import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { eventStatusLabels, eventTypeLabels, formatDateTime, responseLabels } from "@/lib/format";

export type EventCardData = {
  id: string;
  title: string;
  event_type: string;
  status: string;
  starts_at: string;
  location: string | null;
};

export function EventCard({
  event,
  myResponse,
}: {
  event: EventCardData;
  myResponse?: string | null | undefined;
}) {
  return (
    <Link
      to="/eventos/$id"
      params={{ id: event.id }}
      className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold">{event.title}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            {formatDateTime(event.starts_at)}
          </p>
          {event.location && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {event.location}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge variant="secondary">{eventTypeLabels[event.event_type] ?? event.event_type}</Badge>
          {event.status !== "published" && (
            <Badge variant="outline">{eventStatusLabels[event.status] ?? event.status}</Badge>
          )}
          {myResponse && (
            <Badge
              variant={
                myResponse === "confirmed"
                  ? "default"
                  : myResponse === "declined"
                    ? "destructive"
                    : "outline"
              }
            >
              {responseLabels[myResponse] ?? myResponse}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
