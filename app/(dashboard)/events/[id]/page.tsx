"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorPaymentCard } from "@/components/vendor-payment-card";
import { BudgetDonut } from "@/components/budget-donut";
import {
  ArrowLeft, Plus, Share2, CalendarDays, MapPin, Phone, Pencil,
  ListChecks, Users, Clock, CreditCard, PartyPopper, FileText, MessageCircle,
  Send, Copy, Save, AlertTriangle, Sparkles, Loader2, X, Lightbulb, Brain, ChevronDown, ChevronUp,
  Camera, Armchair, UserCheck, TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, formatTime, daysUntil } from "@/lib/utils";
import { EventProgress } from "@/components/event-progress";
import { useToast } from "@/components/ui/toast";
import type { Event, Vendor, Contract, LedgerEntry, SubEvent, Task } from "@/lib/types";
import { checkAIEnabled, getVendorSuggestion, type VendorSuggestionResponse } from "@/lib/ai";

const TYPE_EMOJI: Record<string, string> = {
  mehendi: "🌿", sangeet: "🎶", haldi: "💛", wedding: "💍",
  reception: "🎉", engagement: "💎", cocktail: "🍸",
  vidaai: "🥺", baraat: "🐴", other: "✨",
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const supabase = createClient();

  const { addToast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [contracts, setContracts] = useState<(Contract & { vendor: Vendor })[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<(LedgerEntry & { vendor: Vendor })[]>([]);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [guestCount, setGuestCount] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTips, setAiTips] = useState<VendorSuggestionResponse | null>(null);
  const [showAiTips, setShowAiTips] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    loadData();
    checkAIEnabled().then(setAiEnabled);
  }, [eventId]);

  async function loadData() {
    const [eventRes, contractsRes, ledgerRes, subEventsRes, tasksRes, guestsRes, expensesRes] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).single(),
      supabase.from("contracts").select("*, vendor:vendors(*)").eq("event_id", eventId),
      supabase.from("ledger").select("*, vendor:vendors(*)").eq("event_id", eventId).order("recorded_at", { ascending: false }),
      supabase.from("sub_events").select("*").eq("event_id", eventId).order("date", { ascending: true, nullsFirst: false }).order("sort_order"),
      supabase.from("tasks").select("*").eq("event_id", eventId),
      supabase.from("guests").select("id", { count: "exact" }).eq("event_id", eventId),
      supabase.from("expenses").select("amount").eq("event_id", eventId),
    ]);

    if (eventRes.error) console.error("[EventDetail] Failed to load event:", eventRes.error.message, eventRes.error);
    if (contractsRes.error) console.error("[EventDetail] Failed to load contracts:", contractsRes.error.message, contractsRes.error);
    if (ledgerRes.error) console.error("[EventDetail] Failed to load ledger:", ledgerRes.error.message, ledgerRes.error);

    if (eventRes.data) setEvent(eventRes.data);
    if (contractsRes.data) setContracts(contractsRes.data as any);
    if (ledgerRes.data) setLedgerEntries(ledgerRes.data as any);
    if (subEventsRes.data) setSubEvents(subEventsRes.data);
    if (tasksRes.data) setTasks(tasksRes.data);
    setGuestCount(guestsRes.count || 0);
    setTotalExpenses((expensesRes.data || []).reduce((s: number, e: any) => s + Number(e.amount), 0));
    setLoading(false);
  }

  async function handleAiTips() {
    if (!event) return;
    setAiLoading(true);
    setShowAiTips(true);
    try {
      const result = await getVendorSuggestion({
        event_type: event.event_type,
        budget: Number(event.total_budget) || 0,
        city: event.venue || undefined,
      });
      setAiTips(result);
    } catch (err: any) {
      addToast({ title: "AI tips failed", description: err.message, variant: "destructive" });
      setShowAiTips(false);
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 px-4 pt-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="px-4 pt-4 text-center">
        <p>Event not found.</p>
        <Button asChild className="mt-4">
          <Link href="/events">Back to Events</Link>
        </Button>
      </div>
    );
  }

  const totalSpent = ledgerEntries.reduce((sum, e) => {
    return e.txn_type === "REFUND" ? sum - Number(e.amount) : sum + Number(e.amount);
  }, 0);

  const totalAgreed = contracts.reduce((sum, c) => sum + Number(c.agreed_amount), 0);

  async function duplicateEvent() {
    if (!event) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: newEvent, error } = await supabase.from("events").insert({
      agency_id: event.agency_id,
      client_name: `${event.client_name} (Copy)`,
      client_phone: event.client_phone,
      client_email: event.client_email,
      event_type: event.event_type,
      total_budget: event.total_budget,
      venue: event.venue,
      notes: event.notes,
      status: "active",
    }).select().single();

    if (error || !newEvent) {
      addToast({ title: "Failed to duplicate", description: error?.message, variant: "destructive" });
      return;
    }

    // Duplicate sub-events
    if (subEvents.length > 0) {
      await supabase.from("sub_events").insert(
        subEvents.map((se) => ({
          event_id: newEvent.id,
          name: se.name,
          type: se.type,
          venue: se.venue,
          budget: se.budget,
          notes: se.notes,
          sort_order: se.sort_order,
        }))
      );
    }

    // Duplicate tasks
    if (tasks.length > 0) {
      await supabase.from("tasks").insert(
        tasks.map((t) => ({
          event_id: newEvent.id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          status: "pending",
          sort_order: t.sort_order,
        }))
      );
    }

    addToast({ title: "Event duplicated!", variant: "success" });
    router.push(`/events/${newEvent.id}`);
  }

  function openTemplateDialog() {
    if (!event) return;
    setTemplateName(`${event.event_type} template`);
    setShowTemplateDialog(true);
  }

  async function saveAsTemplate() {
    if (!event) return;
    const name = templateName.trim();
    if (!name) return;
    setSavingTemplate(true);

    const eventDate = event.event_date ? new Date(event.event_date) : null;
    const templateTasks = tasks.map((t) => {
      let daysBefore = 30;
      if (eventDate && t.due_date) {
        const diff = Math.round((eventDate.getTime() - new Date(t.due_date).getTime()) / (1000 * 60 * 60 * 24));
        daysBefore = diff > 0 ? diff : 0;
      }
      return { title: t.title, priority: t.priority, days_before: daysBefore };
    });

    const { error } = await supabase.from("event_templates").insert({
      agency_id: event.agency_id,
      name,
      event_type: event.event_type,
      is_system: false,
      sub_events: subEvents.map((se) => ({ name: se.name, type: se.type })),
      tasks: templateTasks,
      vendor_categories: Array.from(new Set(contracts.map((c) => c.vendor.category).filter(Boolean))),
      budget_split: {},
    });

    if (error) addToast({ title: "Failed to save template", description: error.message, variant: "destructive" });
    else {
      addToast({ title: "Saved as template!", description: "Reuse it when creating new events.", variant: "success" });
      setShowTemplateDialog(false);
    }
    setSavingTemplate(false);
  }

  function shareEventSummary() {
    if (!event) return;
    const lines = [
      `*${event.client_name} - Event Summary*`,
      `Type: ${event.event_type}`,
      event.event_date ? `Date: ${formatDate(event.event_date)}` : "",
      event.venue ? `Venue: ${event.venue}` : "",
      "",
      `*Budget:* ${event.total_budget ? formatCurrency(Number(event.total_budget)) : "Not set"}`,
      `*Total Agreed:* ${formatCurrency(totalAgreed)}`,
      `*Total Paid:* ${formatCurrency(totalSpent)}`,
      `*Outstanding:* ${formatCurrency(Math.max(0, totalAgreed - totalSpent))}`,
      "",
      `*Vendors (${contracts.length}):*`,
      ...contracts.map((c) => {
        const paid = vendorPayments.get(c.vendor_id) || 0;
        return `• ${c.vendor.name} (${(c.vendor.category || "").replace("_", " ")}): ${formatCurrency(paid)} / ${formatCurrency(Number(c.agreed_amount))}`;
      }),
    ].filter(Boolean);

    if (subEvents.length > 0) {
      lines.push("", `*Functions (${subEvents.length}):*`);
      subEvents.forEach((se) => {
        lines.push(`• ${se.name}${se.date ? ` - ${formatDate(se.date)}` : ""}${se.venue ? ` @ ${se.venue}` : ""}`);
      });
    }

    lines.push("", "_Generated by EventKhata_");
    const url = `https://wa.me/${event.client_phone?.replace(/\D/g, "") || ""}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank");
  }

  // Group payments by vendor
  const vendorPayments = new Map<string, number>();
  ledgerEntries.forEach((entry) => {
    const current = vendorPayments.get(entry.vendor_id) || 0;
    vendorPayments.set(
      entry.vendor_id,
      entry.txn_type === "REFUND" ? current - Number(entry.amount) : current + Number(entry.amount)
    );
  });

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link href="/events" className="rounded-full p-2 hover:bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{event.client_name}</h1>
          <div className="flex items-center gap-2">
            <Badge variant={event.status === "active" ? "success" : "secondary"}>
              {event.status}
            </Badge>
            <span className="text-sm capitalize text-navy-500">{event.event_type}</span>
          </div>
        </div>
      </div>

      {/* Event Info */}
      <div className="mb-4 flex flex-wrap gap-3 text-sm text-navy-500">
        {event.event_date && (
          <span className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" /> {formatDate(event.event_date)}
          </span>
        )}
        {event.venue && (
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" /> {event.venue}
          </span>
        )}
        {event.client_phone && (
          <a href={`tel:${event.client_phone}`} className="flex items-center gap-1 text-navy-700">
            <Phone className="h-4 w-4" /> {event.client_phone}
          </a>
        )}
      </div>

      {/* Countdown */}
      {event.event_date && event.status === "active" && (() => {
        const d = daysUntil(event.event_date);
        if (d < 0) return null;
        return (
          <div className="mb-4 flex items-center gap-4 rounded-xl bg-gradient-to-r from-navy-800 to-navy-700 p-4 text-white dark:from-navy-700 dark:to-navy-600">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-2xl font-extrabold">
              {d === 0 ? "!" : d}
            </div>
            <div>
              <p className="text-lg font-bold">{d === 0 ? "Event is TODAY!" : d === 1 ? "Tomorrow!" : `${d} days to go`}</p>
              <p className="text-sm text-navy-300">{formatDate(event.event_date)} · {event.venue || event.event_type}</p>
            </div>
          </div>
        );
      })()}

      {/* Budget Summary */}
      {event.total_budget && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <BudgetDonut totalBudget={Number(event.total_budget)} totalSpent={totalSpent} />
          </CardContent>
        </Card>
      )}

      {/* Budget Alert */}
      {event.total_budget && Number(event.total_budget) > 0 &&
        (totalSpent / Number(event.total_budget)) * 100 >= (event.budget_alert_percent ?? 80) && (
        <div className={`mb-4 flex items-center gap-3 rounded-xl p-3 ${
          totalSpent > Number(event.total_budget) ? "bg-red-50 dark:bg-red-900/20" : "bg-amber-50 dark:bg-amber-900/20"
        }`}>
          <AlertTriangle className={`h-5 w-5 ${totalSpent > Number(event.total_budget) ? "text-red-600" : "text-amber-600"}`} />
          <span className={`text-sm font-medium ${totalSpent > Number(event.total_budget) ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}>
            {totalSpent > Number(event.total_budget)
              ? `Over budget by ${formatCurrency(totalSpent - Number(event.total_budget))}`
              : `${Math.round((totalSpent / Number(event.total_budget)) * 100)}% of budget spent`}
          </span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-4 flex gap-2">
        <Button asChild className="flex-1" variant="outline">
          <Link href={`/events/${eventId}/add-vendor`}>
            <Plus className="mr-2 h-4 w-4" /> Add Vendor
          </Link>
        </Button>
        <Button variant="outline" onClick={shareEventSummary} title="Share summary on WhatsApp" aria-label="Share summary on WhatsApp">
          <Send className="h-4 w-4" />
        </Button>
        <Button asChild variant="outline" aria-label="Edit event">
          <Link href={`/events/${eventId}/edit`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" aria-label="Open public share page">
          <Link href={`/events/${eventId}/share`}>
            <Share2 className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Financial Summary */}
      {totalAgreed > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white p-3 text-center shadow-sm dark:bg-navy-900">
            <p className="text-[10px] text-navy-500">Agreed</p>
            <p className="text-sm font-bold text-navy-900 dark:text-navy-100">{formatCurrency(totalAgreed)}</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm dark:bg-navy-900">
            <p className="text-[10px] text-navy-500">Paid</p>
            <p className="text-sm font-bold text-emerald-600">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm dark:bg-navy-900">
            <p className="text-[10px] text-navy-500">Pending</p>
            <p className="text-sm font-bold text-amber-600">{formatCurrency(Math.max(0, totalAgreed - totalSpent))}</p>
          </div>
        </div>
      )}

      {/* Misc expenses link */}
      {totalExpenses > 0 && (
        <Link href="/expenses" className="mb-4 flex items-center justify-between rounded-xl bg-white p-3 shadow-sm dark:bg-navy-900">
          <span className="flex items-center gap-2 text-sm text-navy-600 dark:text-navy-300">
            <FileText className="h-4 w-4" /> Misc expenses
          </span>
          <span className="font-bold text-navy-900 dark:text-navy-100">{formatCurrency(totalExpenses)}</span>
        </Link>
      )}

      {/* Event Readiness */}
      {event.status === "active" && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <EventProgress
              items={[
                { label: "Event date set", done: !!event.event_date },
                { label: "Budget defined", done: !!event.total_budget && event.total_budget > 0 },
                { label: "Venue confirmed", done: !!event.venue },
                { label: "Vendors booked", done: contracts.length > 0 },
                { label: "Sub-events planned", done: subEvents.length > 0 },
                { label: "Guest list started", done: guestCount > 0 },
                { label: "Tasks created", done: tasks.length > 0, warning: tasks.length > 0 && tasks.some((t) => t.status === "pending") },
                { label: "All tasks completed", done: tasks.length > 0 && tasks.every((t) => t.status === "completed") },
              ]}
            />
          </CardContent>
        </Card>
      )}

      {/* Feature Grid */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Link href={`/events/${eventId}/sub-events`} className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl bg-white p-3 shadow-sm dark:bg-navy-900">
          <PartyPopper className="h-5 w-5 text-pink-600" />
          <span className="text-[10px] font-medium text-navy-700 dark:text-navy-300">Functions</span>
        </Link>
        <Link href={`/events/${eventId}/tasks`} className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl bg-white p-3 shadow-sm dark:bg-navy-900">
          <ListChecks className="h-5 w-5 text-blue-600" />
          <span className="text-[10px] font-medium text-navy-700 dark:text-navy-300">Checklist</span>
        </Link>
        <Link href={`/events/${eventId}/guests`} className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl bg-white p-3 shadow-sm dark:bg-navy-900">
          <Users className="h-5 w-5 text-purple-600" />
          <span className="text-[10px] font-medium text-navy-700 dark:text-navy-300">Guests</span>
        </Link>
        <Link href={`/events/${eventId}/timeline`} className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl bg-white p-3 shadow-sm dark:bg-navy-900">
          <Clock className="h-5 w-5 text-amber-600" />
          <span className="text-[10px] font-medium text-navy-700 dark:text-navy-300">Timeline</span>
        </Link>
        <Link href={`/events/${eventId}/payment-schedule`} className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl bg-white p-3 shadow-sm dark:bg-navy-900">
          <CreditCard className="h-5 w-5 text-emerald-600" />
          <span className="text-[10px] font-medium text-navy-700 dark:text-navy-300">Payments</span>
        </Link>
        <Link href={`/events/${eventId}/documents`} className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl bg-white p-3 shadow-sm dark:bg-navy-900">
          <FileText className="h-5 w-5 text-navy-600" />
          <span className="text-[10px] font-medium text-navy-700 dark:text-navy-300">Documents</span>
        </Link>
        <Link href={`/events/${eventId}/communication`} className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl bg-white p-3 shadow-sm dark:bg-navy-900">
          <MessageCircle className="h-5 w-5 text-teal-600" />
          <span className="text-[10px] font-medium text-navy-700 dark:text-navy-300">Comms</span>
        </Link>
        <Link href={`/events/${eventId}/invite`} className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl bg-white p-3 shadow-sm dark:bg-navy-900">
          <Send className="h-5 w-5 text-rose-600" />
          <span className="text-[10px] font-medium text-navy-700 dark:text-navy-300">E-Invite</span>
        </Link>
        <Link href={`/events/${eventId}/gallery`} className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl bg-white p-3 shadow-sm dark:bg-navy-900">
          <Camera className="h-5 w-5 text-indigo-600" />
          <span className="text-[10px] font-medium text-navy-700 dark:text-navy-300">Gallery</span>
        </Link>
        <Link href={`/events/${eventId}/seating`} className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl bg-white p-3 shadow-sm dark:bg-navy-900">
          <Armchair className="h-5 w-5 text-orange-600" />
          <span className="text-[10px] font-medium text-navy-700 dark:text-navy-300">Seating</span>
        </Link>
        <Link href={`/events/${eventId}/checkin`} className="flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl bg-white p-3 shadow-sm dark:bg-navy-900">
          <UserCheck className="h-5 w-5 text-green-600" />
          <span className="text-[10px] font-medium text-navy-700 dark:text-navy-300">Check-in</span>
        </Link>
        <Link href={`/events/${eventId}/pnl`} className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 shadow-sm dark:bg-navy-900">
          <TrendingUp className="h-5 w-5 text-lime-600" />
          <span className="text-[10px] font-medium text-navy-700 dark:text-navy-300">P&L</span>
        </Link>
      </div>

      {/* Multi-Day Functions */}
      {subEvents.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Functions ({subEvents.length})</h2>
            <Link href={`/events/${eventId}/sub-events`} className="text-sm font-medium text-navy-600">View All</Link>
          </div>
          <div className="space-y-2">
            {subEvents.slice(0, 5).map((se) => {
              const dLeft = se.date ? daysUntil(se.date) : null;
              return (
                <Link key={se.id} href={`/events/${eventId}/sub-events/${se.id}`}
                  className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-navy-900">
                  <span className="text-lg">{TYPE_EMOJI[se.type] || "✨"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-navy-900 dark:text-navy-100">{se.name}</p>
                    <div className="flex gap-2 text-xs text-navy-500">
                      {se.date && <span>{formatDate(se.date)}</span>}
                      {se.start_time && <span>{formatTime(se.start_time)}</span>}
                      {se.venue && <span>{se.venue}</span>}
                    </div>
                  </div>
                  {se.budget && (
                    <span className="text-xs font-bold text-navy-700">{formatCurrency(Number(se.budget))}</span>
                  )}
                  {dLeft !== null && dLeft >= 0 && dLeft <= 14 && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      dLeft <= 3 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {dLeft === 0 ? "Today" : `${dLeft}d`}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Vendors */}
      {contracts.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-3 text-lg font-semibold">Vendors ({contracts.length})</h2>
          <div className="space-y-3">
            {contracts.map((contract) => (
              <VendorPaymentCard
                key={contract.id}
                vendor={contract.vendor}
                agreedAmount={Number(contract.agreed_amount)}
                totalPaid={vendorPayments.get(contract.vendor_id) || 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {event.notes && (
        <div className="mb-4 rounded-xl bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-700">Notes</p>
          <p className="mt-1 text-sm text-amber-900 whitespace-pre-wrap">{event.notes}</p>
        </div>
      )}

      {/* More Actions */}
      <div className="mb-4 space-y-2">
        <button
          onClick={duplicateEvent}
          className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-sm text-navy-600 shadow-sm hover:bg-navy-50 dark:bg-navy-900 dark:text-navy-300 dark:hover:bg-navy-800"
        >
          <Copy className="h-4 w-4" />
          <span>Duplicate this event</span>
        </button>
        <button
          onClick={openTemplateDialog}
          className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-sm text-navy-600 shadow-sm hover:bg-navy-50 dark:bg-navy-900 dark:text-navy-300 dark:hover:bg-navy-800"
        >
          <Save className="h-4 w-4" />
          <span>Save as reusable template</span>
        </button>
        {aiEnabled && (
          <button
            onClick={handleAiTips}
            disabled={aiLoading}
            className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 p-3 text-sm font-medium text-purple-700 shadow-sm transition-all hover:from-purple-100 hover:to-blue-100 disabled:opacity-50 dark:from-purple-950 dark:to-blue-950 dark:text-purple-300 dark:hover:from-purple-900 dark:hover:to-blue-900"
          >
            {aiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>{aiLoading ? "Getting AI tips..." : "AI Tips & Budget Advice"}</span>
          </button>
        )}
      </div>

      {/* AI Tips Section */}
      {showAiTips && (
        <div className="mb-4 overflow-hidden rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:border-purple-800 dark:from-purple-950/50 dark:via-navy-900 dark:to-blue-950/50">
          <div className="flex items-center justify-between border-b border-purple-100 px-4 py-3 dark:border-purple-800">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-purple-900 dark:text-purple-200">AI Vendor & Budget Tips</span>
            </div>
            <button onClick={() => setShowAiTips(false)} className="rounded-full p-1 hover:bg-purple-100 dark:hover:bg-purple-800">
              <X className="h-3.5 w-3.5 text-purple-400" />
            </button>
          </div>
          {aiLoading ? (
            <div className="flex items-center justify-center gap-2 p-8">
              <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
              <span className="text-sm text-purple-600 dark:text-purple-400">Analyzing your event...</span>
            </div>
          ) : aiTips ? (
            <div className="space-y-4 p-4">
              {/* Overview */}
              <div>
                <p className="text-sm text-navy-700 dark:text-navy-300">{aiTips.suggestions}</p>
              </div>

              {/* Price Range */}
              {aiTips.price_range && (
                <div className="rounded-lg bg-purple-100/50 p-3 dark:bg-purple-900/30">
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">Typical Price Range</p>
                  <p className="mt-1 text-sm font-bold text-navy-900 dark:text-navy-100">
                    {formatCurrency(aiTips.price_range.min)} - {formatCurrency(aiTips.price_range.max)}
                  </p>
                </div>
              )}

              {/* Checklist */}
              {aiTips.checklist && aiTips.checklist.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                    <ListChecks className="h-3.5 w-3.5" /> What to Look For
                  </p>
                  <ul className="space-y-1.5">
                    {aiTips.checklist.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-navy-600 dark:text-navy-400">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Negotiation Tips */}
              {aiTips.negotiation_tips && aiTips.negotiation_tips.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                    <Lightbulb className="h-3.5 w-3.5" /> Negotiation Tips
                  </p>
                  <ul className="space-y-1.5">
                    {aiTips.negotiation_tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-navy-600 dark:text-navy-400">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Payment History */}
      {ledgerEntries.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-3 text-lg font-semibold">Payment History</h2>
          <div className="space-y-2">
            {ledgerEntries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium">{(entry.vendor as any)?.name || "Vendor"}</p>
                    <div className="flex gap-2 text-xs text-navy-500">
                      <Badge variant="secondary" className="text-xs">{entry.payment_mode}</Badge>
                      <Badge variant={entry.txn_type === "REFUND" ? "warning" : "secondary"} className="text-xs">
                        {entry.txn_type}
                      </Badge>
                      <span>{formatDateTime(entry.recorded_at)}</span>
                    </div>
                    {entry.notes && <p className="mt-1 text-xs text-navy-500">{entry.notes}</p>}
                  </div>
                  <span className={`text-lg font-bold ${entry.txn_type === "REFUND" ? "text-red-500" : "text-emerald-600"}`}>
                    {entry.txn_type === "REFUND" ? "-" : "+"}{formatCurrency(Number(entry.amount))}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {showTemplateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowTemplateDialog(false)}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:border dark:border-navy-700 dark:bg-navy-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-bold text-navy-900 dark:text-navy-100">Save as Template</h3>
            <p className="mb-4 text-sm text-navy-500">Reuse this event structure when creating future events.</p>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name"
              autoFocus
            />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)} disabled={savingTemplate}>
                Cancel
              </Button>
              <Button onClick={saveAsTemplate} disabled={savingTemplate || !templateName.trim()}>
                {savingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
