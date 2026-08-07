import { useEffect, useState } from "react";

/** true somente após a hidratação — evita divergência de horário entre SSR e cliente. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
