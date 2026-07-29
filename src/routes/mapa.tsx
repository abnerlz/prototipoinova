import { createFileRoute } from "@tanstack/react-router";

import { FilterBar } from "@/components/dashboard/FilterBar";
import { MapPanel } from "@/components/map/MapPanel";
import { useMonitoring } from "@/context/MonitoringContext";

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa Operacional — GeoAlerta RMR" },
      { name: "description", content: "Mapa interativo com drill-down de municípios, bairros e sensores por nível de risco." },
      { property: "og:title", content: "Mapa Operacional — GeoAlerta RMR" },
      { property: "og:description", content: "Visualize encostas monitoradas e sensores em tempo real." },
    ],
  }),
  component: MapaPage,
});

function MapaPage() {
  const { filters } = useMonitoring();
  return (
    <>
      <h1 className="font-display text-xl font-bold">Mapa operacional</h1>
      <FilterBar />
      <MapPanel
        municipalityId={filters.municipalityId === "all" ? undefined : filters.municipalityId}
        neighborhoodId={filters.neighborhoodId === "all" ? undefined : filters.neighborhoodId}
        height="calc(100vh - 220px)"
      />
      <p className="text-xs text-muted-foreground">
        Clique em um município para aproximar e ver bairros; clique em um bairro para ver sensores.
      </p>
    </>
  );
}
