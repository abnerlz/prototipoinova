import { lazy, Suspense } from "react";

import { ClientOnly } from "@/components/common/ClientOnly";

const RiskMap = lazy(() => import("./RiskMap"));

function MapSkeleton({ height }: { height: string }) {
  return (
    <div
      className="grid-scan flex items-center justify-center rounded-xl border border-border/60 bg-secondary/20 text-sm text-muted-foreground"
      style={{ height }}
    >
      Carregando mapa operacional…
    </div>
  );
}

/** Wrapper client-only do mapa (Leaflet não pode ser renderizado no servidor). */
export function MapPanel({
  municipalityId,
  neighborhoodId,
  height = "520px",
  interactive = true,
}: {
  municipalityId?: string;
  neighborhoodId?: string;
  height?: string;
  interactive?: boolean;
}) {
  return (
    <ClientOnly fallback={<MapSkeleton height={height} />}>
      <Suspense fallback={<MapSkeleton height={height} />}>
        <RiskMap
          municipalityId={municipalityId}
          neighborhoodId={neighborhoodId}
          height={height}
          interactive={interactive}
        />
      </Suspense>
    </ClientOnly>
  );
}
