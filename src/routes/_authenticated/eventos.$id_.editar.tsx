import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppPage } from "@/components/app-page";
import { EventForm, type EventFormValues } from "@/components/event-form";
import { friendlyError, fromLocalInputValue, toLocalInputValue } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/eventos/$id_/editar")({
  component: EditarRoute,
});

function EditarRoute() {
  const { id } = Route.useParams();
  return (
    <AppPage title="Editar evento" roles={["leader", "minister"]}>
      {() => <EditarEvento eventId={id} />}
    </AppPage>
  );
}

function EditarEvento({ eventId }: { eventId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ["evento-editar", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("title, event_type, starts_at, ends_at, location, notes")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async (values: EventFormValues) => {
      const startsAt = fromLocalInputValue(values.starts_at);
      if (!startsAt) throw new Error("Informe a data e hora de início.");
      const { error } = await supabase
        .from("events")
        .update({
          title: values.title.trim(),
          event_type: values.event_type,
          starts_at: startsAt,
          ends_at: fromLocalInputValue(values.ends_at),
          location: values.location.trim() || null,
          notes: values.notes.trim() || null,
        })
        .eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento atualizado.");
      queryClient.invalidateQueries({ queryKey: ["evento", eventId] });
      queryClient.invalidateQueries({ queryKey: ["agenda"] });
      navigate({ to: "/eventos/$id", params: { id: eventId } });
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  if (isPending) return <Skeleton className="h-72 w-full" />;
  if (!data) return <p className="text-sm text-muted-foreground">Evento não encontrado.</p>;

  return (
    <EventForm
      initial={{
        title: data.title,
        event_type: data.event_type,
        starts_at: toLocalInputValue(data.starts_at),
        ends_at: toLocalInputValue(data.ends_at),
        location: data.location ?? "",
        notes: data.notes ?? "",
      }}
      submitLabel="Salvar alterações"
      pending={update.isPending}
      onSubmit={(values) => update.mutate(values)}
    />
  );
}
