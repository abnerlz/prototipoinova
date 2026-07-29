import { createFileRoute, Link } from "@tanstack/react-router";

import { FilterBar } from "@/components/dashboard/FilterBar";
import { ScopeDashboard } from "@/components/dashboard/ScopeDashboard";
import { getMunicipality, getNeighborhood } from "@/data/regions";

export const Route = createFileRoute("/bairros/$neighborhoodId")({
  head: () => ({
    meta: [
      { title: "Dashboard do Bairro — GeoAlerta RMR" },
      { name: "description", content: "Mapa, sensores, histórico e previsão da IA para o bairro monitorado." },
      { property: "og:title", content: "Dashboard do Bairro — GeoAlerta RMR" },
      { property: "og:description", content: "Detalhamento de risco por bairro na RMR." },
    ],
  }),
  component: BairroPage,
});

function BairroPage() {
  const { neighborhoodId } = Route.useParams();
  const neighborhood = getNeighborhood(neighborhoodId);
  if (!neighborhood) return <p className="text-sm text-muted-foreground">Bairro não encontrado.</p>;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/bairros" className="text-xs text-muted-foreground hover:text-primary">← Bairros</Link>
        <h1 className="font-display text-xl font-bold">{neighborhood.name}</h1>
        <span className="text-sm text-muted-foreground">{getMunicipality(neighborhood.municipalityId)?.name}</span>
      </div>
      <FilterBar />
      <ScopeDashboard municipalityId={neighborhood.municipalityId} neighborhoodId={neighborhoodId} />
    </>
  );
}
