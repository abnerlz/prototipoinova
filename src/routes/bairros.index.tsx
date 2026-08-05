import { createFileRoute, redirect } from "@tanstack/react-router";

/** Bairros e Municípios foram unificados na aba Localidades. */
export const Route = createFileRoute("/bairros/")({
  beforeLoad: () => {
    throw redirect({ to: "/localidades" });
  },
  component: () => null,
});
