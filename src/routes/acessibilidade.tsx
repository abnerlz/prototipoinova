import { createFileRoute } from "@tanstack/react-router";
import { Accessibility, Keyboard, Eye, Link2, Moon, MousePointer2, MoveHorizontal, Type, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  applyAccessibilityPreferences,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  readAccessibilityPreferences,
  saveAccessibilityPreferences,
  type AccessibilityPreferences,
} from "@/lib/accessibility";

export const Route = createFileRoute("/acessibilidade")({
  head: () => ({ meta: [{ title: "Acessibilidade — ProTerra" }] }),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  const [preferences, setPreferences] = useState(DEFAULT_ACCESSIBILITY_PREFERENCES);

  useEffect(() => {
    const stored = readAccessibilityPreferences();
    setPreferences(stored);
    applyAccessibilityPreferences(stored);
  }, []);

  function updatePreference<K extends keyof AccessibilityPreferences>(key: K, value: AccessibilityPreferences[K]) {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      applyAccessibilityPreferences(next);
      saveAccessibilityPreferences(next);
      return next;
    });
  }

  const options: {
    key: Exclude<keyof AccessibilityPreferences, "fontScale">;
    title: string;
    description: string;
    icon: LucideIcon;
  }[] = [
    {
      key: "darkTheme",
      title: "Tema escuro",
      description: "Ativa o tema escuro. Desative para usar o tema claro.",
      icon: Moon,
    },
    {
      key: "spaciousSpacing",
      title: "Mais espaçamento",
      description: "Amplia o espaço entre linhas e letras.",
      icon: MoveHorizontal,
    },
    {
      key: "largeTargets",
      title: "Controles maiores",
      description: "Amplia botões e campos para facilitar o toque.",
      icon: MousePointer2,
    },
    {
      key: "highContrast",
      title: "Alto contraste",
      description: "Reforça o contraste entre texto, fundo, bordas e foco do teclado.",
      icon: Eye,
    },
    {
      key: "reduceMotion",
      title: "Reduzir animações",
      description: "Diminui animações e transições da interface.",
      icon: MoveHorizontal,
    },
    {
      key: "underlineLinks",
      title: "Sublinhar links",
      description: "Ajuda a identificar links sem depender apenas da cor.",
      icon: Link2,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Accessibility aria-hidden="true" className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold">Acessibilidade</h1>
            <p className="text-sm text-muted-foreground">Ajuste a visualização do ProTerra às suas necessidades.</p>
          </div>
        </div>
      </header>

      <section aria-labelledby="visual-options-title" className="space-y-3">
        <h2 id="visual-options-title" className="font-display text-lg font-semibold">Preferências de visualização</h2>
        <Card className="glass border-border/70">
          <CardHeader className="flex flex-row items-center gap-3">
            <Type aria-hidden="true" className="h-5 w-5 text-primary" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base"><Label htmlFor="font-scale">Tamanho do texto</Label></CardTitle>
              <CardDescription className="mt-1">Escolha entre o tamanho padrão, ampliado ou extra grande.</CardDescription>
            </div>
            <Select
              value={preferences.fontScale}
              onValueChange={(value) => updatePreference("fontScale", value as AccessibilityPreferences["fontScale"])}
            >
              <SelectTrigger id="font-scale" className="w-40" aria-label="Tamanho do texto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Padrão</SelectItem>
                <SelectItem value="large">Ampliado</SelectItem>
                <SelectItem value="largest">Extra grande</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((option) => {
            const Icon = option.icon;
            const checked = preferences[option.key];
            const descriptionId = `accessibility-${option.key}-description`;
            return (
              <Card key={option.key} className="glass border-border/70">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">
                        <Label htmlFor={`accessibility-${option.key}`} className="cursor-pointer text-base">
                          {option.title}
                        </Label>
                      </CardTitle>
                      <CardDescription id={descriptionId} className="mt-1">{option.description}</CardDescription>
                    </div>
                    <Switch
                      id={`accessibility-${option.key}`}
                      aria-label={option.title}
                      aria-describedby={descriptionId}
                      checked={checked}
                      onCheckedChange={(value) => updatePreference(option.key, value)}
                    />
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Keyboard aria-hidden="true" className="h-5 w-5 text-primary" /> Navegação pelo teclado
          </CardTitle>
          <CardDescription>Você pode navegar pelas páginas sem usar o mouse.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><kbd className="rounded border bg-muted px-1.5 py-0.5 text-foreground">Tab</kbd> avança entre links e controles; <kbd className="rounded border bg-muted px-1.5 py-0.5 text-foreground">Shift + Tab</kbd> volta.</p>
          <p><kbd className="rounded border bg-muted px-1.5 py-0.5 text-foreground">Enter</kbd> ou <kbd className="rounded border bg-muted px-1.5 py-0.5 text-foreground">Espaço</kbd> ativa o item selecionado.</p>
          <p>As preferências ficam salvas neste navegador e podem ser alteradas a qualquer momento.</p>
        </CardContent>
      </Card>
    </main>
  );
}
