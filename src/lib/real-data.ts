/**
 * Modo REAL: converte as leituras gravadas pelo protótipo físico (tabela
 * sensor_readings) nos objetos Sensor usados por todo o painel.
 *
 * Nenhum valor é inventado aqui — se não houver leitura, não há sensor.
 */
import { STATION, STATION_COORDS, SENSOR_TYPES } from "@/data/regions";
import { DEFAULT_SENSOR_ID, computeStatus, type LocalStatus } from "@/lib/sensor-api";
import type { Sensor, SensorReading, SensorType } from "@/types";

export interface RealReading {
  id: string;
  sensor_id: string;
  temperatura: number | null;
  umidade_ar: number | null;
  umidade_solo: number | null;
  inclinacao: number | null;
  vibracao: number | null;
  chuva: number | null;
  created_at: string;
}

const FIELD_BY_TYPE: Record<SensorType, keyof RealReading> = {
  pluviosidade: "chuva",
  umidade: "umidade_solo",
  umidade_ar: "umidade_ar",
  temperatura: "temperatura",
  inclinacao: "inclinacao",
  vibracao: "vibracao",
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** `rows` deve vir ordenado do mais recente para o mais antigo. */
export function sensorsFromReadings(rows: RealReading[]): Sensor[] {
  if (!rows.length) return [];
  const chronological = [...rows].reverse();
  const latest = rows[0]!;
  const lastUpdate = new Date(latest.created_at).getTime();

  return SENSOR_TYPES.map((meta, index) => {
    const field = FIELD_BY_TYPE[meta.id];
    const history: SensorReading[] = chronological
      .map((r) => ({ timestamp: new Date(r.created_at).getTime(), value: num(r[field]) }))
      .filter((p): p is SensorReading => p.value !== null);
    const value = num(latest[field]);

    return {
      id: `${STATION.id}-${meta.id}`,
      code: `${DEFAULT_SENSOR_ID}-${String(index + 1).padStart(2, "0")}`,
      name: `${meta.label} · ${STATION.name}`,
      type: meta.id,
      status: value === null ? "offline" : "online",
      municipalityId: STATION.municipalityId,
      neighborhoodId: STATION.id,
      position: STATION_COORDS,
      battery: 100,
      signal: 100,
      value: value ?? 0,
      unit: meta.unit,
      lastUpdate,
      history,
    } satisfies Sensor;
  });
}

export function statusFromReading(row: RealReading | null): LocalStatus | null {
  if (!row) return null;
  return computeStatus(row).status;
}

export const STATUS_LABEL: Record<LocalStatus, string> = {
  NORMAL: "🟢 NORMAL",
  ATENCAO: "🟡 ATENÇÃO",
  RISCO: "🔴 RISCO",
};
