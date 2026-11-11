import { createFileRoute } from "@tanstack/react-router";
import { Activity, AlertTriangle, ChevronDown, Cpu, Gauge, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { AiAnalysisPanel } from "@/components/ai/AiAnalysisPanel";
import { ForecastPanel } from "@/components/ai/ForecastPanel";
import { RecommendedActionsPanel } from "@/components/ai/RecommendedActionsPanel";
import { EventTimeline } from "@/components/common/EventTimeline";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { CitySafetyIndex } from "@/components/dashboard/CitySafetyIndex";
import { ScopeDashboard } from "@/components/dashboard/ScopeDashboard";
import { SimulationControl } from "@/components/simulation/SimulationControl";
import { Card, CardContent } from "@/components/ui/card";
import { useMonitoring } from "@/context/MonitoringContext";
import { getMunicipality, getNeighborhood } from "@/data/regions";
import { RISK_LABEL } from "@/lib/ai";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel Geral — GeoAlerta RMR" },
      { name: "description", content: "Resumo do monitoramento de sensores na Região Metropolitana do Recife." },
      { property: "og:title", content: "Painel Geral — GeoAlerta RMR" },
      { property: "og:description", content: "Resumo do monitoramento de sensores na Região Metropolitana do Recife." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { filters, sensorsIn, riskFor, timeline, alerts } = useMonitoring();
  const municipalityId = filters.municipalityId === "all" ? undefined : filters.municipalityId;
  const neighborhoodId = filters.neighborhoodId === "all" ? undefined : filters.neighborhoodId;
  const scoped = sensorsIn(municipalityId, neighborhoodId);
  const risk = riskFor(municipalityId, neighborhoodId);

  const scopeLabel = neighborhoodId
    ? (getNeighborhood(neighborhoodId)?.name ?? "área selecionada")
    : municipalityId
      ? (getMunicipality(municipalityId)?.name ?? "área selecionada")
      : "Região Metropolitana do Recife";

  const events = timeline.filter(
    (event) =>
      (!municipalityId || event.municipalityId === municipalityId) &&
      (!neighborhoodId || event.neighborhoodId === neighborhoodId),
  );
  const scopedAlerts = alerts.filter(
    (alert) =>
      (!municipalityId || alert.municipalityId === municipalityId) &&
      (!neighborhoodId || alert.neighborhoodId === neighborhoodId),
  );
  const onlineSensors = scoped.filter((sensor) => sensor.status === "online").length;
  const activeAlerts = scopedAlerts.filter((alert) => alert.status === "ativo").length;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Resumo do monitoramento · {scopeLabel}</p>
      </header>

      <SimulationControl />
      <FilterBar />

      <section aria-labelledby="summary-title" className="space-y-3">
        <h2 id="summary-title" className="font-display text-lg font-semibold">Resumo atual</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard
            icon={Gauge}
            label="Índice experimental"
            value={`${Math.round(risk.score)} / 100`}
            detail={`Nível ${RISK_LABEL[risk.level].toLocaleLowerCase("pt-BR")}`}
          />
          <SummaryCard
            icon={Cpu}
            label="Sensores online"
            value={`${onlineSensors} de ${scoped.length}`}
            detail="No filtro selecionado"
          />
          <SummaryCard
            icon={AlertTriangle}
            label="Alertas ativos"
            value={String(activeAlerts)}
            detail="No filtro selecionado"
          />
        </div>
      </section>

      <section aria-labelledby="details-title" className="space-y-3">
        <h2 id="details-title" className="font-display text-lg font-semibold">Detalhes do monitoramento</h2>
        <div className="space-y-3">
          <DetailsSection title="Análise e previsão" description="Leitura do cenário e projeções demonstrativas">
            <div className="grid gap-4 xl:grid-cols-2">
              <AiAnalysisPanel sensors={scoped} risk={risk} scopeLabel={scopeLabel} />
              <ForecastPanel risk={risk} sensors={scoped} />
            </div>
          </DetailsSection>

          <DetailsSection title="Segurança por município" description="Comparação dos níveis calculados para cada município">
            <div className="max-w-3xl">
              <CitySafetyIndex />
            </div>
          </DetailsSection>

          <DetailsSection title="Indicadores, gráficos e mapa" description="Dados detalhados, regiões e leituras dos sensores">
            <ScopeDashboard />
          </DetailsSection>

          <DetailsSection title="Recomendações e ocorrências" description="Ações sugeridas e eventos recentes">
            <div className="grid gap-4 xl:grid-cols-2">
              <RecommendedActionsPanel risk={risk} />
              <EventTimeline items={events} title="Linha do tempo operacional" />
            </div>
          </DetailsSection>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-display text-xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-xl border border-border/70 bg-card shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
        </span>
        <Activity aria-hidden="true" className="mr-1 hidden h-4 w-4 text-primary sm:block" />
        <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border/70 p-3 sm:p-4">{children}</div>
    </details>
  );
}
