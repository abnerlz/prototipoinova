import { MUNICIPALITIES, NEIGHBORHOODS, SENSOR_TYPES, getMunicipality } from "@/data/regions";
import type { Sensor, SensorReading, SensorType } from "@/types";

/**
 * Simulador físico simplificado (comportamento de sensores reais).
 *
 * Cada grandeza persegue um valor de equilíbrio que depende do clima e do
 * terreno, com inércia + ruído. Isso produz séries que sobem, descem e ficam
 * estáveis — nunca uma rampa contínua.
 */

export interface EnvState {
  neighborhoodId: string;
  rain: number; // mm/h
  moisture: number; // % (umidade do solo)
  temperature: number; // °C
  vibration: number; // mm/s
  tilt: number; // graus
  displacement: number; // mm
  stormPhase: number; // 0..1 intensidade do evento de chuva
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** PRNG determinístico para gerar históricos reprodutíveis. */
export function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const hash = (value: string) => {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h) + 1;
};

/** Faixas de operação normal (usadas também pelo modelo de risco). */
export const RANGES = {
  temperature: [22, 33] as const,
  moisture: [30, 100] as const,
  rain: [0, 90] as const,
  vibration: [0, 20] as const,
  tilt: [0, 25] as const,
  displacement: [0, 60] as const,
};

export function createEnvState(neighborhoodId: string, susceptibility: number, salt = 0): EnvState {
  const rnd = seeded(hash(neighborhoodId) + salt);
  // Cada execução começa em um ponto diferente da faixa realista.
  const stormPhase = rnd() < 0.25 ? rnd() * 0.6 : rnd() * 0.12;
  const rain = clamp(stormPhase * 48 + rnd() * 2, 0, 80);
  const moisture = clamp(34 + rain * 0.8 + susceptibility * 14 + (rnd() - 0.5) * 10, 30, 100);
  const saturation = clamp((moisture - 62) / 38, 0, 1);
  return {
    neighborhoodId,
    rain,
    moisture,
    temperature: clamp(30 - rain * 0.12 + (rnd() - 0.5) * 4, 22, 33),
    vibration: clamp(0.4 + saturation * 3 + rnd() * 0.8, 0, 20),
    tilt: clamp(0.9 + susceptibility * 1.1 + saturation * saturation * 5 + (rnd() - 0.5) * 0.4, 0, 25),
    displacement: clamp(susceptibility * 3 + saturation ** 1.5 * 22 + rnd() * 2, 0, 60),
    stormPhase,
  };
}

/**
 * Avança o estado ambiental um passo de tempo (dt em horas).
 * Todas as grandezas são "mean-reverting": podem subir, cair ou oscilar.
 */
export function stepEnv(state: EnvState, susceptibility: number, dt = 0.25): EnvState {
  const jitter = (amp: number) => (Math.random() - 0.5) * 2 * amp;
  const approach = (current: number, target: number, rate: number) =>
    current + (target - current) * clamp(rate * dt, 0, 0.9);

  // --- Clima: eventos de chuva que começam, evoluem e passam ---------------
  let stormPhase = state.stormPhase;
  if (Math.random() < 0.06 * dt) stormPhase = clamp(stormPhase + 0.25 + Math.random() * 0.5, 0, 1);
  stormPhase = clamp(stormPhase - stormPhase * 0.22 * dt + jitter(0.02), 0, 1);

  const rainTarget = stormPhase > 0.06 ? stormPhase * 55 : Math.random() < 0.25 ? Math.random() * 1.5 : 0;
  const rain = clamp(approach(state.rain, rainTarget, 1.6) + jitter(0.7), 0, 90);

  // --- Umidade do solo: infiltra rápido, drena devagar ----------------------
  const moistureEq = clamp(36 + rain * 0.9 + susceptibility * 14, 30, 100);
  const rate = moistureEq > state.moisture ? 0.9 : 0.28 * (1 - susceptibility * 0.4);
  const moisture = clamp(approach(state.moisture, moistureEq, rate) + jitter(0.5), 30, 100);

  // --- Temperatura: cai na chuva, sobe no tempo seco ------------------------
  const temperature = clamp(approach(state.temperature, rain > 4 ? 23.5 : 30, 0.6) + jitter(0.3), 22, 33);

  // --- Resposta geotécnica --------------------------------------------------
  const saturation = clamp((moisture - 62) / 38, 0, 1);

  const tiltEq = clamp(0.9 + susceptibility * 1.1 + saturation * saturation * 6, 0, 25);
  const tilt = clamp(approach(state.tilt, tiltEq, 0.22) + jitter(0.05), 0, 25);

  const displacementEq = clamp(susceptibility * 3 + saturation ** 1.5 * 30, 0, 60);
  const displacement = clamp(approach(state.displacement, displacementEq, 0.15) + jitter(0.2), 0, 60);

  const vibrationEq = clamp(0.4 + saturation * 4 + displacement * 0.06, 0, 20);
  const vibration = clamp(approach(state.vibration, vibrationEq, 0.7) + jitter(0.35), 0, 20);

  return { ...state, rain, moisture, temperature, tilt, displacement, vibration, stormPhase };
}

