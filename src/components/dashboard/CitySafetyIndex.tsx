import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMonitoring } from "@/context/MonitoringContext";
import { useHydrated } from "@/hooks/use-hydrated";
import { MUNICIPALITIES } from "@/data/regions";
import { RISK_COLOR, RISK_LABEL, assessRisk } from "@/lib/ai";
import type { RiskLevel } from "@/types";

const DOT: Record<RiskLevel, string> = {
  baixo: "🟢",
  moderado: "🟡",
  alto: "🟠",
  critico: "🔴",
};

/** Índice Geral de Segurança por cidade — atualizado a cada ciclo de leitura. */
export function CitySafetyIndex() {
  const { sensors, lastTick } = useMonitoring();
  const hydrated = useHydrated();

  const rows = MUNICIPALITIES.map((m) => {
    const scoped = sensors.filter((s) => s.municipalityId === m.id);
    return { municipality: m, risk: assessRisk(scoped), count: scoped.length };
  }).sort((a, b) => b.risk.score - a.risk.score);

  return (
    <Card className="glass border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" /> Índice Geral de Segurança
        </CardTitle>
        <span className="text-[11px] text-muted-foreground">
          Atualizado {hydrated ? new Date(lastTick).toLocaleTimeString("pt-BR") : "—"}
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(({ municipality, risk, count }) => (
          <Link
            key={municipality.id}
            to="/municipios/$municipalityId"
            params={{ municipalityId: municipality.id }}
            className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/20 p-2.5 transition-colors hover:bg-secondary/40"
          >
            <span className="text-base leading-none">{DOT[risk.level]}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {municipality.name}{" "}
                <span className="text-xs text-muted-foreground">· {count} sensores</span>
              </p>
              <Progress value={risk.score} className="mt-1 h-1.5" />
            </div>
            <motion.span
              key={risk.score}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              className="font-display tabular-nums text-sm font-semibold"
              style={{ color: RISK_COLOR[risk.level] }}
            >
              {Math.round(risk.score)}%
            </motion.span>
            <span className="hidden text-xs text-muted-foreground sm:inline">{RISK_LABEL[risk.level]}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
