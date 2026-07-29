import { createFileRoute, Link } from "@tanstack/react-router";

import { SingleSensorChart } from "@/components/charts/SensorCharts";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMonitoring } from "@/context/MonitoringContext";
import { getMunicipality, getNeighborhood } from "@/data/regions";

export const Route = createFileRoute("/sensores/")({
  head: () => ({
    meta: [
      { title: "Rede de Sensores — GeoAlerta RMR" },
      { name: "description", content: "Status, bateria, sinal e leituras dos sensores de pluviosidade, umidade, temperatura, vibração, inclinação e deslocamento." },
      { property: "og:title", content: "Rede de Sensores — GeoAlerta RMR" },
      { property: "og:description", content: "Telemetria em tempo real das encostas monitoradas." },
    ],
  }),
  component: SensoresPage,
});

function SensoresPage() {
  const { filters, sensorsIn } = useMonitoring();
  const sensors = sensorsIn(filters.municipalityId, filters.neighborhoodId, filters.sensorType);

  return (
    <>
      <h1 className="font-display text-xl font-bold">Rede de sensores</h1>
      <FilterBar />
      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {sensors.slice(0, 36).map((sensor) => (
          <Card key={sensor.id} className="glass border-border/60">
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center justify-between gap-2 text-sm">
                <Link to="/sensores/$sensorId" params={{ sensorId: sensor.id }} className="truncate hover:text-primary">
                  {sensor.name}
                </Link>
                <Badge variant="outline" className="border-border/70 text-[10px] uppercase">{sensor.status}</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {sensor.code} · {getNeighborhood(sensor.neighborhoodId)?.name}, {getMunicipality(sensor.municipalityId)?.name}
              </p>
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold tabular-nums text-primary">
                {sensor.value} <span className="text-xs font-normal text-muted-foreground">{sensor.unit}</span>
              </p>
              <SingleSensorChart sensor={sensor} period={filters.period} height={140} />
              <p className="text-[11px] text-muted-foreground">
                Bateria {sensor.battery}% · Sinal {sensor.signal}% · {new Date(sensor.lastUpdate).toLocaleTimeString("pt-BR")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
