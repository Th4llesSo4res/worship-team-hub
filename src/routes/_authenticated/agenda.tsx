import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { AppPage } from "@/components/app-page";
import { EventCard, type EventCardData } from "@/components/event-card";
import { isManager, type CurrentMembership } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: () => <AppPage title="Agenda">{(ctx) => <Agenda {...ctx} />}</AppPage>,
});

function Agenda({ membership }: { membership: CurrentMembership }) {
  const [tab, setTab] = useState<"proximos" | "passados">("proximos");
  const manager = isManager(membership.role);

  const { data, isPending } = useQuery({
    queryKey: ["agenda", membership.organization_id, tab],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      let query = supabase
        .from("events")
        .select("id, title, event_type, status, starts_at, location")
        .eq("organization_id", membership.organization_id);

      query =
        tab === "proximos"
          ? query.gte("starts_at", nowIso).order("starts_at", { ascending: true })
          : query.lt("starts_at", nowIso).order("starts_at", { ascending: false });

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return (data ?? []) as EventCardData[];
    },
  });

  return (
    <div className="space-y-4">
      {manager && (
        <Button asChild className="w-full">
          <Link to="/eventos/novo">Novo evento</Link>
        </Button>
      )}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="w-full">
          <TabsTrigger value="proximos" className="flex-1">
            Próximos
          </TabsTrigger>
          <TabsTrigger value="passados" className="flex-1">
            Anteriores
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento encontrado.</p>
        ) : (
          (data ?? []).map((event) => <EventCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}
