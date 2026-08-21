/**
 * Núcleo da API REST de leituras do protótipo físico (ESP32/Arduino).
 *
 * Este módulo é client-safe: contém apenas validação, cálculo de status e os
 * handlers HTTP. O cliente privilegiado do banco é carregado dinamicamente
 * dentro de cada handler (nunca no escopo do módulo).
 */

export const DEFAULT_SENSOR_ID = "SENSOR-001";

export interface SensorPayload {
  sensor_id: string;
  temperatura: number;
  umidade_ar: number;
  umidade_solo: number;
  inclinacao: number;
  vibracao: number;
  chuva: number;
}

export type LocalStatus = "NORMAL" | "ATENCAO" | "RISCO";

/** Faixas de referência informadas pelo protótipo. */
export const THRESHOLDS = {
  temperatura: { warn: 35, critical: 40 },
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
  temperatura: number | null;
  umidade_ar: number | null;
  umidade_solo: number | null;
  inclinacao: number | null;
  vibracao: number | null;
  chuva: number | null;
}

/**
 * Status geral combinando os indicadores.
 *
 * RISCO exige contexto: um crítico isolado de temperatura não caracteriza
 * deslizamento. Só vira RISCO quando um indicador geotécnico/hídrico crítico
 * aparece acompanhado de outro indicador alterado, ou quando há vários
 * indicadores em atenção simultaneamente.
 */
export function computeStatus(r: ReadingLike): { status: LocalStatus; reasons: string[] } {
  const entries: { key: ThresholdKey; label: string; value: number | null; level: 0 | 1 | 2 }[] = [
    { key: "chuva", label: "chuva", value: r.chuva, level: levelOf("chuva", r.chuva) },
    { key: "umidade_solo", label: "umidade do solo", value: r.umidade_solo, level: levelOf("umidade_solo", r.umidade_solo) },
    { key: "inclinacao", label: "inclinação", value: r.inclinacao, level: levelOf("inclinacao", r.inclinacao) },
    { key: "vibracao", label: "vibração", value: r.vibracao, level: levelOf("vibracao", r.vibracao) },
    { key: "temperatura", label: "temperatura", value: r.temperatura, level: levelOf("temperatura", r.temperatura) },
  ];

  const reasons = entries
    .filter((e) => e.level > 0)
    .map((e) => `${e.label} em ${e.level === 2 ? "nível crítico" : "atenção"} (${e.value})`);

  const geo = entries.filter((e) => e.key !== "temperatura");
  const criticalGeo = geo.filter((e) => e.level === 2).length;
  const alteredGeo = geo.filter((e) => e.level >= 1).length;
  const anyAltered = entries.filter((e) => e.level >= 1).length;

  if ((criticalGeo >= 1 && alteredGeo >= 2) || criticalGeo >= 2 || alteredGeo >= 3) {
    return { status: "RISCO", reasons };
  }
  if (anyAltered >= 1) return { status: "ATENCAO", reasons };
  return { status: "NORMAL", reasons };
}

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-api-key, authorization, apikey",
  "Access-Control-Max-Age": "86400",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

const NUMERIC_FIELDS = [
  "temperatura",
  "umidade_ar",
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
      temperatura: parsed["temperatura"]!,
      umidade_ar: parsed["umidade_ar"]!,
      umidade_solo: parsed["umidade_solo"]!,
      inclinacao: parsed["inclinacao"]!,
      vibracao: parsed["vibracao"]!,
      chuva: parsed["chuva"]!,
    },
  };
}

/** POST /api/sensores — recebe uma leitura do ESP32. */
export async function handleSensorPost(request: Request): Promise<Response> {
  const requiredKey = process.env["SENSOR_API_KEY"];
  if (requiredKey) {
    const provided = request.headers.get("x-api-key");
    if (provided !== requiredKey) {
      return json({ success: false, message: "Chave de API inválida ou ausente (header x-api-key)." }, 401);
    }
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ success: false, message: "JSON inválido." }, 400);
  }

  const result = validatePayload(raw);
  if (!result.ok) return json({ success: false, message: result.error }, 400);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("sensor_readings")
    .insert(result.data)
    .select("id, created_at, sensor_id")
    .single();

  if (error) {
    console.error("[sensor-api] falha ao gravar leitura", error);
    return json({ success: false, message: "Não foi possível gravar a leitura." }, 500);
  }

  return json(
    {
      success: true,
      message: "Dados recebidos com sucesso",
      sensor_id: data.sensor_id,
      timestamp: data.created_at,
    },
    201,
  );
}

/** GET /api/sensores/:id/latest */
export async function handleLatest(sensorId: string): Promise<Response> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("sensor_readings")
    .select("*")
    .eq("sensor_id", sensorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return json({ success: false, message: "Erro ao consultar a última leitura." }, 500);
  if (!data) return json({ success: false, message: "Aguardando dados do sensor..." }, 404);

  const { status } = computeStatus(data);
  return json({
    sensor_id: data.sensor_id,
    temperatura: data.temperatura,
    umidade_ar: data.umidade_ar,
    umidade_solo: data.umidade_solo,
    inclinacao: data.inclinacao,
    vibracao: data.vibracao,
    chuva: data.chuva,
    status,
    timestamp: data.created_at,
  });
}

/** GET /api/sensores/:id/history?limit=100 */
export async function handleHistory(sensorId: string, url: URL): Promise<Response> {
  const raw = Number(url.searchParams.get("limit") ?? 100);
  const limit = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 1000) : 100;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("sensor_readings")
    .select("*")
    .eq("sensor_id", sensorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return json({ success: false, message: "Erro ao consultar o histórico." }, 500);

  return json({
    sensor_id: sensorId,
    count: data.length,
    limit,
    readings: data.map((r) => ({
      id: r.id,
      temperatura: r.temperatura,
      umidade_ar: r.umidade_ar,
      umidade_solo: r.umidade_solo,
      inclinacao: r.inclinacao,
      vibracao: r.vibracao,
      chuva: r.chuva,
      status: computeStatus(r).status,
      timestamp: r.created_at,
    })),
  });
}
