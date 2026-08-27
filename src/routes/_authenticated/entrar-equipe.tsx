import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/entrar-equipe")({
  component: EntrarEquipePage,
});

function extractToken(value: string) {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    return url.searchParams.get("convite") ?? trimmed;
  } catch {
    return trimmed;
  }
}

function EntrarEquipePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = extractToken(value);
    if (!token) {
      toast.error("Cole o link ou o código do convite.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("accept_invitation", { _token: token });
    setSaving(false);
    if (error) {
      toast.error(friendlyError(error, "Não foi possível aceitar o convite."));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["membership"] });
    toast.success("Convite aceito! Aguarde a aprovação do líder.");
    navigate({ to: "/aguardando-aprovacao", replace: true });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Entrar com convite</CardTitle>
          <CardDescription>
            O convite define seu cargo na equipe e precisa ser do mesmo e-mail da sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="convite">Link ou código do convite</Label>
              <Input
                id="convite"
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Validando..." : "Aceitar convite"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate({ to: "/onboarding" })}
            >
              Voltar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
