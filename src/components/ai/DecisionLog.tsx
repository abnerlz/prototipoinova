import { motion } from "framer-motion";
import { ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMunicipality, getNeighborhood } from "@/data/regions";
import { RISK_LABEL, RISK_TOKEN } from "@/lib/ai";
import { cn } from "@/lib/utils";
import type { TimelineEvent } from "@/context/MonitoringContext";

const stamp = (ts: number) =>
  new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Registro automático das decisões tomadas pela IA (última etapa do fluxo). */
export function DecisionLog({ events, max = 12 }: { events: TimelineEvent[]; max?: number }) {
  const list = events.slice(0, max);

  return (
    <Card className="glass border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="h-4 w-4 text-primary" /> Registro de decisões
        </CardTitle>
        <Badge variant="outline" className="border-border/70">{events.length} registros</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {list.length ? (
          list.map((event) => {
            const neighborhood = getNeighborhood(event.neighborhoodId);
            const municipality = getMunicipality(event.municipalityId);
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/20 p-2.5"
              >
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: `var(--${RISK_TOKEN[event.level]})` }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {stamp(event.timestamp)} · {neighborhood?.name ?? "—"}
                    {municipality ? ` · ${municipality.name}` : ""}
                  </p>
                  <p className={cn("text-sm", event.level === "critico" && "font-medium text-risk-critical")}>
                    {event.message}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 border-border/70 text-[11px] capitalize">
                  {RISK_LABEL[event.level]}
                </Badge>
              </motion.div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma decisão registrada — a IA mantém o monitoramento em condição normal.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
