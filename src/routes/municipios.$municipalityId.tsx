import { createFileRoute, Link } from "@tanstack/react-router";

import { FilterBar } from "@/components/dashboard/FilterBar";
import { ScopeDashboard } from "@/components/dashboard/ScopeDashboard";
import { getMunicipality } from "@/data/regions";

export const Route = createFileRoute("/municipios/$municipalityId")({
  head: () => ({
    meta: [
      { title: "Dashboard do Município — GeoAlerta RMR" },
      { name: "description", content: "Índice de risco, sensores, alertas e bairro mais crítico do município monitorado." },
      { property: "og:title", content: "Dashboard do Município — GeoAlerta RMR" },
      { property: "og:description", content: "Dados de deslizamento por município da RMR." },
    ],
  }),
  component: MunicipioPage,
});

function MunicipioPage() {
  const { municipalityId } = Route.useParams();
  const municipality = getMunicipality(municipalityId);

  if (!municipality) {
    return <p className="text-sm text-muted-foreground">Município não encontrado.</p>;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/municipios" className="text-xs text-muted-foreground hover:text-primary">
          ← Municípios
        </Link>
        <h1 className="font-display text-xl font-bold">{municipality.name}</h1>
      </div>
      <FilterBar />
      <ScopeDashboard municipalityId={municipalityId} />
    </>
  );
}
