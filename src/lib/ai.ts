import { SENSOR_TYPES, getNeighborhood, getSensorMeta } from "@/data/regions";
import type { RiskAssessment, RiskLevel, Sensor, SensorType } from "@/types";

/**
 * Motor da "IA de Prevenção de Deslizamentos".
 *
 * Modelo interpretável de pontuação ponderada (0-100) que combina leituras
 * atuais, tendência recente e suscetibilidade geológica do bairro.
 */

interface Weightings {
  type: SensorType;
  weight: number;
  /** Função de normalização da leitura para 0-1. */
  normalize: (value: number) => number;
}

const norm = (value: number, min: number, max: number) =>
  Math.max(0, Math.min(1, (value - min) / (max - min)));

const MODEL: Weightings[] = [
  { type: "pluviosidade", weight: 0.22, normalize: (v) => norm(v, 2, 60) },
  { type: "umidade", weight: 0.24, normalize: (v) => norm(v, 45, 95) },
  { type: "deslocamento", weight: 0.2, normalize: (v) => norm(v, 5, 45) },
  { type: "inclinacao", weight: 0.16, normalize: (v) => norm(v, 3, 18) },
  { type: "vibracao", weight: 0.12, normalize: (v) => norm(v, 1, 12) },
  { type: "temperatura", weight: 0.06, normalize: (v) => 1 - norm(v, 20, 36) },
];

export function riskLevelFromScore(score: number): RiskLevel {
  if (score <= 25) return "baixo";
  if (score <= 50) return "moderado";
  if (score <= 75) return "alto";
  return "critico";
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  baixo: "Baixo",
  moderado: "Moderado",
  alto: "Alto",
  critico: "Crítico",
};

export const RISK_COLOR: Record<RiskLevel, string> = {
  baixo: "#22c55e",
  moderado: "#facc15",
  alto: "#f97316",
  critico: "#ef4444",
};

export const RISK_TOKEN: Record<RiskLevel, string> = {
  baixo: "risk-low",
  moderado: "risk-medium",
  alto: "risk-high",
  critico: "risk-critical",
};

/** Médias por tipo em um instante anterior do histórico (k passos atrás). */
function averagesAtOffset(sensors: Sensor[], k: number): Partial<Record<SensorType, number>> {
  const acc: Partial<Record<SensorType, { sum: number; n: number }>> = {};
  sensors
    .filter((s) => s.status === "online")
    .forEach((s) => {
      const point = s.history[s.history.length - 1 - k];
      if (!point) return;
      const entry = acc[s.type] ?? { sum: 0, n: 0 };
      entry.sum += point.value;
      entry.n += 1;
      acc[s.type] = entry;
    });
  const out: Partial<Record<SensorType, number>> = {};
  (Object.keys(acc) as SensorType[]).forEach((k2) => {
    out[k2] = acc[k2]!.sum / acc[k2]!.n;
  });
  return out;
}

function averageByType(sensors: Sensor[]): Partial<Record<SensorType, number>> {
  const acc: Partial<Record<SensorType, { sum: number; n: number }>> = {};
  sensors
    .filter((s) => s.status === "online")
    .forEach((s) => {
      const entry = acc[s.type] ?? { sum: 0, n: 0 };
      entry.sum += s.value;
      entry.n += 1;
      acc[s.type] = entry;
    });
  const out: Partial<Record<SensorType, number>> = {};
  (Object.keys(acc) as SensorType[]).forEach((k) => {
    out[k] = acc[k]!.sum / acc[k]!.n;
  });
  return out;
}

/** Tendência média das últimas 6 horas (positiva = agravamento). */
function trendFactor(sensors: Sensor[]): number {
  const relevant = sensors.filter((s) => s.type === "deslocamento" || s.type === "umidade");
  if (!relevant.length) return 0;
  const deltas = relevant.map((s) => {
    const h = s.history;
    if (h.length < 7) return 0;
    const recent = h[h.length - 1].value;
    const past = h[h.length - 7].value;
    return past === 0 ? 0 : (recent - past) / Math.max(1, Math.abs(past));
  });
  return deltas.reduce((a, b) => a + b, 0) / deltas.length;
}

/**
 * Faixas de normalidade por tipo de sensor.
 * `warn` = começa a sair do padrão, `severe` = claramente alterado.
 */
const THRESHOLDS: Partial<Record<SensorType, { warn: number; severe: number }>> = {
  pluviosidade: { warn: 14, severe: 34 },
  umidade: { warn: 74, severe: 88 },
  inclinacao: { warn: 4, severe: 9 },
  deslocamento: { warn: 16, severe: 30 },
  vibracao: { warn: 5, severe: 9 },
};

const BANDS: Record<RiskLevel, [number, number]> = {
  baixo: [4, 25],
  moderado: [27, 50],
  alto: [52, 75],
  critico: [77, 97],
};

