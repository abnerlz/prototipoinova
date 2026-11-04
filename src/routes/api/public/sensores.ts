import { createFileRoute } from "@tanstack/react-router";

import { json, preflight } from "@/lib/sensor-api";
import { handleSensorPost } from "@/lib/sensor-api.server";

/** Espelho público de /api/sensores (não exige autenticação do site publicado). */
export const Route = createFileRoute("/api/public/sensores")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => handleSensorPost(request),
      GET: async () => json({ endpoint: "/api/public/sensores", method: "POST" }),
    },
  },
});
