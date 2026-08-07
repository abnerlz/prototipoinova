import { motion } from "framer-motion";
import { BrainCircuit, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { RiskBadge } from "@/components/common/RiskGauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMonitoring } from "@/context/MonitoringContext";
import { aiConfidence, buildPipeline, explainClassification } from "@/lib/intelligence";
import { cn } from "@/lib/utils";
import type { RiskAssessment, Sensor } from "@/types";

/**
 * Painel "Análise Inteligente": expõe o processo de decisão da IA passo a
 * passo, com animação de processamento contínuo e nível de confiança.
 */
export function AiAnalysisPanel({
  sensors,
  risk,
  scopeLabel,
}: {
  sensors: Sensor[];
  risk: RiskAssessment;
  scopeLabel: string;
}) {
  const { lastTick } = useMonitoring();
  const confidence = aiConfidence(sensors, risk);
  const steps = buildPipeline(sensors, risk, confidence);
  const [cursor, setCursor] = useState(steps.length - 1);

  // A cada ciclo de leitura a IA "reprocessa" a cadeia de análise.
  useEffect(() => {
    setCursor(0);
    const id = window.setInterval(() => {
      setCursor((c) => (c >= steps.length - 1 ? c : c + 1));
    }, 320);
    return () => window.clearInterval(id);
  }, [lastTick, steps.length]);

  const analyzing = cursor < steps.length - 1;

  return (
    <Card className="glass border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
            <BrainCircuit className="h-4 w-4" />
            {analyzing && (
              <motion.span
                className="absolute inset-0 rounded-lg border border-primary/50"
                animate={{ opacity: [0.15, 0.7, 0.15], scale: [1, 1.12, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            )}
          </span>
          Análise Inteligente
        </CardTitle>
        <RiskBadge level={risk.level} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Check className="h-3.5 w-3.5 text-risk-low" />}
          {analyzing ? `Processando dados de ${scopeLabel}…` : `Análise concluída para ${scopeLabel}.`}
        </div>

        <ol className="space-y-1.5">
          {steps.map((step, index) => {
            const done = index < cursor;
            const active = index === cursor;
            return (
              <motion.li
                key={step.key}
                initial={false}
                animate={{ opacity: index <= cursor ? 1 : 0.35 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border p-2 text-xs",
                  active
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/50 bg-secondary/20",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                    done || (!analyzing && index === steps.length - 1)
                      ? "bg-risk-low/20 text-risk-low"
                      : active
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {done || (!analyzing && index === steps.length - 1) ? "✓" : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">{step.label}</span>
                  <span className="block text-muted-foreground">{step.detail}</span>
                </span>
              </motion.li>
            );
          })}
        </ol>

        <div>
          <p className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Confiança da IA</span>
            <motion.span
              key={confidence}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              className="font-display tabular-nums font-semibold"
            >
              {confidence}%
            </motion.span>
          </p>
          <Progress value={confidence} className="h-1.5" />
        </div>

        <p className="rounded-lg border border-border/50 bg-secondary/25 p-3 text-sm text-muted-foreground">
          {explainClassification(risk, sensors)}
        </p>
      </CardContent>
    </Card>
  );
}
