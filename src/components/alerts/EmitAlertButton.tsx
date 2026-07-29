import { AnimatePresence, motion } from "framer-motion";
import { Siren } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMonitoring } from "@/context/MonitoringContext";
import { MUNICIPALITIES, NEIGHBORHOODS, getNeighborhood } from "@/data/regions";
import { RISK_LABEL } from "@/lib/ai";
import type { RiskLevel } from "@/types";

const LEVELS: RiskLevel[] = ["baixo", "moderado", "alto", "critico"];

/**
 * Botão flutuante de emissão de alerta, presente em todas as páginas.
 * Abre automaticamente quando a IA identifica risco crítico.
 */
export function EmitAlertButton() {
  const { createAlert, sensorsIn, autoAlert, dismissAutoAlert, riskFor } = useMonitoring();
  const [open, setOpen] = useState(false);
  const [municipalityId, setMunicipalityId] = useState(MUNICIPALITIES[0].id);
  const [neighborhoodId, setNeighborhoodId] = useState(
    NEIGHBORHOODS.find((n) => n.municipalityId === MUNICIPALITIES[0].id)!.id,
  );
  const [level, setLevel] = useState<RiskLevel>("alto");
  const [description, setDescription] = useState("");
  const [origin, setOrigin] = useState<"ia" | "manual">("manual");

  const neighborhoods = NEIGHBORHOODS.filter((n) => n.municipalityId === municipalityId);
  const scopedSensors = sensorsIn(municipalityId, neighborhoodId);
  const assessment = riskFor(municipalityId, neighborhoodId);
  const responsibles = assessment.contributions.slice(0, 3);
  const now = new Date();

  // Abertura automática disparada pela IA em cenário crítico.
  useEffect(() => {
    if (!autoAlert) return;
    setMunicipalityId(autoAlert.municipalityId);
    setNeighborhoodId(autoAlert.neighborhoodId);
    setLevel(autoAlert.level);
    setDescription(autoAlert.description);
    setOrigin("ia");
    setOpen(true);
  }, [autoAlert]);

  const handleMunicipality = (value: string) => {
    setMunicipalityId(value);
    const first = NEIGHBORHOODS.find((n) => n.municipalityId === value);
    if (first) setNeighborhoodId(first.id);
  };

  const confirm = () => {
    createAlert({
      municipalityId,
      neighborhoodId,
      level,
      description:
        description.trim() ||
        `Alerta ${RISK_LABEL[level]} emitido para ${getNeighborhood(neighborhoodId)?.name ?? ""}.`,
      sensorIds: scopedSensors
        .filter((s) => responsibles.some((r) => r.type === s.type))
        .map((s) => s.id),
      origin,
    });
    toast.success("Alerta emitido", {
      description: `${getNeighborhood(neighborhoodId)?.name} · nível ${RISK_LABEL[level]}`,
    });
    close();
  };

  const close = () => {
    setOpen(false);
    setDescription("");
    setOrigin("manual");
    dismissAutoAlert();
  };

  return (
    <>
      <AnimatePresence>
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setOpen(true)}
          aria-label="Emitir alerta"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-destructive px-5 py-3.5 text-sm font-semibold text-destructive-foreground shadow-[0_10px_40px_-10px_var(--destructive)]"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-destructive/40" />
          <Siren className="relative h-5 w-5" />
          <span className="relative hidden sm:inline">Emitir Alerta</span>
        </motion.button>
      </AnimatePresence>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="glass-strong max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Siren className="h-5 w-5 text-destructive" />
              {origin === "ia" ? "Alerta automático da IA" : "Emitir alerta de deslizamento"}
            </DialogTitle>
            <DialogDescription>
              Confirme os dados antes de acionar a rede de resposta da Defesa Civil.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
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

            <div className="grid gap-1.5">
              <Label>Nível do alerta</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as RiskLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>{RISK_LABEL[l]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Descrição</Label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva a situação observada em campo…"
              />
            </div>

            <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Sensores responsáveis
              </p>
              <ul className="space-y-1">
                {responsibles.map((r) => (
                  <li key={r.type} className="flex justify-between gap-2">
                    <span>{r.label}</span>
                    <span className="font-mono text-muted-foreground">
                      {r.value} {r.unit} · {r.weight} pts
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Horário: {now.toLocaleString("pt-BR")} · Índice atual: {assessment.score}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={close}>Cancelar</Button>
            <Button variant="destructive" onClick={confirm}>Confirmar alerta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
