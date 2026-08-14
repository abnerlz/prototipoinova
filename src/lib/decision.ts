import { getSensorMeta } from "@/data/regions";
import type { Alert, RiskAssessment, RiskLevel, Sensor, SensorType } from "@/types";

/**
 * Motor de Apoio à Decisão: converte o diagnóstico técnico (sensores + risco +
 * histórico de alertas) em ações operacionais recomendadas para o gestor.
 */

export type DecisionPriority = "baixa" | "moderada" | "alta" | "critica";

export interface Recommendation {
  id: string;
  action: string;
  priority: DecisionPriority;
  rationale: string;
  /** Prazo sugerido para execução. */
  deadline: string;
}

export const PRIORITY_LABEL: Record<DecisionPriority, string> = {
  baixa: "Baixa",
  moderada: "Moderada",
  alta: "Alta",
  critica: "Crítica",
};

export const PRIORITY_DOT: Record<DecisionPriority, string> = {
  baixa: "🟢",
  moderada: "🟡",
  alta: "🟠",
  critica: "🔴",
};

export const PRIORITY_TOKEN: Record<DecisionPriority, string> = {
  baixa: "risk-low",
  moderada: "risk-medium",
  alta: "risk-high",
  critica: "risk-critical",
};

const PRIORITY_ORDER: DecisionPriority[] = ["critica", "alta", "moderada", "baixa"];

export const STATUS_BY_LEVEL: Record<RiskLevel, string> = {
  baixo: "Normal",
  moderado: "Atenção",
  alto: "Alerta",
  critico: "Emergência",
};

function avg(sensors: Sensor[], type: SensorType) {
  const list = sensors.filter((s) => s.type === type && s.status === "online");
  if (!list.length) return undefined;
  return list.reduce((a, s) => a + s.value, 0) / list.length;
}

/** Chuva acumulada estimada nas últimas 24h (mm) a partir do histórico horário. */
export function rainfall24h(sensors: Sensor[]) {
  const rain = sensors.filter((s) => s.type === "pluviosidade");
  if (!rain.length) return 0;
  const totals = rain.map((s) => s.history.slice(-24).reduce((a, r) => a + r.value, 0));
  return Number((totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1));
}

export interface DecisionInput {
  sensors: Sensor[];
  risk: RiskAssessment;
  alerts: Alert[];
  scopeLabel: string;
  households?: number;
}

export interface DecisionOutput {
  recommendations: Recommendation[];
  summary: string;
  rainfall: number;
  recentAlerts: number;
  topPriority: DecisionPriority;
}

