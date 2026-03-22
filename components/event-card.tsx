import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Event } from "@/lib/types";

interface EventCardProps {
  event: Event;
  totalSpent?: number;
}

export function EventCard({ event, totalSpent = 0 }: EventCardProps) {
  const budget = event.total_budget || 0;
  const percentage = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;

  const statusVariant = {
    active: "success" as const,
    completed: "secondary" as const,
    cancelled: "destructive" as const,
  };

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="transition-shadow hover:shadow-md active:shadow-sm">
        <CardContent className="p-4">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-navy-900">{event.client_name}</h3>
              <p className="text-sm text-navy-500 capitalize">{event.event_type}</p>
            </div>
            <Badge variant={statusVariant[event.status]}>{event.status}</Badge>
          </div>

          <div className="mb-3 flex flex-wrap gap-3 text-xs text-navy-500">
            {event.event_date && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {formatDate(event.event_date)}
              </span>
            )}
            {event.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.venue}
              </span>
            )}
          </div>

          {budget > 0 && (
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-navy-500">
                  {formatCurrency(totalSpent)} spent
                </span>
                <span className="font-medium">{formatCurrency(budget)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-navy-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    percentage > 90 ? "bg-red-500" : percentage > 70 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
