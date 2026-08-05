import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { DecisionPanel } from "@/components/decision/DecisionPanel";
import { RiskBadge } from "@/components/common/RiskGauge";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMonitoring } from "@/context/MonitoringContext";
import { NEIGHBORHOODS, getMunicipality } from "@/data/regions";
import { assessRisk } from "@/lib/ai";
import {
  PRIORITY_DOT,
  PRIORITY_LABEL,
  STATUS_BY_LEVEL,
  buildDecisionSupport,
} from "@/lib/decision";

export const Route = createFileRoute("/apoio-decisao")({
  head: () => ({
    meta: [
      { title: "Apoio à Decisão — GeoAlerta RMR" },
      { name: "description", content: "Recomendações operacionais priorizadas para gestores: vistoria, monitoramento, alerta preventivo, interdição e evacuação." },
      { property: "og:title", content: "Apoio à Decisão — GeoAlerta RMR" },
      { property: "og:description", content: "Sistema inteligente de apoio à decisão da Defesa Civil na RMR." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApoioDecisaoPage,
});

function ApoioDecisaoPage() {
  const { sensors, alerts, filters, sensorsIn } = useMonitoring();
  const municipalityId = filters.municipalityId === "all" ? undefined : filters.municipalityId;
  const neighborhoodId = filters.neighborhoodId === "all" ? undefined : filters.neighborhoodId;

  const scoped = sensorsIn(municipalityId, neighborhoodId);
  const scopeRisk = assessRisk(scoped);
  const scopeLabel = neighborhoodId
    ? NEIGHBORHOODS.find((n) => n.id === neighborhoodId)?.name ?? "Escopo atual"
    : municipalityId
      ? getMunicipality(municipalityId)?.name ?? "Escopo atual"
      : "Região Metropolitana do Recife";

  const scopedAlerts = alerts.filter(
    (a) =>
      (!municipalityId || a.municipalityId === municipalityId) &&
      (!neighborhoodId || a.neighborhoodId === neighborhoodId),
  );

  const byNeighborhood = NEIGHBORHOODS.map((n) => {
    const local = sensors.filter((s) => s.neighborhoodId === n.id);
    const risk = assessRisk(local);
    const decision = buildDecisionSupport({
      sensors: local,
      risk,
      alerts: alerts.filter((a) => a.neighborhoodId === n.id),
      scopeLabel: n.name,
      households: n.households,
    });
    return { n, risk, decision };
  }).sort((a, b) => b.risk.score - a.risk.score);

  const urgent = byNeighborhood.filter((r) => r.decision.topPriority === "critica" || r.decision.topPriority === "alta");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display flex items-center gap-2 text-xl font-bold">
          <ShieldAlert className="h-5 w-5 text-primary" /> Apoio à Decisão
        </h1>
        <Badge variant="outline" className="border-primary/40 text-primary">
          {urgent.length} localidade(s) exigindo ação prioritária
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Recomendações geradas automaticamente a partir da chuva acumulada, leituras dos sensores,
        histórico de alertas e índice de risco da região. Uso exclusivo de gestores.
      </p>

      <FilterBar />

      <DecisionPanel sensors={scoped} risk={scopeRisk} alerts={scopedAlerts} scopeLabel={scopeLabel} />

      <Card className="glass border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Painel de ações por localidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {byNeighborhood.map(({ n, risk, decision }) => {
            const top = decision.recommendations[0];
            return (
              <Link
                key={n.id}
                to="/localidades/$neighborhoodId"
                params={{ neighborhoodId: n.id }}
                className="block rounded-xl border border-border/50 bg-secondary/20 p-3 transition-colors hover:bg-secondary/35"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span aria-hidden>{PRIORITY_DOT[decision.topPriority]}</span>
                  <p className="font-display min-w-0 flex-1 truncate text-sm font-semibold">
                    {n.name}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      · {getMunicipality(n.municipalityId)?.name}
                    </span>
                  </p>
                  <Badge variant="outline" className="border-border/70 text-[11px]">
                    {STATUS_BY_LEVEL[risk.level]}
                  </Badge>
                  <Badge variant="outline" className="border-border/70 text-[11px]">
                    Prioridade {PRIORITY_LABEL[decision.topPriority]}
                  </Badge>
                  <RiskBadge level={risk.level} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <strong className="text-foreground">{top?.action}</strong> — {top?.rationale}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Chuva 24h: {decision.rainfall} mm · Índice {risk.score} · Prob. {risk.probability24h}% ·{" "}
                  {decision.recentAlerts} alerta(s) em 7 dias
                </p>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}
