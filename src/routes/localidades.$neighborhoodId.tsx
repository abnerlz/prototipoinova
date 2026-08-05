import { createFileRoute, Link } from "@tanstack/react-router";

import { DecisionPanel } from "@/components/decision/DecisionPanel";
import { ScopeDashboard } from "@/components/dashboard/ScopeDashboard";
import { RiskBadge } from "@/components/common/RiskGauge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMonitoring } from "@/context/MonitoringContext";
import { getMunicipality, getNeighborhood } from "@/data/regions";
import { teamsFor } from "@/data/teams";
import { RISK_LABEL, assessRisk } from "@/lib/ai";
import { STATUS_BY_LEVEL, rainfall24h } from "@/lib/decision";

export const Route = createFileRoute("/localidades/$neighborhoodId")({
  head: () => ({
    meta: [
      { title: "Detalhe da Localidade — GeoAlerta RMR" },
      { name: "description", content: "Mapa, sensores, índice pluviométrico, histórico de alertas, equipes responsáveis e recomendações de apoio à decisão." },
      { property: "og:title", content: "Detalhe da Localidade — GeoAlerta RMR" },
      { property: "og:description", content: "Panorama operacional completo da localidade monitorada." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LocalidadePage,
});

function LocalidadePage() {
  const { neighborhoodId } = Route.useParams();
  const { sensors, alerts } = useMonitoring();
  const neighborhood = getNeighborhood(neighborhoodId);

  if (!neighborhood) {
    return <p className="text-sm text-muted-foreground">Localidade não encontrada.</p>;
  }

  const municipality = getMunicipality(neighborhood.municipalityId);
  const scoped = sensors.filter((s) => s.neighborhoodId === neighborhood.id);
  const risk = assessRisk(scoped);
  const localAlerts = alerts
    .filter((a) => a.neighborhoodId === neighborhood.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8);
  const rain = rainfall24h(scoped);
  const rain1h = scoped
    .filter((s) => s.type === "pluviosidade")
    .reduce((a, s, _, arr) => a + s.value / arr.length, 0);
  const teams = teamsFor(neighborhood.municipalityId);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/localidades" className="text-xs text-muted-foreground hover:text-primary">
          ← Localidades
        </Link>
        <h1 className="font-display text-xl font-bold">{neighborhood.name}</h1>
        <span className="text-sm text-muted-foreground">{municipality?.name} · PE</span>
        <RiskBadge level={risk.level} />
        <Badge variant="outline" className="border-border/70">Status: {STATUS_BY_LEVEL[risk.level]}</Badge>
      </div>

      <ScopeDashboard municipalityId={neighborhood.municipalityId} neighborhoodId={neighborhood.id} />

      <div className="grid gap-4 xl:grid-cols-2">
        <DecisionPanel
          sensors={scoped}
          risk={risk}
          alerts={localAlerts}
          scopeLabel={neighborhood.name}
          households={neighborhood.households}
        />

        <div className="space-y-4">
          <Card className="glass border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-base">Índice pluviométrico</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
                <p className="font-display text-2xl font-bold tabular-nums">{rain1h.toFixed(1)}</p>
                <p className="text-[11px] text-muted-foreground">mm/h atual</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
                <p className="font-display text-2xl font-bold tabular-nums">{rain}</p>
                <p className="text-[11px] text-muted-foreground">mm em 24h</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
                <p className="font-display text-2xl font-bold tabular-nums">{risk.probability24h}%</p>
                <p className="text-[11px] text-muted-foreground">prob. de ocorrência</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-base">Histórico de alertas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {localAlerts.map((a) => (
                <div key={a.id} className="rounded-lg border border-border/50 bg-secondary/20 p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{RISK_LABEL[a.level]} · {a.origin === "ia" ? "IA" : "Manual"}</span>
                    <span className="text-muted-foreground">{new Date(a.createdAt).toLocaleString("pt-BR")}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{a.description}</p>
                </div>
              ))}
              {localAlerts.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum alerta registrado nesta localidade.</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-base">Equipes responsáveis</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {teams.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-secondary/20 p-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{t.role} · Base {t.base}</p>
                  </div>
                  <Badge variant="outline" className="border-border/70 text-[11px]">{t.contact}</Badge>
                  <Badge variant="outline" className="border-border/70 text-[11px]">
                    Aciona em risco {RISK_LABEL[t.activateAt].toLowerCase()}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
