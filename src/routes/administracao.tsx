import { createFileRoute } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMonitoring } from "@/context/MonitoringContext";
import { firebaseAuth } from "@/integrations/firebase/client";

export const Route = createFileRoute("/administracao")({
  head: () => ({ meta: [{ title: "Administração — ProTerra" }] }),
  component: AdministrationPage,
});

function AdministrationPage() {
  const { isAdmin, isOperator, authLoading } = useMonitoring();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"operator" | "admin">("operator");
  const [busy, setBusy] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setCreatedAccount(null);
    try {
      const user = firebaseAuth?.currentUser;
      if (!user) throw new Error("Entre novamente com sua conta de administrador.");
      const token = await user.getIdToken(true);
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, password, role }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível criar a conta.");
      setCreatedAccount(result.message ?? "Conta criada. O usuário deve confirmar o e-mail para acessar.");
      toast.success("Conta criada", { description: "A verificação de e-mail será solicitada no primeiro acesso." });
      setEmail("");
      setPassword("");
      setRole("operator");
    } catch (cause) {
      toast.error("Falha ao criar conta", { description: cause instanceof Error ? cause.message : "Tente novamente." });
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return <p role="status" className="text-sm text-muted-foreground">Verificando acesso…</p>;
  if (!isOperator) {
    return <p role="alert" className="rounded-lg border border-risk-high/40 bg-risk-high/10 p-4 text-sm">Entre com uma conta de operador para acessar esta área.</p>;
  }
  if (!isAdmin) {
    return <p role="alert" className="rounded-lg border border-risk-high/40 bg-risk-high/10 p-4 text-sm">Esta área é exclusiva para administradores.</p>;
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold">Administração de acesso</h1>
        <p className="mt-1 text-sm text-muted-foreground">Somente administradores podem criar operadores ou conceder acesso administrativo.</p>
      </header>
      <Card className="glass border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-5 w-5 text-primary" /> Criar conta</CardTitle>
          <CardDescription>O usuário recebe um acesso inicial e confirma o e-mail antes de usar as funções de operação. Use uma senha temporária forte e compartilhe-a por um canal seguro.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-user-email">E-mail</Label>
              <Input id="new-user-email" type="email" autoComplete="off" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-password">Senha temporária</Label>
              <Input id="new-user-password" type="password" autoComplete="new-password" minLength={14} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} />
              <p className="text-xs text-muted-foreground">Mínimo de 14 caracteres. A senha não é exibida nem registrada pelo aplicativo.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-role">Perfil</Label>
              <Select value={role} onValueChange={(value) => setRole(value as "operator" | "admin")}>
                <SelectTrigger id="new-user-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">Operador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={busy}>
              <UserPlus className="h-4 w-4" /> {busy ? "Criando…" : role === "admin" ? "Criar administrador" : "Criar operador"}
            </Button>
          </form>
          {createdAccount ? <p role="status" className="mt-4 rounded-md border border-risk-low/40 bg-risk-low/10 p-3 text-sm">{createdAccount}</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
