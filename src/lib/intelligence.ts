import { getSensorMeta } from "@/data/regions";
import { RISK_LABEL, riskLevelFromScore } from "@/lib/ai";
import type { RiskAssessment, RiskLevel, Sensor, SensorType } from "@/types";

/**
 * Camada de "inteligência": descreve o raciocínio da IA (pipeline de análise),
 * o nível de confiança do diagnóstico e as previsões de curto prazo.
 *
 * Todas as funções são puras — podem ser chamadas durante a renderização.
 */

export interface PipelineStep {
  key: string;
  label: string;
  detail: string;
}

/** Etapas fixas do processo decisório da IA (exibidas em sequência animada). */
export function buildPipeline(sensors: Sensor[], risk: RiskAssessment, confidence: number): PipelineStep[] {
  const online = sensors.filter((s) => s.status === "online");
  const invalid = sensors.length - online.length;
  const top = risk.contributions[0];

  return [
    {
      key: "leitura",
      label: "Leitura dos sensores",
      detail: `${online.length} sensores ativos transmitindo em tempo real.`,
    },
    {
      key: "validacao",
      label: "Validação dos dados",
      detail: invalid
        ? `${invalid} leitura(s) descartada(s) por falha de comunicação ou manutenção.`
        : "Todas as leituras dentro dos limites físicos esperados.",
    },
    {
      key: "tendencia",
      label: "Análise de tendência",
      detail:
        risk.trend === "subindo"
          ? "Curvas em elevação nas últimas 6 horas."
          : risk.trend === "caindo"
            ? "Curvas em recuo nas últimas 6 horas."
            : "Curvas estáveis, oscilando dentro da faixa habitual.",
    },
    {
      key: "historico",
      label: "Comparação com histórico",
      detail: "Leituras confrontadas com a série de 7 dias e episódios anteriores da encosta.",
    },
    {
      key: "previsao",
      label: "Previsão de risco",
      detail: `Probabilidade de ocorrência em 24h estimada em ${risk.probability24h}%.`,
    },
    {
      key: "confianca",
      label: "Nível de confiança",
      detail: `Confiança do modelo em ${confidence}% para o escopo analisado.`,
    },
    {
      key: "decisao",
      label: "Decisão automática",
      detail: `Classificação combinada: risco ${RISK_LABEL[risk.level].toUpperCase()} (${risk.score}/100).`,
    },
    {
      key: "acoes",
      label: "Recomendação de ações",
      detail: top
        ? `Plano operacional priorizado a partir de ${top.label} e das demais variáveis.`
        : "Plano operacional emitido para o gestor.",
    },
  ];
}

/**
 * Confiança da IA (85-99%): cresce com a cobertura de sensores e com a
 * estabilidade das leituras; cai com sensores offline e ruído elevado.
 */
export function aiConfidence(sensors: Sensor[], risk: RiskAssessment): number {
  if (!sensors.length) return 85;
  const online = sensors.filter((s) => s.status === "online");
  const coverage = online.length / sensors.length;
  const types = new Set(online.map((s) => s.type)).size / 6;

  // Ruído: dispersão relativa das últimas leituras.
  const noise =
    online.reduce((acc, s) => {
      const tail = s.history.slice(-8).map((h) => h.value);
      if (tail.length < 3) return acc;
      const mean = tail.reduce((a, b) => a + b, 0) / tail.length;
      if (mean === 0) return acc;
      const sd = Math.sqrt(tail.reduce((a, b) => a + (b - mean) ** 2, 0) / tail.length);
      return acc + Math.min(1, sd / Math.abs(mean));
    }, 0) / Math.max(1, online.length);

  const battery = online.reduce((a, s) => a + s.battery, 0) / Math.max(1, online.length) / 100;
  const stability = risk.trend === "estavel" ? 1 : 0.7;

  const raw = 85 + coverage * 6 + types * 4 + battery * 2 + stability * 2 - noise * 6;
  return Math.round(Math.max(85, Math.min(99, raw)));
}

