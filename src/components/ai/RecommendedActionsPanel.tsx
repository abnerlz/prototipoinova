import { motion } from "framer-motion";
import { CheckCircle2, ClipboardList } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RiskAssessment, RiskLevel } from "@/types";

/**
 * Painel "Ações Recomendadas": lista objetiva de providências, liberada
 * progressivamente conforme o nível de risco avaliado pela IA.
 */
const ORDER: RiskLevel[] = ["baixo", "moderado", "alto", "critico"];

const ACTIONS: { action: string; from: RiskLevel; note: string }[] = [
  { action: "Intensificar monitoramento", from: "baixo", note: "Reduzir o intervalo de leitura dos sensores." },
  { action: "Enviar equipe técnica", from: "moderado", note: "Vistoria presencial de trincas, surgências e taludes." },
  { action: "Notificar Defesa Civil", from: "moderado", note: "Comunicar o plantão da COMDEC e registrar ocorrência." },
  { action: "Isolar área preventiva", from: "alto", note: "Restringir circulação nas cotas mais altas." },
  { action: "Emitir alerta para moradores", from: "alto", note: "Acionar sirenes, SMS e agentes comunitários." },
  { action: "Avaliar evacuação", from: "critico", note: "Abrir abrigos e remover famílias em imóveis de encosta." },
];

const TONE: Record<RiskLevel, string> = {
  baixo: "border-risk-low/40 bg-risk-low/10 text-risk-low",
  moderado: "border-risk-medium/40 bg-risk-medium/10 text-risk-medium",
  alto: "border-risk-high/40 bg-risk-high/10 text-risk-high",
  critico: "border-risk-critical/50 bg-risk-critical/10 text-risk-critical",
};

export function RecommendedActionsPanel({ risk }: { risk: RiskAssessment }) {
  const level = ORDER.indexOf(risk.level);

  return (
    <Card className={cn("glass border-border/60", risk.level === "critico" && "alert-glow")}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-primary" /> Ações Recomendadas
        </CardTitle>
        <Badge variant="outline" className={cn("border", TONE[risk.level])}>
          {ACTIONS.filter((a) => ORDER.indexOf(a.from) <= level).length} ativas
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {ACTIONS.map((item, i) => {
          const enabled = ORDER.indexOf(item.from) <= level;
          return (
            <motion.div
              key={item.action}
              initial={false}
              animate={{ opacity: enabled ? 1 : 0.4 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border p-2.5 text-sm",
                enabled ? TONE[item.from] : "border-border/50 bg-secondary/20 text-muted-foreground",
              )}
            >
              <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", !enabled && "opacity-50")} />
              <span className="min-w-0">
                <span className="block font-medium">{item.action}</span>
                <span className="block text-xs text-muted-foreground">
                  {enabled ? item.note : `Liberada a partir do risco ${item.from}.`}
                </span>
              </span>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
