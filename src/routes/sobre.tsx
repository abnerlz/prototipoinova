import { createFileRoute } from "@tanstack/react-router";
import { HeartHandshake, Leaf, Radio, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/sobre")({
  head: () => ({ meta: [{ title: "Sobre nós — ProTerra" }, { name: "description", content: "Conheça a proposta e os limites do protótipo ProTerra." }] }),
  component: AboutPage,
});

function AboutPage() {
  return <main className="mx-auto w-full max-w-5xl space-y-6">
    <header className="max-w-3xl space-y-2">
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">Sobre nós</p>
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Tecnologia para cuidar do território</h1>
      <p className="text-muted-foreground">O ProTerra é um protótipo de monitoramento ambiental voltado à visualização de leituras de sensores, análise experimental de risco e apoio à compreensão das condições locais.</p>
    </header>
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="glass border-border/60"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Leaf className="h-5 w-5 text-primary" /> Nossa proposta</CardTitle></CardHeader><CardContent className="text-sm leading-relaxed text-muted-foreground">Reunir dados ambientais e apresentá-los de forma clara para apoiar observação, validação e planejamento comunitário.</CardContent></Card>
      <Card className="glass border-border/60"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Radio className="h-5 w-5 text-primary" /> Como funciona</CardTitle></CardHeader><CardContent className="text-sm leading-relaxed text-muted-foreground">Sensores enviam leituras ao Firebase e o painel organiza os valores, horários, histórico e indicadores calculados para as áreas configuradas.</CardContent></Card>
      <Card className="glass border-border/60"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5 text-primary" /> Uso responsável</CardTitle></CardHeader><CardContent className="text-sm leading-relaxed text-muted-foreground">Os índices e análises são experimentais. Não são previsão validada nem ordem de evacuação, e não substituem inspeção de campo ou orientações oficiais da Defesa Civil.</CardContent></Card>
      <Card className="glass border-border/60"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><HeartHandshake className="h-5 w-5 text-primary" /> Construção colaborativa</CardTitle></CardHeader><CardContent className="text-sm leading-relaxed text-muted-foreground">O projeto está em evolução. A validação das medições, a calibração dos sensores e a participação de especialistas são etapas essenciais para ampliar sua confiabilidade.</CardContent></Card>
    </div>
  </main>;
}
