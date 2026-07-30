import { createFileRoute } from "@tanstack/react-router";

import { FilterBar } from "@/components/dashboard/FilterBar";
import { ScopeDashboard } from "@/components/dashboard/ScopeDashboard";
import { SimulationControl } from "@/components/simulation/SimulationControl";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel Geral — GeoAlerta RMR" },
      { name: "description", content: "Índice de risco, sensores e previsão de deslizamentos em tempo real na Região Metropolitana do Recife." },
      { property: "og:title", content: "Painel Geral — GeoAlerta RMR" },
      { property: "og:description", content: "Monitoramento inteligente de encostas com IA preditiva." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold">Dashboard da Região Metropolitana</h1>
      </div>
      <SimulationControl />
      <FilterBar />
      <ScopeDashboard />
    </>
  );
}

