"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EventCard } from "@/components/event-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileHeader } from "@/components/mobile-header";
import { fetchWithCache, invalidateCache } from "@/lib/cache";
import { Plus, Search, CalendarDays, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { Event } from "@/lib/types";

export default function EventsPage() {
  const [events, setEvents] = useState<(Event & { total_spent: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const supabase = createClient();

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents(forceFresh = false) {
    if (forceFresh) setRefreshing(true);

    try {
      const data = await fetchWithCache(
        "events:list_with_spent",
        async () => {
          // Fetch events and all ledger entries in parallel (ONLY 2 queries, no N+1 loop)
          const [eventsRes, ledgerRes] = await Promise.all([
            supabase
              .from("events")
              .select("*")
              .order("event_date", { ascending: false, nullsFirst: false }),
            supabase.from("ledger").select("event_id, amount, txn_type"),
          ]);

          if (eventsRes.error) {
            console.error("[EventsPage] Failed to load events:", eventsRes.error.message);
            return [];
          }

          const eventsData = eventsRes.data || [];
          const ledgerData = ledgerRes.data || [];

          // Group spent by event_id in memory (0ms)
          const spentMap: Record<string, number> = {};
          ledgerData.forEach((entry) => {
            if (!entry.event_id) return;
            const amt = entry.txn_type === "REFUND" ? -Number(entry.amount) : Number(entry.amount);
            spentMap[entry.event_id] = (spentMap[entry.event_id] || 0) + amt;
          });

          return eventsData.map((evt) => ({
            ...evt,
            total_spent: spentMap[evt.id] || 0,
          }));
        },
        { ttlMs: 45000, tags: ["events", "ledger"], forceFresh }
      );

      setEvents(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleManualRefresh = () => {
    invalidateCache(["events", "ledger"]);
    loadEvents(true);
  };

  const filtered = events.filter((e) => {
    const matchSearch =
      e.client_name.toLowerCase().includes(search.toLowerCase()) ||
      (e.venue || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.event_type || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || e.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="pb-28">
      <MobileHeader
        title="Events"
        subtitle={`${events.length} total events`}
        rightAction={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-full text-navy-600 hover:bg-navy-100 active:scale-95 dark:text-navy-300 dark:hover:bg-navy-800 disabled:opacity-50"
              title="Refresh events"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <Link href="/events/calendar">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-navy-600 hover:bg-navy-100 dark:text-navy-300 dark:hover:bg-navy-800"
                aria-label="Open event calendar"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <Input
            placeholder="Search by client, venue, or event type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 rounded-2xl text-xs bg-white dark:bg-navy-900 border-navy-100 dark:border-navy-800"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {["all", "active", "completed", "cancelled"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition-all active:scale-95 ${
                filter === s
                  ? "bg-navy-900 text-white shadow-xs dark:bg-navy-100 dark:text-navy-900"
                  : "bg-white text-navy-600 border border-navy-100 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-navy-100 bg-white p-4 dark:border-navy-800 dark:bg-navy-900"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <Skeleton className="mb-1.5 h-5 w-32" />
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="mb-3 h-3 w-40" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
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
              <EventCard key={event.id} event={event} totalSpent={event.total_spent} />
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <Link
        href="/events/new"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-white shadow-xl shadow-navy-900/30 transition-transform active:scale-90 dark:bg-navy-100 dark:text-navy-900"
        aria-label="New Event"
      >
        <Plus className="h-6 w-6 stroke-[2.5]" />
      </Link>
    </div>
  );
}
