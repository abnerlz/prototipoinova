import { createFileRoute } from "@tanstack/react-router";

import { preflight } from "@/lib/sensor-api";
import { handleLatest } from "@/lib/sensor-api.server";

export const Route = createFileRoute("/api/sensores/$sensorId/latest")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ params }) => handleLatest(params.sensorId),
    },
  },
});
