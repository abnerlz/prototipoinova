import { MUNICIPALITIES, NEIGHBORHOODS, SENSOR_TYPES, getMunicipality } from "@/data/regions";
import type { Sensor, SensorReading, SensorType } from "@/types";

/**
 * Simulador físico simplificado.
 *
 * A ideia central é que as grandezas NÃO são aleatórias e independentes:
 * chuva -> umidade do solo -> inclinação/deslocamento -> vibração.
 * Cada bairro possui um estado ambiental próprio que evolui no tempo.
 */

export interface EnvState {
  neighborhoodId: string;
  rain: number; // mm/h
  moisture: number; // %
  temperature: number; // °C
  vibration: number; // mm/s
  tilt: number; // graus
  displacement: number; // mm
  stormPhase: number; // 0..1 intensidade de evento de chuva
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

export function createEnvState(neighborhoodId: string, susceptibility: number): EnvState {
  const rnd = seeded(hash(neighborhoodId));
  const stormPhase = rnd() * susceptibility;
  const rain = clamp(stormPhase * 55 + rnd() * 6, 0, 80);
  const moisture = clamp(38 + rain * 0.7 + susceptibility * 18 + rnd() * 8, 10, 100);
  return {
    neighborhoodId,
    rain,
    moisture,
    temperature: clamp(28 - rain * 0.08 + rnd() * 3, 18, 40),
    vibration: clamp((moisture - 40) * 0.06 + rnd() * 1.6, 0, 20),
    tilt: clamp(susceptibility * 6 + (moisture - 50) * 0.05 + rnd() * 1.2, 0, 25),
    displacement: clamp(susceptibility * 10 + (moisture - 45) * 0.25 + rnd() * 3, 0, 60),
    stormPhase,
  };
}

/** Avança o estado ambiental um passo de tempo (dt em horas). */
export function stepEnv(state: EnvState, susceptibility: number, dt = 1 / 60): EnvState {
  const noise = () => (Math.random() - 0.5) * 2;

  // Evento de chuva: sobe e desce lentamente, com chance de novas tempestades.
  let stormPhase = state.stormPhase + (Math.random() < 0.015 * dt * 60 ? 0.25 : 0) - 0.04 * dt;
  stormPhase = clamp(stormPhase + noise() * 0.01, 0, 1);

  const rain = clamp(state.rain + (stormPhase * 62 - state.rain) * 0.25 * dt * 6 + noise() * 0.6, 0, 90);

  // Umidade acompanha a chuva com inércia e drena lentamente quando não chove.
  const infiltration = rain * 0.55 * dt * 6;
  const drainage = (state.moisture - 32) * 0.05 * dt * 6 * (1 - susceptibility * 0.4);
  const moisture = clamp(state.moisture + infiltration - drainage + noise() * 0.2, 10, 100);

  // Temperatura cai com chuva e sobe em tempo seco.
  const temperature = clamp(
    state.temperature + ((rain > 5 ? 23 : 31) - state.temperature) * 0.08 * dt * 6 + noise() * 0.15,
    18,
    40,
  );

  // Saturação do solo destrava movimento de massa.
  const saturation = clamp((moisture - 55) / 45, 0, 1);
  const tilt = clamp(
    state.tilt + saturation * susceptibility * 0.35 * dt * 6 - 0.02 * dt * 6 + noise() * 0.05,
    0,
    25,
  );
  const displacement = clamp(
    state.displacement + saturation * susceptibility * 1.6 * dt * 6 - 0.05 * dt * 6 + noise() * 0.12,
    0,
    60,
  );
  const vibration = clamp(
    (displacement * 0.18 + tilt * 0.25 + saturation * 3) * (0.85 + Math.random() * 0.3),
    0,
    20,
  );

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

/** Gera histórico horário coerente retroagindo a partir do estado atual. */
function buildHistory(state: EnvState, susceptibility: number, type: SensorType, seed: number): SensorReading[] {
  const rnd = seeded(seed);
  let sim: EnvState = { ...state, stormPhase: rnd() * susceptibility };
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

export function createSensors(states: Record<string, EnvState>): Sensor[] {
  const sensors: Sensor[] = [];
  NEIGHBORHOODS.forEach((neighborhood, nIndex) => {
    const state = states[neighborhood.id];
    SENSOR_TYPES.forEach((meta, tIndex) => {
      const rnd = seeded(hash(neighborhood.id + meta.id));
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
        history: buildHistory(state, neighborhood.susceptibility, meta.id, hash(neighborhood.id + meta.id)),
      });
    });
  });
  return sensors;
}

export function createInitialStates(): Record<string, EnvState> {
  const states: Record<string, EnvState> = {};
  NEIGHBORHOODS.forEach((n) => {
    states[n.id] = createEnvState(n.id, n.susceptibility);
  });
  return states;
}

export const MUNICIPALITY_COUNT = MUNICIPALITIES.length;
export const municipalityName = (id: string) => getMunicipality(id)?.name ?? id;
