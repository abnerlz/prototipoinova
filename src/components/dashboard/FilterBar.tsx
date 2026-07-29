import { Filter, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MUNICIPALITIES, NEIGHBORHOODS, PERIODS, SENSOR_TYPES } from "@/data/regions";
import { useMonitoring } from "@/context/MonitoringContext";
import type { Filters, SensorType } from "@/types";

/** Barra de filtros global — qualquer alteração recalcula todo o dashboard. */
export function FilterBar() {
  const { filters, setFilters } = useMonitoring();
  const neighborhoods = NEIGHBORHOODS.filter(
    (n) => filters.municipalityId === "all" || n.municipalityId === filters.municipalityId,
  );

  return (
    <div className="glass sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl p-3">
      <span className="flex items-center gap-2 pr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Filter className="h-3.5 w-3.5" /> Filtros
      </span>

      <Select value={filters.municipalityId} onValueChange={(v) => setFilters({ municipalityId: v })}>
        <SelectTrigger className="h-9 w-[190px] bg-secondary/40 text-sm">
          <SelectValue placeholder="Município" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os municípios</SelectItem>
          {MUNICIPALITIES.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.neighborhoodId} onValueChange={(v) => setFilters({ neighborhoodId: v })}>
        <SelectTrigger className="h-9 w-[190px] bg-secondary/40 text-sm">
          <SelectValue placeholder="Bairro" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os bairros</SelectItem>
          {neighborhoods.map((n) => (
            <SelectItem key={n.id} value={n.id}>
              {n.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.sensorType}
        onValueChange={(v) => setFilters({ sensorType: v as SensorType | "all" })}
      >
        <SelectTrigger className="h-9 w-[190px] bg-secondary/40 text-sm">
          <SelectValue placeholder="Tipo de sensor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os sensores</SelectItem>
          {SENSOR_TYPES.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.period} onValueChange={(v) => setFilters({ period: v as Filters["period"] })}>
        <SelectTrigger className="h-9 w-[170px] bg-secondary/40 text-sm">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="sm"
        className="ml-auto text-muted-foreground"
        onClick={() =>
          setFilters({ municipalityId: "all", neighborhoodId: "all", sensorType: "all", period: "24h" })
        }
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Limpar
      </Button>
    </div>
  );
}
