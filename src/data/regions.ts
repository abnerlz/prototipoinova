import type { Municipality, Neighborhood, PeriodOption, SensorType } from "@/types";

/** Municípios monitorados da Região Metropolitana do Recife. */
export const MUNICIPALITIES: Municipality[] = [
  { id: "recife", name: "Recife", center: { lat: -8.0476, lng: -34.877 }, population: 1653461 },
  { id: "olinda", name: "Olinda", center: { lat: -8.0089, lng: -34.8553 }, population: 393115 },
  { id: "paulista", name: "Paulista", center: { lat: -7.9407, lng: -34.8728 }, population: 331774 },
  {
    id: "jaboatao",
    name: "Jaboatão dos Guararapes",
    center: { lat: -8.1128, lng: -35.0147 },
    population: 706867,
  },
  {
    id: "camaragibe",
    name: "Camaragibe",
    center: { lat: -8.0217, lng: -34.9782 },
    population: 158899,
  },
  {
    id: "abreu-e-lima",
    name: "Abreu e Lima",
    center: { lat: -7.9067, lng: -34.9028 },
    population: 99622,
  },
  { id: "igarassu", name: "Igarassu", center: { lat: -7.8342, lng: -34.9061 }, population: 117019 },
  {
    id: "sao-lourenco",
    name: "São Lourenço da Mata",
    center: { lat: -8.0022, lng: -35.0181 },
    population: 114079,
  },
  { id: "moreno", name: "Moreno", center: { lat: -8.1186, lng: -35.0922 }, population: 62669 },
  {
    id: "cabo",
    name: "Cabo de Santo Agostinho",
    center: { lat: -8.2872, lng: -35.0347 },
    population: 208944,
  },
];

interface RawNeighborhood {
  name: string;
  municipalityId: string;
  offset: [number, number];
  susceptibility: number;
  households: number;
}

const RAW: RawNeighborhood[] = [
  // Recife — principais áreas com histórico de risco geológico
  { name: "Ibura", municipalityId: "recife", offset: [-0.058, -0.068], susceptibility: 0.88, households: 5600 },
  { name: "Dois Unidos", municipalityId: "recife", offset: [0.034, -0.032], susceptibility: 0.84, households: 4300 },
  { name: "Nova Descoberta", municipalityId: "recife", offset: [0.028, -0.047], susceptibility: 0.81, households: 4100 },
  { name: "Alto José do Pinho", municipalityId: "recife", offset: [0.024, -0.025], susceptibility: 0.79, households: 2400 },
  { name: "Várzea", municipalityId: "recife", offset: [0.003, -0.077], susceptibility: 0.58, households: 6200 },
  { name: "Casa Amarela", municipalityId: "recife", offset: [0.018, -0.036], susceptibility: 0.66, households: 5100 },
  { name: "Jordão", municipalityId: "recife", offset: [-0.068, -0.048], susceptibility: 0.74, households: 2300 },
  { name: "Córrego do Jenipapo", municipalityId: "recife", offset: [0.033, -0.054], susceptibility: 0.92, households: 2750 },
  { name: "Linha do Tiro", municipalityId: "recife", offset: [0.042, -0.022], susceptibility: 0.71, households: 2050 },
  // Olinda
  { name: "Passarinho", municipalityId: "olinda", offset: [0.023, -0.033], susceptibility: 0.79, households: 1900 },
];


const slug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const NEIGHBORHOODS: Neighborhood[] = RAW.map((item) => {
  const municipality = MUNICIPALITIES.find((m) => m.id === item.municipalityId)!;
  return {
    id: `${item.municipalityId}-${slug(item.name)}`,
    name: item.name,
    municipalityId: item.municipalityId,
    center: {
      lat: municipality.center.lat + item.offset[0],
      lng: municipality.center.lng + item.offset[1],
    },
    susceptibility: item.susceptibility,
    households: item.households,
  };
});

export const SENSOR_TYPES: {
  id: SensorType;
  label: string;
  unit: string;
  min: number;
  max: number;
  icon: string;
}[] = [
  { id: "pluviosidade", label: "Pluviosidade", unit: "mm/h", min: 0, max: 80, icon: "CloudRain" },
  { id: "umidade", label: "Umidade do Solo", unit: "%", min: 10, max: 100, icon: "Droplets" },
  { id: "temperatura", label: "Temperatura", unit: "°C", min: 18, max: 40, icon: "Thermometer" },
  { id: "vibracao", label: "Vibração", unit: "mm/s", min: 0, max: 20, icon: "Activity" },
  { id: "inclinacao", label: "Inclinação do Terreno", unit: "°", min: 0, max: 25, icon: "TriangleRight" },
  { id: "deslocamento", label: "Deslocamento do Solo", unit: "mm", min: 0, max: 60, icon: "MoveDiagonal" },
];

export const PERIODS: PeriodOption[] = [
  { id: "24h", label: "Últimas 24 horas", hours: 24 },
  { id: "7d", label: "Últimos 7 dias", hours: 24 * 7 },
  { id: "30d", label: "Últimos 30 dias", hours: 24 * 30 },
];

export const getMunicipality = (id: string) => MUNICIPALITIES.find((m) => m.id === id);
export const getNeighborhood = (id: string) => NEIGHBORHOODS.find((n) => n.id === id);
export const getSensorMeta = (type: SensorType) => SENSOR_TYPES.find((s) => s.id === type)!;
