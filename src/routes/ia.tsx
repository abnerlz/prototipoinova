import { createFileRoute, redirect } from "@tanstack/react-router";

/** A análise de IA foi consolidada na Central de Inteligência. */
export const Route = createFileRoute("/ia")({
  beforeLoad: () => { throw redirect({ to: "/central-inteligencia" }); },
  component: () => null,
});
