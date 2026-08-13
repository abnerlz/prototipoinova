import { motion } from "framer-motion";
import { Activity, BrainCircuit, Gauge, Radar } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

/**
 * Faixa superior da Central de Inteligência: mostra que a IA processa dados
 * continuamente (animação discreta) e o nível de confiança do modelo.
 */
export function AiProcessingStrip({
  confidence,
  scopeLabel,
  sensorsOnline,
  cycles,
}: {
  confidence: number;
  scopeLabel: string;
  sensorsOnline: number;
  cycles: number;
}) {
  return (
    <Card className="glass border-primary/30">
      <CardContent className="flex flex-wrap items-center gap-4 p-4">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <BrainCircuit className="h-5 w-5" />
          <motion.span
            className="absolute inset-0 rounded-xl border border-primary/50"
            animate={{ opacity: [0.15, 0.65, 0.15], scale: [1, 1.14, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>

        <div className="min-w-[12rem] flex-1">
          <p className="font-display text-sm font-semibold">Motor de inteligência ativo</p>
          <p className="text-xs text-muted-foreground">
            Processando {sensorsOnline} fluxos de sensores · {scopeLabel}
          </p>
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 18 }).map((_, i) => (
              <motion.span
                key={i}
                className="h-3 w-1 rounded-full bg-primary/60"
                animate={{ scaleY: [0.35, 1, 0.35], opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.06, ease: "easeInOut" }}
              />
            ))}
          </div>
        </div>

        <div className="min-w-[11rem] flex-1">
          <p className="mb-1 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Gauge className="h-3.5 w-3.5" /> Confiança da IA
            </span>
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
          <p className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Radar className="h-3 w-3" /> {cycles} ciclos analisados
            </span>
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" /> leitura contínua
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
