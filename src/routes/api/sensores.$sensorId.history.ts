import { createFileRoute } from "@tanstack/react-router";

import { preflight } from "@/lib/sensor-api";
import { handleHistory } from "@/lib/sensor-api.server";

export const Route = createFileRoute("/api/sensores/$sensorId/history")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ params, request }) => handleHistory(params.sensorId, new URL(request.url)),
    },
  },
});
