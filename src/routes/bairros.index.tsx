import { createFileRoute, Link } from "@tanstack/react-router";

import { RiskBadge } from "@/components/common/RiskGauge";
import { useMonitoring } from "@/context/MonitoringContext";
import { NEIGHBORHOODS, getMunicipality } from "@/data/regions";
import { assessRisk } from "@/lib/ai";

export const Route = createFileRoute("/bairros/")({
  head: () => ({
    meta: [
      { title: "Bairros em Risco — GeoAlerta RMR" },
      { name: "description", content: "Lista de bairros monitorados com índice de risco de deslizamento em tempo real." },
      { property: "og:title", content: "Bairros em Risco — GeoAlerta RMR" },
      { property: "og:description", content: "Ranking de bairros por risco geológico na RMR." },
    ],
  }),
  component: BairrosPage,
});

function BairrosPage() {
  const { sensors } = useMonitoring();
  const rows = NEIGHBORHOODS.map((n) => ({
    n,
    risk: assessRisk(sensors.filter((s) => s.neighborhoodId === n.id)),
  })).sort((a, b) => b.risk.score - a.risk.score);

  return (
    <>
      <h1 className="font-display text-xl font-bold">Bairros monitorados</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map(({ n, risk }) => (
          <Link key={n.id} to="/bairros/$neighborhoodId" params={{ neighborhoodId: n.id }}>
            <div className="glass h-full rounded-xl p-4 transition-transform hover:-translate-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display truncate font-semibold">{n.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{getMunicipality(n.municipalityId)?.name}</p>
                </div>
                <RiskBadge level={risk.level} />
              </div>
              <p className="font-display mt-3 text-2xl font-bold tabular-nums">{risk.score}</p>
              <p className="text-xs text-muted-foreground">
                {n.households.toLocaleString("pt-BR")} domicílios · {risk.probability24h}% em 24h
              </p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
