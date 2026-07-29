import { createFileRoute } from "@tanstack/react-router";

import { RiskBadge } from "@/components/common/RiskGauge";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMonitoring } from "@/context/MonitoringContext";
import { MUNICIPALITIES, NEIGHBORHOODS } from "@/data/regions";
import { assessRisk } from "@/lib/ai";
import { downloadCsv } from "@/lib/export";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — GeoAlerta RMR" },
      { name: "description", content: "Relatórios consolidados de risco, sensores e alertas por município e bairro, prontos para exportação." },
      { property: "og:title", content: "Relatórios — GeoAlerta RMR" },
      { property: "og:description", content: "Documentação operacional do monitoramento de encostas." },
    ],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { sensors, alerts } = useMonitoring();
  const rows = MUNICIPALITIES.map((m) => {
    const scoped = sensors.filter((s) => s.municipalityId === m.id);
    const risk = assessRisk(scoped);
    return {
      m,
      risk,
      sensores: scoped.length,
      online: scoped.filter((s) => s.status === "online").length,
      bairros: NEIGHBORHOODS.filter((n) => n.municipalityId === m.id).length,
      alertas: alerts.filter((a) => a.municipalityId === m.id).length,
    };
  }).sort((a, b) => b.risk.score - a.risk.score);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold">Relatórios operacionais</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              "relatorio-municipios.csv",
              rows.map((r) => ({
                municipio: r.m.name,
                indice: r.risk.score,
                nivel: r.risk.level,
                probabilidade24h: `${r.risk.probability24h}%`,
                bairros: r.bairros,
                sensores: r.sensores,
                online: r.online,
                alertas: r.alertas,
              })),
            )
          }
        >
          Exportar CSV
        </Button>
      </div>
      <FilterBar />
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.m.id} className="glass border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                {r.m.name} <RiskBadge level={r.risk.level} />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <Info label="Índice" value={r.risk.score} />
              <Info label="Prob. 24h" value={`${r.risk.probability24h}%`} />
              <Info label="Bairros" value={r.bairros} />
              <Info label="Sensores" value={r.sensores} />
              <Info label="Online" value={r.online} />
              <Info label="Alertas" value={r.alertas} />
              <p className="col-span-full text-xs text-muted-foreground">{r.risk.reasons[0]}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/50 bg-secondary/25 p-2">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
