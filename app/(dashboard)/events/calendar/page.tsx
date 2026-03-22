"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import Link from "next/link";
import type { Event, SubEvent } from "@/lib/types";

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: "event" | "subevent";
  eventId: string;
  color: string;
};

const COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-amber-500",
  "bg-emerald-500", "bg-red-500", "bg-cyan-500", "bg-indigo-500",
];

export default function CalendarPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => { load(); }, []);

  async function load() {
    const [eRes, seRes] = await Promise.all([
      supabase.from("events").select("*").not("event_date", "is", null),
      supabase.from("sub_events").select("*").not("date", "is", null),
    ]);
    if (eRes.data) setEvents(eRes.data);
    if (seRes.data) setSubEvents(seRes.data);
    setLoading(false);
  }

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const items: CalendarEvent[] = [];
    events.forEach((e, i) => {
      if (e.event_date) {
        items.push({
          id: e.id,
          title: e.client_name,
          date: e.event_date,
          type: "event",
          eventId: e.id,
          color: COLORS[i % COLORS.length],
        });
      }
    });
    subEvents.forEach((se) => {
      if (se.date) {
        const parentEvent = events.find((e) => e.id === se.event_id);
        const parentIndex = events.findIndex((e) => e.id === se.event_id);
        items.push({
          id: se.id,
          title: `${se.name}${parentEvent ? ` (${parentEvent.client_name})` : ""}`,
          date: se.date,
          type: "subevent",
          eventId: se.event_id,
          color: COLORS[parentIndex >= 0 ? parentIndex % COLORS.length : 0],
        });
      }
    });
    return items;
  }, [events, subEvents]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const monthDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [firstDay, daysInMonth]);

  function getEventsForDay(day: number): CalendarEvent[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return calendarEvents.filter((e) => e.date === dateStr);
  }

  function prevMonth() { setCurrentMonth(new Date(year, month - 1, 1)); }
  function nextMonth() { setCurrentMonth(new Date(year, month + 1, 1)); }

  const monthLabel = currentMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/events" className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
            <CalendarDays className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Calendar</h1>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="mb-4 flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
        <button onClick={prevMonth} className="rounded-lg p-2 hover:bg-navy-50">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-navy-900">{monthLabel}</h2>
        <button onClick={nextMonth} className="rounded-lg p-2 hover:bg-navy-50">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="mb-4 rounded-xl bg-white p-3 shadow-sm">
        {/* Day headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-navy-400">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const dayEvents = getEventsForDay(day);
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

            return (
              <div key={day} className={cn(
                "relative flex min-h-[3rem] flex-col items-center rounded-lg p-1 text-xs",
                isToday && "bg-navy-900 text-white",
                dayEvents.length > 0 && !isToday && "bg-navy-50"
              )}>
                <span className={cn("font-semibold", isToday ? "text-white" : "text-navy-700")}>{day}</span>
                <div className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                  {dayEvents.slice(0, 3).map((evt) => (
                    <div key={evt.id} className={`h-1.5 w-1.5 rounded-full ${isToday ? "bg-white" : evt.color}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event List for Month */}
      <h2 className="mb-2 text-sm font-bold text-navy-700">Events this month</h2>
      <div className="space-y-2">
        {calendarEvents
          .filter((e) => {
            const d = new Date(e.date);
            return d.getMonth() === month && d.getFullYear() === year;
          })
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((evt) => (
            <Link key={evt.id} href={`/events/${evt.eventId}`}
              className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
              <div className={`h-3 w-3 rounded-full ${evt.color}`} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-navy-900">{evt.title}</p>
                <p className="text-xs text-navy-500">
                  {new Date(evt.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  {evt.type === "subevent" && " · Sub-event"}
                </p>
              </div>
            </Link>
          ))}
        {calendarEvents.filter((e) => {
          const d = new Date(e.date);
          return d.getMonth() === month && d.getFullYear() === year;
        }).length === 0 && (
          <p className="py-6 text-center text-sm text-navy-400">No events this month</p>
        )}
      </div>
    </div>
  );
}
