import { createFileRoute } from "@tanstack/react-router";

import { handleSensorPost, json, preflight } from "@/lib/sensor-api";

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
