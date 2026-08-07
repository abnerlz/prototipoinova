import { createFileRoute } from "@tanstack/react-router";

import { AiAnalysisPanel } from "@/components/ai/AiAnalysisPanel";
import { ForecastPanel } from "@/components/ai/ForecastPanel";
import { RecommendedActionsPanel } from "@/components/ai/RecommendedActionsPanel";
import { RiskBadge, RiskGauge } from "@/components/common/RiskGauge";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMonitoring } from "@/context/MonitoringContext";
import { NEIGHBORHOODS, getMunicipality } from "@/data/regions";
import { assessRisk } from "@/lib/ai";

export const Route = createFileRoute("/ia")({
  head: () => ({
    meta: [
      { title: "IA Preditiva — GeoAlerta RMR" },
      { name: "description", content: "Modelo preditivo de risco de deslizamento: pesos, variáveis, probabilidade em 24h e explicações por bairro." },
      { property: "og:title", content: "IA Preditiva — GeoAlerta RMR" },
      { property: "og:description", content: "Como o modelo calcula o risco geológico da RMR." },
    ],
  }),
  component: IaPage,
});

const WEIGHTS = [
  { label: "Chuva acumulada", weight: 30 },
  { label: "Umidade do solo", weight: 25 },
  { label: "Inclinação da encosta", weight: 20 },
  { label: "Deslocamento do terreno", weight: 15 },
  { label: "Vibração e temperatura", weight: 10 },
];

function IaPage() {
  const { filters, sensorsIn, sensors } = useMonitoring();
  const scoped = sensorsIn(filters.municipalityId, filters.neighborhoodId, filters.sensorType);
  const risk = assessRisk(scoped);
  const scopeLabel =
    filters.neighborhoodId !== "all"
      ? (NEIGHBORHOODS.find((n) => n.id === filters.neighborhoodId)?.name ?? "escopo selecionado")
      : filters.municipalityId !== "all"
        ? (getMunicipality(filters.municipalityId)?.name ?? "escopo selecionado")
        : "Região Metropolitana do Recife";
  const ranking = NEIGHBORHOODS.map((n) => ({ n, r: assessRisk(sensors.filter((s) => s.neighborhoodId === n.id)) }))
    .sort((a, b) => b.r.score - a.r.score)
    .slice(0, 8);

  return (
    <>
      <h1 className="font-display text-xl font-bold">IA de prevenção</h1>
      <FilterBar />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AiAnalysisPanel sensors={scoped} risk={risk} scopeLabel={scopeLabel} />
        </div>
        <div className="space-y-4">
          <ForecastPanel risk={risk} sensors={scoped} />
          <RecommendedActionsPanel risk={risk} />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="glass border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-base">Previsão do escopo atual</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <RiskGauge score={risk.score} size={170} label="Índice de risco" />
            <p className="text-sm text-muted-foreground">Probabilidade em 24h: <strong className="text-foreground">{risk.probability24h}%</strong></p>
            <RiskBadge level={risk.level} />
          </CardContent>
        </Card>

        <Card className="glass border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-base">Pesos do modelo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {WEIGHTS.map((w) => (
              <div key={w.label}>
                <p className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{w.label}</span><span>{w.weight}%</span></p>
                <Progress value={w.weight * 3} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-base">Diagnóstico</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {risk.reasons.map((reason) => (
              <p key={reason} className="rounded-lg border border-border/50 bg-secondary/25 p-2">{reason}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-border/60">
        <CardHeader className="pb-2"><CardTitle className="text-base">Bairros com maior probabilidade em 24h</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {ranking.map(({ n, r }) => (
            <div key={n.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/20 p-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{n.name} <span className="text-xs text-muted-foreground">· {getMunicipality(n.municipalityId)?.name}</span></p>
                <Progress value={r.probability24h} className="mt-1 h-1.5" />
              </div>
              <span className="font-display tabular-nums">{r.probability24h}%</span>
              <RiskBadge level={r.level} />
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
