import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Phone, MessageCircle } from "lucide-react";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import type { Event } from "@/lib/types";

interface EventCardProps {
  event: Event;
  totalSpent?: number;
}

const TYPE_EMOJI: Record<string, string> = {
  mehendi: "🌿",
  sangeet: "🎶",
  haldi: "💛",
  wedding: "💍",
  reception: "🎉",
  engagement: "💎",
  cocktail: "🍸",
  vidaai: "🥺",
  baraat: "🐴",
  other: "✨",
};

export function EventCard({ event, totalSpent = 0 }: EventCardProps) {
  const budget = event.total_budget || 0;
  const percentage = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;
  const dLeft = event.event_date ? daysUntil(event.event_date) : null;
  const emoji = TYPE_EMOJI[event.event_type?.toLowerCase()] || "✨";

  const statusVariant = {
    active: "success" as const,
    completed: "secondary" as const,
    cancelled: "destructive" as const,
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (event.client_phone) {
      window.location.href = `tel:${event.client_phone}`;
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (event.client_phone) {
      const cleanPhone = event.client_phone.replace(/\D/g, "");
      const msg = encodeURIComponent(
        `Namaste ${event.client_name}! Checking in regarding your upcoming ${event.event_type} event on ${event.event_date ? formatDate(event.event_date) : "EventKhata"}.`
      );
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
    }
  };

  return (
    <Link href={`/events/${event.id}`} className="block">
      <Card className="transition-all duration-200 hover:shadow-md active:scale-[0.99] border-navy-100 dark:border-navy-800 bg-white dark:bg-navy-900 rounded-2xl overflow-hidden">
        <CardContent className="p-4">
          <div className="mb-2.5 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-navy-50 text-xl dark:bg-navy-800 shadow-xs">
                {emoji}
              </span>
              <div className="min-w-0">
                <h3 className="truncate font-bold text-navy-900 dark:text-navy-100 text-base">
                  {event.client_name}
                </h3>
                <p className="text-xs capitalize font-medium text-navy-500 dark:text-navy-400">
                  {event.event_type}
                </p>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-1.5">
              {dLeft !== null && dLeft >= 0 && dLeft <= 14 && event.status === "active" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    dLeft === 0
                      ? "bg-red-100 text-red-700 animate-pulse"
                      : dLeft <= 3
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {dLeft === 0 ? "TODAY!" : `${dLeft}d left`}
                </span>
              )}
              <Badge variant={statusVariant[event.status]} className="text-[10px] capitalize">
                {event.status}
              </Badge>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-navy-500 dark:text-navy-400">
            <div className="flex flex-wrap items-center gap-3">
              {event.event_date && (
                <span className="flex items-center gap-1 font-medium">
                  <CalendarDays className="h-3.5 w-3.5 text-navy-400" />
                  {formatDate(event.event_date)}
                </span>
              )}
              {event.venue && (
                <span className="flex items-center gap-1 truncate max-w-[140px]">
                  <MapPin className="h-3.5 w-3.5 text-navy-400 flex-shrink-0" />
                  <span className="truncate">{event.venue}</span>
                </span>
              )}
            </div>

            {event.client_phone && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCall}
                  title="Call Client"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-50 text-navy-600 hover:bg-navy-100 active:scale-95 dark:bg-navy-800 dark:text-navy-300"
                >
                  <Phone className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  title="Message Client on WhatsApp"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:scale-95 dark:bg-emerald-950/40 dark:text-emerald-400"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {budget > 0 && (
            <div className="pt-1 border-t border-navy-50 dark:border-navy-800/60">
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="font-medium text-navy-500 dark:text-navy-400">
                  Paid: <strong className="text-emerald-600 font-bold">{formatCurrency(totalSpent)}</strong>
                </span>
                <span className="text-navy-500 dark:text-navy-400">
                  Budget: <strong className="text-navy-800 dark:text-navy-200">{formatCurrency(budget)}</strong>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-navy-100 dark:bg-navy-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    percentage > 90
                      ? "bg-red-500"
                      : percentage > 70
                      ? "bg-amber-500"
                      : "bg-emerald-500"
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
