import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { MUNICIPALITIES, NEIGHBORHOODS, getNeighborhood } from "@/data/regions";
import { assessRisk } from "@/lib/ai";
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

interface MonitoringContextValue {
  sensors: Sensor[];
  alerts: Alert[];
  filters: Filters;
  live: boolean;
  intervalMs: number;
  lastTick: number;
  setFilters: (patch: Partial<Filters>) => void;
  setLive: (live: boolean) => void;
  setIntervalMs: (ms: number) => void;
  createAlert: (alert: Omit<Alert, "id" | "createdAt" | "status">) => void;
  closeAlert: (id: string) => void;
  sensorsIn: (municipalityId?: string, neighborhoodId?: string, type?: SensorType | "all") => Sensor[];
  riskFor: (municipalityId?: string, neighborhoodId?: string) => RiskAssessment;
  autoAlert: Alert | null;
  dismissAutoAlert: () => void;
  simulation: SimulationState | null;
  simulationHistory: SimulationRecord[];
  startSimulation: (input: StartSimulationInput) => void;
  stopSimulation: () => void;
}

const MonitoringContext = createContext<MonitoringContextValue | null>(null);

const MAX_HISTORY = 169;

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
}

export function MonitoringProvider({ children }: { children: ReactNode }) {
  const statesRef = useRef<Record<string, EnvState>>(createInitialStates());
  const [sensors, setSensors] = useState<Sensor[]>(() => createSensors(statesRef.current));
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filters, setFiltersState] = useState<Filters>({
    municipalityId: "all",
    neighborhoodId: "all",
    sensorType: "all",
    period: "24h",
  });
  const [live, setLive] = useState(true);
  const [intervalMs, setIntervalMs] = useState(4000);
  const [lastTick, setLastTick] = useState(Date.now());

  const simRef = useRef<SimRuntime | null>(null);
  const [simulation, setSimulation] = useState<SimulationState | null>(null);
  const [simulationHistory, setSimulationHistory] = useState<SimulationRecord[]>([]);

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

  const createAlert = useCallback<MonitoringContextValue["createAlert"]>((alert) => {
    setAlerts((prev) => [
      { ...alert, id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now(), status: "ativo" },
      ...prev,
    ]);
  }, []);

  const closeAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "encerrado", closedAt: Date.now() } : a)),
    );
  }, []);

  const pushEvent = useCallback((message: string, score: number, level: RiskAssessment["level"]) => {
    setSimulation((prev) =>
      prev
        ? { ...prev, events: [...prev.events, { timestamp: Date.now(), message, score, level }].slice(-40) }
        : prev,
    );
  }, []);

  // Loop de simulação/monitoramento em tempo real.
  useEffect(() => {
    if (!live) return;
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
          statesRef.current[sim.neighborhoodId] = applyScenario(target, sim.baseline, sim.scenario, sim.progress);
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
            battery: Math.max(5, sensor.battery - (Math.random() < 0.02 ? 1 : 0)),
            signal: Math.max(20, Math.min(100, sensor.signal + Math.round((Math.random() - 0.5) * 4))),
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
  }, [live, intervalMs, pushEvent]);

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
        description: `IA (simulação): índice crítico de ${assessment.score} em ${name}. Probabilidade de deslizamento em 24h: ${assessment.probability24h}%.`,
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

  const value = useMemo<MonitoringContextValue>(
    () => ({
      sensors,
      alerts,
      filters,
      live,
      intervalMs,
      lastTick,
      setFilters,
      setLive,
      setIntervalMs,
      createAlert,
      closeAlert,
      sensorsIn,
      riskFor,
      // Monitoramento silencioso: nenhum pop-up automático fora da simulação.
      autoAlert: null,
      dismissAutoAlert: () => {},
      simulation,
      simulationHistory,
      startSimulation,
      stopSimulation,
    }),
    [
      sensors,
      alerts,
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