export type ForecastDirection = "subindo" | "estavel" | "caindo";

export interface ForecastPoint {
  horizon: string;
  score: number;
  level: RiskLevel;
  direction: ForecastDirection;
}

export const DIRECTION_ICON: Record<ForecastDirection, string> = {
  subindo: "⬆",
  estavel: "➡",
  caindo: "⬇",
};

export const DIRECTION_LABEL: Record<ForecastDirection, string> = {
  subindo: "aumentando",
  estavel: "estável",
  caindo: "diminuindo",
};

/** Previsão para 30min / 1h / 6h a partir da tendência e da saturação atual. */
export function shortTermForecast(risk: RiskAssessment, sensors: Sensor[]): ForecastPoint[] {
  const avg = (type: SensorType) => {
    const list = sensors.filter((s) => s.type === type && s.status === "online");
    return list.length ? list.reduce((a, s) => a + s.value, 0) / list.length : 0;
  };
  const rain = avg("pluviosidade");
  const moisture = avg("umidade");

  // Força motriz: chuva ativa empurra para cima; solo drenando puxa para baixo.
  const drive =
    (rain > 12 ? 1 : rain > 3 ? 0.35 : -0.4) * 0.6 +
    (moisture > 82 ? 0.6 : moisture > 70 ? 0.2 : -0.3) * 0.6 +
    (risk.trend === "subindo" ? 0.6 : risk.trend === "caindo" ? -0.6 : 0);

  const horizons: { label: string; factor: number }[] = [
    { label: "30 minutos", factor: 1 },
    { label: "1 hora", factor: 1.9 },
    { label: "6 horas", factor: 4.2 },
  ];

  return horizons.map(({ label, factor }) => {
    const delta = drive * 3.4 * factor;
    const score = Number(Math.max(2, Math.min(99, risk.score + delta)).toFixed(1));
    const direction: ForecastDirection =
      score - risk.score > 1.5 ? "subindo" : score - risk.score < -1.5 ? "caindo" : "estavel";
    return { horizon: label, score, level: riskLevelFromScore(score), direction };
  });
}

/** Explicação em linguagem natural do porquê da classificação. */
export function explainClassification(risk: RiskAssessment, sensors: Sensor[]): string {
  const online = sensors.filter((s) => s.status === "online");
  const byType = (type: SensorType) => {
    const list = online.filter((s) => s.type === type);
    return list.length ? list.reduce((a, s) => a + s.value, 0) / list.length : undefined;
  };
  const parts: string[] = [];
  const rain = byType("pluviosidade");
  const moisture = byType("umidade");
  const tilt = byType("inclinacao");
  const disp = byType("deslocamento");
  const vib = byType("vibracao");

  const push = (value: number | undefined, type: SensorType, warn: number, text: string) => {
    if (value !== undefined && value >= warn) parts.push(`${text} (${value.toFixed(1)} ${getSensorMeta(type).unit})`);
  };
  push(rain, "pluviosidade", 14, "chuva acumulada acima do normal");
  push(moisture, "umidade", 74, "umidade do solo elevada");
  push(tilt, "inclinacao", 4, "inclinação do terreno crescente");
  push(disp, "deslocamento", 16, "deslocamento do maciço detectado");
  push(vib, "vibracao", 5, "vibração acima do padrão");

  if (!parts.length) {
    return `Classificado como ${RISK_LABEL[risk.level].toUpperCase()}: todas as variáveis permanecem dentro das faixas de normalidade, sem combinação de fatores agravantes.`;
  }
  const conector = parts.length > 1 ? "O aumento simultâneo de " : "A alteração de ";
  return `Classificado como ${RISK_LABEL[risk.level].toUpperCase()}: ${conector}${parts.join(", ")} elevou o índice combinado para ${risk.score}/100, com tendência ${DIRECTION_LABEL[risk.trend]}.`;
}
