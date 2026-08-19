import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha | WorshipApp" },
      { name: "description", content: "Receba um link para redefinir a senha do WorshipApp." },
      { property: "og:title", content: "Recuperar senha do WorshipApp" },
      {
        property: "og:description",
        content: "Receba um link para redefinir a senha do WorshipApp.",
      },
    ],
  }),
  component: RecuperarSenhaPage,
});

function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/perfil`,
    });
    setLoading(false);
    if (error) {
      toast.error(friendlyError(error, "Não foi possível enviar o e-mail."));
      return;
    }
    toast.success("Se o e-mail existir, enviaremos o link de recuperação.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Recuperar senha</CardTitle>
          <CardDescription>Enviaremos um link para redefinir sua senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm">
            <Link to="/login" className="text-muted-foreground underline">
              Voltar para o login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
