import { NEIGHBORHOODS, SENSOR_TYPES, STATION } from "@/data/regions";
import type { Sensor, SensorReading, SensorType } from "@/types";

/**
 * Simulador físico simplificado do Ponto de Monitoramento 01.
 *
 * Cada grandeza persegue um valor de equilíbrio que depende do clima e do
 * terreno, com inércia + ruído. Isso produz séries que sobem, descem e ficam
 * estáveis — nunca uma rampa contínua.
 */

export interface EnvState {
  neighborhoodId: string;
  rain: number; // mm/h
  moisture: number; // % (umidade do solo)
  airHumidity: number; // % (umidade do ar)
  temperature: number; // °C
  vibration: number; // mm/s
  tilt: number; // graus
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
  airHumidity: [40, 100] as const,
  rain: [0, 90] as const,
  vibration: [0, 20] as const,
  tilt: [0, 25] as const,
};

export function createEnvState(neighborhoodId: string, susceptibility: number, salt = 0): EnvState {
  const rnd = seeded(hash(neighborhoodId) + salt);
  const stormPhase = rnd() < 0.25 ? rnd() * 0.5 : rnd() * 0.1;
  const rain = clamp(stormPhase * 42 + rnd() * 2, 0, 80);
  const moisture = clamp(34 + rain * 0.8 + susceptibility * 12 + (rnd() - 0.5) * 10, 30, 100);
  const saturation = clamp((moisture - 62) / 38, 0, 1);
  return {
    neighborhoodId,
    rain,
    moisture,
    airHumidity: clamp(58 + rain * 0.9 + (rnd() - 0.5) * 12, 40, 100),
    temperature: clamp(30 - rain * 0.12 + (rnd() - 0.5) * 4, 22, 33),
    vibration: clamp(0.4 + saturation * 2.4 + rnd() * 0.7, 0, 20),
    tilt: clamp(0.9 + susceptibility * 1.1 + saturation * saturation * 4 + (rnd() - 0.5) * 0.4, 0, 25),
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
  if (Math.random() < 0.05 * dt) stormPhase = clamp(stormPhase + 0.2 + Math.random() * 0.4, 0, 1);
  stormPhase = clamp(stormPhase - stormPhase * 0.22 * dt + jitter(0.02), 0, 1);

  const rainTarget = stormPhase > 0.06 ? stormPhase * 50 : Math.random() < 0.25 ? Math.random() * 1.5 : 0;
  const rain = clamp(approach(state.rain, rainTarget, 1.6) + jitter(0.7), 0, 90);

  // --- Umidade do solo: infiltra rápido, drena devagar ----------------------
  const moistureEq = clamp(36 + rain * 0.9 + susceptibility * 12, 30, 100);
  const rate = moistureEq > state.moisture ? 0.9 : 0.28 * (1 - susceptibility * 0.4);
  const moisture = clamp(approach(state.moisture, moistureEq, rate) + jitter(0.5), 30, 100);

  // --- Umidade do ar: acompanha a chuva, com resposta rápida ---------------
  const airEq = clamp(58 + rain * 1.1, 40, 99);
  const airHumidity = clamp(approach(state.airHumidity, airEq, 1.1) + jitter(0.8), 40, 100);

  // --- Temperatura: cai na chuva, sobe no tempo seco ------------------------
  const temperature = clamp(approach(state.temperature, rain > 4 ? 23.5 : 30, 0.6) + jitter(0.3), 22, 33);

  // --- Resposta geotécnica --------------------------------------------------
  const saturation = clamp((moisture - 62) / 38, 0, 1);

  const tiltEq = clamp(0.9 + susceptibility * 1.1 + saturation * saturation * 6, 0, 25);
  const tilt = clamp(approach(state.tilt, tiltEq, 0.22) + jitter(0.05), 0, 25);

  const vibrationEq = clamp(0.4 + saturation * 4 + tilt * 0.15, 0, 20);
  const vibration = clamp(approach(state.vibration, vibrationEq, 0.7) + jitter(0.35), 0, 20);

  return { ...state, rain, moisture, airHumidity, temperature, tilt, vibration, stormPhase };
}

export function envValue(state: EnvState, type: SensorType): number {
  switch (type) {
    case "pluviosidade":
      return state.rain;
    case "umidade":
      return state.moisture;
    case "umidade_ar":
      return state.airHumidity;
    case "temperatura":
      return state.temperature;
    case "vibracao":
      return state.vibration;
    case "inclinacao":
      return state.tilt;
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

/** Os seis sensores do protótipo, todos pertencentes ao Ponto 01. */
export function createSensors(states: Record<string, EnvState>, salt = 0): Sensor[] {
  const state = states[STATION.id];
  return SENSOR_TYPES.map((meta, index) => {
    const rnd = seeded(hash(STATION.id + meta.id) + salt);
    return {
      id: `${STATION.id}-${meta.id}`,
      code: `PM01-S${String(index + 1).padStart(2, "0")}`,
      name: meta.label,
      type: meta.id,
      status: "online" as const,
      municipalityId: STATION.municipalityId,
      neighborhoodId: STATION.id,
      position: { lat: STATION.center.lat, lng: STATION.center.lng },
      battery: Math.round(70 + rnd() * 30),
      signal: Math.round(70 + rnd() * 30),
      value: Number(envValue(state, meta.id).toFixed(2)),
      unit: meta.unit,
      lastUpdate: Date.now(),
      history: buildHistory(state, STATION.susceptibility, meta.id, hash(STATION.id + meta.id) + salt),
    };
  });
}

export function createInitialStates(salt = 0): Record<string, EnvState> {
  const states: Record<string, EnvState> = {};
  NEIGHBORHOODS.forEach((n) => {
    states[n.id] = createEnvState(n.id, n.susceptibility, salt);
  });
  return states;
}

export const MUNICIPALITY_COUNT = 1;
export const municipalityName = () => "Recife";
