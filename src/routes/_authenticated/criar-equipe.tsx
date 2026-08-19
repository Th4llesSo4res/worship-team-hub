import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/format";
import { useAuthUser, useCurrentMembership } from "@/hooks/use-session";
import { PageSkeleton } from "@/components/app-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/criar-equipe")({
  component: CriarEquipePage,
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function CriarEquipePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useAuthUser();
  const { data: membership, isPending } = useCurrentMembership(user?.id);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading || isPending || !membership) return;
    navigate({
      to: membership.status === "active" ? "/dashboard" : "/aguardando-aprovacao",
      replace: true,
    });
  }, [loading, isPending, membership, navigate]);

  if (loading || isPending || membership) return <PageSkeleton />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      toast.error("Informe um nome com pelo menos 3 caracteres.");
      return;
    }
    setSaving(true);
    const slug = `${slugify(trimmed)}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase.rpc("create_organization_with_leader", {
      _name: trimmed,
      _slug: slug,
    });
    setSaving(false);
    if (error) {
      toast.error(friendlyError(error, "Não foi possível criar a equipe."));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["membership"] });
    toast.success("Equipe criada! Você é o líder.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Criar equipe</CardTitle>
          <CardDescription>
            Você será o líder e poderá convidar ministros e músicos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da equipe / igreja</Label>
              <Input
                id="nome"
                required
                value={name}
                placeholder="Ministério de Louvor Central"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Criando..." : "Criar equipe"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
