import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";

import { RiskBadge } from "@/components/common/RiskGauge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMonitoring } from "@/context/MonitoringContext";
import { downloadCsv } from "@/lib/export";
import { OCCURRENCE_STATUS_LABEL, buildOccurrences } from "@/lib/occurrences";

export const Route = createFileRoute("/ocorrencias")({
  head: () => ({
    meta: [
      { title: "Ocorrências Operacionais — GeoAlerta RMR" },
      {
        name: "description",
        content:
          "Registro de ocorrências de campo: horário, local, nível, status, equipe responsável, tempo de resposta e ação realizada.",
      },
      { property: "og:title", content: "Ocorrências Operacionais — GeoAlerta RMR" },
      { property: "og:description", content: "Acompanhe o atendimento de cada ocorrência da Defesa Civil na RMR." },
    ],
  }),
  component: OcorrenciasPage,
});

const STATUS_TONE = {
  aberta: "border-risk-medium/40 text-risk-medium",
  "em-atendimento": "border-risk-high/40 text-risk-high",
  concluida: "border-risk-low/40 text-risk-low",
} as const;

function OcorrenciasPage() {
  const { alerts } = useMonitoring();
  const occurrences = buildOccurrences(alerts);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold">Ocorrências</h1>
        <Button
          variant="outline"
          size="sm"
          disabled={!occurrences.length}
          onClick={() =>
            downloadCsv(
              "ocorrencias.csv",
              occurrences.map((o) => ({
                horario: new Date(o.createdAt).toLocaleString("pt-BR"),
                municipio: o.municipality,
                bairro: o.neighborhood,
                nivel: o.level,
                status: OCCURRENCE_STATUS_LABEL[o.status],
                equipe: o.team,
                resposta_min: o.responseMinutes,
                acao: o.action,
              })),
            )
          }
        >
          Exportar CSV
        </Button>
      </div>

      <Card className="glass border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" /> Registro de atendimentos ({occurrences.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {occurrences.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Horário</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Equipe responsável</TableHead>
                  <TableHead className="text-right">Tempo de resposta</TableHead>
                  <TableHead>Ação realizada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {occurrences.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="whitespace-nowrap tabular-nums text-xs">
                      {new Date(o.createdAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {o.neighborhood}
                      <span className="block text-xs text-muted-foreground">{o.municipality}</span>
                    </TableCell>
                    <TableCell>
                      <RiskBadge level={o.level} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_TONE[o.status]}>
                        {OCCURRENCE_STATUS_LABEL[o.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {o.team}
                      <span className="block text-xs text-muted-foreground">{o.teamContact}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{o.responseMinutes} min</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{o.action}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma ocorrência registrada. As ocorrências são abertas automaticamente a cada alerta emitido pela IA ou
              pelo operador.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
