import "leaflet/dist/leaflet.css";

import { useNavigate } from "@tanstack/react-router";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";

import { NeighborhoodSheet } from "@/components/map/NeighborhoodSheet";
import { useMonitoring } from "@/context/MonitoringContext";
import { MUNICIPALITIES, NEIGHBORHOODS, getSensorMeta } from "@/data/regions";
import { RISK_COLOR, RISK_LABEL, assessRisk } from "@/lib/ai";

export type MapLevel = "regiao" | "municipio" | "bairro";

interface RiskMapProps {
  municipalityId?: string;
  neighborhoodId?: string;
  height?: string;
  interactive?: boolean;
}

function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.9 });
  }, [map, center[0], center[1], zoom]);
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 200);
    return () => window.clearTimeout(id);
  }, [map]);
  return null;
}

/** Mapa operacional com drill-down: região → município → bairro → sensores. */
export default function RiskMap({
  municipalityId,
  neighborhoodId,
  height = "520px",
  interactive = true,
}: RiskMapProps) {
  const { sensors } = useMonitoring();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  const level: MapLevel = neighborhoodId ? "bairro" : municipalityId ? "municipio" : "regiao";

  const center = useMemo<[number, number]>(() => {
    if (neighborhoodId) {
      const n = NEIGHBORHOODS.find((x) => x.id === neighborhoodId);
      if (n) return [n.center.lat, n.center.lng];
    }
    if (municipalityId) {
      const m = MUNICIPALITIES.find((x) => x.id === municipalityId);
      if (m) return [m.center.lat, m.center.lng];
    }
    return [-8.03, -34.95];
  }, [municipalityId, neighborhoodId]);

  const zoom = level === "bairro" ? 15 : level === "municipio" ? 12 : 10;

  useEffect(() => {
    // Evita ícones quebrados do Leaflet em bundlers.
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  }, []);

  const municipalityMarkers = MUNICIPALITIES.map((m) => {
    const scoped = sensors.filter((s) => s.municipalityId === m.id);
    const risk = assessRisk(scoped);
    return { municipality: m, risk, count: scoped.length };
  });

  const neighborhoodMarkers = NEIGHBORHOODS.filter((n) => n.municipalityId === municipalityId).map((n) => {
    const scoped = sensors.filter((s) => s.neighborhoodId === n.id);
    return { neighborhood: n, risk: assessRisk(scoped), count: scoped.length };
  });

  const sensorMarkers = sensors.filter((s) => s.neighborhoodId === neighborhoodId);

  return (
    <div className="overflow-hidden rounded-xl border border-border/60" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={interactive}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={center} zoom={zoom} />

        {level === "regiao" &&
          municipalityMarkers.map(({ municipality, risk, count }) => (
            <CircleMarker
              key={municipality.id}
              center={[municipality.center.lat, municipality.center.lng]}
              radius={14}
              pathOptions={{
                color: RISK_COLOR[risk.level],
                fillColor: RISK_COLOR[risk.level],
                fillOpacity: 0.45,
                weight: 2,
              }}
              eventHandlers={{
                click: () =>
                  interactive && navigate({ to: "/municipios/$municipalityId", params: { municipalityId: municipality.id } }),
              }}
            >
              <Popup>
                <strong>{municipality.name}</strong>
                <br />
                Índice: {risk.score} · {RISK_LABEL[risk.level]}
                <br />
                {count} sensores
              </Popup>
            </CircleMarker>
          ))}

        {level === "municipio" &&
          neighborhoodMarkers.map(({ neighborhood, risk, count }) => (
            <CircleMarker
              key={neighborhood.id}
              center={[neighborhood.center.lat, neighborhood.center.lng]}
              radius={11}
              pathOptions={{
                color: RISK_COLOR[risk.level],
                fillColor: RISK_COLOR[risk.level],
                fillOpacity: 0.5,
                weight: 2,
              }}
              eventHandlers={{
                click: () => interactive && setSelected(neighborhood.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {neighborhood.name} · {RISK_LABEL[risk.level]} ({count} sensores)
              </Tooltip>
            </CircleMarker>
          ))}

        {level === "bairro" &&
          sensorMarkers.map((sensor) => {
            const risk = assessRisk([sensor]);
            const color = sensor.status === "online" ? RISK_COLOR[risk.level] : "#64748b";
            return (
              <CircleMarker
                key={sensor.id}
                center={[sensor.position.lat, sensor.position.lng]}
                radius={9}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.6, weight: 2 }}
                eventHandlers={{
                  click: () => interactive && navigate({ to: "/sensores/$sensorId", params: { sensorId: sensor.id } }),
                }}
              >
                <Popup>
                  <strong>{getSensorMeta(sensor.type).label}</strong>
                  <br />
                  {sensor.code} · {sensor.status}
                  <br />
                  Leitura: {sensor.value} {sensor.unit}
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>
      <NeighborhoodSheet neighborhoodId={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
