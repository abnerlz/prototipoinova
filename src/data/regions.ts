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

export const STATION = NEIGHBORHOODS[0];

/** Os seis sensores existentes no protótipo físico. */
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
  { id: "umidade_ar", label: "Umidade do Ar", unit: "%", min: 20, max: 100, icon: "Waves", emoji: "💧" },
  { id: "temperatura", label: "Temperatura", unit: "°C", min: 18, max: 40, icon: "Thermometer", emoji: "🌡️" },
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
