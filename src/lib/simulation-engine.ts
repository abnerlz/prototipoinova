import type { EnvState } from "@/lib/simulation";
import type { SimulationScenario, SimulationSpeed, SensorType } from "@/types";

/**
 * Motor da simulação controlada (modo apresentação).
 *
 * A evolução é encadeada como no mundo real: chuva → umidade → inclinação →
 * deslocamento → vibração. Cada grandeza só começa a subir depois que a
 * anterior avançou, e nunca todas ao mesmo tempo.
 */

export interface PhaseSpec {
  key: SensorType;
  /** Início da fase no eixo de progresso (0-1). */
  start: number;
  /** Duração da rampa (0-1). */
  ramp: number;
  /** Valor-alvo da grandeza no pico da simulação. */
  target: number;
  label: string;
  message: string;
}

const FULL_CHAIN: PhaseSpec[] = [
  {
    key: "pluviosidade",
    start: 0,
    ramp: 0.22,
    target: 68,
    label: "Chuva intensa",
    message: "Aumento acentuado da pluviosidade sobre a encosta monitorada.",
  },
  {
    key: "umidade",
    start: 0.18,
    ramp: 0.26,
    target: 95,
    label: "Saturação do solo",
    message: "Aumento da umidade do solo devido às chuvas acumuladas.",
  },
  {
    key: "inclinacao",
    start: 0.42,
    ramp: 0.2,
    target: 16,
    label: "Inclinação",
    message: "Pequena inclinação detectada nos inclinômetros da encosta.",
  },
  {
    key: "deslocamento",
    start: 0.58,
    ramp: 0.22,
    target: 44,
    label: "Deslocamento",
    message: "Movimento inicial da encosta registrado pelos extensômetros.",
  },
  {
    key: "vibracao",
    start: 0.76,
    ramp: 0.2,
    target: 11,
    label: "Vibração",
    message: "Aumento das vibrações no maciço — instabilidade em progressão.",
  },
];

const pick = (keys: SensorType[]) => FULL_CHAIN.filter((p) => keys.includes(p.key));

/** Reescalona as fases escolhidas para ocupar todo o eixo de progresso. */
function rescale(phases: PhaseSpec[]): PhaseSpec[] {
  if (!phases.length) return phases;
  const min = Math.min(...phases.map((p) => p.start));
  const max = Math.max(...phases.map((p) => p.start + p.ramp));
  const span = max - min || 1;
  return phases.map((p) => ({
    ...p,
    start: (p.start - min) / span,
    ramp: p.ramp / span,
  }));
}

export const SCENARIOS: Record<
  SimulationScenario,
  { label: string; description: string; phases: PhaseSpec[] }
> = {
  chuva: {
    label: "Chuva Intensa",
    description: "Evento pluviométrico severo com resposta gradual da umidade do solo.",
    phases: rescale(pick(["pluviosidade", "umidade"])),
  },
  saturacao: {
    label: "Saturação do Solo",
    description: "Encharcamento progressivo do maciço até a perda de coesão.",
    phases: rescale(pick(["umidade", "inclinacao"])),
  },
  vibracao: {
    label: "Vibração Excessiva",
    description: "Vibrações crescentes associadas a pequenos movimentos do talude.",
    phases: rescale(pick(["vibracao", "deslocamento"])),
  },
  movimento: {
    label: "Movimento da Encosta",
    description: "Inclinação e deslocamento evoluindo até ruptura iminente.",
    phases: rescale(pick(["inclinacao", "deslocamento", "vibracao"])),
  },
  completa: {
    label: "Simulação Completa",
    description: "Cadeia completa: chuva → umidade → inclinação → deslocamento → vibração.",
    phases: FULL_CHAIN,
  },
};

export const SPEEDS: Record<SimulationSpeed, { label: string; step: number }> = {
  lenta: { label: "Lenta", step: 0.012 },
  normal: { label: "Normal", step: 0.026 },
  rapida: { label: "Rápida", step: 0.055 },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Intensidade (0-1) de cada fase para um dado progresso global. */
export function phaseIntensities(scenario: SimulationScenario, progress: number) {
  return SCENARIOS[scenario].phases.map((phase) => ({
    phase,
    intensity: clamp01((progress - phase.start) / phase.ramp),
  }));
}

const FIELD: Record<SensorType, keyof EnvState> = {
  pluviosidade: "rain",
  umidade: "moisture",
  temperatura: "temperature",
  vibracao: "vibration",
  inclinacao: "tilt",
  deslocamento: "displacement",
};

/**
 * Aplica o cenário sobre o estado ambiental natural do bairro.
 * O estado natural continua evoluindo — a simulação apenas puxa cada grandeza
 * em direção ao alvo conforme a fase correspondente avança.
 */
export function applyScenario(
  state: EnvState,
  baseline: EnvState,
  scenario: SimulationScenario,
  progress: number,
  jitter = 1,
): EnvState {
  const next: EnvState = { ...state };
  const noise = (amp: number) => (Math.random() - 0.5) * 2 * amp;

  phaseIntensities(scenario, progress).forEach(({ phase, intensity }) => {
    if (intensity <= 0) return;
    const field = FIELD[phase.key];
    const current = next[field] as number;
    const base = baseline[field] as number;

    // Rampa suavizada (ease-in-out) + micro-oscilação: a grandeza avança em
    // degraus, com pequenos recuos, como um sensor real em campo.
    const eased = intensity * intensity * (3 - 2 * intensity);
    // Oscilação natural: respiração lenta + micro-ondulação rápida. Produz
    // subidas, pequenos recuos e patamares — nunca uma rampa contínua.
    const breath =
      1 +
      Math.sin(progress * 9 + phase.start * 7) * 0.05 +
      Math.sin(progress * 31 + phase.start * 3) * 0.025;
    const target = Math.max(base, phase.target * jitter) * breath;
    const desired = lerp(base, target, eased);

    // Aproximação gradual e lenta do alvo — pode subir ou cair a cada ciclo.
    const rate = 0.14 + eased * 0.16;
    (next[field] as number) = Math.max(
      0,
      current + (desired - current) * rate + noise(Math.max(0.02, desired * 0.035)),
    );
  });

  // A temperatura acompanha a chuva (cai quando chove forte).
  if (next.rain > state.rain + 1) {
    next.temperature = Math.max(22, next.temperature - 0.15);
  }
  return next;
}

/** Rótulo da fase atualmente dominante. */
export function currentPhaseLabel(scenario: SimulationScenario, progress: number) {
  const active = phaseIntensities(scenario, progress).filter((p) => p.intensity > 0 && p.intensity < 1);
  if (active.length) return active[active.length - 1].phase.label;
  const done = phaseIntensities(scenario, progress).filter((p) => p.intensity >= 1);
  return done.length ? done[done.length - 1].phase.label : "Preparando cenário";
}

export const SCENARIO_LABEL = (s: SimulationScenario) => SCENARIOS[s].label;
export const SPEED_LABEL = (s: SimulationSpeed) => SPEEDS[s].label;
