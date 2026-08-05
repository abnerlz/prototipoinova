import type { Alert, RiskAssessment, Sensor } from "@/types";

import { motion } from "framer-motion";
import { CheckCircle2, ClipboardList, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PRIORITY_DOT,
  PRIORITY_LABEL,
  PRIORITY_TOKEN,
  buildDecisionSupport,
} from "@/lib/decision";
import { cn } from "@/lib/utils";

/** Painel reutilizável com as recomendações do módulo Apoio à Decisão. */
export function DecisionPanel({
  sensors,
  risk,
  alerts,
  scopeLabel,
  households,
  compact = false,
}: {
  sensors: Sensor[];
  risk: RiskAssessment;
  alerts: Alert[];
  scopeLabel: string;
  households?: number;
  compact?: boolean;
}) {
  const { recommendations, summary, rainfall, recentAlerts } = buildDecisionSupport({
    sensors,
    risk,
    alerts,
    scopeLabel,
    households,
  });

  return (
    <Card className="glass border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-primary" />
          Apoio à Decisão · {scopeLabel}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{summary}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {!compact && (
          <div className="mb-1 flex flex-wrap gap-2 text-[11px]">
            <Badge variant="outline" className="border-border/70">Chuva 24h: {rainfall} mm</Badge>
            <Badge variant="outline" className="border-border/70">Índice: {risk.score}</Badge>
            <Badge variant="outline" className="border-border/70">Prob. 24h: {risk.probability24h}%</Badge>
            <Badge variant="outline" className="border-border/70">Alertas 7d: {recentAlerts}</Badge>
          </div>
        )}

        {recommendations.map((rec, i) => (
          <motion.div
            key={rec.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-border/50 bg-secondary/20 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span aria-hidden>{PRIORITY_DOT[rec.priority]}</span>
              <p className="font-display min-w-0 flex-1 text-sm font-semibold">{rec.action}</p>
              <Badge
                variant="outline"
                className={cn("shrink-0 text-[11px]")}
                style={{
                  borderColor: `var(--${PRIORITY_TOKEN[rec.priority]})`,
                  color: `var(--${PRIORITY_TOKEN[rec.priority]})`,
                }}
              >
                Prioridade {PRIORITY_LABEL[rec.priority]}
              </Badge>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{rec.rationale}</p>
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" /> Prazo sugerido: {rec.deadline}
            </p>
          </motion.div>
        ))}

        {recommendations.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-risk-low" /> Nenhuma ação necessária no momento.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
