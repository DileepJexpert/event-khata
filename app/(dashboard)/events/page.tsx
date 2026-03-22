"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EventCard } from "@/components/event-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, CalendarDays, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Event } from "@/lib/types";

export default function EventsPage() {
  const [events, setEvents] = useState<(Event & { total_spent: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data: eventsData, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("[EventsPage] Failed to load events:", error.message, error);
    }

    if (eventsData) {
      // Get total spent for each event
      const eventsWithSpent = await Promise.all(
        eventsData.map(async (event) => {
          const { data: ledgerData, error: ledgerError } = await supabase
            .from("ledger")
            .select("amount, txn_type")
            .eq("event_id", event.id);

          if (ledgerError) {
            console.error("[EventsPage] Failed to load ledger for event:", event.id, ledgerError.message, ledgerError);
          }

          const total_spent = (ledgerData || []).reduce((sum, entry) => {
            return entry.txn_type === "REFUND" ? sum - Number(entry.amount) : sum + Number(entry.amount);
          }, 0);

          return { ...event, total_spent };
        })
      );
      setEvents(eventsWithSpent);
    }
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const filtered = events.filter((e) => {
    const matchSearch = e.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (e.venue || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || e.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Events</h1>
          <p className="text-sm text-navy-500">{events.length} total events</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {["all", "active", "completed", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === s
                ? "bg-navy-900 text-white"
                : "bg-white text-navy-600 hover:bg-navy-100"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events yet"
          description="Create your first event to start tracking vendor payments."
          actionLabel="Create Event"
          actionHref="/events/new"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              totalSpent={event.total_spent}
            />
          ))}
        </div>
      )}

      <Link
        href="/events/new"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-white shadow-lg transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
