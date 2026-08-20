import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppPage } from "@/components/app-page";
import { friendlyError } from "@/lib/format";
import type { CurrentMembership } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/musicas")({
  component: () => (
    <AppPage title="Músicas" roles={["leader", "minister"]}>
      {(ctx) => <Musicas {...ctx} />}
    </AppPage>
  ),
});

type SongForm = {
  id: string | null;
  title: string;
  artist: string;
  default_key: string;
  reference_url: string;
  notes: string;
};

const emptyForm: SongForm = {
  id: null,
  title: "",
  artist: "",
  default_key: "",
  reference_url: "",
  notes: "",
};

function Musicas({ membership, userId }: { membership: CurrentMembership; userId: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SongForm>(emptyForm);

  const { data, isPending } = useQuery({
    queryKey: ["songs", membership.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("songs")
        .select("id, title, artist, default_key, reference_url, notes, is_active")
        .eq("organization_id", membership.organization_id)
        .order("title", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        organization_id: membership.organization_id,
        title: form.title.trim(),
        artist: form.artist.trim() || null,
        default_key: form.default_key.trim() || null,
        reference_url: form.reference_url.trim() || null,
        notes: form.notes.trim() || null,
        created_by: userId,
      };
      if (form.id) {
        const { created_by: _ignored, ...update } = payload;
        const { error } = await supabase.from("songs").update(update).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("songs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(form.id ? "Música atualizada." : "Música adicionada.");
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["songs", membership.organization_id] });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("songs").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["songs", membership.organization_id] }),
    onError: (error) => toast.error(friendlyError(error)),
  });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{form.id ? "Editar música" : "Nova música"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="artista">Artista</Label>
              <Input
                id="artista"
                value={form.artist}
                onChange={(e) => setForm({ ...form, artist: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tom">Tom padrão</Label>
              <Input
                id="tom"
                placeholder="G"
                value={form.default_key}
                onChange={(e) => setForm({ ...form, default_key: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="link">Link de referência</Label>
            <Input
              id="link"
              type="url"
              placeholder="https://youtube.com/..."
              value={form.reference_url}
              onChange={(e) => setForm({ ...form, reference_url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="obs">Observações</Label>
            <Textarea
              id="obs"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={save.isPending || form.title.trim().length < 2}
              onClick={() => save.mutate()}
            >
              {form.id ? "Salvar" : "Adicionar"}
            </Button>
            {form.id && (
              <Button variant="outline" onClick={() => setForm(emptyForm)}>
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Todas as músicas</h2>
        {isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma música cadastrada.</p>
        ) : (
          (data ?? []).map((song) => (
            <div
              key={song.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{song.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {song.artist ?? "Sem artista"}
                  {song.default_key ? ` · Tom ${song.default_key}` : ""}
                </p>
                {!song.is_active && (
                  <Badge variant="outline" className="mt-1">
                    Inativa
                  </Badge>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Editar"
                  onClick={() =>
                    setForm({
                      id: song.id,
                      title: song.title,
                      artist: song.artist ?? "",
                      default_key: song.default_key ?? "",
                      reference_url: song.reference_url ?? "",
                      notes: song.notes ?? "",
                    })
                  }
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={song.is_active ? "Desativar" : "Reativar"}
                  onClick={() => toggleActive.mutate({ id: song.id, isActive: !song.is_active })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
