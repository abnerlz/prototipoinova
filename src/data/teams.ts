import type { RiskLevel } from "@/types";

export interface FieldTeam {
  id: string;
  name: string;
  role: string;
  contact: string;
  base: string;
  /** Nível a partir do qual a equipe é acionada. */
  activateAt: RiskLevel;
}

/** Equipes responsáveis por município (dados operacionais de referência). */
export const TEAMS_BY_MUNICIPALITY: Record<string, FieldTeam[]> = {
  recife: [
    { id: "rec-cod", name: "COMDEC Recife — Plantão", role: "Coordenação de operações", contact: "199", base: "Cais do Apolo", activateAt: "moderado" },
    { id: "rec-geo", name: "Equipe Geotécnica A", role: "Vistoria de encostas", contact: "(81) 3355-0100", base: "Casa Amarela", activateAt: "alto" },
    { id: "rec-cbm", name: "1º Batalhão CBMPE", role: "Resgate e evacuação", contact: "193", base: "Santo Amaro", activateAt: "critico" },
  ],
  olinda: [
    { id: "oli-cod", name: "COMDEC Olinda — Plantão", role: "Coordenação de operações", contact: "199", base: "Bairro Novo", activateAt: "moderado" },
    { id: "oli-geo", name: "Equipe Geotécnica Norte", role: "Vistoria de encostas", contact: "(81) 3305-1122", base: "Passarinho", activateAt: "alto" },
  ],
};

export const DEFAULT_TEAMS: FieldTeam[] = [
  { id: "rmr-cod", name: "CODECIPE — Plantão Estadual", role: "Coordenação regional", contact: "199", base: "Recife", activateAt: "moderado" },
  { id: "rmr-cbm", name: "CBMPE — Grupamento de Busca", role: "Resgate e evacuação", contact: "193", base: "Recife", activateAt: "critico" },
];

export const teamsFor = (municipalityId?: string) =>
  (municipalityId && TEAMS_BY_MUNICIPALITY[municipalityId]) || DEFAULT_TEAMS;
