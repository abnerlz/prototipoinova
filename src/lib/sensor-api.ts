/**
 * Núcleo da API REST de leituras do protótipo físico (ESP32/Arduino).
 *
 * Este módulo é client-safe: contém apenas tipos, validação, cálculo de status
 * e respostas HTTP compartilhadas. Os handlers de banco ficam em
 * `sensor-api.server.ts`.
 */

export const DEFAULT_SENSOR_ID = "bancada_esp32_01";
export interface SensorReadingRow {
  id: string;
  sensor_id: string;
  umidade_solo: number | null;
  inclinacao: number | null;
  vibracao: number | null;
  chuva: number | null;
  created_at: string;
}

export interface SensorPayload {
  sensor_id: string;
  umidade_solo: number;
  inclinacao: number;
  vibracao: number;
  chuva: number;
}

export type LocalStatus = "NORMAL" | "ATENCAO" | "RISCO";

/** Faixas de referência informadas pelo protótipo. */
export const THRESHOLDS = {
  umidade_solo: { warn: 70, critical: 85 },
  inclinacao: { warn: 5, critical: 10 },
  vibracao: { warn: 0.5, critical: 1 },
  chuva: { warn: 20, critical: 50 },
} as const;

export type ThresholdKey = keyof typeof THRESHOLDS;

export function levelOf(key: ThresholdKey, value: number | null | undefined): 0 | 1 | 2 {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  const t = THRESHOLDS[key];
  if (value > t.critical) return 2;
  if (value >= t.warn) return 1;
  return 0;
}

export interface ReadingLike {
  umidade_solo: number | null;
  inclinacao: number | null;
  vibracao: number | null;
  chuva: number | null;
}

/**
 * Status geral combinando os indicadores.
 *
 * RISCO exige uma combinação de indicadores geotécnicos e hídricos alterados.
 */
export function computeStatus(r: ReadingLike): { status: LocalStatus; reasons: string[] } {
  const entries: { key: ThresholdKey; label: string; value: number | null; level: 0 | 1 | 2 }[] = [
    { key: "chuva", label: "chuva", value: r.chuva, level: levelOf("chuva", r.chuva) },
    { key: "umidade_solo", label: "umidade do solo", value: r.umidade_solo, level: levelOf("umidade_solo", r.umidade_solo) },
    { key: "inclinacao", label: "inclinação", value: r.inclinacao, level: levelOf("inclinacao", r.inclinacao) },
    { key: "vibracao", label: "vibração", value: r.vibracao, level: levelOf("vibracao", r.vibracao) },
  ];

  const reasons = entries
    .filter((e) => e.level > 0)
    .map((e) => `${e.label} em ${e.level === 2 ? "nível crítico" : "atenção"} (${e.value})`);

  const criticalGeo = entries.filter((e) => e.level === 2).length;
  const alteredGeo = entries.filter((e) => e.level >= 1).length;

  if ((criticalGeo >= 1 && alteredGeo >= 2) || criticalGeo >= 2 || alteredGeo >= 3) {
    return { status: "RISCO", reasons };
  }
  if (alteredGeo >= 1) return { status: "ATENCAO", reasons };
  return { status: "NORMAL", reasons };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
}

const NUMERIC_FIELDS = [
  "umidade_solo",
  "inclinacao",
  "vibracao",
  "chuva",
] as const;

export function validatePayload(raw: unknown): { ok: true; data: SensorPayload } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "Corpo da requisição deve ser um objeto JSON." };
  }
  const body = raw as Record<string, unknown>;

  const sensorId = body["sensor_id"] === undefined ? DEFAULT_SENSOR_ID : body["sensor_id"];
  if (typeof sensorId !== "string" || sensorId.trim().length === 0 || sensorId.length > 64) {
    return { ok: false, error: "Campo 'sensor_id' deve ser um texto de 1 a 64 caracteres." };
  }

  const parsed: Record<string, number> = {};
  for (const field of NUMERIC_FIELDS) {
    const value = body[field];
    if (value === undefined || value === null) {
      return { ok: false, error: `Campo '${field}' é obrigatório.` };
    }
    const num = typeof value === "string" ? Number(value.replace(",", ".")) : value;
    if (typeof num !== "number" || !Number.isFinite(num)) {
      return { ok: false, error: `Campo '${field}' deve ser numérico (decimais permitidos).` };
    }
    if (num < -1000 || num > 10000) {
      return { ok: false, error: `Campo '${field}' fora da faixa aceitável.` };
    }
    parsed[field] = num;
  }

  return {
    ok: true,
    data: {
      sensor_id: sensorId.trim(),
      umidade_solo: parsed["umidade_solo"]!,
      inclinacao: parsed["inclinacao"]!,
      vibracao: parsed["vibracao"]!,
      chuva: parsed["chuva"]!,
    },
  };
}
