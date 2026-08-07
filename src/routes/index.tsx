import { createFileRoute } from "@tanstack/react-router";

import { AiAnalysisPanel } from "@/components/ai/AiAnalysisPanel";
import { ForecastPanel } from "@/components/ai/ForecastPanel";
import { RecommendedActionsPanel } from "@/components/ai/RecommendedActionsPanel";
import { EventTimeline } from "@/components/common/EventTimeline";
import { CitySafetyIndex } from "@/components/dashboard/CitySafetyIndex";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { ScopeDashboard } from "@/components/dashboard/ScopeDashboard";
import { SimulationControl } from "@/components/simulation/SimulationControl";
import { useMonitoring } from "@/context/MonitoringContext";
import { getMunicipality, getNeighborhood } from "@/data/regions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel Geral — GeoAlerta RMR" },
      { name: "description", content: "Índice de risco, sensores e previsão de deslizamentos em tempo real na Região Metropolitana do Recife." },
      { property: "og:title", content: "Painel Geral — GeoAlerta RMR" },
      { property: "og:description", content: "Índice de risco, sensores e previsão de deslizamentos em tempo real na Região Metropolitana do Recife." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { filters, sensorsIn, riskFor, timeline } = useMonitoring();
  const municipalityId = filters.municipalityId === "all" ? undefined : filters.municipalityId;
  const neighborhoodId = filters.neighborhoodId === "all" ? undefined : filters.neighborhoodId;
  const scoped = sensorsIn(municipalityId, neighborhoodId);
  const risk = riskFor(municipalityId, neighborhoodId);

  const scopeLabel = neighborhoodId
    ? (getNeighborhood(neighborhoodId)?.name ?? "escopo selecionado")
    : municipalityId
      ? (getMunicipality(municipalityId)?.name ?? "escopo selecionado")
      : "Região Metropolitana do Recife";

  const events = timeline.filter(
    (t) =>
      (!municipalityId || t.municipalityId === municipalityId) &&
      (!neighborhoodId || t.neighborhoodId === neighborhoodId),
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold">Dashboard da Região Metropolitana</h1>
      </div>
      <SimulationControl />
      <FilterBar />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AiAnalysisPanel sensors={scoped} risk={risk} scopeLabel={scopeLabel} />
        </div>
        <div className="space-y-4">
          <ForecastPanel risk={risk} sensors={scoped} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <CitySafetyIndex />
        <RecommendedActionsPanel risk={risk} />
        <EventTimeline items={events} title="Linha do tempo operacional" />
      </div>

      <ScopeDashboard />
    </>
  );
}
