import { createFileRoute } from "@tanstack/react-router";
import { Activity, ClipboardCheck, MapPin, Plus, Radio } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { onValue, push, ref, set } from "firebase/database";

import { OperatorAccess } from "@/components/auth/OperatorAccess";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useMonitoring } from "@/context/MonitoringContext";
import { MUNICIPALITIES, NEIGHBORHOODS } from "@/data/regions";
import { firebaseAuth, realtimeDatabase } from "@/integrations/firebase/client";
import { DEFAULT_SENSOR_ID } from "@/lib/sensor-api";
import type { RealReading } from "@/lib/real-data";
import type { Neighborhood } from "@/types";

export const Route = createFileRoute("/operacao")({
  head: () => ({ meta: [{ title: "Operação — ProTerra" }] }),
  component: OperationPage,
});

type ReadingReview = {
  status: "validado" | "inconsistente";
  note: string;
  reviewedAt: number;
  reviewedBy: string;
};

type SensorReview = {
  status: "funcionando" | "investigar" | "manutencao";
  note: string;
  reviewedAt: number;
  reviewedBy: string;
};

function OperationPage() {
  const { authLoading, isOperator, realReadings, sensors, customRegions } = useMonitoring();
  const [readingReviews, setReadingReviews] = useState<Record<string, ReadingReview>>({});
  const [sensorReview, setSensorReview] = useState<SensorReview | null>(null);
  const [readingNotes, setReadingNotes] = useState<Record<string, string>>({});
  const [sensorNote, setSensorNote] = useState("");
  const [regionName, setRegionName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [susceptibility, setSusceptibility] = useState("0.5");
  const [households, setHouseholds] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOperator) return;
    const stopReadings = onValue(ref(realtimeDatabase, "reading_reviews"), (snapshot) => {
      const reviews: Record<string, ReadingReview> = {};
      snapshot.forEach((child) => {
        const value = child.val() as ReadingReview | null;
        if (value && (value.status === "validado" || value.status === "inconsistente")) {
          reviews[child.key ?? ""] = value;
        }
        return false;
      });
      setReadingReviews(reviews);
    });
    const stopSensor = onValue(ref(realtimeDatabase, `sensor_reviews/${DEFAULT_SENSOR_ID}`), (snapshot) => {
      const value = snapshot.val() as SensorReview | null;
      if (value && ["funcionando", "investigar", "manutencao"].includes(value.status)) {
        setSensorReview(value);
        setSensorNote(value.note ?? "");
      } else {
        setSensorReview(null);
      }
    });
    return () => {
      stopReadings();
      stopSensor();
    };
  }, [isOperator]);

  async function saveReadingReview(reading: RealReading, status: ReadingReview["status"]) {
    const reviewerId = firebaseAuth.currentUser?.uid;
    if (!reviewerId) return;
    const note = readingNotes[reading.id]?.trim() ?? "";
    try {
      await set(ref(realtimeDatabase, `reading_reviews/${reading.id}`), {
        status,
        note,
        reviewedAt: Date.now(),
        reviewedBy: reviewerId,
      } satisfies ReadingReview);
      toast.success(status === "validado" ? "Leitura validada" : "Leitura marcada para revisão");
    } catch (cause) {
      console.error("[operacao] Falha ao salvar revisão de leitura.", cause);
      toast.error("Não foi possível salvar a revisão", { description: "Confira sua sessão e as regras do banco." });
    }
  }

  async function saveSensorReview(status: SensorReview["status"]) {
    const reviewerId = firebaseAuth.currentUser?.uid;
    if (!reviewerId) return;
    try {
      await set(ref(realtimeDatabase, `sensor_reviews/${DEFAULT_SENSOR_ID}`), {
        status,
        note: sensorNote.trim().slice(0, 500),
        reviewedAt: Date.now(),
        reviewedBy: reviewerId,
      } satisfies SensorReview);
      toast.success("Inspeção do sensor salva");
    } catch (cause) {
      console.error("[operacao] Falha ao salvar inspeção do sensor.", cause);
      toast.error("Não foi possível salvar a inspeção", { description: "Confira sua sessão e as regras do banco." });
    }
  }

  async function addRegion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const creatorId = firebaseAuth.currentUser?.uid;
    if (!creatorId) return;
    const name = regionName.trim().replace(/\s+/g, " ");
    const lat = Number(latitude);
    const lng = Number(longitude);
    const exposure = Number(susceptibility);
    const homeCount = Number(households);
    if (name.length < 2 || name.length > 80 || !Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180 || !Number.isFinite(exposure) || exposure < 0 || exposure > 1 || !Number.isInteger(homeCount) || homeCount < 0 || homeCount > 1_000_000) {
      toast.error("Confira os dados da região", { description: "Nome, coordenadas, suscetibilidade (0 a 1) e domicílios precisam ser válidos." });
      return;
    }
    const duplicate = [...NEIGHBORHOODS, ...customRegions].some((region) => region.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"));
    if (duplicate) {
      toast.error("Essa região já está cadastrada.");
      return;
    }

    setBusy(true);
    const regionReference = push(ref(realtimeDatabase, "custom_regions"));
    try {
      await set(regionReference, {
        name,
        municipalityId: MUNICIPALITIES[0].id,
        center: { lat, lng },
        susceptibility: exposure,
        households: homeCount,
        createdAt: Date.now(),
        createdBy: creatorId,
      });
      setRegionName("");
      setLatitude("");
      setLongitude("");
      setHouseholds("");
      setSusceptibility("0.5");
      toast.success("Região cadastrada", { description: "Ela já está disponível nos filtros do painel." });
    } catch (cause) {
      console.error("[operacao] Falha ao salvar região.", cause);
      toast.error("Não foi possível cadastrar a região", { description: "Confira sua sessão e as regras do banco." });
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return <p role="status" className="text-sm text-muted-foreground">Verificando acesso…</p>;
  if (!isOperator) {
    return (
      <Card className="max-w-xl border-border/70">
        <CardHeader><CardTitle>Acesso de operador</CardTitle><CardDescription>Entre com uma conta verificada para revisar leituras, cadastrar regiões e registrar inspeções.</CardDescription></CardHeader>
        <CardContent><OperatorAccess /></CardContent>
      </Card>
    );
  }

  const latestSensor = sensors[0];
  const latestReadings = realReadings.slice(0, 20);

  return (
    <main className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold">Operação e validação</h1>
        <p className="mt-1 text-sm text-muted-foreground">Registre revisões humanas sem alterar os valores originais recebidos do ESP32.</p>
      </header>

      <Card className="glass border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Radio className="h-5 w-5 text-primary" /> Estado do sensor físico</CardTitle>
          <CardDescription>Sensor {DEFAULT_SENSOR_ID} · a situação calculada considera a chegada recente de leituras. A inspeção abaixo é um registro humano separado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Telemetria: {latestSensor?.status ?? "sem leituras"}</Badge>
            {latestSensor ? <span className="text-sm text-muted-foreground">Última leitura: {new Date(latestSensor.lastUpdate).toLocaleString("pt-BR")}</span> : null}
            {sensorReview ? <Badge variant="outline">Inspeção: {sensorReview.status} · {new Date(sensorReview.reviewedAt).toLocaleString("pt-BR")}</Badge> : null}
          </div>
          <Label htmlFor="sensor-review-note">Observação da inspeção</Label>
          <Textarea id="sensor-review-note" maxLength={500} rows={2} value={sensorNote} onChange={(event) => setSensorNote(event.target.value)} placeholder="Descreva o teste realizado, conexão, cabos ou alimentação…" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void saveSensorReview("funcionando")}><Activity className="h-4 w-4" /> Funcionando</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void saveSensorReview("investigar")}>Investigar</Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => void saveSensorReview("manutencao")}>Manutenção</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="h-5 w-5 text-primary" /> Revisão das leituras</CardTitle>
          <CardDescription>Revise as 20 medições mais recentes. A marcação registra quem revisou, quando e o motivo; não recalibra nem altera os dados do sensor.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {latestReadings.length ? (
            <Table>
              <TableHeader><TableRow><TableHead>Horário</TableHead><TableHead>Chuva</TableHead><TableHead>Solo</TableHead><TableHead>Inclinação</TableHead><TableHead>Vibração</TableHead><TableHead>Revisão</TableHead></TableRow></TableHeader>
              <TableBody>
                {latestReadings.map((reading) => {
                  const review = readingReviews[reading.id];
                  return (
                    <TableRow key={reading.id}>
                      <TableCell className="whitespace-nowrap text-xs">{new Date(reading.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>{reading.chuva ?? "—"}</TableCell>
                      <TableCell>{reading.umidade_solo ?? "—"}</TableCell>
                      <TableCell>{reading.inclinacao ?? "—"}</TableCell>
                      <TableCell>{reading.vibracao ?? "—"}</TableCell>
                      <TableCell className="min-w-64">
                        {review ? <Badge variant="outline" className="mb-2">{review.status} · {new Date(review.reviewedAt).toLocaleString("pt-BR")}</Badge> : <span className="mb-2 block text-xs text-muted-foreground">Pendente de revisão</span>}
                        <Textarea
                          aria-label={`Observação para a leitura de ${reading.created_at}`}
                          maxLength={500}
                          rows={2}
                          value={readingNotes[reading.id] ?? review?.note ?? ""}
                          onChange={(event) => setReadingNotes((current) => ({ ...current, [reading.id]: event.target.value }))}
                          placeholder="Motivo ou observação (opcional)"
                        />
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" onClick={() => void saveReadingReview(reading, "validado")}>Validar</Button>
                          <Button size="sm" variant="outline" onClick={() => void saveReadingReview(reading, "inconsistente")}>Inconsistente</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">Ainda não há leituras reais para revisar.</p>
          )}
        </CardContent>
      </Card>

      <Card className="glass border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-5 w-5 text-primary" /> Regiões cadastradas</CardTitle>
          <CardDescription>Cadastre áreas de Recife para incluí-las nos filtros e mapas. Uma região nova não significa que haja sensor instalado nela.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 xl:grid-cols-2">
          <form onSubmit={addRegion} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="region-name">Nome da região</Label><Input id="region-name" minLength={2} maxLength={80} required value={regionName} onChange={(event) => setRegionName(event.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="region-lat">Latitude</Label><Input id="region-lat" type="number" min={-90} max={90} step="any" required value={latitude} onChange={(event) => setLatitude(event.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="region-lng">Longitude</Label><Input id="region-lng" type="number" min={-180} max={180} step="any" required value={longitude} onChange={(event) => setLongitude(event.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="region-susceptibility">Suscetibilidade (0 a 1)</Label><Input id="region-susceptibility" type="number" min={0} max={1} step="0.01" required value={susceptibility} onChange={(event) => setSusceptibility(event.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="region-households">Domicílios</Label><Input id="region-households" type="number" min={0} max={1000000} step={1} required value={households} onChange={(event) => setHouseholds(event.target.value)} /></div>
            </div>
            <Button type="submit" disabled={busy}><Plus className="h-4 w-4" /> {busy ? "Salvando…" : "Adicionar região"}</Button>
          </form>
          <div className="space-y-2">
            {[...NEIGHBORHOODS.filter((region) => !customRegions.some((custom) => custom.id === region.id)), ...customRegions].map((region: Neighborhood) => (
              <div key={region.id} className="rounded-lg border border-border/70 bg-card p-3">
                <p className="font-medium">{region.name}</p>
                <p className="text-xs text-muted-foreground">{region.municipalityId} · {region.center.lat.toFixed(4)}, {region.center.lng.toFixed(4)} · {region.households} domicílios</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
