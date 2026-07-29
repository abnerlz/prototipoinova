import { useEffect, useState, type ReactNode } from "react";

/** Renderiza os filhos apenas após a hidratação (bibliotecas browser-only). */
export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}
