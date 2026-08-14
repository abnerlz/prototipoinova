/**
 * Tipos globais do sistema de monitoramento de deslizamentos.
 */

export type SensorType =
  | "pluviosidade"
  | "umidade"
  | "umidade_ar"
  | "temperatura"
  | "inclinacao"
  | "vibracao";


export type SensorStatus = "online" | "offline" | "manutencao";

export type RiskLevel = "baixo" | "moderado" | "alto" | "critico";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Municipality {
  id: string;
  name: string;
  center: Coordinates;
  population: number;
}

export interface Neighborhood {
  id: string;
  name: string;
  municipalityId: string;
  center: Coordinates;
  /** Suscetibilidade geológica base do bairro (0-1). */
  susceptibility: number;
  households: number;
}

export interface SensorReading {
  timestamp: number;
  value: number;
}

export interface Sensor {
  id: string;
  code: string;
  name: string;
  type: SensorType;
  status: SensorStatus;
  municipalityId: string;
  neighborhoodId: string;
  position: Coordinates;
  battery: number;
  signal: number;
  value: number;
  unit: string;
  lastUpdate: number;
  history: SensorReading[];
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  probability24h: number;
  /** Contribuição de cada tipo de sensor para o índice (0-100). */
  contributions: { type: SensorType; label: string; weight: number; value: number; unit: string }[];
  reasons: string[];
  trend: "subindo" | "estavel" | "caindo";
}

export interface Alert {
  id: string;
  municipalityId: string;
  neighborhoodId: string;
  level: RiskLevel;
  description: string;
  sensorIds: string[];
  createdAt: number;
  closedAt?: number;
  status: "ativo" | "encerrado";
  origin: "ia" | "manual";
}

export interface PeriodOption {
  id: "24h" | "7d" | "30d";
  label: string;
  hours: number;
}

export interface Filters {
  municipalityId: string | "all";
  neighborhoodId: string | "all";
  sensorType: SensorType | "all";
  period: PeriodOption["id"];
}

/* ---------------- Simulação controlada (modo apresentação) ---------------- */

export type SimulationScenario =
  | "chuva"
  | "saturacao"
  | "vibracao"
  | "movimento"
  | "completa";

export type SimulationSpeed = "lenta" | "normal" | "rapida";

export type SimulationPhaseKey = SensorType;

export interface SimulationEvent {
  timestamp: number;
  message: string;
  level: RiskLevel;
  score: number;
}

export interface SimulationRecord {
  id: string;
  scenario: SimulationScenario;
  speed: SimulationSpeed;
  municipalityId: string;
  neighborhoodId: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  peakScore: number;
  peakLevel: RiskLevel;
  events: SimulationEvent[];
}

export interface SimulationState {
  active: boolean;
  /** true enquanto os sensores retornam gradualmente ao normal. */
  recovering: boolean;
  scenario: SimulationScenario;
  speed: SimulationSpeed;
  municipalityId: string;
  neighborhoodId: string;
  startedAt: number;
  progress: number;
  currentPhase: string;
  peakScore: number;
  events: SimulationEvent[];
}
