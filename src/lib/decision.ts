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

/** Não calcula acumulado sem uma série que cubra as 24 horas completas. */
export function rainfall24h(sensors: Sensor[]) {
  void sensors;
  return null; // A leitura atual está em mm/h; falta integrar a série para obter mm acumulados.
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
  rainfall: number | null;
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
  const lowBattery = sensors.filter((s) => s.battery !== null && s.battery < 25).length;

  const day = 24 * 60 * 60 * 1000;
  const recentAlerts = alerts.filter((a) => Date.now() - a.createdAt < 7 * day).length;
  const activeAlerts = alerts.filter((a) => a.status === "ativo").length;

  const recs: Recommendation[] = [];
  const fact = (condition: boolean, text: string) => (condition ? text : "");
  const facts = [
    fact(rain !== null, `chuva acumulada medida nas últimas 24 horas: ${rain ?? "indisponível"} mm`),
    humidity !== undefined ? `umidade do solo em ${humidity.toFixed(0)}%` : "",
    airHumidity !== undefined ? `umidade do ar em ${airHumidity.toFixed(0)}%` : "",
  ].filter(Boolean);
  const context = facts.join(", ");

  // Monitoramento — sempre presente, com intensidade proporcional ao risco.
  if (risk.level === "baixo") {
    recs.push({
      id: "monitorar",
      action: "Conferir a qualidade dos dados e manter a rotina definida pela equipe",
      priority: "baixa",
      rationale: `O índice experimental está baixo (${context || "sem alterações detectadas"}). Isso não confirma segurança da área; siga o protocolo local e verifique se as leituras estão atualizadas.`,
      deadline: "Conforme protocolo local",
    });
  } else {
    recs.push({
      id: "intensificar",
      action: "Revisar as leituras e o intervalo de monitoramento",
      priority: risk.level === "critico" ? "alta" : risk.level === "alto" ? "alta" : "moderada",
      rationale: `Índice experimental em ${risk.score} (${risk.trend}) com ${context || "contexto incompleto"}. Confirme os dados com a equipe responsável e aplique o protocolo local.`,
      deadline: "Revisão humana necessária",
    });
  }

  // Vistoria em campo.
  if (risk.score >= 35 || (tilt !== undefined && tilt >= 4)) {
    recs.push({
      id: "vistoria",
      action: "Solicitar avaliação técnica da área",
      priority: risk.level === "critico" ? "alta" : risk.level === "alto" ? "alta" : "moderada",
      rationale: `O índice experimental ou a leitura de inclinação merece conferência. A equipe habilitada deve avaliar o local e validar os dados antes de concluir sobre a estabilidade.`,
      deadline: "Definido pela equipe responsável",
    });
  }

  // Revisão técnica humana, sem emissão automática de alerta público.
  if (risk.level === "alto" || risk.level === "critico" || (rain !== null && rain >= 50 && risk.level === "moderado")) {
    recs.push({
      id: "alerta-preventivo",
      action: "Solicitar revisão de profissional responsável",
      priority: risk.level === "critico" ? "critica" : "alta",
      rationale: `O índice experimental está elevado. Confirme a qualidade das leituras e siga o protocolo oficial da Defesa Civil antes de qualquer ação. Chuva acumulada e probabilidade não estão validadas neste protótipo.`,
      deadline: "Revisão humana necessária",
    });
  }

  // Interdição temporária.
  if (risk.level === "critico" || (risk.level === "alto" && (tilt ?? 0) >= 9)) {
    recs.push({
      id: "interdicao",
      action: "Revisar presencialmente conforme protocolo oficial",
      priority: risk.level === "critico" ? "critica" : "alta",
      rationale: `O índice experimental exige conferência técnica. O sistema não determina interdição; essa decisão cabe à autoridade competente após vistoria.`,
      deadline: "Revisão humana necessária",
    });
  }

  // Evacuação preventiva.
  if (risk.level === "critico") {
    recs.push({
      id: "evacuacao",
      action: "Conferir leituras e encaminhar para avaliação da Defesa Civil",
      priority: "critica",
      rationale: `Índice experimental crítico (${risk.score}/100) em ${scopeLabel}${households ? `; cadastro indica cerca de ${households.toLocaleString("pt-BR")} domicílios` : ""}. Validar sensores e encaminhar para avaliação humana. Não é uma ordem de evacuação.`,
      deadline: "Revisão humana necessária",
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
      ? `Índice experimental crítico em ${scopeLabel}: requer revisão humana; não é ordem de evacuação ou interdição.`
      : risk.level === "alto"
        ? `Índice elevado em ${scopeLabel}: conferir dados e encaminhar para avaliação técnica.`
        : risk.level === "moderado"
          ? `Atenção em ${scopeLabel}: intensificar leituras e programar vistoria preventiva.`
          : `Situação normal em ${scopeLabel}: manter rotina de monitoramento.`;

  return { recommendations: recs, summary, rainfall: rain, recentAlerts, topPriority };
}

export const sensorLabel = (type: SensorType) => getSensorMeta(type).label;
