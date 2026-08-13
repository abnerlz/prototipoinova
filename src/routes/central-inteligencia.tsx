import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { AiAnalysisPanel } from "@/components/ai/AiAnalysisPanel";
import { AiProcessingStrip } from "@/components/ai/AiProcessingStrip";
import { DecisionLog } from "@/components/ai/DecisionLog";
import { ForecastPanel } from "@/components/ai/ForecastPanel";
import { RecommendedActionsPanel } from "@/components/ai/RecommendedActionsPanel";
import { RiskBadge, RiskGauge } from "@/components/common/RiskGauge";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMonitoring } from "@/context/MonitoringContext";
import { NEIGHBORHOODS, getMunicipality } from "@/data/regions";
import { assessRisk } from "@/lib/ai";
import { aiConfidence, explainClassification } from "@/lib/intelligence";

export const Route = createFileRoute("/central-inteligencia")({
  head: () => ({
    meta: [
      { title: "Central de Inteligência — GeoAlerta RMR" },
      {
        name: "description",
        content:
          "Centro inteligente de operações: fluxo de análise da IA, confiança do modelo, classificação explicada por bairro e registro automático de decisões.",
      },
      { property: "og:title", content: "Central de Inteligência — GeoAlerta RMR" },
      {
        property: "og:description",
        content: "Fluxo completo da IA: validação, tendências, probabilidade, risco e recomendações.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntelligenceCenterPage,
});

function IntelligenceCenterPage() {
  const { filters, sensorsIn, sensors, timeline, lastTick } = useMonitoring();

  const scoped = sensorsIn(filters.municipalityId, filters.neighborhoodId, filters.sensorType);
  const risk = assessRisk(scoped);
  const confidence = aiConfidence(scoped, risk);

  const scopeLabel =
    filters.neighborhoodId !== "all"
      ? (NEIGHBORHOODS.find((n) => n.id === filters.neighborhoodId)?.name ?? "escopo selecionado")
      : filters.municipalityId !== "all"
        ? (getMunicipality(filters.municipalityId)?.name ?? "escopo selecionado")
        : "Região Metropolitana do Recife";

  // Contador de ciclos analisados desde a abertura da central.
  const [cycles, setCycles] = useState(0);
  const seen = useRef(0);
  useEffect(() => {
    if (seen.current !== lastTick) {
      seen.current = lastTick;
      setCycles((c) => c + 1);
    }
  }, [lastTick]);

  // Classificação explicada de cada bairro, ordenada pelo risco.
  const classifications = useMemo(
    () =>
      NEIGHBORHOODS.map((n) => {
        const local = sensors.filter((s) => s.neighborhoodId === n.id);
        const localRisk = assessRisk(local);
        return {
          neighborhood: n,
          risk: localRisk,
          explanation: explainClassification(localRisk, local),
        };
      }).sort((a, b) => b.risk.score - a.risk.score),
    [sensors],
  );

  return (
    <>
      <div>
        <h1 className="font-display text-xl font-bold">Central de Inteligência</h1>
        <p className="text-sm text-muted-foreground">
          A IA recebe, valida, correlaciona e decide continuamente sobre todos os sensores em conjunto.
        </p>
      </div>

      <AiProcessingStrip
        confidence={confidence}
        scopeLabel={scopeLabel}
        sensorsOnline={scoped.filter((s) => s.status === "online").length}
        cycles={cycles}
      />

      <FilterBar />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AiAnalysisPanel sensors={scoped} risk={risk} scopeLabel={scopeLabel} />
        </div>
        <div className="space-y-4">
          <Card className="glass border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Decisão automática</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2">
              <RiskGauge score={risk.score} size={150} label="Índice combinado" />
              <RiskBadge level={risk.level} />
              <p className="text-center text-xs text-muted-foreground">
                Probabilidade em 24h: <strong className="text-foreground">{risk.probability24h}%</strong> · tendência{" "}
                {risk.trend}
              </p>
            </CardContent>
          </Card>
          <ForecastPanel risk={risk} sensors={scoped} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <RecommendedActionsPanel risk={risk} />
        <DecisionLog events={timeline} />
      </div>

      <Card className="glass border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Classificação explicada por bairro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {classifications.map(({ neighborhood, risk: localRisk, explanation }) => (
            <Link
              key={neighborhood.id}
              to="/localidades/$neighborhoodId"
              params={{ neighborhoodId: neighborhood.id }}
              className="block rounded-lg border border-border/50 bg-secondary/20 p-3 transition-colors hover:border-primary/40 hover:bg-secondary/40"
            >
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                  {neighborhood.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    · {getMunicipality(neighborhood.municipalityId)?.name}
                  </span>
                </p>
                <span className="font-display tabular-nums text-sm">{localRisk.score}</span>
                <RiskBadge level={localRisk.level} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{explanation}</p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
