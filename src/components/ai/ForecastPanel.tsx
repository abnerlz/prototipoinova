import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

import { RiskBadge } from "@/components/common/RiskGauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DIRECTION_ICON, DIRECTION_LABEL, shortTermForecast } from "@/lib/intelligence";
import type { RiskAssessment, Sensor } from "@/types";

/** Painel "Previsão Inteligente": risco atual + horizontes de 30min, 1h e 6h. */
export function ForecastPanel({ risk, sensors }: { risk: RiskAssessment; sensors: Sensor[] }) {
  const points = shortTermForecast(risk, sensors);

  return (
    <Card className="glass border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-primary" /> Previsão Inteligente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Risco atual</p>
            <Progress value={risk.score} className="mt-1 h-1.5" />
          </div>
          <span className="font-display tabular-nums text-lg font-bold">{risk.score}</span>
          <RiskBadge level={risk.level} />
        </div>

        {points.map((p, i) => (
          <motion.div
            key={p.horizon}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/20 p-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                Previsão para {p.horizon} · {DIRECTION_ICON[p.direction]} {DIRECTION_LABEL[p.direction]}
              </p>
              <Progress value={p.score} className="mt-1 h-1.5" />
            </div>
            <span className="font-display tabular-nums text-sm font-semibold">{p.score}</span>
            <RiskBadge level={p.level} />
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
