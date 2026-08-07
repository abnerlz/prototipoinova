import { motion } from "framer-motion";
import { Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RISK_TOKEN } from "@/lib/ai";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types";

export interface TimelineItem {
  id: string;
  timestamp: number;
  message: string;
  level: RiskLevel;
}

const time = (ts: number) =>
  new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Linha do tempo de eventos operacionais detectados automaticamente. */
export function EventTimeline({
  items,
  title = "Linha do tempo",
  emptyLabel = "Nenhum evento relevante registrado — monitoramento em condição normal.",
  max = 20,
}: {
  items: TimelineItem[];
  title?: string;
  emptyLabel?: string;
  max?: number;
}) {
  const list = items.slice(0, max);

  return (
    <Card className="glass border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {list.length ? (
          <ol className="relative space-y-3 border-l border-border/60 pl-4">
            {list.map((item) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className="relative"
              >
                <span
                  className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-background"
                  style={{ background: `var(--${RISK_TOKEN[item.level]})` }}
                />
                <p className="font-display text-xs tabular-nums text-muted-foreground">{time(item.timestamp)}</p>
                <p className={cn("text-sm", item.level === "critico" && "font-medium text-risk-critical")}>
                  {item.message}
                </p>
              </motion.li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}
