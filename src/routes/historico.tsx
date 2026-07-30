import { createFileRoute } from "@tanstack/react-router";

import { MultiSensorChart } from "@/components/charts/SensorCharts";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { RiskBadge } from "@/components/common/RiskGauge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMonitoring } from "@/context/MonitoringContext";
import { getMunicipality, getNeighborhood, getSensorMeta } from "@/data/regions";
import { assessRisk } from "@/lib/ai";
import { SCENARIOS } from "@/lib/simulation-engine";
import { downloadCsv } from "@/lib/export";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de Leituras — GeoAlerta RMR" },
      { name: "description", content: "Consulte o histórico de leituras dos sensores por município, bairro, tipo, período e nível de risco." },
      { property: "og:title", content: "Histórico de Leituras — GeoAlerta RMR" },
      { property: "og:description", content: "Base histórica do monitoramento de encostas da RMR." },
    ],
  }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const { filters, sensorsIn, simulationHistory } = useMonitoring();
  const sensors = sensorsIn(filters.municipalityId, filters.neighborhoodId, filters.sensorType);
  const rows = sensors.slice(0, 60).map((s) => {
    const risk = assessRisk([s]);
    return {
      sensor: s,
      risk,
      min: Math.min(...s.history.map((h) => h.value)),
      max: Math.max(...s.history.map((h) => h.value)),
      avg: s.history.reduce((a, b) => a + b.value, 0) / s.history.length,
    };
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold">Histórico</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              "historico.csv",
              rows.map((r) => ({
                sensor: r.sensor.code,
                tipo: getSensorMeta(r.sensor.type).label,
                municipio: getMunicipality(r.sensor.municipalityId)?.name ?? "",
                bairro: getNeighborhood(r.sensor.neighborhoodId)?.name ?? "",
                minimo: r.min.toFixed(2),
                media: r.avg.toFixed(2),
                maximo: r.max.toFixed(2),
                risco: r.risk.level,
              })),
            )
          }
        >
          Exportar CSV
        </Button>
      </div>
      <FilterBar />

      <Card className="glass border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Simulações registradas ({simulationHistory.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {simulationHistory.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Município</TableHead>
                  <TableHead>Bairro</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Maior índice</TableHead>
                  <TableHead className="text-right">Duração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {simulationHistory.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{new Date(s.startedAt).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{new Date(s.startedAt).toLocaleTimeString("pt-BR")}</TableCell>
                    <TableCell>{getMunicipality(s.municipalityId)?.name}</TableCell>
                    <TableCell>{getNeighborhood(s.neighborhoodId)?.name}</TableCell>
                    <TableCell>{SCENARIOS[s.scenario].label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.peakScore} <RiskBadge level={s.peakLevel} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Math.round(s.durationMs / 1000)}s
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma simulação registrada. Inicie uma pelo botão “Iniciar Simulação” no Dashboard.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="glass border-border/60">
        <CardHeader className="pb-2"><CardTitle className="text-base">Séries agregadas</CardTitle></CardHeader>
        <CardContent><MultiSensorChart sensors={sensors} period={filters.period} height={300} /></CardContent>
      </Card>


      <Card className="glass border-border/60">
        <CardHeader className="pb-2"><CardTitle className="text-base">Registros ({rows.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sensor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Município</TableHead>
                <TableHead>Bairro</TableHead>
                <TableHead className="text-right">Mín.</TableHead>
                <TableHead className="text-right">Média</TableHead>
                <TableHead className="text-right">Máx.</TableHead>
                <TableHead>Risco</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.sensor.id}>
                  <TableCell className="font-mono text-xs">{r.sensor.code}</TableCell>
                  <TableCell>{getSensorMeta(r.sensor.type).label}</TableCell>
                  <TableCell>{getMunicipality(r.sensor.municipalityId)?.name}</TableCell>
                  <TableCell>{getNeighborhood(r.sensor.neighborhoodId)?.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.min.toFixed(1)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.avg.toFixed(1)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.max.toFixed(1)}</TableCell>
                  <TableCell><RiskBadge level={r.risk.level} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
