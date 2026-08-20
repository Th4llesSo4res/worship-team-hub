import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ExternalLink, MapPin, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppPage } from "@/components/app-page";
import {
  eventStatusLabels,
  eventTypeLabels,
  formatDateTime,
  friendlyError,
  responseLabels,
} from "@/lib/format";
import { isManager, type CurrentMembership } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/eventos/$id")({
  component: EventoRoute,
});

function EventoRoute() {
  const { id } = Route.useParams();
  return <AppPage title="Evento">{(ctx) => <Evento eventId={id} {...ctx} />}</AppPage>;
}

function Evento({
  eventId,
  membership,
}: {
  eventId: string;
  membership: CurrentMembership;
}) {
  const queryClient = useQueryClient();
  const manager = isManager(membership.role);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["evento", eventId] });

  const [declineNote, setDeclineNote] = useState("");
  const [newSongId, setNewSongId] = useState("");
  const [newSongKey, setNewSongKey] = useState("");
  const [newMemberId, setNewMemberId] = useState("");
  const [newFunctionId, setNewFunctionId] = useState("");

  const { data, isPending } = useQuery({
    queryKey: ["evento", eventId],
    queryFn: async () => {
      const [eventRes, songsRes, assignmentsRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, event_type, status, starts_at, ends_at, location, notes")
          .eq("id", eventId)
          .maybeSingle(),
        supabase
          .from("event_songs")
          .select("id, position, selected_key, notes, songs(id, title, artist, default_key, reference_url)")
          .eq("event_id", eventId)
          .order("position", { ascending: true }),
        supabase
          .from("event_assignments")
          .select("id, membership_id, response_status, response_note, ministry_functions(name)")
          .eq("event_id", eventId),
      ]);
      if (eventRes.error) throw eventRes.error;
      if (songsRes.error) throw songsRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      const assignments = assignmentsRes.data ?? [];
      const names = new Map<string, string>();
      if (assignments.length > 0) {
        const { data: members } = await supabase
          .from("memberships")
          .select("id, user_id")
          .in("id", assignments.map((a) => a.membership_id));
        const userIds = (members ?? []).map((m) => m.user_id);
        const { data: profiles } = userIds.length
          ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
          : { data: [] };
        const byUser = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
        for (const m of members ?? []) names.set(m.id, byUser.get(m.user_id) ?? "Integrante");
      }

      return {
        event: eventRes.data,
        songs: songsRes.data ?? [],
        assignments: assignments.map((a) => ({ ...a, name: names.get(a.membership_id) ?? "Integrante" })),
      };
    },
  });

  const { data: options } = useQuery({
    queryKey: ["evento-options", membership.organization_id],
    enabled: manager,
    queryFn: async () => {
      const [songsRes, functionsRes, membersRes] = await Promise.all([
        supabase
          .from("songs")
          .select("id, title, default_key")
          .eq("organization_id", membership.organization_id)
          .eq("is_active", true)
          .order("title"),
        supabase
          .from("ministry_functions")
          .select("id, name")
          .eq("organization_id", membership.organization_id)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("memberships")
          .select("id, user_id")
          .eq("organization_id", membership.organization_id)
          .eq("status", "active"),
      ]);
      const members = membersRes.data ?? [];
      const userIds = members.map((m) => m.user_id);
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] };
      const byUser = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
      return {
        songs: songsRes.data ?? [],
        functions: functionsRes.data ?? [],
        members: members.map((m) => ({ id: m.id, name: byUser.get(m.user_id) ?? "Integrante" })),
      };
    },
  });

  const respond = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "confirmed" | "declined" }) => {
      if (status === "declined" && declineNote.trim().length < 3) {
        throw new Error("Justifique a recusa para a liderança.");
      }
      const { error } = await supabase
        .from("event_assignments")
        .update({
          response_status: status,
          response_note: status === "declined" ? declineNote.trim() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setDeclineNote("");
      toast.success("Resposta registrada.");
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["dashboard-events"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  const setStatus = useMutation({
    mutationFn: async (status: "published" | "cancelled" | "completed" | "draft") => {
      const { error } = await supabase.from("events").update({ status }).eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento atualizado.");
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["agenda"] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  const addSong = useMutation({
    mutationFn: async () => {
      if (!newSongId) throw new Error("Escolha uma música.");
      const { error } = await supabase.from("event_songs").insert({
        organization_id: membership.organization_id,
        event_id: eventId,
        song_id: newSongId,
        position: (data?.songs.length ?? 0) + 1,
        selected_key: newSongKey.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewSongId("");
      setNewSongKey("");
      invalidate();
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  const removeSong = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_songs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error) => toast.error(friendlyError(error)),
  });

  const addAssignment = useMutation({
    mutationFn: async () => {
      if (!newMemberId || !newFunctionId) throw new Error("Escolha o integrante e a função.");
      const { error } = await supabase.from("event_assignments").insert({
        organization_id: membership.organization_id,
        event_id: eventId,
        membership_id: newMemberId,
        function_id: newFunctionId,
        assigned_by: membership.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMemberId("");
      setNewFunctionId("");
      invalidate();
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  const removeAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error) => toast.error(friendlyError(error)),
  });

  if (isPending) return <Skeleton className="h-64 w-full" />;
  if (!data?.event) return <p className="text-sm text-muted-foreground">Evento não encontrado.</p>;

  const event = data.event;
  const myAssignment = data.assignments.find((a) => a.membership_id === membership.id);

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">{event.title}</h2>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary">{eventTypeLabels[event.event_type]}</Badge>
            <Badge variant="outline">{eventStatusLabels[event.status]}</Badge>
          </div>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="size-4" /> {formatDateTime(event.starts_at)}
          {event.ends_at ? ` — ${formatDateTime(event.ends_at)}` : ""}
        </p>
        {event.location && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" /> {event.location}
          </p>
        )}
        {event.notes && <p className="text-sm">{event.notes}</p>}

        {manager && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/eventos/$id/editar" params={{ id: eventId }}>
                Editar
              </Link>
            </Button>
            {event.status === "draft" && (
              <Button size="sm" onClick={() => setStatus.mutate("published")}>
                Publicar
              </Button>
            )}
            {event.status === "published" && (
              <>
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate("completed")}>
                  Concluir
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setStatus.mutate("cancelled")}
                >
                  Cancelar
                </Button>
              </>
            )}
          </div>
        )}
      </section>

      {myAssignment && (
        <Card>
          <CardHeader>
            <CardTitle>Minha escala</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              Função: <strong>{myAssignment.ministry_functions?.name}</strong> · Status:{" "}
              {responseLabels[myAssignment.response_status]}
            </p>
            <div className="space-y-2">
              <Label htmlFor="justificativa">Justificativa (obrigatória ao recusar)</Label>
              <Textarea
                id="justificativa"
                value={declineNote}
                onChange={(e) => setDeclineNote(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => respond.mutate({ id: myAssignment.id, status: "confirmed" })}
              >
                Confirmar
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => respond.mutate({ id: myAssignment.id, status: "declined" })}
              >
                Recusar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Escala</h2>
        {data.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguém escalado ainda.</p>
        ) : (
          data.assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{a.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {a.ministry_functions?.name}
                </p>
                {a.response_note && (
                  <p className="text-xs text-muted-foreground">Motivo: {a.response_note}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge
                  variant={
                    a.response_status === "confirmed"
                      ? "default"
                      : a.response_status === "declined"
                        ? "destructive"
                        : "outline"
                  }
                >
                  {responseLabels[a.response_status]}
                </Badge>
                {manager && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remover da escala"
                    onClick={() => removeAssignment.mutate(a.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}

        {manager && (
          <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
            <Select value={newMemberId} onValueChange={setNewMemberId}>
              <SelectTrigger aria-label="Integrante">
                <SelectValue placeholder="Integrante" />
              </SelectTrigger>
              <SelectContent>
                {(options?.members ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newFunctionId} onValueChange={setNewFunctionId}>
              <SelectTrigger aria-label="Função">
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                {(options?.functions ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={() => addAssignment.mutate()}>
              Escalar
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Repertório do evento</h2>
        {data.songs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma música definida.</p>
        ) : (
          data.songs.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{s.songs?.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {s.songs?.artist ?? "Sem artista"}
                  {s.selected_key || s.songs?.default_key
                    ? ` · Tom ${s.selected_key ?? s.songs?.default_key}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {s.songs?.reference_url && (
                  <a
                    href={s.songs.reference_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground"
                    aria-label="Abrir referência"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                )}
                {manager && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remover música"
                    onClick={() => removeSong.mutate(s.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}

        {manager && (
          <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
            <Select value={newSongId} onValueChange={setNewSongId}>
              <SelectTrigger aria-label="Música">
                <SelectValue placeholder="Música" />
              </SelectTrigger>
              <SelectContent>
                {(options?.songs ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Tom do evento (opcional)"
              value={newSongKey}
              onChange={(e) => setNewSongKey(e.target.value)}
            />
            <Button className="w-full" onClick={() => addSong.mutate()}>
              Adicionar música
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
