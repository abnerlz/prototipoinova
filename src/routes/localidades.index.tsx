import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { RiskBadge } from "@/components/common/RiskGauge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMonitoring } from "@/context/MonitoringContext";
import { MUNICIPALITIES, NEIGHBORHOODS, getMunicipality } from "@/data/regions";
import { assessRisk } from "@/lib/ai";
import { STATUS_BY_LEVEL } from "@/lib/decision";

export const Route = createFileRoute("/localidades/")({
  head: () => ({
    meta: [
      { title: "Localidades Monitoradas — GeoAlerta RMR" },
      { name: "description", content: "Cidades e bairros monitorados com nível de risco, sensores ativos, status e última atualização." },
      { property: "og:title", content: "Localidades Monitoradas — GeoAlerta RMR" },
      { property: "og:description", content: "Busque e filtre cidades e bairros por risco, estado e status operacional." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LocalidadesPage,
});

const norm = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function LocalidadesPage() {
  const { sensors, lastTick } = useMonitoring();
  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const [city, setCity] = useState("all");
  const [level, setLevel] = useState("all");
  const [status, setStatus] = useState("all");

  const rows = useMemo(
    () =>
      NEIGHBORHOODS.map((n) => {
        const scoped = sensors.filter((s) => s.neighborhoodId === n.id);
        const risk = assessRisk(scoped);
        const online = scoped.filter((s) => s.status === "online");
        return {
          n,
          risk,
          city: getMunicipality(n.municipalityId)?.name ?? "—",
          state: "PE",
          online: online.length,
          total: scoped.length,
          updated: Math.max(lastTick, ...scoped.map((s) => s.lastUpdate), 0),
          status: STATUS_BY_LEVEL[risk.level],
        };
      }).sort((a, b) => b.risk.score - a.risk.score),
    [sensors, lastTick],
  );

  const filtered = rows.filter((r) => {
    const q = norm(query.trim());
    if (q && !norm(r.n.name).includes(q) && !norm(r.city).includes(q)) return false;
    if (state !== "all" && r.state !== state) return false;
    if (city !== "all" && r.n.municipalityId !== city) return false;
    if (level !== "all" && r.risk.level !== level) return false;
    if (status !== "all" && r.status !== status) return false;
    return true;
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold">Localidades monitoradas</h1>
        <Badge variant="outline" className="border-border/70">
          {filtered.length} de {rows.length} localidades
        </Badge>
      </div>

      <div className="glass grid gap-2 rounded-xl p-3 md:grid-cols-5">
        <div className="relative md:col-span-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cidade ou bairro…"
            className="pl-8"
            aria-label="Buscar cidade ou bairro"
          />
        </div>
        <Select value={state} onValueChange={setState}>
          <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            <SelectItem value="PE">Pernambuco (PE)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger><SelectValue placeholder="Cidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as cidades</SelectItem>
            {MUNICIPALITIES.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger><SelectValue placeholder="Nível de risco" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            <SelectItem value="baixo">Baixo</SelectItem>
            <SelectItem value="moderado">Moderado</SelectItem>
            <SelectItem value="alto">Alto</SelectItem>
            <SelectItem value="critico">Crítico</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="Normal">Normal</SelectItem>
            <SelectItem value="Atenção">Atenção</SelectItem>
            <SelectItem value="Alerta">Alerta</SelectItem>
            <SelectItem value="Emergência">Emergência</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="glass overflow-x-auto rounded-xl">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b border-border/60">
              <th className="p-3 text-left font-medium">Cidade</th>
              <th className="p-3 text-left font-medium">Bairro</th>
              <th className="p-3 text-left font-medium">Estado</th>
              <th className="p-3 text-left font-medium">Nível de risco</th>
              <th className="p-3 text-left font-medium">Sensores ativos</th>
              <th className="p-3 text-left font-medium">Última atualização</th>
              <th className="p-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <motion.tr
                key={r.n.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="border-b border-border/40 last:border-0 hover:bg-secondary/25"
              >
                <td className="p-3">{r.city}</td>
                <td className="p-3">
                  <Link
                    to="/localidades/$neighborhoodId"
                    params={{ neighborhoodId: r.n.id }}
                    className="font-medium hover:text-primary"
                  >
                    {r.n.name}
                  </Link>
                </td>
                <td className="p-3 text-muted-foreground">{r.state}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <RiskBadge level={r.risk.level} />
                    <span className="tabular-nums text-xs text-muted-foreground">{r.risk.score}</span>
                  </div>
                </td>
                <td className="p-3 tabular-nums">{r.online}/{r.total}</td>
                <td className="p-3 text-muted-foreground">
                  {new Date(r.updated).toLocaleString("pt-BR")}
                </td>
                <td className="p-3">{r.status}</td>
              </motion.tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  Nenhuma localidade encontrada com os filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
