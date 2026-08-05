import { createFileRoute, redirect } from "@tanstack/react-router";

/** Bairros e Municípios foram unificados na aba Localidades. */
export const Route = createFileRoute("/municipios/")({
  beforeLoad: () => {
    throw redirect({ to: "/localidades" });
  },
  component: () => null,
});