/** Nível de risco pela COMBINAÇÃO dos sensores, não por um único valor. */
function combinedLevel(averages: Partial<Record<SensorType, number>>) {
  let warn = 0;
  let severe = 0;
  const flags: Partial<Record<SensorType, "warn" | "severe">> = {};
  (Object.keys(THRESHOLDS) as SensorType[]).forEach((type) => {
    const value = averages[type];
    const t = THRESHOLDS[type];
    if (value === undefined || !t) return;
    if (value >= t.severe) {
      severe += 1;
      warn += 1;
      flags[type] = "severe";
    } else if (value >= t.warn) {
      warn += 1;
      flags[type] = "warn";
    }
  });

  const chuvaCritica =
    flags.pluviosidade === "severe" &&
    flags.umidade === "severe" &&
    Boolean(flags.inclinacao) &&
    Boolean(flags.vibracao);

  let level: RiskLevel = "baixo";
  if (chuvaCritica || severe >= 3) level = "critico";
  else if (warn >= 3 || severe >= 2) level = "alto";
  else if (warn >= 1) level = "moderado";

  return { level, warn, severe, flags };
}

export function assessRisk(sensors: Sensor[], previousAlerts = 0): RiskAssessment {
  const averages = averageByType(sensors);
  const contributions: RiskAssessment["contributions"] = [];
  let raw = 0;

  MODEL.forEach((entry) => {
    const value = averages[entry.type];
    if (value === undefined) return;
    const contribution = entry.normalize(value) * entry.weight * 100;
    raw += contribution;
    contributions.push({
      type: entry.type,
      label: getSensorMeta(entry.type).label,
      weight: Number(contribution.toFixed(1)),
      value: Number(value.toFixed(1)),
      unit: getSensorMeta(entry.type).unit,
    });
  });

  const neighborhood = sensors[0] ? getNeighborhood(sensors[0].neighborhoodId) : undefined;
  const susceptibility = neighborhood?.susceptibility ?? 0.6;
  raw *= 0.75 + susceptibility * 0.4;

  const trend = trendFactor(sensors);
  raw += trend * 12;
  raw += Math.min(6, previousAlerts * 1.5);
  raw = Math.max(0, Math.min(100, raw));

  // O índice é posicionado dentro da faixa do nível combinado.
  const combined = combinedLevel(averages);
  let level = combined.level;
  const { warn, severe, flags } = combined;

  // Crítico exige persistência: a combinação precisa se manter elevada por
  // vários ciclos seguidos — um pico isolado não escala o nível.
  if (level === "critico") {
    const sustained = [1, 2, 3].every((k) => {
      const past = averagesAtOffset(sensors, k);
      if (!Object.keys(past).length) return true;
      const l = combinedLevel(past).level;
      return l === "alto" || l === "critico";
    });
    if (!sustained) level = "alto";
  }
  const [lo, hi] = BANDS[level];
  const score = Math.max(lo, Math.min(hi, lo + (hi - lo) * Math.min(1, raw / 100 + severe * 0.12)));

  const sorted = [...contributions].sort((a, b) => b.weight - a.weight);
  const reasons: string[] = [];

  const altered = (Object.keys(flags) as SensorType[]).map((t) => getSensorMeta(t).label);
  reasons.push(
    altered.length
      ? `${altered.length} sensor(es) fora do padrão simultaneamente: ${altered.join(", ")}.`
      : "Todos os sensores operam dentro das faixas de normalidade.",
  );
  sorted.slice(0, 2).forEach((c) => {
    reasons.push(`${c.label} em ${c.value} ${c.unit} (peso ${c.weight} no índice combinado).`);
  });
  if (trend > 0.05) {
    reasons.push("Tendência de agravamento nas últimas 6 horas (umidade e deslocamento em alta).");
  } else if (trend < -0.05) {
    reasons.push("Tendência de estabilização: umidade e deslocamento em queda nas últimas 6 horas.");
  } else {
    reasons.push("Leituras estáveis, com oscilações dentro do esperado para o período.");
  }
  if (susceptibility > 0.8) {
    reasons.push("Área classificada com alta suscetibilidade geológica (encostas íngremes e ocupação densa).");
  }
  if (previousAlerts > 0) {
    reasons.push(`${previousAlerts} alerta(s) recente(s) na região aumentam o peso do histórico.`);
  }

  const probability24h = Math.round(
    Math.max(1, Math.min(98, score * 0.8 + warn * 3 + Math.max(0, trend) * 20 + susceptibility * 5)),
  );

  return {
    score: Number(score.toFixed(1)),
    level,
    probability24h,
    contributions: sorted,
    reasons,
    trend: trend > 0.03 ? "subindo" : trend < -0.03 ? "caindo" : "estavel",
  };
}

/** Previsão simples para as próximas 24 horas a partir da tendência atual. */
export function forecast24h(assessment: RiskAssessment) {
  const points: { hour: string; risco: number; limiteCritico: number }[] = [];
  const dir = assessment.trend === "subindo" ? 1 : assessment.trend === "caindo" ? -1 : 0;
  let value = assessment.score;
  for (let i = 0; i <= 24; i += 3) {
    value = Math.max(2, Math.min(100, value + dir * (1.6 + Math.random() * 1.4) + (Math.random() - 0.5) * 2));
    points.push({
      hour: `+${i}h`,
      risco: Number(value.toFixed(1)),
      limiteCritico: 76,
    });
  }
  return points;
}

export const SENSOR_LABELS = Object.fromEntries(SENSOR_TYPES.map((s) => [s.id, s.label])) as Record<
  SensorType,
  string
>;
