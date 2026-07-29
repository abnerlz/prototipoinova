import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Building2,
  CloudRain,
  Cpu,
  Gauge,
  MapPin,
  Timer,
  WifiOff,
} from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MultiSensorChart } from "@/components/charts/SensorCharts";
import { RiskBadge, RiskGauge } from "@/components/common/RiskGauge";
import { SectionTitle, StatCard } from "@/components/common/StatCard";
import { MapPanel } from "@/components/map/MapPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMonitoring } from "@/context/MonitoringContext";
import { MUNICIPALITIES, NEIGHBORHOODS, getMunicipality, getNeighborhood } from "@/data/regions";
import { RISK_COLOR, RISK_LABEL, assessRisk, forecast24h } from "@/lib/ai";
import type { SensorType } from "@/types";

interface ScopeDashboardProps {
  municipalityId?: string;
  neighborhoodId?: string;
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
} as const;

/**
 * Dashboard hierárquico reutilizado nos níveis Região → Município → Bairro.
 * Todos os indicadores são recalculados a partir do escopo recebido.
 */
export function ScopeDashboard({ municipalityId, neighborhoodId }: ScopeDashboardProps) {
  const { sensors, alerts, filters, riskFor, sensorsIn } = useMonitoring();

  const scopeMunicipality = municipalityId ?? (filters.municipalityId === "all" ? undefined : filters.municipalityId);
  const scopeNeighborhood = neighborhoodId ?? (filters.neighborhoodId === "all" ? undefined : filters.neighborhoodId);
  const typeFilter: SensorType | undefined = filters.sensorType === "all" ? undefined : filters.sensorType;

  const scoped = sensorsIn(scopeMunicipality, scopeNeighborhood, filters.sensorType);
  const scopedAll = sensorsIn(scopeMunicipality, scopeNeighborhood);
  const risk = riskFor(scopeMunicipality, scopeNeighborhood);
  const forecast = useMemo(() => forecast24h(risk), [risk.score, risk.trend]);

  const scopedAlerts = alerts.filter(
    (a) =>
      (!scopeMunicipality || a.municipalityId === scopeMunicipality) &&
      (!scopeNeighborhood || a.neighborhoodId === scopeNeighborhood),
  );

  const online = scopedAll.filter((s) => s.status === "online").length;
  const offline = scopedAll.length - online;

  const neighborhoodRanking = useMemo(() => {
    const list = NEIGHBORHOODS.filter(
      (n) =>
        (!scopeMunicipality || n.municipalityId === scopeMunicipality) &&
        (!scopeNeighborhood || n.id === scopeNeighborhood),
    );
    return list
      .map((n) => {
        const assessment = assessRisk(sensors.filter((s) => s.neighborhoodId === n.id));
        return { neighborhood: n, assessment };
      })
      .sort((a, b) => b.assessment.score - a.assessment.score);
  }, [sensors, scopeMunicipality, scopeNeighborhood]);

  const municipalityRanking = useMemo(
    () =>
      MUNICIPALITIES.filter((m) => !scopeMunicipality || m.id === scopeMunicipality)
        .map((m) => ({
          municipality: m,
          assessment: assessRisk(sensors.filter((s) => s.municipalityId === m.id)),
        }))
        .sort((a, b) => b.assessment.score - a.assessment.score),
    [sensors, scopeMunicipality],
  );

  const regionsInAlert = neighborhoodRanking.filter(
    (n) => n.assessment.level === "alto" || n.assessment.level === "critico",
  ).length;

  const criticalNeighborhood = neighborhoodRanking[0];
  const chartTypes = typeFilter ? [typeFilter] : undefined;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Gauge} label="Índice Geral de Risco" value={risk.score} hint={RISK_LABEL[risk.level]} tone={risk.level === "critico" ? "critical" : risk.level === "alto" ? "high" : risk.level === "moderado" ? "medium" : "low"} />
        <StatCard icon={Building2} label={scopeNeighborhood ? "Domicílios no bairro" : "Municípios monitorados"} value={scopeNeighborhood ? (getNeighborhood(scopeNeighborhood)?.households ?? 0).toLocaleString("pt-BR") : municipalityRanking.length} hint={scopeMunicipality ? getMunicipality(scopeMunicipality)?.name : "Região Metropolitana do Recife"} delay={0.04} />
        <StatCard icon={Cpu} label="Sensores online" value={online} hint={`${scopedAll.length} instalados no escopo`} tone="low" delay={0.08} />
        <StatCard icon={WifiOff} label="Sensores offline" value={offline} hint="Requerem manutenção" tone={offline > 0 ? "high" : "low"} delay={0.12} />
        <StatCard icon={AlertTriangle} label="Alertas" value={scopedAlerts.length} hint={`${scopedAlerts.filter((a) => a.status === "ativo").length} ativos`} tone={scopedAlerts.some((a) => a.status === "ativo") ? "critical" : "default"} delay={0.16} />
        <StatCard icon={MapPin} label="Regiões em alerta" value={regionsInAlert} hint="Risco alto ou crítico" tone={regionsInAlert ? "high" : "low"} delay={0.2} />
        <StatCard icon={BrainCircuit} label="Status da IA" value="Operacional" hint={`Tendência ${risk.trend}`} delay={0.24} />
        <StatCard icon={Timer} label="Probabilidade 24h" value={`${risk.probability24h}%`} hint="Deslizamento no escopo" tone={risk.probability24h > 60 ? "critical" : "medium"} delay={0.28} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="glass border-border/60 xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Índice consolidado</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <RiskGauge score={risk.score} sublabel={`Probabilidade de deslizamento em 24h: ${risk.probability24h}%`} />
            <div className="w-full space-y-2">
              {risk.contributions.slice(0, 4).map((c) => (
                <div key={c.type} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="font-mono">{c.value} {c.unit}</span>
                  </div>
                  <Progress value={Math.min(100, c.weight * 4)} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/60 xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Previsão da IA — próximas 24 horas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={264}>
              <ComposedChart data={forecast} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={44} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="risco" name="Índice previsto" fill="url(#forecastGrad)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                <Line dataKey="limiteCritico" name="Limiar crítico" stroke="var(--risk-critical)" strokeDasharray="6 6" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="glass border-border/60 xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Séries dos sensores · {filters.period === "24h" ? "24 horas" : filters.period === "7d" ? "7 dias" : "30 dias"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MultiSensorChart sensors={scoped} period={filters.period} types={chartTypes} height={300} />
          </CardContent>
        </Card>

        <Card className="glass border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mapa operacional</CardTitle>
          </CardHeader>
          <CardContent>
            <MapPanel municipalityId={scopeMunicipality} neighborhoodId={scopeNeighborhood} height="332px" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="glass border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ranking de risco por bairro</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(220, Math.min(360, neighborhoodRanking.length * 26))}>
              <BarChart
                layout="vertical"
                data={neighborhoodRanking.slice(0, 12).map((n) => ({
                  name: n.neighborhood.name,
                  risco: n.assessment.score,
                  fill: RISK_COLOR[n.assessment.level],
                }))}
                margin={{ left: 8, right: 16 }}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={128} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--secondary)", opacity: 0.3 }} />
                <Bar dataKey="risco" radius={[0, 6, 6, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Diagnóstico da IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <RiskBadge level={risk.level} />
              <Badge variant="outline" className="border-border/70">Tendência: {risk.trend}</Badge>
              {criticalNeighborhood ? (
                <Badge variant="outline" className="border-border/70">
                  Bairro mais crítico: {criticalNeighborhood.neighborhood.name}
                </Badge>
              ) : null}
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {risk.reasons.map((reason, i) => (
                <motion.li
                  key={reason}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-2 rounded-lg border border-border/50 bg-secondary/25 p-2.5"
                >
                  <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{reason}</span>
                </motion.li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {!scopeNeighborhood ? (
        <section>
          <SectionTitle
            title={scopeMunicipality ? "Bairros monitorados" : "Municípios monitorados"}
            subtitle="Clique para abrir o dashboard exclusivo do nível seguinte."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {scopeMunicipality
              ? neighborhoodRanking.map(({ neighborhood, assessment }) => (
                  <Link key={neighborhood.id} to="/bairros/$neighborhoodId" params={{ neighborhoodId: neighborhood.id }}>
                    <motion.div whileHover={{ y: -3 }} className="glass h-full rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display font-semibold">{neighborhood.name}</p>
                        <RiskBadge level={assessment.level} />
                      </div>
                      <p className="font-display mt-3 text-2xl font-bold tabular-nums">{assessment.score}</p>
                      <p className="text-xs text-muted-foreground">
                        {sensors.filter((s) => s.neighborhoodId === neighborhood.id).length} sensores ·{" "}
                        {assessment.probability24h}% em 24h
                      </p>
                    </motion.div>
                  </Link>
                ))
              : municipalityRanking.map(({ municipality, assessment }) => (
                  <Link key={municipality.id} to="/municipios/$municipalityId" params={{ municipalityId: municipality.id }}>
                    <motion.div whileHover={{ y: -3 }} className="glass h-full rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display font-semibold">{municipality.name}</p>
                        <RiskBadge level={assessment.level} />
                      </div>
                      <p className="font-display mt-3 text-2xl font-bold tabular-nums">{assessment.score}</p>
                      <p className="text-xs text-muted-foreground">
                        {sensors.filter((s) => s.municipalityId === municipality.id).length} sensores ·{" "}
                        {NEIGHBORHOODS.filter((n) => n.municipalityId === municipality.id).length} bairros
                      </p>
                    </motion.div>
                  </Link>
                ))}
          </div>
        </section>
      ) : null}

      <Card className="glass border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudRain className="h-4 w-4 text-primary" /> Leituras em tempo real
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scoped.slice(0, 9).map((sensor) => (
            <Link key={sensor.id} to="/sensores/$sensorId" params={{ sensorId: sensor.id }}>
              <div className="rounded-lg border border-border/60 bg-secondary/25 p-3 transition-colors hover:border-primary/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{sensor.name}</p>
                  <Badge variant="outline" className="border-border/70 text-[10px] uppercase">{sensor.status}</Badge>
                </div>
                <p className="font-display mt-1 text-xl font-bold tabular-nums text-primary">
                  {sensor.value} <span className="text-xs font-normal text-muted-foreground">{sensor.unit}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {sensor.code} · bateria {sensor.battery}% · sinal {sensor.signal}%
                </p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
