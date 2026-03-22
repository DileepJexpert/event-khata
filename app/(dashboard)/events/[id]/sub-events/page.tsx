"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/currency-input";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft, Plus, Loader2, MapPin, Clock as ClockIcon,
  IndianRupee, Users, ListChecks, Sparkles,
} from "lucide-react";
import { SUB_EVENT_TYPES, formatDate, formatCurrency, formatTime, daysUntil } from "@/lib/utils";
import Link from "next/link";
import type { SubEvent, Contract, Vendor, Task } from "@/lib/types";

const DAY_COLORS = [
  "border-l-pink-500 bg-pink-50",
  "border-l-amber-500 bg-amber-50",
  "border-l-emerald-500 bg-emerald-50",
  "border-l-blue-500 bg-blue-50",
  "border-l-purple-500 bg-purple-50",
  "border-l-red-500 bg-red-50",
  "border-l-cyan-500 bg-cyan-50",
];

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

type FunctionStats = {
  vendorCount: number;
  taskCount: number;
  taskDone: number;
  totalBudget: number;
  totalPaid: number;
};

export default function SubEventsPage() {
  const supabase = createClient();
  const params = useParams();
  const { addToast } = useToast();
  const eventId = params.id as string;

  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [stats, setStats] = useState<Record<string, FunctionStats>>({});
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("mehendi");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [venue, setVenue] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const [seRes, evtRes, conRes, taskRes, ledgerRes] = await Promise.all([
      supabase.from("sub_events").select("*").eq("event_id", eventId).order("date", { ascending: true, nullsFirst: false }).order("sort_order"),
      supabase.from("events").select("*").eq("id", eventId).single(),
      supabase.from("contracts").select("id, sub_event_id, agreed_amount, vendor_id").eq("event_id", eventId),
      supabase.from("tasks").select("id, sub_event_id, status").eq("event_id", eventId),
      supabase.from("ledger").select("vendor_id, amount, txn_type, contract_id").eq("event_id", eventId),
    ]);

    if (seRes.data) setSubEvents(seRes.data);
    if (evtRes.data) setEvent(evtRes.data);

    // Build stats per function
    const contracts = conRes.data || [];
    const tasks = taskRes.data || [];
    const ledger = ledgerRes.data || [];

    // Map contract_id -> sub_event_id for ledger lookup
    const contractSubEvent = new Map<string, string>();
    contracts.forEach((c) => { if (c.sub_event_id) contractSubEvent.set(c.id, c.sub_event_id); });

    const statsMap: Record<string, FunctionStats> = {};
    (seRes.data || []).forEach((se) => {
      const fnContracts = contracts.filter((c) => c.sub_event_id === se.id);
      const fnTasks = tasks.filter((t) => t.sub_event_id === se.id);
      const fnVendorIds = new Set(fnContracts.map((c) => c.vendor_id));
      const fnPaid = ledger
        .filter((l) => {
          if (l.contract_id && contractSubEvent.get(l.contract_id) === se.id) return true;
          return false;
        })
        .reduce((s, l) => s + (l.txn_type === "REFUND" ? -Number(l.amount) : Number(l.amount)), 0);

      statsMap[se.id] = {
        vendorCount: fnVendorIds.size,
        taskCount: fnTasks.length,
        taskDone: fnTasks.filter((t) => t.status === "completed").length,
        totalBudget: se.budget ? Number(se.budget) : 0,
        totalPaid: fnPaid,
      };
    });
    setStats(statsMap);
    setLoading(false);
  }

  function resetForm() {
    setName(""); setType("mehendi"); setDate(""); setStartTime(""); setEndTime("");
    setVenue(""); setBudget(""); setNotes(""); setShowForm(false);
  }

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("sub_events").insert({
      event_id: eventId,
      name: name.trim(),
      type,
      date: date || null,
      start_time: startTime || null,
      end_time: endTime || null,
      venue: venue || null,
      budget: budget ? Number(budget) : null,
      notes: notes || null,
      sort_order: subEvents.length,
    });
    if (error) {
      addToast({ title: "Failed to add", description: error.message, variant: "destructive" });
    } else {
      addToast({ title: "Function added!", variant: "success" });
      resetForm();
      load();
    }
    setSaving(false);
  }

  async function quickAdd(typeVal: string, label: string) {
    const { error } = await supabase.from("sub_events").insert({
      event_id: eventId,
      name: label,
      type: typeVal,
      sort_order: subEvents.length,
    });
    if (!error) {
      addToast({ title: `${label} added!`, variant: "success" });
      load();
    }
  }

  // Group sub-events by date (day-wise)
  const dayGroups = new Map<string, SubEvent[]>();
  const undated: SubEvent[] = [];
  subEvents.forEach((se) => {
    if (se.date) {
      const key = se.date;
      if (!dayGroups.has(key)) dayGroups.set(key, []);
      dayGroups.get(key)!.push(se);
    } else {
      undated.push(se);
    }
  });
  const sortedDays = Array.from(dayGroups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  // Calculate total across all functions
  const totalFnBudget = subEvents.reduce((s, se) => s + (se.budget ? Number(se.budget) : 0), 0);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/events/${eventId}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Wedding Planner</h1>
          <p className="text-sm text-navy-500">
            {subEvents.length} function{subEvents.length !== 1 ? "s" : ""}
            {sortedDays.length > 0 && ` across ${sortedDays.length} day${sortedDays.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      {/* Budget summary across functions */}
      {totalFnBudget > 0 && (
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-navy-500">Total Functions Budget</span>
            <span className="text-lg font-bold text-navy-900">{formatCurrency(totalFnBudget)}</span>
          </div>
          {event?.total_budget && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-100">
              <div className="h-full rounded-full bg-navy-600" style={{ width: `${Math.min((totalFnBudget / Number(event.total_budget)) * 100, 100)}%` }} />
            </div>
          )}
          {event?.total_budget && (
            <p className="mt-1 text-xs text-navy-500">
              {((totalFnBudget / Number(event.total_budget)) * 100).toFixed(0)}% of {formatCurrency(Number(event.total_budget))} event budget
            </p>
          )}
        </div>
      )}

      {/* Quick Add Buttons */}
      {subEvents.length === 0 && !showForm && (
        <div className="mb-6">
          <p className="mb-3 text-sm font-semibold text-navy-700">Quick add common functions:</p>
          <div className="grid grid-cols-3 gap-2">
            {SUB_EVENT_TYPES.filter((t) => t.value !== "other").map((t) => (
              <button key={t.value} onClick={() => quickAdd(t.value, t.label)}
                className="flex flex-col items-center gap-1 rounded-xl border-2 border-navy-100 bg-white p-3 text-center transition-colors hover:border-navy-300 hover:bg-navy-50">
                <span className="text-xl">{TYPE_EMOJI[t.value] || "✨"}</span>
                <span className="text-xs font-semibold text-navy-700">{t.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-center text-navy-400">Tap to add, then set dates & details for each</p>
        </div>
      )}

      {showForm && (
        <div className="mb-6 space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="space-y-2">
            <Label>Function Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sangeet Night" />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex flex-wrap gap-2">
              {SUB_EVENT_TYPES.map((t) => (
                <button key={t.value} type="button" onClick={() => { setType(t.value); if (!name) setName(t.label); }}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    type === t.value ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 text-navy-600"
                  }`}>
                  <span>{TYPE_EMOJI[t.value]}</span> {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Budget</Label>
              <CurrencyInput value={budget} onChange={setBudget} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Venue</Label>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Poolside Area" />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Theme, dress code, special instructions..." />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={saving || !name.trim()} className="flex-1">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Add Function
            </Button>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Day-wise display */}
      {sortedDays.map(([dateStr, fns], dayIndex) => {
        const dayDate = new Date(dateStr);
        const dayLabel = dayDate.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });
        const dLeft = daysUntil(dateStr);
        const colorClass = DAY_COLORS[dayIndex % DAY_COLORS.length];

        return (
          <div key={dateStr} className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-navy-900">Day {dayIndex + 1}</h2>
                <p className="text-xs text-navy-500">{dayLabel}</p>
              </div>
              {dLeft >= 0 && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  dLeft <= 3 ? "bg-red-100 text-red-700" : dLeft <= 7 ? "bg-amber-100 text-amber-700" : "bg-navy-100 text-navy-700"
                }`}>
                  {dLeft === 0 ? "Today!" : dLeft === 1 ? "Tomorrow" : `${dLeft}d left`}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {fns.map((fn) => {
                const fnStats = stats[fn.id] || { vendorCount: 0, taskCount: 0, taskDone: 0, totalBudget: 0, totalPaid: 0 };
                return (
                  <Link key={fn.id} href={`/events/${eventId}/sub-events/${fn.id}`}
                    className={`block rounded-xl border-l-4 p-4 shadow-sm ${colorClass}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{TYPE_EMOJI[fn.type] || "✨"}</span>
                        <div>
                          <h3 className="text-base font-bold text-navy-900">{fn.name}</h3>
                          <div className="flex flex-wrap gap-2 text-xs text-navy-500">
                            {fn.start_time && (
                              <span className="flex items-center gap-0.5">
                                <ClockIcon className="h-3 w-3" />
                                {formatTime(fn.start_time)}{fn.end_time ? ` - ${formatTime(fn.end_time)}` : ""}
                              </span>
                            )}
                            {fn.venue && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" /> {fn.venue}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Function Stats Row */}
                    <div className="mt-3 flex gap-3">
                      {fn.budget && (
                        <div className="flex items-center gap-1 text-xs">
                          <IndianRupee className="h-3 w-3 text-navy-400" />
                          <span className="font-semibold text-navy-700">{formatCurrency(Number(fn.budget))}</span>
                        </div>
                      )}
                      {fnStats.vendorCount > 0 && (
                        <div className="flex items-center gap-1 text-xs text-navy-500">
                          <Users className="h-3 w-3" /> {fnStats.vendorCount} vendor{fnStats.vendorCount > 1 ? "s" : ""}
                        </div>
                      )}
                      {fnStats.taskCount > 0 && (
                        <div className="flex items-center gap-1 text-xs text-navy-500">
                          <ListChecks className="h-3 w-3" /> {fnStats.taskDone}/{fnStats.taskCount} tasks
                        </div>
                      )}
                    </div>

                    {fn.notes && (
                      <p className="mt-2 text-xs text-navy-500">{fn.notes}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Undated functions */}
      {undated.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-base font-bold text-navy-900">
            {sortedDays.length > 0 ? "Date not set" : "Functions"}
          </h2>
          <div className="space-y-3">
            {undated.map((fn) => {
              const fnStats = stats[fn.id] || { vendorCount: 0, taskCount: 0, taskDone: 0, totalBudget: 0, totalPaid: 0 };
              return (
                <Link key={fn.id} href={`/events/${eventId}/sub-events/${fn.id}`}
                  className="block rounded-xl border-l-4 border-l-navy-300 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{TYPE_EMOJI[fn.type] || "✨"}</span>
                    <div>
                      <h3 className="text-base font-bold text-navy-900">{fn.name}</h3>
                      <p className="text-xs text-navy-400">Tap to set date & details</p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-3">
                    {fn.budget && (
                      <span className="text-xs font-semibold text-navy-700">{formatCurrency(Number(fn.budget))}</span>
                    )}
                    {fnStats.vendorCount > 0 && (
                      <span className="text-xs text-navy-500">{fnStats.vendorCount} vendors</span>
                    )}
                    {fnStats.taskCount > 0 && (
                      <span className="text-xs text-navy-500">{fnStats.taskDone}/{fnStats.taskCount} tasks</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {subEvents.length === 0 && !showForm && (
        <div className="mt-4 text-center text-sm text-navy-400">
          <Sparkles className="mx-auto mb-2 h-8 w-8 text-navy-300" />
          <p>Plan your multi-day event</p>
          <p className="mt-1">Add functions like Mehendi, Sangeet, Haldi,</p>
          <p>Wedding, Reception — each with its own planning.</p>
        </div>
      )}
    </div>
  );
}
