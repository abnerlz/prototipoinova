import { getMunicipality, getNeighborhood } from "@/data/regions";
import { teamsFor } from "@/data/teams";
import { RISK_LABEL } from "@/lib/ai";
import type { Alert, RiskLevel } from "@/types";

/**
 * Ocorrências operacionais: cada alerta emitido gera uma ocorrência de campo
 * com equipe responsável, tempo de resposta e ação executada.
 */

export type OccurrenceStatus = "aberta" | "em-atendimento" | "concluida";

export interface Occurrence {
  id: string;
  createdAt: number;
  municipality: string;
  neighborhood: string;
  level: RiskLevel;
  status: OccurrenceStatus;
  team: string;
  teamContact: string;
  responseMinutes: number;
  action: string;
}

export const OCCURRENCE_STATUS_LABEL: Record<OccurrenceStatus, string> = {
  aberta: "Aberta",
  "em-atendimento": "Em atendimento",
  concluida: "Concluída",
};

const ACTION_BY_LEVEL: Record<RiskLevel, string> = {
  baixo: "Monitoramento remoto intensificado",
  moderado: "Vistoria técnica agendada na encosta",
  alto: "Equipe em campo, área isolada preventivamente",
  critico: "Evacuação preventiva e acionamento da Defesa Civil",
};

/** Tempo de resposta determinístico a partir do id do alerta (sem ruído a cada render). */
function deterministic(id: string, min: number, max: number) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  return min + (Math.abs(h) % (max - min + 1));
}

export function buildOccurrences(alerts: Alert[]): Occurrence[] {
  return alerts.map((alert) => {
    const teams = teamsFor(alert.municipalityId);
    const team =
      teams.find((t) => t.activateAt === alert.level) ??
      teams[Math.min(teams.length - 1, alert.level === "critico" ? teams.length - 1 : 0)];

    const status: OccurrenceStatus =
      alert.status === "encerrado"
        ? "concluida"
        : alert.level === "critico" || alert.level === "alto"
          ? "em-atendimento"
          : "aberta";

    return {
      id: alert.id,
      createdAt: alert.createdAt,
      municipality: getMunicipality(alert.municipalityId)?.name ?? alert.municipalityId,
      neighborhood: getNeighborhood(alert.neighborhoodId)?.name ?? alert.neighborhoodId,
      level: alert.level,
      status,
      team: team?.name ?? "COMDEC — Plantão",
      teamContact: team?.contact ?? "199",
      responseMinutes: deterministic(alert.id, alert.level === "critico" ? 4 : 9, alert.level === "critico" ? 12 : 40),
      action: ACTION_BY_LEVEL[alert.level],
    };
  });
}

export const occurrenceLevelLabel = (level: RiskLevel) => RISK_LABEL[level];
