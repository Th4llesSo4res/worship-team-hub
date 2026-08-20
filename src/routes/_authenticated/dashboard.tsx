import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { AppPage } from "@/components/app-page";
import { EventCard, type EventCardData } from "@/components/event-card";
import { isManager, type CurrentMembership } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: () => <AppPage title="Início">{(ctx) => <Dashboard {...ctx} />}</AppPage>,
});

function useUpcoming(membership: CurrentMembership) {
  return useQuery({
    queryKey: ["dashboard-events", membership.organization_id, membership.id],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const [eventsRes, assignmentsRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, event_type, status, starts_at, location")
          .eq("organization_id", membership.organization_id)
          .gte("starts_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(5),
        supabase
          .from("event_assignments")
          .select("id, event_id, response_status")
          .eq("membership_id", membership.id),
      ]);
      if (eventsRes.error) throw eventsRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;
      return {
        events: (eventsRes.data ?? []) as EventCardData[],
        assignments: assignmentsRes.data ?? [],
      };
    },
  });
}

function Dashboard({ membership }: { membership: CurrentMembership }) {
  const { data, isPending } = useUpcoming(membership);
  const manager = isManager(membership.role);

  const responseByEvent = new Map(
    (data?.assignments ?? []).map((a) => [a.event_id, a.response_status as string]),
  );
  const myEvents = (data?.events ?? []).filter((e) => responseByEvent.has(e.id));
  const pendingCount = myEvents.filter((e) => responseByEvent.get(e.id) === "pending").length;

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-secondary p-4">
        <p className="text-sm text-secondary-foreground/80">
          {pendingCount > 0
            ? `Você tem ${pendingCount} escala(s) aguardando sua resposta.`
            : "Nenhuma resposta pendente. Tudo em dia!"}
        </p>
      </section>

      {manager && (
        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <Link to="/eventos/novo">Novo evento</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/musicas">Músicas</Link>
          </Button>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Minhas próximas escalas</h2>
        {isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : myEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você ainda não está escalado.</p>
        ) : (
          myEvents.map((event) => (
            <EventCard key={event.id} event={event} myResponse={responseByEvent.get(event.id)} />
          ))
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Próximos eventos</h2>
          <Link to="/agenda" className="text-sm text-muted-foreground underline">
            Ver agenda
          </Link>
        </div>
        {isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : (data?.events ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento agendado.</p>
        ) : (
          (data?.events ?? []).map((event) => <EventCard key={event.id} event={event} />)
        )}
      </section>
    </div>
  );
}
