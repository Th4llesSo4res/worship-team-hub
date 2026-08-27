import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppPage } from "@/components/app-page";
import { friendlyError, roleLabels, statusLabels } from "@/lib/format";
import type {
  CurrentMembership,
  MembershipRole,
  MembershipStatus,
} from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/equipe")({
  component: () => <AppPage title="Equipe">{(ctx) => <Equipe {...ctx} />}</AppPage>,
});

function Equipe({ membership }: { membership: CurrentMembership }) {
  const queryClient = useQueryClient();
  const isLeader = membership.role === "leader";

  const { data, isPending } = useQuery({
    queryKey: ["memberships", membership.organization_id],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("memberships")
        .select("id, role, status, user_id")
        .eq("organization_id", membership.organization_id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const ids = (members ?? []).map((m) => m.user_id);
      const names = new Map<string, string>();
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);
        for (const p of profiles ?? []) names.set(p.id, p.full_name);
      }

      return (members ?? []).map((m) => ({ ...m, full_name: names.get(m.user_id) ?? "Integrante" }));
    },
  });

  const activeLeaders = (data ?? []).filter((m) => m.role === "leader" && m.status === "active");
  const lastLeaderId = activeLeaders.length === 1 ? activeLeaders[0]!.id : null;
  const lastLeaderMessage = "Defina outro líder ativo antes de alterar ou remover este líder";

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("memberships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Integrante removido.");
      queryClient.invalidateQueries({ queryKey: ["memberships", membership.organization_id] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  const updateMember = useMutation({
    mutationFn: async (input: { id: string; role?: MembershipRole; status?: MembershipStatus }) => {
      const patch: { role?: MembershipRole; status?: MembershipStatus } = {};
      if (input.role) patch.role = input.role;
      if (input.status) patch.status = input.status;
      const { error } = await supabase.from("memberships").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Equipe atualizada.");
      queryClient.invalidateQueries({ queryKey: ["memberships", membership.organization_id] });
      queryClient.invalidateQueries({ queryKey: ["membership"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  const pending = (data ?? []).filter((m) => m.status === "pending");
  const others = (data ?? []).filter((m) => m.status !== "pending");

  return (
    <div className="space-y-6">
      {isLeader && (
        <Button asChild className="w-full">
          <Link to="/convites">Convidar integrante</Link>
        </Button>
      )}

      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <>
          {isLeader && pending.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold">Aguardando aprovação</h2>
              {pending.map((m) => (
                <div key={m.id} className="rounded-xl border border-border bg-card p-4">
                  <p className="font-medium">{m.full_name}</p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => updateMember.mutate({ id: m.id, status: "active" })}
                    >
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => updateMember.mutate({ id: m.id, status: "inactive" })}
                    >
                      Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </section>
          )}

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Integrantes</h2>
            {others.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum integrante ativo ainda.</p>
            ) : (
              others.map((m) => {
                const locked = m.id === lastLeaderId;
                return (
                  <div key={m.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{m.full_name}</p>
                        <div className="mt-1 flex gap-1.5">
                          <Badge variant="secondary">{roleLabels[m.role]}</Badge>
                          {m.status !== "active" && (
                            <Badge variant="outline">{statusLabels[m.status]}</Badge>
                          )}
                        </div>
                      </div>
                      {isLeader && (
                        <Select
                          value={m.role}
                          disabled={locked}
                          onValueChange={(value) =>
                            updateMember.mutate({ id: m.id, role: value as MembershipRole })
                          }
                        >
                          <SelectTrigger className="w-32 shrink-0" aria-label="Alterar papel">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="leader">Líder</SelectItem>
                            <SelectItem value="minister">Ministro</SelectItem>
                            <SelectItem value="musician">Músico</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {isLeader && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={locked}
                          onClick={() =>
                            updateMember.mutate({
                              id: m.id,
                              status: m.status === "active" ? "inactive" : "active",
                            })
                          }
                        >
                          {m.status === "active" ? "Desativar" : "Ativar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={locked}
                          onClick={() => removeMember.mutate(m.id)}
                        >
                          Remover
                        </Button>
                      </div>
                    )}

                    {isLeader && locked && (
                      <p className="mt-2 text-xs text-muted-foreground">{lastLeaderMessage}</p>
                    )}
                  </div>
                );
              })
            )}
          </section>
        </>
      )}
    </div>
  );
}
