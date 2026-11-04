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
  umidade_solo: number | null;
  inclinacao: number | null;
  vibracao: number | null;
  chuva: number | null;
  created_at: string;
}

const FIREBASE_PUSH_CHARS = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";

function timestampFromPushId(id: string): number | null {
  if (id.length !== 20) return null;
  let timestamp = 0;
  for (const char of id.slice(0, 8)) {
    const digit = FIREBASE_PUSH_CHARS.indexOf(char);
    if (digit < 0) return null;
    timestamp = timestamp * 64 + digit;
  }
  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizeTimestamp(value: unknown, id: string): string | null {
  let timestamp: number | null = null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) timestamp = parsed;
  } else if (typeof value === "number" && Number.isFinite(value)) {
    timestamp = value < 1_000_000_000_000 ? value * 1000 : value;
  }
  timestamp ??= timestampFromPushId(id);
  return timestamp === null ? null : new Date(timestamp).toISOString();
}

/** Converts the Firebase record shape used by the ESP32 into a safe panel row. */
export function parseFirebaseReading(id: string, value: unknown): RealReading | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row["sensor_id"] !== "string") return null;

  const numberField = (field: string): number | null => {
    const fieldValue = row[field];
    return typeof fieldValue === "number" && Number.isFinite(fieldValue) ? fieldValue : null;
  };
  const createdAt = normalizeTimestamp(row["created_at"] ?? row["timestamp"], id);
  if (!createdAt) return null;

  return {
    id,
    sensor_id: row["sensor_id"],
    umidade_solo: numberField("umidade_solo"),
    inclinacao: numberField("inclinacao"),
    vibracao: numberField("vibracao"),
    chuva: numberField("chuva"),
    created_at: createdAt,
  };
}

const FIELD_BY_TYPE: Record<SensorType, keyof RealReading> = {
  pluviosidade: "chuva",
  umidade: "umidade_solo",
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
  const isFresh = Number.isFinite(lastUpdate) && Date.now() - lastUpdate <= 15_000;

  return SENSOR_TYPES.map((meta, index) => {
    const field = FIELD_BY_TYPE[meta.id];
    const history: SensorReading[] = chronological
      .map((r) => ({ timestamp: new Date(r.created_at).getTime(), value: num(r[field]) }))
      .filter((p): p is SensorReading => p.value !== null);
    const value = num(latest[field]);

    return {
      id: `${STATION.id}-${meta.id}`,
      code: DEFAULT_SENSOR_ID,
      name: `${meta.label} · ${STATION.name}`,
      type: meta.id,
      status: value === null || !isFresh ? "offline" : "online",
      municipalityId: STATION.municipalityId,
      neighborhoodId: STATION.id,
      position: STATION_COORDS,
      battery: null,
      signal: null,
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
