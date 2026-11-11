import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  getIdTokenResult,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { limitToLast, onValue, orderByKey, push, query, ref, set, update } from "firebase/database";

import { MUNICIPALITIES, NEIGHBORHOODS, getNeighborhood, replaceCustomNeighborhoods } from "@/data/regions";
import { firebaseAuth, firebaseAuthConfigured, realtimeDatabase } from "@/integrations/firebase/client";
import { DEFAULT_SENSOR_ID, computeStatus, type LocalStatus } from "@/lib/sensor-api";
import { parseFirebaseReading, sensorsFromReadings, type RealReading } from "@/lib/real-data";
import { RISK_LABEL, assessRisk } from "@/lib/ai";
import {
  createInitialStates,
  createSensors,
  envValue,
  stepEnv,
  type EnvState,
} from "@/lib/simulation";
import {
  SCENARIOS,
  SPEEDS,
  applyScenario,
  currentPhaseLabel,
  phaseIntensities,
} from "@/lib/simulation-engine";
import type {
  Alert,
  Filters,
  RiskAssessment,
  Sensor,
  SensorType,
  Neighborhood,
  SimulationRecord,
  SimulationScenario,
  SimulationSpeed,
  SimulationState,
} from "@/types";

interface StartSimulationInput {
  scenario: SimulationScenario;
  speed: SimulationSpeed;
  municipalityId: string;
  neighborhoodId: string;
}

export type OperationMode = "real" | "simulacao";
export type DatabaseConnection = "conectando" | "conectado" | "sem_dados" | "erro";

interface MonitoringContextValue {
  sensors: Sensor[];
  /** MODO REAL usa apenas leituras vindas da API; MODO SIMULAÇÃO gera dados fictícios. */
  mode: OperationMode;
  setMode: (mode: OperationMode) => void;
  /** Leituras reais recebidas do protótipo (mais recente primeiro). */
  realReadings: RealReading[];
  awaitingRealData: boolean;
  realStatus: LocalStatus | null;
  lastRealUpdate: number | null;
  databaseConnection: DatabaseConnection;
  databaseError: string | null;
  alerts: Alert[];
  customRegions: Neighborhood[];
  filters: Filters;
  live: boolean;
  intervalMs: number;
  lastTick: number;
  setFilters: (patch: Partial<Filters>) => void;
  setLive: (live: boolean) => void;
  setIntervalMs: (ms: number) => void;
  createAlert: (alert: Omit<Alert, "id" | "createdAt" | "status" | "simulated">) => Promise<Alert | null>;
  closeAlert: (id: string) => Promise<boolean>;
  operatorEmail: string | null;
  isOperator: boolean;
  isAdmin: boolean;
  authLoading: boolean;
  authConfigured: boolean;
  signInOperator: (email: string, password: string) => Promise<void>;
  signOutOperator: () => Promise<void>;
  sensorsIn: (municipalityId?: string, neighborhoodId?: string, type?: SensorType | "all") => Sensor[];
  riskFor: (municipalityId?: string, neighborhoodId?: string) => RiskAssessment;
  autoAlert: Alert | null;
  dismissAutoAlert: () => void;
  simulation: SimulationState | null;
  simulationHistory: SimulationRecord[];
  /** Linha do tempo global de eventos detectados automaticamente. */
  timeline: TimelineEvent[];
  startSimulation: (input: StartSimulationInput) => void;
  stopSimulation: () => void;
}

export interface TimelineEvent {
  id: string;
  timestamp: number;
  message: string;
  level: RiskAssessment["level"];
  neighborhoodId: string;
  municipalityId: string;
}

const MonitoringContext = createContext<MonitoringContextValue | null>(null);

const MAX_HISTORY = 169;

const ORDER: RiskAssessment["level"][] = ["baixo", "moderado", "alto", "critico"];

const VALID_RISK_LEVELS = new Set<RiskAssessment["level"]>(ORDER);

