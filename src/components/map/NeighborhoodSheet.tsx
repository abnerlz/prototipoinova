import { Link } from "@tanstack/react-router";

import { MultiSensorChart } from "@/components/charts/SensorCharts";
import { AiAnalysisPanel } from "@/components/ai/AiAnalysisPanel";
import { ForecastPanel } from "@/components/ai/ForecastPanel";
import { RecommendedActionsPanel } from "@/components/ai/RecommendedActionsPanel";
import { EventTimeline } from "@/components/common/EventTimeline";
import { RiskBadge, RiskGauge } from "@/components/common/RiskGauge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMonitoring } from "@/context/MonitoringContext";
import { getMunicipality, getNeighborhood, getSensorMeta } from "@/data/regions";
import { assessRisk } from "@/lib/ai";
import { STATUS_BY_LEVEL } from "@/lib/decision";

/**
 * Painel lateral do mapa: substitui os popups pequenos por uma visão completa
 * do bairro (status, sensores, gráfico, histórico, eventos e ações da IA).
 */
export function NeighborhoodSheet({
  neighborhoodId,
  onOpenChange,
}: {
  neighborhoodId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { sensors, alerts, timeline } = useMonitoring();
  const neighborhood = neighborhoodId ? getNeighborhood(neighborhoodId) : undefined;
  const scoped = sensors.filter((s) => s.neighborhoodId === neighborhoodId);
  const risk = assessRisk(scoped);
  const localAlerts = alerts.filter((a) => a.neighborhoodId === neighborhoodId).slice(0, 6);
  const events = timeline.filter((t) => t.neighborhoodId === neighborhoodId);
  const lastUpdate = scoped.reduce((a, s) => Math.max(a, s.lastUpdate), 0);

  return (
    <Sheet open={Boolean(neighborhoodId && neighborhood)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {neighborhood && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="font-display text-lg">{neighborhood.name}</SheetTitle>
              <SheetDescription>
                {getMunicipality(neighborhood.municipalityId)?.name} ·{" "}
                {neighborhood.households.toLocaleString("pt-BR")} domicílios
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-8">
              <div className="flex flex-wrap items-center gap-2">
                <RiskBadge level={risk.level} />
                <Badge variant="outline" className="border-border/70">
                  Status: {STATUS_BY_LEVEL[risk.level]}
                </Badge>
                <Badge variant="outline" className="border-border/70">
                  Probabilidade 24h: {risk.probability24h}%
                </Badge>
                <Badge variant="outline" className="border-border/70">
                  Atualizado {lastUpdate ? new Date(lastUpdate).toLocaleTimeString("pt-BR") : "—"}
                </Badge>
              </div>

              <div className="flex justify-center">
                <RiskGauge score={risk.score} size={160} label="Índice de risco" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {scoped.map((s) => (
                  <div key={s.id} className="rounded-lg border border-border/50 bg-secondary/20 p-2">
                    <p className="truncate text-[11px] text-muted-foreground">{getSensorMeta(s.type).label}</p>
                    <p className="value-tick font-display text-sm font-semibold tabular-nums" key={s.value}>
                      {s.value} <span className="text-xs font-normal text-muted-foreground">{s.unit}</span>
                    </p>
                  </div>
                ))}
              </div>

              <MultiSensorChart sensors={scoped} period="24h" />

              <ForecastPanel risk={risk} sensors={scoped} />
              <AiAnalysisPanel sensors={scoped} risk={risk} scopeLabel={neighborhood.name} />
              <RecommendedActionsPanel risk={risk} />
              <EventTimeline items={events} title="Eventos do bairro" max={8} />

              <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
                <p className="mb-2 text-sm font-medium">Histórico de alertas</p>
                {localAlerts.length ? (
                  <ul className="space-y-2">
                    {localAlerts.map((a) => (
                      <li key={a.id} className="text-xs text-muted-foreground">
                        <span className="tabular-nums">{new Date(a.createdAt).toLocaleString("pt-BR")}</span> ·{" "}
                        {a.description}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum alerta registrado para este bairro.</p>
                )}
              </div>

              <Button asChild className="w-full">
                <Link to="/localidades/$neighborhoodId" params={{ neighborhoodId: neighborhood.id }}>
                  Abrir página completa da localidade
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
