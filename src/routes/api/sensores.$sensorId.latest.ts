import { createFileRoute } from "@tanstack/react-router";

import { handleLatest, preflight } from "@/lib/sensor-api";

export const Route = createFileRoute("/api/sensores/$sensorId/latest")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ params }) => handleLatest(params.sensorId),
    },
  },
});
