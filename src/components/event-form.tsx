import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type EventFormValues = {
  title: string;
  event_type: "service" | "rehearsal" | "special";
  starts_at: string;
  ends_at: string;
  location: string;
  notes: string;
};

export function EventForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
}: {
  initial: EventFormValues;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: EventFormValues) => void;
}) {
  const [values, setValues] = useState<EventFormValues>(initial);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="titulo">Título</Label>
        <Input
          id="titulo"
          required
          value={values.title}
          onChange={(e) => setValues({ ...values, title: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select
          value={values.event_type}
          onValueChange={(v) => setValues({ ...values, event_type: v as EventFormValues["event_type"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="service">Culto</SelectItem>
            <SelectItem value="rehearsal">Ensaio</SelectItem>
            <SelectItem value="special">Evento especial</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="inicio">Início</Label>
          <Input
            id="inicio"
            type="datetime-local"
            required
            value={values.starts_at}
            onChange={(e) => setValues({ ...values, starts_at: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fim">Término (opcional)</Label>
          <Input
            id="fim"
            type="datetime-local"
            value={values.ends_at}
            onChange={(e) => setValues({ ...values, ends_at: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="local">Local</Label>
        <Input
          id="local"
          value={values.location}
          onChange={(e) => setValues({ ...values, location: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notas">Observações</Label>
        <Textarea
          id="notas"
          value={values.notes}
          onChange={(e) => setValues({ ...values, notes: e.target.value })}
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
