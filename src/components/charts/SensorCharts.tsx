import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getSensorMeta } from "@/data/regions";
import type { Sensor, SensorType } from "@/types";

const PERIOD_HOURS: Record<string, number> = { "24h": 24, "7d": 168, "30d": 720 };

export interface SeriesPoint {
  label: string;
  timestamp: number;
  [key: string]: number | string;
}

/** Agrega leituras de um conjunto de sensores em uma série temporal média. */
export function buildSeries(sensors: Sensor[], period: string, types?: SensorType[]): SeriesPoint[] {
  if (!sensors.length) return [];
  const wanted = types ?? Array.from(new Set(sensors.map((s) => s.type)));
  const now = Date.now();
  const cutoff = now - (PERIOD_HOURS[period] ?? 24) * 3_600_000;
  const bucketMs = period === "24h" ? 3_600_000 : period === "7d" ? 6 * 3_600_000 : 24 * 3_600_000;
  const buckets = new Map<number, Map<SensorType, { sum: number; count: number }>>();
  for (const sensor of sensors) {
    if (!wanted.includes(sensor.type)) continue;
    for (const reading of sensor.history) {
      if (reading.timestamp < cutoff || reading.timestamp > now) continue;
      const timestamp = Math.floor(reading.timestamp / bucketMs) * bucketMs;
      const values = buckets.get(timestamp) ?? new Map<SensorType, { sum: number; count: number }>();
      const current = values.get(sensor.type) ?? { sum: 0, count: 0 };
      current.sum += reading.value;
      current.count += 1;
      values.set(sensor.type, current);
      buckets.set(timestamp, values);
    }
  }
  return [...buckets.entries()].sort(([a], [b]) => a - b).map(([timestamp, values]) => {
    const point: SeriesPoint = {
      timestamp,
      label: period === "24h"
        ? new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : new Date(timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    };
    values.forEach(({ sum, count }, type) => { point[type] = Number((sum / count).toFixed(2)); });
    return point;
  });
}

const COLORS: Record<SensorType, string> = {
  pluviosidade: "var(--chart-1)",
  umidade: "var(--chart-2)",
  temperatura: "var(--chart-3)",
  umidade_ar: "var(--chart-5)",
  vibracao: "var(--chart-6)",
  inclinacao: "var(--chart-4)",
};

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--popover-foreground)",
} as const;

export function MultiSensorChart({
  sensors,
  period,
  types,
  height = 280,
}: {
  sensors: Sensor[];
  period: string;
  types?: SensorType[];
  height?: number;
}) {
  const data = useMemo(() => buildSeries(sensors, period, types), [sensors, period, types]);
  const keys = useMemo(
    () => (types ?? Array.from(new Set(sensors.map((s) => s.type)))).filter((t) => data.some((d) => d[t] !== undefined)),
    [types, sensors, data],
  );

  if (!data.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Sem dados para os filtros atuais.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={44} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--muted-foreground)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {keys.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={`${getSensorMeta(key).label} (${getSensorMeta(key).unit})`}
            stroke={COLORS[key]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SingleSensorChart({
  sensor,
  period,
  height = 240,
}: {
  sensor: Sensor;
  period: string;
  height?: number;
}) {
  const data = useMemo(() => buildSeries([sensor], period, [sensor.type]), [sensor, period]);
  const meta = getSensorMeta(sensor.type);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${sensor.type}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS[sensor.type]} stopOpacity={0.5} />
            <stop offset="100%" stopColor={COLORS[sensor.type]} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={44} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} ${meta.unit}`, meta.label]} />
        <Area
          type="monotone"
          dataKey={sensor.type}
          stroke={COLORS[sensor.type]}
          strokeWidth={2}
          fill={`url(#grad-${sensor.type})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
