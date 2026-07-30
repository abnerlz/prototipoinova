import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, PlayCircle, Radar, Square } from "lucide-react";
import { useState } from "react";

import { RiskBadge } from "@/components/common/RiskGauge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMonitoring } from "@/context/MonitoringContext";
import { MUNICIPALITIES, NEIGHBORHOODS, getMunicipality, getNeighborhood } from "@/data/regions";
import { SCENARIOS, SPEEDS } from "@/lib/simulation-engine";
import type { SimulationScenario, SimulationSpeed } from "@/types";

const SCENARIO_IDS = Object.keys(SCENARIOS) as SimulationScenario[];
const SPEED_IDS = Object.keys(SPEEDS) as SimulationSpeed[];

/** Indicador de status + controle de simulação do Centro de Operações. */
export function SimulationControl() {
  const { simulation, startSimulation, stopSimulation, filters } = useMonitoring();
  const [open, setOpen] = useState(false);
  const [scenario, setScenario] = useState<SimulationScenario>("completa");
  const [speed, setSpeed] = useState<SimulationSpeed>("normal");

  const defaultMunicipality =
    filters.municipalityId !== "all" ? filters.municipalityId : MUNICIPALITIES[0].id;
  const defaultNeighborhood =
    filters.neighborhoodId !== "all"
      ? filters.neighborhoodId
      : [...NEIGHBORHOODS]
          .filter((n) => n.municipalityId === defaultMunicipality)
          .sort((a, b) => b.susceptibility - a.susceptibility)[0].id;

  const [municipalityId, setMunicipalityId] = useState(defaultMunicipality);
  const [neighborhoodId, setNeighborhoodId] = useState(defaultNeighborhood);
  const neighborhoods = NEIGHBORHOODS.filter((n) => n.municipalityId === municipalityId);

  const active = Boolean(simulation?.active);

  const handleMunicipality = (value: string) => {
    setMunicipalityId(value);
    const first = NEIGHBORHOODS.find((n) => n.municipalityId === value);
    if (first) setNeighborhoodId(first.id);
  };

  const start = () => {
    startSimulation({ scenario, speed, municipalityId, neighborhoodId });
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-xl p-3">
        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 rounded-full ${active ? "animate-pulse bg-[var(--risk-critical)]" : "bg-[var(--risk-low)]"}`}
          />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
            <p className="font-display text-sm font-bold">
              {active
                ? simulation?.recovering
                  ? "Simulação encerrando — retorno ao normal"
                  : "Simulação em andamento"
                : "Monitoramento Normal"}
            </p>
          </div>
          {active ? (
            <span className="hidden text-xs text-muted-foreground sm:block">
              {SCENARIOS[simulation!.scenario].label} · {getNeighborhood(simulation!.neighborhoodId)?.name} ·{" "}
              {simulation!.currentPhase}
            </span>
          ) : null}
        </div>

        {active ? (
          <Button size="lg" variant="destructive" onClick={stopSimulation} disabled={simulation?.recovering}>
            <Square className="h-4 w-4" /> Encerrar Simulação
          </Button>
        ) : (
          <Button size="lg" onClick={() => setOpen(true)} className="font-semibold">
            <PlayCircle className="h-5 w-5" /> Iniciar Simulação
          </Button>
        )}
      </div>

      <AnimatePresence>
        {active ? (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="glass border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Radar className="h-4 w-4 text-primary" /> Evolução do cenário —{" "}
                  {getMunicipality(simulation!.municipalityId)?.name} ·{" "}
                  {getNeighborhood(simulation!.neighborhoodId)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{simulation!.currentPhase}</span>
                    <span className="tabular-nums">
                      pico do índice: {simulation!.peakScore}
                    </span>
                  </div>
                  <Progress value={simulation!.progress * 100} className="h-2" />
                </div>
                <ul className="max-h-56 space-y-2 overflow-y-auto text-sm text-muted-foreground">
                  {[...simulation!.events].reverse().map((e) => (
                    <li
                      key={`${e.timestamp}-${e.message}`}
                      className="flex items-start gap-2 rounded-lg border border-border/50 bg-secondary/25 p-2.5"
                    >
                      <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="flex-1">{e.message}</span>
                      <span className="shrink-0 font-mono text-[11px]">
                        {new Date(e.timestamp).toLocaleTimeString("pt-BR")}
                      </span>
                      <RiskBadge level={e.level} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-strong sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" /> Iniciar simulação controlada
            </DialogTitle>
            <DialogDescription>
              Cenário de demonstração com evolução gradual dos sensores, narrada pela IA.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Escolha o cenário</Label>
              <Select value={scenario} onValueChange={(v) => setScenario(v as SimulationScenario)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCENARIO_IDS.map((id) => (
                    <SelectItem key={id} value={id}>{SCENARIOS[id].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{SCENARIOS[scenario].description}</p>
            </div>

            <div className="grid gap-1.5">
              <Label>Velocidade da simulação</Label>
              <Select value={speed} onValueChange={(v) => setSpeed(v as SimulationSpeed)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPEED_IDS.map((id) => (
                    <SelectItem key={id} value={id}>{SPEEDS[id].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Município</Label>
                <Select value={municipalityId} onValueChange={handleMunicipality}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MUNICIPALITIES.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Bairro</Label>
                <Select value={neighborhoodId} onValueChange={setNeighborhoodId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {neighborhoods.map((n) => (
                      <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={start}>Iniciar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
