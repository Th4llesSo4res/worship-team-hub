import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppPage } from "@/components/app-page";
import { formatDateTime, friendlyError, roleLabels } from "@/lib/format";
import type { CurrentMembership, MembershipRole } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/convites")({
  component: () => (
    <AppPage title="Convites" roles={["leader"]}>
      {(ctx) => <Convites {...ctx} />}
    </AppPage>
  ),
});

function Convites({ membership }: { membership: CurrentMembership }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MembershipRole>("musician");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["invitations", membership.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("id, email, role, expires_at, used_at, created_at")
        .eq("organization_id", membership.organization_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_invitation", {
        _organization_id: membership.organization_id,
        _email: email.trim().toLowerCase(),
        _role: role,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (token) => {
      setInviteLink(`${window.location.origin}/cadastro?convite=${encodeURIComponent(token)}`);
      setEmail("");
      toast.success("Convite gerado. Copie e envie o link.");
      queryClient.invalidateQueries({ queryKey: ["invitations", membership.organization_id] });
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível gerar o convite.")),
  });

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    toast.success("Link copiado.");
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Convidar integrante</CardTitle>
          <CardDescription>
            O link é de uso único e só funciona para o e-mail informado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as MembershipRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="musician">Músico</SelectItem>
                <SelectItem value="minister">Ministro</SelectItem>
                <SelectItem value="leader">Líder</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            disabled={createInvite.isPending || !email.includes("@")}
            onClick={() => createInvite.mutate()}
          >
            Gerar convite
          </Button>

          {inviteLink && (
            <div className="space-y-2 rounded-lg bg-muted p-3">
              <p className="break-all text-xs text-muted-foreground">{inviteLink}</p>
              <Button variant="outline" size="sm" onClick={() => void copyLink()}>
                <Copy className="mr-2 size-4" /> Copiar link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Convites enviados</h2>
        {(data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum convite gerado ainda.</p>
        ) : (
          (data ?? []).map((invite) => {
            const expired = new Date(invite.expires_at).getTime() < Date.now();
            return (
              <div
                key={invite.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Expira em {formatDateTime(invite.expires_at)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="secondary">{roleLabels[invite.role]}</Badge>
                  {invite.used_at ? (
                    <Badge>Usado</Badge>
                  ) : expired ? (
                    <Badge variant="destructive">Expirado</Badge>
                  ) : (
                    <Badge variant="outline">Pendente</Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
