import { createFileRoute } from "@tanstack/react-router";

import { handleHistory, preflight } from "@/lib/sensor-api";

export const Route = createFileRoute("/api/sensores/$sensorId/history")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ params, request }) => handleHistory(params.sensorId, new URL(request.url)),
    },
  },
});
