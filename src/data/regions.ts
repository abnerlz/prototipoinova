import type { Municipality, Neighborhood, PeriodOption, SensorType } from "@/types";

/**
 * O sistema representa UMA única estação física: o Ponto de Monitoramento 01.
 * Os tipos de município/localidade são mantidos apenas como metadados de
 * localização do ponto (usados pelo mapa e pelos relatórios).
 */

export const STATION_ID = "ponto-01";
export const STATION_NAME = "Ponto de Monitoramento 01";
export const STATION_ADDRESS = "Encosta monitorada — Ibura, Recife (PE)";
export const STATION_COORDS = { lat: -8.1058, lng: -34.945 };

export const MUNICIPALITIES: Municipality[] = [
  { id: "recife", name: "Recife", center: STATION_COORDS, population: 1653461 },
];

export const NEIGHBORHOODS: Neighborhood[] = [
  {
    id: STATION_ID,
    name: STATION_NAME,
    municipalityId: "recife",
    center: STATION_COORDS,
    susceptibility: 0.82,
    households: 420,
  },
];

const BUILT_IN_NEIGHBORHOODS = [...NEIGHBORHOODS];

/** Atualiza as regiões criadas por operadores sem substituir a lista compartilhada usada pelas telas. */
export function replaceCustomNeighborhoods(custom: Neighborhood[]) {
  const builtInIds = new Set(BUILT_IN_NEIGHBORHOODS.map((region) => region.id));
  const uniqueCustom = custom.filter((region) => !builtInIds.has(region.id));
  NEIGHBORHOODS.splice(0, NEIGHBORHOODS.length, ...BUILT_IN_NEIGHBORHOODS, ...uniqueCustom);
}

export const STATION = NEIGHBORHOODS[0];

/** Os quatro tipos de sensor mantidos no protótipo. */
export const SENSOR_TYPES: {
  id: SensorType;
  label: string;
  unit: string;
  min: number;
  max: number;
  icon: string;
  emoji: string;
}[] = [
  { id: "pluviosidade", label: "Pluviosidade", unit: "mm/h", min: 0, max: 80, icon: "CloudRain", emoji: "🌧️" },
  { id: "umidade", label: "Umidade do Solo", unit: "%", min: 10, max: 100, icon: "Droplets", emoji: "🌱" },
  { id: "inclinacao", label: "Inclinação", unit: "°", min: 0, max: 25, icon: "TriangleRight", emoji: "📐" },
  { id: "vibracao", label: "Vibração", unit: "mm/s", min: 0, max: 20, icon: "Activity", emoji: "📳" },
];

export const PERIODS: PeriodOption[] = [
  { id: "24h", label: "Últimas 24 horas", hours: 24 },
  { id: "7d", label: "Últimos 7 dias", hours: 24 * 7 },
  { id: "30d", label: "Últimos 30 dias", hours: 24 * 30 },
];

export const getMunicipality = (id?: string) => MUNICIPALITIES.find((m) => m.id === id);
export const getNeighborhood = (id?: string) => NEIGHBORHOODS.find((n) => n.id === id) ?? STATION;
export const getSensorMeta = (type: SensorType) => SENSOR_TYPES.find((s) => s.id === type)!;
