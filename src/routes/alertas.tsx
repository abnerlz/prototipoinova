import { createFileRoute } from "@tanstack/react-router";

import { RiskBadge } from "@/components/common/RiskGauge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { useMonitoring } from "@/context/MonitoringContext";
import { getMunicipality, getNeighborhood } from "@/data/regions";
import { downloadCsv } from "@/lib/export";
import type { Alert } from "@/types";

export const Route = createFileRoute("/alertas")({
  head: () => ({
    meta: [
      { title: "Alertas — GeoAlerta RMR" },
      { name: "description", content: "Alertas ativos e encerrados de risco de deslizamento com sensores responsáveis e exportação." },
      { property: "og:title", content: "Alertas — GeoAlerta RMR" },
      { property: "og:description", content: "Gestão de alertas da Defesa Civil na RMR." },
    ],
  }),
  component: AlertasPage,
});

function AlertList({ items, onClose }: { items: Alert[]; onClose?: (id: string) => void }) {
  const { sensors } = useMonitoring();
  if (!items.length) return <p className="py-8 text-center text-sm text-muted-foreground">Nenhum alerta neste grupo.</p>;
  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div key={a.id} className="glass rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-display font-semibold">
                {getNeighborhood(a.neighborhoodId)?.name} · {getMunicipality(a.municipalityId)?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(a.createdAt).toLocaleDateString("pt-BR")} às {new Date(a.createdAt).toLocaleTimeString("pt-BR")} · origem {a.origin === "ia" ? "IA" : "manual"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <RiskBadge level={a.level} />
              {onClose && a.status === "ativo" ? (
                <Button size="sm" variant="outline" onClick={() => onClose(a.id)}>Encerrar</Button>
              ) : null}
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{a.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Sensores responsáveis: {a.sensorIds.map((id) => sensors.find((s) => s.id === id)?.code).filter(Boolean).join(", ") || "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

function AlertasPage() {
  const { alerts, closeAlert, filters } = useMonitoring();
  const filtered = alerts.filter(
    (a) =>
      (filters.municipalityId === "all" || a.municipalityId === filters.municipalityId) &&
      (filters.neighborhoodId === "all" || a.neighborhoodId === filters.neighborhoodId),
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold">Central de alertas</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              "alertas.csv",
              filtered.map((a) => ({
                municipio: getMunicipality(a.municipalityId)?.name ?? "",
                bairro: getNeighborhood(a.neighborhoodId)?.name ?? "",
                nivel: a.level,
                status: a.status,
                data: new Date(a.createdAt).toLocaleString("pt-BR"),
                motivo: a.description,
              })),
            )
          }
        >
          Exportar CSV
        </Button>
      </div>
      <FilterBar />
      <Card className="glass border-border/60">
        <CardHeader className="pb-2"><CardTitle className="text-base">Alertas ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="ativos">
            <TabsList>
              <TabsTrigger value="ativos">Ativos</TabsTrigger>
              <TabsTrigger value="encerrados">Encerrados</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>
            <TabsContent value="ativos" className="mt-4">
              <AlertList items={filtered.filter((a) => a.status === "ativo")} onClose={closeAlert} />
            </TabsContent>
            <TabsContent value="encerrados" className="mt-4">
              <AlertList items={filtered.filter((a) => a.status === "encerrado")} />
            </TabsContent>
            <TabsContent value="historico" className="mt-4">
              <AlertList items={filtered} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
