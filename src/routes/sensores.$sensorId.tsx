import { createFileRoute, Link } from "@tanstack/react-router";

import { SingleSensorChart } from "@/components/charts/SensorCharts";
import { RiskGauge } from "@/components/common/RiskGauge";
import { MapPanel } from "@/components/map/MapPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useMonitoring } from "@/context/MonitoringContext";
import { getMunicipality, getNeighborhood } from "@/data/regions";
import { assessRisk } from "@/lib/ai";

export const Route = createFileRoute("/sensores/$sensorId")({
  head: () => ({
    meta: [
      { title: "Detalhe do Sensor — GeoAlerta RMR" },
      { name: "description", content: "Leituras em tempo real, GPS, bateria, sinal e histórico do sensor selecionado." },
      { property: "og:title", content: "Detalhe do Sensor — GeoAlerta RMR" },
      { property: "og:description", content: "Telemetria detalhada do sensor de encosta." },
    ],
  }),
  component: SensorPage,
});

function SensorPage() {
  const { sensorId } = Route.useParams();
  const { sensors, filters } = useMonitoring();
  const sensor = sensors.find((s) => s.id === sensorId);
  if (!sensor) return <p className="text-sm text-muted-foreground">Sensor não encontrado.</p>;

  const risk = assessRisk([sensor]);
  const info = [
    ["Nome", sensor.name],
    ["ID", sensor.code],
    ["Município", getMunicipality(sensor.municipalityId)?.name ?? "—"],
    ["Bairro", getNeighborhood(sensor.neighborhoodId)?.name ?? "—"],
    ["GPS", `${sensor.position.lat.toFixed(5)}, ${sensor.position.lng.toFixed(5)}`],
    ["Status", sensor.status],
    ["Última atualização", new Date(sensor.lastUpdate).toLocaleString("pt-BR")],
  ] as const;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/sensores" className="text-xs text-muted-foreground hover:text-primary">← Sensores</Link>
        <h1 className="font-display text-xl font-bold">{sensor.name}</h1>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="glass border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-base">Ficha técnica</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {info.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">{label}</span>
                <span className="truncate font-mono text-xs">{value}</span>
              </div>
            ))}
            <div className="pt-2">
              <p className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Bateria</span><span>{sensor.battery}%</span></p>
              <Progress value={sensor.battery} className="h-1.5" />
            </div>
            <div>
              <p className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Intensidade do sinal</span><span>{sensor.signal}%</span></p>
              <Progress value={sensor.signal} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-base">Leitura em tempo real</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <p className="font-display text-4xl font-bold tabular-nums text-primary">
              {sensor.value} <span className="text-base font-normal text-muted-foreground">{sensor.unit}</span>
            </p>
            <RiskGauge score={risk.score} size={150} label="Risco local" />
          </CardContent>
        </Card>

        <Card className="glass border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-base">Localização</CardTitle></CardHeader>
          <CardContent>
            <MapPanel municipalityId={sensor.municipalityId} neighborhoodId={sensor.neighborhoodId} height="280px" />
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-border/60">
        <CardHeader className="pb-2"><CardTitle className="text-base">Histórico de leituras</CardTitle></CardHeader>
        <CardContent><SingleSensorChart sensor={sensor} period={filters.period} height={300} /></CardContent>
      </Card>
    </>
  );
}
