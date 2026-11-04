import { getSensorReadingsReference } from "@/integrations/firebase/admin.server";
import {
  computeStatus,
  DEFAULT_SENSOR_ID,
  json,
  validatePayload,
  type SensorReadingRow,
} from "@/lib/sensor-api";

function parseSensorReading(id: string, value: unknown): SensorReadingRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row["sensor_id"] !== "string") return null;
  const createdAt = row["created_at"];
  if (typeof createdAt !== "string" && typeof createdAt !== "number") return null;

  const fields = ["umidade_solo", "inclinacao", "vibracao", "chuva"] as const;
  if (fields.some((field) => row[field] !== null && typeof row[field] !== "number")) return null;
  const timestamp = new Date(createdAt);
  if (!Number.isFinite(timestamp.getTime())) return null;

  return {
    id,
    sensor_id: row["sensor_id"],
    umidade_solo: row["umidade_solo"] as number | null,
    inclinacao: row["inclinacao"] as number | null,
    vibracao: row["vibracao"] as number | null,
    chuva: row["chuva"] as number | null,
    created_at: timestamp.toISOString(),
  };
}

async function loadSensorReadings(sensorId: string, limit: number): Promise<SensorReadingRow[]> {
  const snapshot = await (await getSensorReadingsReference())
    .orderByChild("sensor_id")
    .equalTo(sensorId)
    .limitToLast(limit)
    .get();

  const rows: SensorReadingRow[] = [];
  snapshot.forEach((child) => {
    const row = parseSensorReading(child.key ?? "", child.val());
    if (row) rows.push(row);
    return false;
  });
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** POST /api/sensores — recebe uma leitura do ESP32. */
export async function handleSensorPost(request: Request): Promise<Response> {
  const requiredKey = process.env["SENSOR_API_KEY"];
  if (!requiredKey) {
    console.error("[sensor-api] SENSOR_API_KEY não configurada no servidor.");
    return json({ success: false, message: "Recepção de sensores não configurada no servidor." }, 503);
  }
  const provided = request.headers.get("x-api-key");
  if (provided !== requiredKey) {
    return json({ success: false, message: "Chave de API inválida ou ausente (header x-api-key)." }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8192) {
    return json({ success: false, message: "Corpo da requisição excede o limite de 8 KB." }, 413);
  }

  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > 8192) {
      return json({ success: false, message: "Corpo da requisição excede o limite de 8 KB." }, 413);
    }
    raw = JSON.parse(body);
  } catch {
    return json({ success: false, message: "JSON inválido." }, 400);
  }

  const result = validatePayload(raw);
  if (!result.ok) return json({ success: false, message: result.error }, 400);

  if (result.data.sensor_id !== DEFAULT_SENSOR_ID) {
    return json({ success: false, message: `Este protótipo está configurado para o sensor ${DEFAULT_SENSOR_ID}.` }, 422);
  }

  try {
    const reading = { ...result.data, created_at: new Date().toISOString() };
    await (await getSensorReadingsReference()).push().set(reading);
    return json(
      {
        success: true,
        message: "Dados recebidos com sucesso",
        sensor_id: reading.sensor_id,
        timestamp: reading.created_at,
      },
      201,
    );
  } catch (cause) {
    console.error("[sensor-api] conexão de gravação Firebase não configurada.", cause);
    return json({ success: false, message: "Banco não configurado para receber leituras." }, 503);
  }
}

/** GET /api/sensores/:id/latest */
export async function handleLatest(sensorId: string): Promise<Response> {
  let data: SensorReadingRow | null = null;
  try {
    data = (await loadSensorReadings(sensorId, 1000))[0] ?? null;
  } catch (cause) {
    console.error("[sensor-api] consulta Firebase não configurada.", cause);
    return json({ success: false, message: "Banco não configurado para consulta." }, 503);
  }

  if (!data) return json({ success: false, message: "Aguardando dados do sensor..." }, 404);
  const { status } = computeStatus(data);
  return json({
    sensor_id: data.sensor_id,
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

  let data: SensorReadingRow[] = [];
  try {
    data = await loadSensorReadings(sensorId, limit);
  } catch (cause) {
    console.error("[sensor-api] consulta Firebase não configurada.", cause);
    return json({ success: false, message: "Banco não configurado para consulta." }, 503);
  }

  return json({
    sensor_id: sensorId,
    count: data.length,
    limit,
    readings: data.map((reading) => ({
      id: reading.id,
      umidade_solo: reading.umidade_solo,
      inclinacao: reading.inclinacao,
      vibracao: reading.vibracao,
      chuva: reading.chuva,
      status: computeStatus(reading).status,
      timestamp: reading.created_at,
    })),
  });
}