function parseStoredAlert(id: string, value: unknown): Alert | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row["municipalityId"] !== "string" ||
    typeof row["neighborhoodId"] !== "string" ||
    typeof row["level"] !== "string" || !VALID_RISK_LEVELS.has(row["level"] as RiskAssessment["level"]) ||
    typeof row["description"] !== "string" ||
    (row["sensorIds"] !== undefined && row["sensorIds"] !== null &&
      (!Array.isArray(row["sensorIds"]) || !row["sensorIds"].every((sensorId) => typeof sensorId === "string"))) ||
    typeof row["createdAt"] !== "number" || !Number.isFinite(row["createdAt"]) ||
    (row["status"] !== "ativo" && row["status"] !== "encerrado") ||
    (row["origin"] !== "ia" && row["origin"] !== "manual")
  ) return null;

  return {
    id,
    municipalityId: row["municipalityId"],
    neighborhoodId: row["neighborhoodId"],
    level: row["level"] as Alert["level"],
    description: row["description"],
    sensorIds: Array.isArray(row["sensorIds"]) ? row["sensorIds"] as string[] : [],
    createdAt: row["createdAt"],
    ...(typeof row["closedAt"] === "number" ? { closedAt: row["closedAt"] } : {}),
    status: row["status"],
    origin: row["origin"],
  };
}

interface SimRuntime {
  active: boolean;
  recovering: boolean;
  scenario: SimulationScenario;
  speed: SimulationSpeed;
  municipalityId: string;
  neighborhoodId: string;
  startedAt: number;
  progress: number;
  peakScore: number;
  reachedPhases: Set<string>;
  baseline: EnvState;
  criticalNotified: boolean;
  /** Variação aleatória dos alvos: cada execução gera valores diferentes. */
  jitter: number;
}

