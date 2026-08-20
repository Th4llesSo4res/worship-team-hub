import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { AppPage } from "@/components/app-page";
import { EventForm, type EventFormValues } from "@/components/event-form";
import { fromLocalInputValue, friendlyError } from "@/lib/format";
import type { CurrentMembership } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/eventos/novo")({
  component: () => (
    <AppPage title="Novo evento" roles={["leader", "minister"]}>
      {(ctx) => <NovoEvento {...ctx} />}
    </AppPage>
  ),
});

function NovoEvento({ membership, userId }: { membership: CurrentMembership; userId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: async (values: EventFormValues) => {
      const startsAt = fromLocalInputValue(values.starts_at);
      if (!startsAt) throw new Error("Informe a data e hora de início.");
      const { data, error } = await supabase
        .from("events")
        .insert({
          organization_id: membership.organization_id,
          title: values.title.trim(),
          event_type: values.event_type,
          starts_at: startsAt,
          ends_at: fromLocalInputValue(values.ends_at),
          location: values.location.trim() || null,
          notes: values.notes.trim() || null,
          created_by: userId,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      toast.success("Evento criado como rascunho.");
      queryClient.invalidateQueries({ queryKey: ["agenda"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-events"] });
      navigate({ to: "/eventos/$id", params: { id } });
    },
    onError: (error) => toast.error(friendlyError(error, "Não foi possível criar o evento.")),
  });

  return (
    <EventForm
      initial={{
        title: "",
        event_type: "service",
        starts_at: "",
        ends_at: "",
        location: "",
        notes: "",
      }}
      submitLabel="Criar evento"
      pending={create.isPending}
      onSubmit={(values) => create.mutate(values)}
    />
  );
}
