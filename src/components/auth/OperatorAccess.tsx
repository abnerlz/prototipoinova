import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMonitoring } from "@/context/MonitoringContext";

export function OperatorAccess() {
  const { operatorEmail, isOperator, isAdmin, authLoading, authConfigured, signInOperator, signOutOperator } = useMonitoring();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await signInOperator(email, password);
      setOpen(false);
      setPassword("");
      toast.success("Acesso de operador iniciado", { description: "Sua conta e suas permissões foram verificadas." });
    } catch (cause) {
      toast.error("Não foi possível entrar", {
        description: cause instanceof Error ? cause.message : "Verifique o e-mail e a senha.",
        duration: 9000,
      });
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await signOutOperator();
      toast.success("Sessão encerrada");
    } catch {
      toast.error("Não foi possível encerrar a sessão.");
    }
  }

  if (isOperator && operatorEmail) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="hidden max-w-36 truncate text-xs text-muted-foreground xl:inline" title={operatorEmail}>
          <ShieldCheck aria-hidden="true" className="mr-1 inline h-3.5 w-3.5 text-primary" />
          {isAdmin ? "Admin" : "Operador"}
        </span>
        <Button asChild variant="ghost" size="icon" aria-label="Sair da conta de operador" title="Sair">
          <button type="button" onClick={logout}><LogOut className="h-4 w-4" /></button>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" disabled={authLoading} onClick={() => setOpen(true)}>
        <LogIn aria-hidden="true" className="h-4 w-4" />
        <span className="hidden sm:inline">Acesso operador</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Entrar como operador</DialogTitle>
            <DialogDescription>
              O acesso exige uma conta criada por um administrador e e-mail confirmado.
            </DialogDescription>
          </DialogHeader>
          {!authConfigured ? (
            <p className="rounded-md border border-risk-high/40 bg-risk-high/10 p-3 text-sm">
              O login ainda depende da configuração de VITE_FIREBASE_API_KEY no ambiente do site.
            </p>
          ) : null}
          <form id="operator-login-form" onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="operator-email">E-mail</Label>
              <Input id="operator-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="operator-password">Senha</Label>
              <Input id="operator-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" form="operator-login-form" disabled={busy || !authConfigured}>
              {busy ? "Verificando…" : "Entrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