export function MonitoringProvider({ children }: { children: ReactNode }) {
  const statesRef = useRef<Record<string, EnvState>>(createInitialStates());
  const [simSensors, setSensors] = useState<Sensor[]>(() => createSensors(statesRef.current));
  const [mode, setMode] = useState<OperationMode>("real");
  const [realReadings, setRealReadings] = useState<RealReading[]>([]);
  const [freshnessClock, setFreshnessClock] = useState(Date.now());
  const [databaseConnection, setDatabaseConnection] = useState<DatabaseConnection>("conectando");
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isOperator, setIsOperator] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const realSensors = useMemo(() => sensorsFromReadings(realReadings), [realReadings, freshnessClock]);
  const sensors = mode === "real" ? realSensors : simSensors;
  const latestReal = realReadings[0] ?? null;
  const realStatus = latestReal ? computeStatus(latestReal).status : null;
  const lastRealUpdate = latestReal ? new Date(latestReal.created_at).getTime() : null;
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [customRegions, setCustomRegions] = useState<Neighborhood[]>([]);
  const [filters, setFiltersState] = useState<Filters>({
    municipalityId: "all",
    neighborhoodId: "all",
    sensorType: "all",
    period: "24h",
  });
  const [live, setLive] = useState(true);
  const [intervalMs, setIntervalMs] = useState(4000);
  const [lastTick, setLastTick] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setFreshnessClock(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!firebaseAuth) {
      setAuthLoading(false);
      return;
    }
    return onAuthStateChanged(firebaseAuth, async (user) => {
      setAuthUser(user);
      if (!user) {
        setIsOperator(false);
        setIsAdmin(false);
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);
      try {
        const claims = (await getIdTokenResult(user)).claims;
        const verified = user.emailVerified && claims["email_verified"] === true;
        const admin = verified && claims["admin"] === true;
        setIsAdmin(admin);
        setIsOperator(verified && (admin || claims["operator"] === true));
      } catch (cause) {
        console.error("[auth] Não foi possível carregar o perfil do operador.", cause);
        setIsOperator(false);
        setIsAdmin(false);
      } finally {
        setAuthLoading(false);
      }
    });
  }, []);

  const signInOperator = useCallback(async (email: string, password: string) => {
    const auth = firebaseAuth;
    if (!firebaseAuthConfigured || !auth) {
      throw new Error("Configure VITE_FIREBASE_API_KEY para ativar o login do Firebase.");
    }
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    if (!credential.user.emailVerified) {
      await sendEmailVerification(credential.user, { url: window.location.origin });
      await firebaseSignOut(auth);
      throw new Error("Enviamos um link de confirmação para seu e-mail. Confirme a conta e depois entre novamente.");
    }

    const claims = (await getIdTokenResult(credential.user, true)).claims;
    const admin = claims["admin"] === true;
    if (!admin && claims["operator"] !== true) {
      await firebaseSignOut(auth);
      throw new Error("Esta conta não tem perfil de operador no ProTerra.");
    }
  }, []);

  const signOutOperator = useCallback(() => firebaseAuth ? firebaseSignOut(firebaseAuth) : Promise.resolve(), []);

  const simRef = useRef<SimRuntime | null>(null);
  const [simulation, setSimulation] = useState<SimulationState | null>(null);
  const [simulationHistory, setSimulationHistory] = useState<SimulationRecord[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    const unsubscribe = onValue(
      ref(realtimeDatabase, "custom_regions"),
      (snapshot) => {
        const regions: Neighborhood[] = [];
        snapshot.forEach((child) => {
          const raw = child.val() as Record<string, unknown> | null;
          const center = raw?.["center"] as Record<string, unknown> | undefined;
          if (
            !raw || typeof raw["name"] !== "string" || typeof raw["municipalityId"] !== "string" ||
            typeof center?.["lat"] !== "number" || typeof center?.["lng"] !== "number" ||
            typeof raw["susceptibility"] !== "number" || typeof raw["households"] !== "number"
          ) return false;
          regions.push({
            id: child.key ?? "",
            name: raw["name"],
            municipalityId: raw["municipalityId"],
            center: { lat: center["lat"], lng: center["lng"] },
            susceptibility: raw["susceptibility"],
            households: raw["households"],
          });
          return false;
        });
        replaceCustomNeighborhoods(regions);
        setCustomRegions(regions);
      },
      (cause) => {
        console.error("[regiões] Falha ao ler regiões cadastradas.", cause);
        toast.error("Não foi possível carregar as novas regiões", { description: "Confira a permissão de leitura do Firebase." });
      },
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onValue(
      ref(realtimeDatabase, "alerts"),
      (snapshot) => {
        const stored: Alert[] = [];
        snapshot.forEach((child) => {
          const alert = parseStoredAlert(child.key ?? "", child.val());
          if (alert) stored.push(alert);
          return false;
        });
        stored.sort((a, b) => b.createdAt - a.createdAt);
        setAlerts((current) => [...current.filter((alert) => alert.simulated), ...stored]);
      },
      (cause) => {
        console.error("[alertas] Falha ao ler o histórico persistido.", cause);
        toast.error("Não foi possível carregar o histórico", {
          description: "Verifique as regras de leitura do Firebase para os alertas.",
          id: "alerts-read-error",
        });
      },
    );
    return unsubscribe;
  }, []);

  // Cada carregamento gera um conjunto de leituras diferente, dentro da faixa
  // realista — sem divergir da renderização do servidor (roda após a montagem).
  useEffect(() => {
    const salt = Math.floor(Math.random() * 1_000_000);
    statesRef.current = createInitialStates(salt);
    setSensors(createSensors(statesRef.current, salt));
  }, []);

  // ---- MODO REAL: busca as leituras gravadas pelo protótipo (ESP32) --------
  useEffect(() => {
    if (mode !== "real") return;
    let cancelled = false;
    // The database already uses Firebase push IDs, which sort by creation time.
    // Read a bounded window by key, then filter locally so this keeps working
    // even before the optional sensor_id index is deployed.
    const readingsQuery = query(ref(realtimeDatabase, "sensor_readings"), orderByKey(), limitToLast(1000));
    const unsubscribe = onValue(
      readingsQuery,
      (snapshot) => {
        if (cancelled) return;
        const rows: RealReading[] = [];
        snapshot.forEach((child) => {
          const row = parseFirebaseReading(child.key ?? "", child.val());
          if (row?.sensor_id === DEFAULT_SENSOR_ID) rows.push(row);
          return false;
        });
        rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
        setRealReadings(rows);
        setDatabaseConnection(rows.length ? "conectado" : "sem_dados");
        setDatabaseError(null);
        setLastTick(Date.now());
      },
      (cause) => {
        if (cancelled) return;
        console.error("[monitoramento] falha ao consultar Firebase Realtime Database", cause);
        setDatabaseConnection("erro");
        setDatabaseError(cause.message || "Não foi possível consultar o banco.");
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [mode]);

  const setFilters = useCallback((patch: Partial<Filters>) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...patch };
      // Ao trocar de município, o bairro selecionado deixa de ser válido.
      if (patch.municipalityId && patch.municipalityId !== prev.municipalityId) {
        next.neighborhoodId = "all";
      }
      return next;
    });
  }, []);

  const createAlert = useCallback<MonitoringContextValue["createAlert"]>(async (alert) => {
    const createdAt = Date.now();
    if (mode === "simulacao") {
      const localAlert: Alert = {
        ...alert,
        id: `local-${createdAt}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt,
        status: "ativo",
        simulated: true,
      };
      setAlerts((current) => [localAlert, ...current]);
      return localAlert;
    }
    if (!isOperator) {
      toast.error("Ação restrita a operadores", { description: "Entre com uma conta de operador verificada para registrar alertas." });
      return null;
    }

    const alertReference = push(ref(realtimeDatabase, "alerts"));
    if (!alertReference.key) return null;
    const storedAlert: Omit<Alert, "id" | "simulated"> = {
      ...alert,
      createdAt,
      status: "ativo",
    };
    try {
      await set(alertReference, storedAlert);
      return { ...storedAlert, id: alertReference.key };
    } catch (cause) {
      console.error("[alertas] Falha ao gravar alerta no Firebase.", cause);
      toast.error("Alerta não foi salvo", { description: "A conta pode não ter permissão de operador ou o Firebase está indisponível." });
      return null;
    }
  }, [isOperator, mode]);

  const closeAlert = useCallback<MonitoringContextValue["closeAlert"]>(async (id) => {
    if (id.startsWith("local-")) {
      setAlerts((current) => current.map((alert) =>
        alert.id === id ? { ...alert, status: "encerrado", closedAt: Date.now() } : alert,
      ));
      return true;
    }
    if (!isOperator) {
      toast.error("Ação restrita a operadores", { description: "Entre com uma conta de operador para encerrar este alerta." });
      return false;
    }
    try {
      await update(ref(realtimeDatabase, `alerts/${id}`), { status: "encerrado", closedAt: Date.now() });
      return true;
    } catch (cause) {
      console.error("[alertas] Falha ao encerrar alerta no Firebase.", cause);
      toast.error("Não foi possível encerrar o alerta", { description: "Verifique sua sessão de operador e tente novamente." });
      return false;
    }
  }, [isOperator]);

  const pushEvent = useCallback((message: string, score: number, level: RiskAssessment["level"]) => {
    setSimulation((prev) =>
      prev
        ? { ...prev, events: [...prev.events, { timestamp: Date.now(), message, score, level }].slice(-40) }
        : prev,
    );
  }, []);

  // Loop de simulação/monitoramento em tempo real.
  useEffect(() => {
    if (!live || mode === "real") return;
    const id = window.setInterval(() => {
      const now = Date.now();
      const sim = simRef.current;

      NEIGHBORHOODS.forEach((n) => {
        statesRef.current[n.id] = stepEnv(statesRef.current[n.id], n.susceptibility, 0.25);
      });

      // Cenário controlado aplicado somente ao bairro escolhido.
      if (sim?.active) {
        const step = SPEEDS[sim.speed].step;
        sim.progress = Math.max(0, Math.min(1, sim.progress + (sim.recovering ? -step * 0.9 : step)));

        const target = statesRef.current[sim.neighborhoodId];
        if (target) {
          statesRef.current[sim.neighborhoodId] = applyScenario(target, sim.baseline, sim.scenario, sim.progress, sim.jitter);
        }

        if (!sim.recovering) {
          phaseIntensities(sim.scenario, sim.progress).forEach(({ phase, intensity }) => {
            if (intensity > 0.15 && !sim.reachedPhases.has(phase.key)) {
              sim.reachedPhases.add(phase.key);
              const score = assessRisk(
                sensorsRef.current.filter((s) => s.neighborhoodId === sim.neighborhoodId),
              );
              pushEvent(phase.message, score.score, score.level);
            }
          });
        }

        if (sim.recovering && sim.progress <= 0.001) {
          finishSimulationRef.current?.();
        }
      }

      setSensors((prev) =>
        prev.map((sensor) => {
          if (sensor.status !== "online") return sensor;
          const state = statesRef.current[sensor.neighborhoodId];
          const value = Number(envValue(state, sensor.type).toFixed(2));
          const history = [...sensor.history, { timestamp: now, value }].slice(-MAX_HISTORY);
          return {
            ...sensor,
            value,
            history,
            lastUpdate: now,
            battery: Math.max(5, (sensor.battery ?? 70) - (Math.random() < 0.02 ? 1 : 0)),
            signal: Math.max(20, Math.min(100, (sensor.signal ?? 70) + Math.round((Math.random() - 0.5) * 4))),
          };
        }),
      );
      setLastTick(now);
      if (sim?.active) {
        setSimulation((prev) =>
          prev
            ? {
                ...prev,
                progress: sim.progress,
                recovering: sim.recovering,
                currentPhase: sim.recovering
                  ? "Retorno gradual às condições normais"
                  : currentPhaseLabel(sim.scenario, sim.progress),
              }
            : prev,
        );
      }
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [live, intervalMs, mode, pushEvent]);

  const sensorsRef = useRef<Sensor[]>(sensors);
  useEffect(() => {
    sensorsRef.current = sensors;
  }, [sensors]);

  const sensorsIn = useCallback<MonitoringContextValue["sensorsIn"]>(
    (municipalityId, neighborhoodId, type) =>
      sensors.filter(
        (s) =>
          (!municipalityId || municipalityId === "all" || s.municipalityId === municipalityId) &&
          (!neighborhoodId || neighborhoodId === "all" || s.neighborhoodId === neighborhoodId) &&
          (!type || type === "all" || s.type === type),
      ),
    [sensors],
  );

  const riskFor = useCallback<MonitoringContextValue["riskFor"]>(
    (municipalityId, neighborhoodId) => {
      const scoped = sensorsIn(municipalityId, neighborhoodId);
      const recent = alerts.filter(
        (a) =>
          (!municipalityId || municipalityId === "all" || a.municipalityId === municipalityId) &&
          (!neighborhoodId || neighborhoodId === "all" || a.neighborhoodId === neighborhoodId) &&
          Date.now() - a.createdAt < 86_400_000,
      ).length;
      return assessRisk(scoped, recent);
    },
    [sensorsIn, alerts],
  );

  const finishSimulationRef = useRef<() => void>(undefined);

  const startSimulation = useCallback<MonitoringContextValue["startSimulation"]>((input) => {
    if (simRef.current?.active) return;
    setMode("simulacao");
    const now = Date.now();
    simRef.current = {
      active: true,
      recovering: false,
      scenario: input.scenario,
      speed: input.speed,
      municipalityId: input.municipalityId,
      neighborhoodId: input.neighborhoodId,
      startedAt: now,
      progress: 0,
      peakScore: 0,
      reachedPhases: new Set<string>(),
      baseline: { ...statesRef.current[input.neighborhoodId] },
      criticalNotified: false,
      jitter: 0.85 + Math.random() * 0.3,
    };
    setSimulation({
      active: true,
      recovering: false,
      scenario: input.scenario,
      speed: input.speed,
      municipalityId: input.municipalityId,
      neighborhoodId: input.neighborhoodId,
      startedAt: now,
      progress: 0,
      currentPhase: SCENARIOS[input.scenario].phases[0]?.label ?? "Preparando cenário",
      peakScore: 0,
      events: [
        {
          timestamp: now,
          message: `Simulação "${SCENARIOS[input.scenario].label}" iniciada em ${getNeighborhood(input.neighborhoodId)?.name ?? ""}. A IA passa a narrar cada mudança.`,
          level: "baixo",
          score: 0,
        },
      ],
    });
  }, []);

  /** Encerra a simulação: inicia o retorno gradual às condições normais. */
  const stopSimulation = useCallback(() => {
    const sim = simRef.current;
    if (!sim?.active || sim.recovering) return;
    sim.recovering = true;
    setSimulation((prev) => (prev ? { ...prev, recovering: true } : prev));
    pushEvent(
      "Encerramento solicitado: sensores retornando gradualmente aos valores normais.",
      0,
      "moderado",
    );
  }, [pushEvent]);

  // Grava o histórico e volta ao monitoramento normal.
  finishSimulationRef.current = () => {
    const sim = simRef.current;
    if (!sim) return;
    const endedAt = Date.now();
    simRef.current = null;
    setMode("real");
    setSimulation((prev) => {
      if (prev) {
        setSimulationHistory((hist) => [
          {
            id: `sim-${sim.startedAt}`,
            scenario: sim.scenario,
            speed: sim.speed,
            municipalityId: sim.municipalityId,
            neighborhoodId: sim.neighborhoodId,
            startedAt: sim.startedAt,
            endedAt,
            durationMs: endedAt - sim.startedAt,
            peakScore: Number(sim.peakScore.toFixed(1)),
            peakLevel:
              sim.peakScore > 75 ? "critico" : sim.peakScore > 50 ? "alto" : sim.peakScore > 25 ? "moderado" : "baixo",
            events: prev.events,
          },
          ...hist,
        ]);
      }
      return null;
    });
    toast.success("Situação normalizada", {
      description: "A IA confirma o retorno ao estado seguro de monitoramento.",
    });
  };

  // Alertas durante a simulação: apenas nas transições (crítico / normalizado).
  useEffect(() => {
    const sim = simRef.current;
    if (!sim?.active) return;
    const scoped = sensors.filter((s) => s.neighborhoodId === sim.neighborhoodId);
    if (!scoped.length) return;
    const assessment = assessRisk(scoped);
    if (assessment.score > sim.peakScore) sim.peakScore = assessment.score;
    setSimulation((prev) => (prev ? { ...prev, peakScore: Number(sim.peakScore.toFixed(1)) } : prev));

    const name = getNeighborhood(sim.neighborhoodId)?.name ?? "";
    if (assessment.level === "critico" && !sim.criticalNotified) {
      sim.criticalNotified = true;
      createAlert({
        municipalityId: sim.municipalityId,
        neighborhoodId: sim.neighborhoodId,
        level: "critico",
        description: `Simulação fictícia: índice experimental crítico (${assessment.score}) em ${name}. Não representa probabilidade de deslizamento.`,
        sensorIds: scoped.map((s) => s.id),
        origin: "ia",
      });
      toast.error("Risco CRÍTICO detectado", { description: `${name} · índice ${assessment.score}` });
      setSimulation((prev) =>
        prev
          ? {
              ...prev,
              events: [
                ...prev.events,
                {
                  timestamp: Date.now(),
                  message: `Índice de risco atingiu nível CRÍTICO (${assessment.score}). Alerta único emitido para ${name}.`,
                  level: "critico",
                  score: assessment.score,
                },
              ],
            }
          : prev,
      );
    } else if (assessment.level !== "critico" && sim.criticalNotified && sim.recovering) {
      sim.criticalNotified = false;
      createAlert({
        municipalityId: sim.municipalityId,
        neighborhoodId: sim.neighborhoodId,
        level: assessment.level,
        description: `IA (simulação): situação normalizada em ${name}. Índice atual ${assessment.score}.`,
        sensorIds: [],
        origin: "ia",
      });
      setSimulation((prev) =>
        prev
          ? {
              ...prev,
              events: [
                ...prev.events,
                {
                  timestamp: Date.now(),
                  message: `Situação normalizada: índice recuou para ${assessment.score}.`,
                  level: assessment.level,
                  score: assessment.score,
                },
              ],
            }
          : prev,
      );
    }
  }, [sensors, createAlert]);

  // ---- Linha do tempo automática -----------------------------------------
  const prevLevels = useRef<Record<string, RiskAssessment["level"]>>({});
  const prevRain = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!sensors.length) return;
    const now = Date.now();
    const additions: TimelineEvent[] = [];

    NEIGHBORHOODS.forEach((n) => {
      const scoped = sensors.filter((s) => s.neighborhoodId === n.id && s.status === "online");
      if (!scoped.length) return;
      const assessment = assessRisk(scoped);
      const before = prevLevels.current[n.id];
      prevLevels.current[n.id] = assessment.level;

      if (before && before !== assessment.level) {
        const subiu = ORDER.indexOf(assessment.level) > ORDER.indexOf(before);
        additions.push({
          id: `${n.id}-lvl-${now}`,
          timestamp: now,
          message: `IA ${subiu ? "elevou" : "reduziu"} o risco de ${n.name} para ${RISK_LABEL[assessment.level]} (índice ${assessment.score}).`,
          level: assessment.level,
          neighborhoodId: n.id,
          municipalityId: n.municipalityId,
        });
      }

      const rain = scoped.find((s) => s.type === "pluviosidade")?.value ?? 0;
      const rainBefore = prevRain.current[n.id] ?? rain;
      prevRain.current[n.id] = rain;
      if (rainBefore < 12 && rain >= 12) {
        additions.push({
          id: `${n.id}-rain-${now}`,
          timestamp: now,
          message: `Chuva intensa iniciada em ${n.name} (${rain.toFixed(1)} mm/h).`,
          level: assessment.level,
          neighborhoodId: n.id,
          municipalityId: n.municipalityId,
        });
      } else if (rainBefore >= 12 && rain < 4) {
        additions.push({
          id: `${n.id}-rain-stop-${now}`,
          timestamp: now,
          message: `Chuva cessou em ${n.name}; sensores retornando gradualmente ao normal.`,
          level: assessment.level,
          neighborhoodId: n.id,
          municipalityId: n.municipalityId,
        });
      }
    });

    if (additions.length) setTimeline((prev) => [...additions, ...prev].slice(0, 120));
  }, [sensors]);

  const value = useMemo<MonitoringContextValue>(
    () => ({
      sensors,
      mode,
      setMode,
      realReadings,
      awaitingRealData: mode === "real" && realReadings.length === 0,
      realStatus,
      lastRealUpdate,
      databaseConnection,
      databaseError,
      alerts,
      customRegions,
      filters,
      live,
      intervalMs,
      lastTick,
      setFilters,
      setLive,
      setIntervalMs,
      createAlert,
      closeAlert,
      operatorEmail: authUser?.email ?? null,
      isOperator,
      isAdmin,
      authLoading,
      authConfigured: firebaseAuthConfigured,
      signInOperator,
      signOutOperator,
      sensorsIn,
      riskFor,
      // Monitoramento silencioso: nenhum pop-up automático fora da simulação.
      autoAlert: null,
      dismissAutoAlert: () => {},
      simulation,
      simulationHistory,
      timeline,
      startSimulation,
      stopSimulation,
    }),
    [
      sensors,
      mode,
      realReadings,
      realStatus,
      lastRealUpdate,
      databaseConnection,
      databaseError,
      authUser,
      isOperator,
      isAdmin,
      authLoading,
      signInOperator,
      signOutOperator,
      alerts,
      customRegions,
      filters,
      live,
      intervalMs,
      lastTick,
      setFilters,
      createAlert,
      closeAlert,
      sensorsIn,
      riskFor,
      simulation,
      simulationHistory,
      timeline,
      startSimulation,
      stopSimulation,
    ],
  );

  return <MonitoringContext.Provider value={value}>{children}</MonitoringContext.Provider>;
}

export function useMonitoring() {
  const ctx = useContext(MonitoringContext);
  if (!ctx) throw new Error("useMonitoring precisa estar dentro de <MonitoringProvider>");
  return ctx;
}

export { MUNICIPALITIES, NEIGHBORHOODS, getNeighborhood };