export function envValue(state: EnvState, type: SensorType): number {
  switch (type) {
    case "pluviosidade":
      return state.rain;
    case "umidade":
      return state.moisture;
    case "temperatura":
      return state.temperature;
    case "vibracao":
      return state.vibration;
    case "inclinacao":
      return state.tilt;
    case "deslocamento":
      return state.displacement;
  }
}

const HISTORY_POINTS = 168; // 7 dias em passos horários

/** Gera histórico horário coerente (subidas, quedas e platôs). */
function buildHistory(state: EnvState, susceptibility: number, type: SensorType, seed: number): SensorReading[] {
  const rnd = seeded(seed);
  let sim: EnvState = { ...state, stormPhase: rnd() * 0.4 };
  const now = Date.now();
  const readings: SensorReading[] = [];
  for (let i = HISTORY_POINTS; i > 0; i -= 1) {
    sim = stepEnv(sim, susceptibility, 1);
    readings.push({
      timestamp: now - i * 3600_000,
      value: Number(envValue(sim, type).toFixed(2)),
    });
  }
  readings.push({ timestamp: now, value: Number(envValue(state, type).toFixed(2)) });
  return readings;
}

export function createSensors(states: Record<string, EnvState>, salt = 0): Sensor[] {
  const sensors: Sensor[] = [];
  NEIGHBORHOODS.forEach((neighborhood, nIndex) => {
    const state = states[neighborhood.id];
    SENSOR_TYPES.forEach((meta, tIndex) => {
      const rnd = seeded(hash(neighborhood.id + meta.id) + salt);
      const offline = rnd() > 0.94;
      const code = `${neighborhood.municipalityId.slice(0, 3).toUpperCase()}-${String(nIndex + 1).padStart(2, "0")}${String(tIndex + 1)}`;
      sensors.push({
        id: `${neighborhood.id}-${meta.id}`,
        code,
        name: `${meta.label} · ${neighborhood.name}`,
        type: meta.id,
        status: offline ? "offline" : rnd() > 0.97 ? "manutencao" : "online",
        municipalityId: neighborhood.municipalityId,
        neighborhoodId: neighborhood.id,
        position: {
          lat: neighborhood.center.lat + (rnd() - 0.5) * 0.006,
          lng: neighborhood.center.lng + (rnd() - 0.5) * 0.006,
        },
        battery: Math.round(45 + rnd() * 55),
        signal: Math.round(35 + rnd() * 65),
        value: Number(envValue(state, meta.id).toFixed(2)),
        unit: meta.unit,
        lastUpdate: Date.now(),
        history: buildHistory(
          state,
          neighborhood.susceptibility,
          meta.id,
          hash(neighborhood.id + meta.id) + salt,
        ),
      });
    });
  });
  return sensors;
}

export function createInitialStates(salt = 0): Record<string, EnvState> {
  const states: Record<string, EnvState> = {};
  NEIGHBORHOODS.forEach((n) => {
    states[n.id] = createEnvState(n.id, n.susceptibility, salt);
  });
  return states;
}

export const MUNICIPALITY_COUNT = MUNICIPALITIES.length;
export const municipalityName = (id: string) => getMunicipality(id)?.name ?? id;
