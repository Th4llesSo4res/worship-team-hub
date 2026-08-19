import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/format";
import { useAuthUser } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CadastroSearch = { convite?: string };

export const Route = createFileRoute("/cadastro")({
  validateSearch: (search: Record<string, unknown>): CadastroSearch => ({
    convite: typeof search['convite'] === "string" ? (search['convite'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Criar conta | WorshipApp" },
      { name: "description", content: "Crie sua conta no WorshipApp e participe da equipe de louvor." },
      { property: "og:title", content: "Criar conta no WorshipApp" },
      {
        property: "og:description",
        content: "Crie sua conta no WorshipApp e participe da equipe de louvor.",
      },
    ],
  }),
  component: CadastroPage,
});

function CadastroPage() {
  const { convite } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (convite) sessionStorage.setItem("worshipapp:convite", convite);
  }, [convite]);

  useEffect(() => {
    if (loading || !user) return;
    const token = convite ?? sessionStorage.getItem("worshipapp:convite");
    if (!token) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    setAccepting(true);
    supabase
      .rpc("accept_invitation", { _token: token })
      .then(({ error }) => {
        sessionStorage.removeItem("worshipapp:convite");
        setAccepting(false);
        if (error) {
          toast.error(friendlyError(error, "Não foi possível aceitar o convite."));
          navigate({ to: "/dashboard", replace: true });
          return;
        }
        toast.success("Convite aceito! Aguarde a aprovação do líder.");
        navigate({ to: "/aguardando-aprovacao", replace: true });
      });
  }, [loading, user, convite, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const token = convite ?? sessionStorage.getItem("worshipapp:convite") ?? undefined;
    const redirectTo = token
      ? `${window.location.origin}/cadastro?convite=${encodeURIComponent(token)}`
      : `${window.location.origin}/dashboard`;

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { full_name: fullName.trim() },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(friendlyError(error, "Não foi possível criar a conta."));
      return;
    }
    toast.success("Cadastro criado! Confirme o e-mail que enviamos para continuar.");
  }

  if (accepting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary px-4 text-primary-foreground">
        Validando convite...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-primary-foreground">
          <h1 className="font-display text-3xl font-semibold">Criar conta</h1>
          {convite && (
            <p className="mt-1 text-sm text-primary-foreground/70">
              Use o mesmo e-mail que recebeu o convite.
            </p>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Seus dados</CardTitle>
            <CardDescription>
              Após o cadastro, confirme seu e-mail para concluir o acesso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Criando..." : "Criar conta"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm">
              <Link to="/login" className="text-muted-foreground underline">
                Já tenho conta
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
