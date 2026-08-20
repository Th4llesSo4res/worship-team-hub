import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppPage } from "@/components/app-page";
import { isManager, type CurrentMembership } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/repertorio")({
  component: () => <AppPage title="Repertório">{(ctx) => <Repertorio {...ctx} />}</AppPage>,
});

function Repertorio({ membership }: { membership: CurrentMembership }) {
  const [term, setTerm] = useState("");
  const manager = isManager(membership.role);

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

  const filtered = (data ?? []).filter((s) =>
    `${s.title} ${s.artist ?? ""}`.toLowerCase().includes(term.trim().toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {manager && (
        <Button asChild variant="outline" className="w-full">
          <Link to="/musicas">Gerenciar músicas</Link>
        </Button>
      )}
      <Input
        placeholder="Buscar por título ou artista"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma música encontrada.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((song) => (
            <li key={song.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-base font-semibold">{song.title}</h3>
                  {song.artist && (
                    <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
                  )}
                  {song.notes && <p className="mt-1 text-sm text-muted-foreground">{song.notes}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {song.default_key && <Badge variant="secondary">Tom {song.default_key}</Badge>}
                  {!song.is_active && <Badge variant="outline">Inativa</Badge>}
                  {song.reference_url && (
                    <a
                      href={song.reference_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground underline"
                    >
                      Ouvir <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
