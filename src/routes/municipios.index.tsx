import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

import { RiskBadge } from "@/components/common/RiskGauge";
import { useMonitoring } from "@/context/MonitoringContext";
import { MUNICIPALITIES, NEIGHBORHOODS } from "@/data/regions";
import { assessRisk } from "@/lib/ai";

export const Route = createFileRoute("/municipios/")({
  head: () => ({
    meta: [
      { title: "Municípios Monitorados — GeoAlerta RMR" },
      { name: "description", content: "Índice de risco consolidado dos 10 municípios monitorados da Região Metropolitana do Recife." },
      { property: "og:title", content: "Municípios Monitorados — GeoAlerta RMR" },
      { property: "og:description", content: "Compare o risco de deslizamento entre municípios da RMR." },
    ],
  }),
  component: MunicipiosPage,
});

function MunicipiosPage() {
  const { sensors } = useMonitoring();
  return (
    <>
      <h1 className="font-display text-xl font-bold">Municípios monitorados</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MUNICIPALITIES.map((m, i) => {
          const scoped = sensors.filter((s) => s.municipalityId === m.id);
          const risk = assessRisk(scoped);
          return (
            <Link key={m.id} to="/municipios/$municipalityId" params={{ municipalityId: m.id }}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ y: -3 }}
                className="glass h-full rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display font-semibold">{m.name}</p>
                  <RiskBadge level={risk.level} />
                </div>
                <p className="font-display mt-3 text-3xl font-bold tabular-nums">{risk.score}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {NEIGHBORHOODS.filter((n) => n.municipalityId === m.id).length} bairros · {scoped.length} sensores
                </p>
                <p className="text-xs text-muted-foreground">
                  População: {m.population.toLocaleString("pt-BR")} · {risk.probability24h}% em 24h
                </p>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
