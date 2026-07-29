import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { MUNICIPALITIES, NEIGHBORHOODS, getNeighborhood } from "@/data/regions";
import { assessRisk } from "@/lib/ai";
import {
  createInitialStates,
  createSensors,
  envValue,
  stepEnv,
  type EnvState,
} from "@/lib/simulation";
import type { Alert, Filters, RiskAssessment, Sensor, SensorType } from "@/types";

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
}

const MonitoringContext = createContext<MonitoringContextValue | null>(null);

const MAX_HISTORY = 169;

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
  const [autoAlert, setAutoAlert] = useState<Alert | null>(null);
  const autoAlertGuard = useRef<Record<string, number>>({});

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

  // Loop de simulação em tempo real.
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      NEIGHBORHOODS.forEach((n) => {
        statesRef.current[n.id] = stepEnv(statesRef.current[n.id], n.susceptibility, 0.25);
      });
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
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [live, intervalMs]);

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

  // Detecção automática de risco crítico por bairro.
  useEffect(() => {
    const now = Date.now();
    for (const neighborhood of NEIGHBORHOODS) {
      const scoped = sensors.filter((s) => s.neighborhoodId === neighborhood.id);
      if (!scoped.length) continue;
      const assessment = assessRisk(scoped);
      if (assessment.level !== "critico") continue;
      const last = autoAlertGuard.current[neighborhood.id] ?? 0;
      if (now - last < 120_000) continue;
      autoAlertGuard.current[neighborhood.id] = now;
      const contributors = assessment.contributions.slice(0, 3).map((c) => c.type);
      setAutoAlert({
        id: "auto-draft",
        municipalityId: neighborhood.municipalityId,
        neighborhoodId: neighborhood.id,
        level: "critico",
        description: `IA detectou índice crítico de ${assessment.score} em ${neighborhood.name}. Probabilidade de deslizamento em 24h: ${assessment.probability24h}%.`,
        sensorIds: scoped.filter((s) => contributors.includes(s.type)).map((s) => s.id),
        createdAt: now,
        status: "ativo",
        origin: "ia",
      });
      break;
    }
  }, [sensors]);

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
      autoAlert,
      dismissAutoAlert: () => setAutoAlert(null),
    }),
    [sensors, alerts, filters, live, intervalMs, lastTick, setFilters, createAlert, closeAlert, sensorsIn, riskFor, autoAlert],
  );

  return <MonitoringContext.Provider value={value}>{children}</MonitoringContext.Provider>;
}

export function useMonitoring() {
  const ctx = useContext(MonitoringContext);
  if (!ctx) throw new Error("useMonitoring precisa estar dentro de <MonitoringProvider>");
  return ctx;
}

export { MUNICIPALITIES, NEIGHBORHOODS, getNeighborhood };
