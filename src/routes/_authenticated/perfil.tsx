import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppPage } from "@/components/app-page";
import { friendlyError, functionCategoryLabels, roleLabels } from "@/lib/format";
import type { CurrentMembership } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: () => <AppPage title="Perfil">{(ctx) => <Perfil {...ctx} />}</AppPage>,
});

function Perfil({ membership, userId }: { membership: CurrentMembership; userId: string }) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: myFunctions } = useQuery({
    queryKey: ["member-functions", membership.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_functions")
        .select("id, is_primary, ministry_functions(name, category)")
        .eq("membership_id", membership.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado.");
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  async function handlePassword() {
    if (password.length < 8) {
      toast.error("A nova senha precisa ter ao menos 8 caracteres.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(friendlyError(error, "Não foi possível alterar a senha."));
      return;
    }
    setPassword("");
    toast.success("Senha atualizada.");
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Meus dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tel">Telefone</Label>
            <Input
              id="tel"
              value={phone}
              placeholder="(11) 99999-0000"
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={saveProfile.isPending}
            onClick={() => saveProfile.mutate()}
          >
            Salvar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            {membership.organization_name} —{" "}
            <span className="font-medium">{roleLabels[membership.role]}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {(myFunctions ?? []).length === 0 ? (
              <p className="text-muted-foreground">
                Nenhuma função atribuída. Peça ao líder para definir suas funções.
              </p>
            ) : (
              (myFunctions ?? []).map((f) => (
                <Badge key={f.id} variant={f.is_primary ? "default" : "secondary"}>
                  {f.ministry_functions?.name}
                  {f.ministry_functions?.category
                    ? ` · ${functionCategoryLabels[f.ministry_functions.category]}`
                    : ""}
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alterar senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senha">Nova senha</Label>
            <Input
              id="senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button variant="outline" className="w-full" onClick={() => void handlePassword()}>
            Atualizar senha
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
