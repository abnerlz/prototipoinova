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
  // Recife
  { name: "Alto do Mandu", municipalityId: "recife", offset: [0.018, 0.012], susceptibility: 0.86, households: 3200 },
  { name: "Córrego do Jenipapo", municipalityId: "recife", offset: [0.026, -0.004], susceptibility: 0.92, households: 2750 },
  { name: "Nova Descoberta", municipalityId: "recife", offset: [0.012, -0.018], susceptibility: 0.81, households: 4100 },
  { name: "Ibura", municipalityId: "recife", offset: [-0.045, 0.01], susceptibility: 0.88, households: 5600 },
  { name: "Jordão Alto", municipalityId: "recife", offset: [-0.058, -0.006], susceptibility: 0.74, households: 2300 },
  { name: "Vasco da Gama", municipalityId: "recife", offset: [0.008, -0.03], susceptibility: 0.69, households: 3800 },
  // Olinda
  { name: "Alto da Bondade", municipalityId: "olinda", offset: [0.008, -0.014], susceptibility: 0.83, households: 2100 },
  { name: "Passarinho", municipalityId: "olinda", offset: [-0.012, -0.024], susceptibility: 0.79, households: 1900 },
  { name: "Águas Compridas", municipalityId: "olinda", offset: [0.004, -0.031], susceptibility: 0.87, households: 2600 },
  { name: "Sítio Novo", municipalityId: "olinda", offset: [-0.005, -0.006], susceptibility: 0.62, households: 1500 },
  // Paulista
  { name: "Maranguape II", municipalityId: "paulista", offset: [0.006, 0.014], susceptibility: 0.66, households: 2200 },
  { name: "Jardim Paulista", municipalityId: "paulista", offset: [-0.011, -0.008], susceptibility: 0.58, households: 1800 },
  { name: "Nossa Senhora do Ó", municipalityId: "paulista", offset: [0.014, -0.02], susceptibility: 0.71, households: 1600 },
  // Jaboatão
  { name: "Alto do Céu", municipalityId: "jaboatao", offset: [0.012, 0.016], susceptibility: 0.89, households: 2400 },
  { name: "Curado", municipalityId: "jaboatao", offset: [0.03, 0.005], susceptibility: 0.77, households: 3100 },
  { name: "Vila Rica", municipalityId: "jaboatao", offset: [-0.018, 0.02], susceptibility: 0.68, households: 1700 },
  { name: "Prazeres", municipalityId: "jaboatao", offset: [-0.006, -0.024], susceptibility: 0.61, households: 2900 },
  // Camaragibe
  { name: "Vila da Fábrica", municipalityId: "camaragibe", offset: [0.006, 0.01], susceptibility: 0.72, households: 1400 },
  { name: "Alberto Maia", municipalityId: "camaragibe", offset: [-0.014, -0.008], susceptibility: 0.8, households: 1900 },
  { name: "Timbi", municipalityId: "camaragibe", offset: [0.016, -0.014], susceptibility: 0.64, households: 1600 },
  // Abreu e Lima
  { name: "Caetés I", municipalityId: "abreu-e-lima", offset: [0.008, 0.012], susceptibility: 0.7, households: 1300 },
  { name: "Timbó", municipalityId: "abreu-e-lima", offset: [-0.01, -0.01], susceptibility: 0.59, households: 1100 },
  // Igarassu
  { name: "Cruz de Rebouças", municipalityId: "igarassu", offset: [0.01, 0.014], susceptibility: 0.63, households: 1200 },
  { name: "Nova Cruz", municipalityId: "igarassu", offset: [-0.012, -0.009], susceptibility: 0.57, households: 950 },
  // São Lourenço da Mata
  { name: "Tiúma", municipalityId: "sao-lourenco", offset: [0.011, 0.015], susceptibility: 0.66, households: 1450 },
  { name: "Muribeca", municipalityId: "sao-lourenco", offset: [-0.013, -0.011], susceptibility: 0.6, households: 1050 },
  // Moreno
  { name: "Bonança", municipalityId: "moreno", offset: [0.009, 0.012], susceptibility: 0.75, households: 900 },
  { name: "Kombi", municipalityId: "moreno", offset: [-0.011, -0.013], susceptibility: 0.68, households: 760 },
  // Cabo
  { name: "Charneca", municipalityId: "cabo", offset: [0.012, 0.01], susceptibility: 0.71, households: 1500 },
  { name: "Garapu", municipalityId: "cabo", offset: [-0.014, -0.012], susceptibility: 0.64, households: 1250 },
  { name: "Ponte dos Carvalhos", municipalityId: "cabo", offset: [-0.03, 0.008], susceptibility: 0.55, households: 2100 },
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
