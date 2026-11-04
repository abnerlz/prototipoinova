import { createFileRoute } from "@tanstack/react-router";

import { json, preflight } from "@/lib/sensor-api";
import { handleSensorPost } from "@/lib/sensor-api.server";

export const Route = createFileRoute("/api/sensores")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => handleSensorPost(request),
      GET: async () =>
        json({
          endpoint: "/api/sensores",
          method: "POST",
          content_type: "application/json",
          exemplo: {
            sensor_id: "SENSOR-001",
            umidade_solo: 64,
            inclinacao: 3.2,
            vibracao: 0.18,
            chuva: 12.4,
          },
        }),
    },
  },
});