export function buildDecisionSupport(input: DecisionInput): DecisionOutput {
  const { sensors, risk, alerts, scopeLabel, households } = input;
  const rain = rainfall24h(sensors);
  const humidity = avg(sensors, "umidade");
  const airHumidity = avg(sensors, "umidade_ar");
  const tilt = avg(sensors, "inclinacao");
  const vibration = avg(sensors, "vibracao");
  const offline = sensors.filter((s) => s.status !== "online").length;
  const lowBattery = sensors.filter((s) => s.battery < 25).length;

  const day = 24 * 60 * 60 * 1000;
  const recentAlerts = alerts.filter((a) => Date.now() - a.createdAt < 7 * day).length;
  const activeAlerts = alerts.filter((a) => a.status === "ativo").length;

  const recs: Recommendation[] = [];
  const fact = (condition: boolean, text: string) => (condition ? text : "");
  const facts = [
    fact(rain >= 40, `volume de chuva de ${rain} mm nas últimas 24 horas`),
    fact(rain > 0 && rain < 40, `chuva acumulada de ${rain} mm nas últimas 24 horas`),
    humidity !== undefined ? `umidade do solo em ${humidity.toFixed(0)}%` : "",
    airHumidity !== undefined ? `umidade do ar em ${airHumidity.toFixed(0)}%` : "",
  ].filter(Boolean);
  const context = facts.join(", ");

  // Monitoramento — sempre presente, com intensidade proporcional ao risco.
  if (risk.level === "baixo") {
    recs.push({
      id: "monitorar",
      action: "Manter monitoramento de rotina",
      priority: "baixa",
      rationale: `${scopeLabel} opera dentro das faixas de normalidade (${context || "sensores estáveis"}). Nenhuma ação de campo é necessária neste momento.`,
      deadline: "Ciclo padrão (a cada 6h)",
    });
  } else {
    recs.push({
      id: "intensificar",
      action: "Intensificar o monitoramento da área",
      priority: risk.level === "critico" ? "alta" : risk.level === "alto" ? "alta" : "moderada",
      rationale: `Índice de risco em ${risk.score} (${risk.trend}) com ${context}. Reduzir o intervalo de leitura e acompanhar a evolução em tempo real.`,
      deadline: "Imediato",
    });
  }

  // Vistoria em campo.
  if (risk.score >= 35 || (tilt !== undefined && tilt >= 4)) {
    recs.push({
      id: "vistoria",
      action: "Enviar equipe para vistoria técnica",
      priority: risk.level === "critico" ? "alta" : risk.level === "alto" ? "alta" : "moderada",
      rationale: `Sinais de movimentação do solo em ${scopeLabel}${tilt !== undefined ? ` (inclinação ${tilt.toFixed(1)}°)` : ""}. Vistoria presencial confirma trincas, surgências e estabilidade das encostas.`,
      deadline: risk.score >= 35 ? "12h" : "48h",
    });
  }

  // Alerta preventivo à população.
  if (risk.level === "alto" || risk.level === "critico" || (rain >= 50 && risk.level === "moderado")) {
    recs.push({
      id: "alerta-preventivo",
      action: "Emitir alerta preventivo à população",
      priority: risk.level === "critico" ? "critica" : "alta",
      rationale: `A região apresentou ${rain} mm de chuva nas últimas 24 horas, associado à movimentação do solo detectada pelos sensores. Probabilidade de ocorrência em 24h estimada em ${risk.probability24h}%.`,
      deadline: "Imediato",
    });
  }

  // Interdição temporária.
  if (risk.level === "critico" || (risk.level === "alto" && (tilt ?? 0) >= 9)) {
    recs.push({
      id: "interdicao",
      action: "Recomendar interdição temporária de vias e imóveis em encosta",
      priority: risk.level === "critico" ? "critica" : "alta",
      rationale: `Combinação de saturação do solo${humidity !== undefined ? ` (${humidity.toFixed(0)}%)` : ""} e inclinação crescente indica perda de estabilidade. Restringir circulação nas cotas mais altas reduz exposição imediata.`,
      deadline: "Imediato",
    });
  }

  // Evacuação preventiva.
  if (risk.level === "critico") {
    recs.push({
      id: "evacuacao",
      action: "Solicitar evacuação preventiva",
      priority: "critica",
      rationale: `Risco CRÍTICO (${risk.score}/100) em ${scopeLabel}${households ? `, com cerca de ${households.toLocaleString("pt-BR")} domicílios expostos` : ""}. Acionar Defesa Civil e abrigos de apoio antes da evolução do quadro.`,
      deadline: "Imediato",
    });
  }

  // Vibração anômala.
  if (vibration !== undefined && vibration >= 9) {
    recs.push({
      id: "vibracao",
      action: "Investigar fonte de vibração excessiva",
      priority: "moderada",
      rationale: `Vibração média de ${vibration.toFixed(1)} mm/s acima da faixa esperada — verificar obras, tráfego pesado ou colapso incipiente de talude.`,
      deadline: "24h",
    });
  }

  // Histórico da região.
  if (recentAlerts >= 2) {
    recs.push({
      id: "historico",
      action: "Revisar plano de contingência da região",
      priority: activeAlerts > 0 ? "alta" : "moderada",
      rationale: `${recentAlerts} alerta(s) registrados nos últimos 7 dias em ${scopeLabel}. Reincidência indica necessidade de obra de contenção e revisão das rotas de evacuação.`,
      deadline: "7 dias",
    });
  }

  // Manutenção da rede.
  if (offline > 0 || lowBattery > 0) {
    recs.push({
      id: "manutencao",
      action: "Acionar manutenção da rede de sensores",
      priority: offline >= 2 ? "moderada" : "baixa",
      rationale: `${offline} sensor(es) sem comunicação e ${lowBattery} com bateria abaixo de 25%. Cobertura incompleta reduz a confiabilidade do índice de risco.`,
      deadline: "72h",
    });
  }

  recs.sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));

  const topPriority = recs[0]?.priority ?? "baixa";
  const summary =
    risk.level === "critico"
      ? `Cenário crítico em ${scopeLabel}: acionar evacuação preventiva e interdição imediata.`
      : risk.level === "alto"
        ? `Quadro de alerta em ${scopeLabel}: vistoria em campo e comunicado preventivo à população.`
        : risk.level === "moderado"
          ? `Atenção em ${scopeLabel}: intensificar leituras e programar vistoria preventiva.`
          : `Situação normal em ${scopeLabel}: manter rotina de monitoramento.`;

  return { recommendations: recs, summary, rainfall: rain, recentAlerts, topPriority };
}

export const sensorLabel = (type: SensorType) => getSensorMeta(type).label;
