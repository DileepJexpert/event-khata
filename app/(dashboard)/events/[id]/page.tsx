"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorPaymentCard } from "@/components/vendor-payment-card";
import { BudgetDonut } from "@/components/budget-donut";
import { MobileHeader } from "@/components/mobile-header";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Share2,
  CalendarDays,
  MapPin,
  Phone,
  Pencil,
  ListChecks,
  Users,
  Clock,
  CreditCard,
  PartyPopper,
  FileText,
  MessageCircle,
  Send,
  Copy,
  Save,
  AlertTriangle,
  Sparkles,
  Loader2,
  X,
  Lightbulb,
  Brain,
  Camera,
  Armchair,
  UserCheck,
  TrendingUp,
  IndianRupee,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, formatTime, daysUntil } from "@/lib/utils";
import { EventProgress } from "@/components/event-progress";
import { useToast } from "@/components/ui/toast";
import { fetchWithCache, invalidateCache } from "@/lib/cache";
import type { Event, Vendor, Contract, LedgerEntry, SubEvent, Task } from "@/lib/types";
import { checkAIEnabled, getVendorSuggestion, type VendorSuggestionResponse } from "@/lib/ai";

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
  const [refreshing, setRefreshing] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTips, setAiTips] = useState<VendorSuggestionResponse | null>(null);
  const [showAiTips, setShowAiTips] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Mobile segmented tabs
  const [activeTab, setActiveTab] = useState<"overview" | "vendors" | "ledger" | "functions" | "tools">("overview");

  useEffect(() => {
    loadData();
    checkAIEnabled().then(setAiEnabled);
  }, [eventId]);

  async function loadData(forceFresh = false) {
    if (forceFresh) setRefreshing(true);
    try {
      const result = await fetchWithCache(
        `event:detail:${eventId}`,
        async () => {
          const [
            eventRes,
            contractsRes,
            ledgerRes,
            subEventsRes,
            tasksRes,
            guestsRes,
            expensesRes,
          ] = await Promise.all([
            supabase.from("events").select("*").eq("id", eventId).single(),
            supabase.from("contracts").select("*, vendor:vendors(*)").eq("event_id", eventId),
            supabase
              .from("ledger")
              .select("*, vendor:vendors(*)")
              .eq("event_id", eventId)
              .order("recorded_at", { ascending: false }),
            supabase
              .from("sub_events")
              .select("*")
              .eq("event_id", eventId)
              .order("date", { ascending: true, nullsFirst: false })
              .order("sort_order"),
            supabase.from("tasks").select("*").eq("event_id", eventId),
            supabase.from("guests").select("id", { count: "exact" }).eq("event_id", eventId),
            supabase.from("expenses").select("amount").eq("event_id", eventId),
          ]);

          if (eventRes.error) console.error("[EventDetail] Failed to load event:", eventRes.error.message);

          return {
            event: eventRes.data || null,
            contracts: (contractsRes.data as any) || [],
            ledgerEntries: (ledgerRes.data as any) || [],
            subEvents: subEventsRes.data || [],
            tasks: tasksRes.data || [],
            guestCount: guestsRes.count || 0,
            totalExpenses: (expensesRes.data || []).reduce((s: number, e: any) => s + Number(e.amount), 0),
          };
        },
        { ttlMs: 45000, tags: [`event:${eventId}`, "events", "ledger"], forceFresh }
      );

      if (result.event) setEvent(result.event);
      setContracts(result.contracts);
      setLedgerEntries(result.ledgerEntries);
      setSubEvents(result.subEvents);
      setTasks(result.tasks);
      setGuestCount(result.guestCount);
      setTotalExpenses(result.totalExpenses);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleManualRefresh = () => {
    invalidateCache([`event:${eventId}`, "events", "ledger"]);
    loadData(true);
  };

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

  function shareEventSummary() {
    if (!event) return;
    const lines = [
      `*Event Summary: ${event.client_name}*`,
      `Type: ${event.event_type}`,
      event.event_date ? `Date: ${formatDate(event.event_date)}` : null,
      event.venue ? `Venue: ${event.venue}` : null,
      event.total_budget ? `Budget: ${formatCurrency(Number(event.total_budget))}` : null,
      `Total Spent: ${formatCurrency(totalSpent)}`,
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

  async function duplicateEvent() {
    if (!event) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: newEvent, error } = await supabase
      .from("events")
      .insert({
        agency_id: event.agency_id,
        client_name: `${event.client_name} (Copy)`,
        client_phone: event.client_phone,
        client_email: event.client_email,
        event_type: event.event_type,
        total_budget: event.total_budget,
        venue: event.venue,
        notes: event.notes,
        status: "active",
      })
      .select()
      .single();

    if (error || !newEvent) {
      addToast({ title: "Failed to duplicate", description: error?.message, variant: "destructive" });
      return;
    }

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
      if (t.due_date && eventDate) {
        const taskDue = new Date(t.due_date);
        const diffMs = eventDate.getTime() - taskDue.getTime();
        daysBefore = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      }
      return {
        title: t.title,
        description: t.description,
        priority: t.priority,
        days_before_event: daysBefore,
        category: "general",
      };
    });

    const templateVendors = contracts.map((c) => ({
      category: c.vendor.category,
      typical_budget_percentage:
        event.total_budget && Number(event.total_budget) > 0
          ? Math.round((Number(c.agreed_amount) / Number(event.total_budget)) * 100)
          : null,
      is_essential: true,
      notes: null,
    }));

    const { error } = await supabase.from("event_templates").insert({
      name,
      event_type: event.event_type,
      description: `Template based on ${event.client_name}`,
      tasks: templateTasks,
      vendor_checklist: templateVendors,
    });

    setSavingTemplate(false);
    if (error) {
      addToast({ title: "Failed to save template", description: error.message, variant: "destructive" });
    } else {
      addToast({ title: "Template saved!", variant: "success" });
      setShowTemplateDialog(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 px-4 pt-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 text-center">
        <p className="text-navy-500 text-sm">Event not found.</p>
        <Button asChild className="mt-4 rounded-xl">
          <Link href="/events">Back to Events</Link>
        </Button>
      </div>
    );
  }

  const totalSpent = ledgerEntries.reduce((sum, e) => {
    return e.txn_type === "REFUND" ? sum - Number(e.amount) : sum + Number(e.amount);
  }, 0);

  const totalAgreed = contracts.reduce((sum, c) => sum + Number(c.agreed_amount), 0);

  // Group payments by vendor
  const vendorPayments = new Map<string, number>();
  ledgerEntries.forEach((entry) => {
    const current = vendorPayments.get(entry.vendor_id) || 0;
    vendorPayments.set(
      entry.vendor_id,
      entry.txn_type === "REFUND" ? current - Number(entry.amount) : current + Number(entry.amount)
    );
  });

  const emoji = TYPE_EMOJI[event.event_type?.toLowerCase()] || "✨";
  const dLeft = event.event_date ? daysUntil(event.event_date) : null;

  return (
    <div className="pb-36">
      <MobileHeader
        title={event.client_name}
        subtitle={`${emoji} ${event.event_type} ${event.venue ? `· ${event.venue}` : ""}`}
        showBack
        backHref="/events"
        rightAction={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Refresh event data"
              className="flex h-9 w-9 items-center justify-center rounded-full text-navy-600 hover:bg-navy-100 active:scale-95 dark:text-navy-300 dark:hover:bg-navy-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={shareEventSummary}
              title="Share Summary via WhatsApp"
              className="flex h-9 w-9 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50 active:scale-95 dark:text-emerald-400 dark:hover:bg-navy-800"
            >
              <Send className="h-4 w-4" />
            </button>
            <Link
              href={`/events/${eventId}/edit`}
              className="flex h-9 w-9 items-center justify-center rounded-full text-navy-600 hover:bg-navy-100 active:scale-95 dark:text-navy-300 dark:hover:bg-navy-800"
              title="Edit Event"
            >
              <Pencil className="h-4 w-4" />
            </Link>
            <Link
              href={`/events/${eventId}/share`}
              className="flex h-9 w-9 items-center justify-center rounded-full text-navy-600 hover:bg-navy-100 active:scale-95 dark:text-navy-300 dark:hover:bg-navy-800"
              title="Client Portal Link"
            >
              <Share2 className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      {/* Hero Client & Countdown Card */}
      <div className="p-4 pb-0 space-y-3">
        <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-xs dark:border-navy-800 dark:bg-navy-900">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">{emoji}</span>
                <h2 className="text-base font-bold text-navy-900 dark:text-navy-100">
                  {event.client_name}
                </h2>
                <Badge variant={event.status === "active" ? "success" : "secondary"} className="text-[10px]">
                  {event.status}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-navy-500 dark:text-navy-400">
                {event.event_date && (
                  <span className="flex items-center gap-1 font-medium">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(event.event_date)}
                  </span>
                )}
                {event.venue && (
                  <span className="flex items-center gap-1 truncate max-w-[140px]">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{event.venue}</span>
                  </span>
                )}
              </div>
            </div>

            {dLeft !== null && dLeft >= 0 && event.status === "active" && (
              <div className="rounded-xl bg-navy-50 px-3 py-1.5 text-center dark:bg-navy-800">
                <span className="block text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {dLeft === 0 ? "TODAY" : `${dLeft}d`}
                </span>
                <span className="text-[9px] uppercase font-bold text-navy-400">
                  {dLeft === 0 ? "Event" : "to go"}
                </span>
              </div>
            )}
          </div>

          {/* Client Quick Call / WhatsApp Bar */}
          {event.client_phone && (
            <div className="mt-3 flex items-center justify-between border-t border-navy-50 pt-2.5 dark:border-navy-800">
              <span className="text-xs text-navy-500 font-medium">
                Client: <strong>{event.client_phone}</strong>
              </span>
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${event.client_phone}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-50 text-navy-600 hover:bg-navy-100 active:scale-95 dark:bg-navy-800 dark:text-navy-300"
                  title="Call Client"
                >
                  <Phone className="h-3.5 w-3.5" />
                </a>
                <a
                  href={`https://wa.me/${event.client_phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:scale-95 dark:bg-emerald-950/40 dark:text-emerald-400"
                  title="WhatsApp Client"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Executive Financial Snapshot */}
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white p-3.5 shadow-xs dark:border-navy-800 dark:bg-navy-900">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-navy-400 dark:text-navy-500">
              Financial Khata
            </span>
            <Link
              href={`/events/${eventId}/pnl`}
              className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"
            >
              Detailed P&L <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-navy-50/70 p-2.5 dark:bg-navy-800/60">
              <p className="text-[10px] font-medium text-navy-500 dark:text-navy-400">Client Budget</p>
              <p className="truncate text-sm font-black text-navy-900 dark:text-navy-100">
                {event.total_budget ? formatCurrency(Number(event.total_budget)) : "Not set"}
              </p>
            </div>
            <div className="rounded-xl bg-blue-50/70 p-2.5 dark:bg-blue-950/30">
              <p className="text-[10px] font-medium text-blue-700 dark:text-blue-300">Committed</p>
              <p className="truncate text-sm font-black text-blue-900 dark:text-blue-100">
                {formatCurrency(totalAgreed)}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50/70 p-2.5 dark:bg-emerald-950/30">
              <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300">Paid to Date</p>
              <p className="truncate text-sm font-black text-emerald-900 dark:text-emerald-100">
                {formatCurrency(totalSpent)}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50/70 p-2.5 dark:bg-amber-950/30">
              <p className="text-[10px] font-medium text-amber-700 dark:text-amber-300">Remaining Balance</p>
              <p className="truncate text-sm font-black text-amber-900 dark:text-amber-100">
                {formatCurrency(Math.max(0, totalAgreed - totalSpent))}
              </p>
            </div>
          </div>

          {totalAgreed > 0 && (
            <div className="mt-2.5 space-y-1">
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-navy-100 dark:bg-navy-800">
                <div
                  style={{ width: `${Math.min(100, (totalSpent / totalAgreed) * 100)}%` }}
                  className="bg-emerald-500 transition-all"
                />
                <div
                  style={{
                    width: `${Math.max(0, Math.min(100 - (totalSpent / totalAgreed) * 100, ((totalAgreed - totalSpent) / totalAgreed) * 100))}%`,
                  }}
                  className="bg-amber-400 transition-all"
                />
              </div>
              <div className="flex justify-between text-[10px] text-navy-500 dark:text-navy-400">
                <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {Math.round((totalSpent / totalAgreed) * 100)}% Paid
                </span>
                <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {Math.round((Math.max(0, totalAgreed - totalSpent) / totalAgreed) * 100)}% Due
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Segmented Sticky Mobile Tab Pills */}
      <div className="sticky top-[53px] z-20 mt-3 border-y border-navy-100 bg-white/95 px-4 py-2 backdrop-blur-md dark:border-navy-800 dark:bg-navy-950/95">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: "overview", label: "Overview" },
            { id: "vendors", label: `Vendors (${contracts.length})` },
            { id: "ledger", label: `Ledger (${ledgerEntries.length})` },
            { id: "functions", label: `Functions (${subEvents.length})` },
            { id: "tools", label: "All Tools" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                activeTab === tab.id
                  ? "bg-navy-900 text-white shadow-xs dark:bg-navy-100 dark:text-navy-900"
                  : "bg-navy-50 text-navy-600 hover:bg-navy-100 dark:bg-navy-900 dark:text-navy-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="p-4 space-y-4">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Budget Donut */}
            {event.total_budget && (
              <Card className="rounded-2xl border-navy-100 bg-white shadow-xs dark:border-navy-800 dark:bg-navy-900">
                <CardContent className="p-4">
                  <BudgetDonut totalBudget={Number(event.total_budget)} totalSpent={totalSpent} />
                </CardContent>
              </Card>
            )}

            {/* Event Readiness */}
            {event.status === "active" && (
              <Card className="rounded-2xl border-navy-100 bg-white shadow-xs dark:border-navy-800 dark:bg-navy-900">
                <CardContent className="p-4">
                  <EventProgress
                    items={[
                      { label: "Event date set", done: !!event.event_date },
                      { label: "Budget defined", done: !!event.total_budget && event.total_budget > 0 },
                      { label: "Venue confirmed", done: !!event.venue },
                      { label: "Vendors booked", done: contracts.length > 0 },
                      { label: "Sub-events planned", done: subEvents.length > 0 },
                      { label: "Guest list started", done: guestCount > 0 },
                      {
                        label: "Tasks created",
                        done: tasks.length > 0,
                        warning: tasks.length > 0 && tasks.some((t) => t.status === "pending"),
                      },
                      {
                        label: "All tasks completed",
                        done: tasks.length > 0 && tasks.every((t) => t.status === "completed"),
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {event.notes && (
              <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200/60 dark:bg-amber-950/30 dark:border-amber-900/40">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Event Notes</p>
                <p className="mt-1 text-xs text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{event.notes}</p>
              </div>
            )}

            {/* Secondary Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={duplicateEvent}
                className="flex items-center justify-center gap-2 rounded-2xl border border-navy-100 bg-white p-3 text-xs font-bold text-navy-700 shadow-xs active:scale-95 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-200"
              >
                <Copy className="h-4 w-4" /> Duplicate
              </button>
              <button
                type="button"
                onClick={openTemplateDialog}
                className="flex items-center justify-center gap-2 rounded-2xl border border-navy-100 bg-white p-3 text-xs font-bold text-navy-700 shadow-xs active:scale-95 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-200"
              >
                <Save className="h-4 w-4" /> Save Template
              </button>
            </div>

            {aiEnabled && (
              <button
                type="button"
                onClick={handleAiTips}
                disabled={aiLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 p-3.5 text-xs font-bold text-white shadow-md transition active:scale-98"
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {aiLoading ? "Analyzing Event..." : "Get AI Vendor & Budget Advice"}
              </button>
            )}
          </div>
        )}

        {/* TAB 2: VENDORS */}
        {activeTab === "vendors" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-navy-400">
                Assigned Vendors ({contracts.length})
              </h3>
              <Link
                href={`/events/${eventId}/add-vendor`}
                className="flex items-center gap-1 text-xs font-bold text-navy-900 dark:text-navy-100"
              >
                <Plus className="h-3.5 w-3.5" /> Add Vendor
              </Link>
            </div>

            {contracts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-navy-200 p-8 text-center dark:border-navy-800">
                <Users className="mx-auto h-8 w-8 text-navy-400" />
                <p className="mt-2 text-xs font-medium text-navy-500">No vendors booked for this event yet.</p>
                <Button asChild size="sm" className="mt-3 rounded-xl">
                  <Link href={`/events/${eventId}/add-vendor`}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Book First Vendor
                  </Link>
                </Button>
              </div>
            ) : (
              contracts.map((contract) => {
                const paid = vendorPayments.get(contract.vendor_id) || 0;
                const agreed = Number(contract.agreed_amount);
                const balance = Math.max(0, agreed - paid);

                return (
                  <div
                    key={contract.id}
                    className="rounded-2xl border border-navy-100 bg-white p-3.5 shadow-xs dark:border-navy-800 dark:bg-navy-900"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-navy-900 dark:text-navy-100">
                          {contract.vendor.name}
                        </h4>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {contract.vendor.category?.replace("_", " ")}
                          </Badge>
                          {contract.vendor.phone && (
                            <span className="text-[11px] text-navy-400">{contract.vendor.phone}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] text-navy-400">Balance Due</p>
                        <p className="text-sm font-black text-amber-600 dark:text-amber-400">
                          {formatCurrency(balance)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-navy-50 pt-2 text-xs text-navy-500 dark:border-navy-800">
                      <span>Agreed: <strong>{formatCurrency(agreed)}</strong></span>
                      <span>Paid: <strong className="text-emerald-600">{formatCurrency(paid)}</strong></span>
                      <Link
                        href={`/pay?eventId=${eventId}&vendorId=${contract.vendor_id}`}
                        className="rounded-xl bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 active:scale-95 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        + Pay
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: LEDGER */}
        {activeTab === "ledger" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-navy-400">
                Payment History ({ledgerEntries.length})
              </h3>
              <Link
                href={`/pay?eventId=${eventId}`}
                className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400"
              >
                <Plus className="h-3.5 w-3.5" /> Log Payment
              </Link>
            </div>

            {ledgerEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-navy-200 p-8 text-center dark:border-navy-800">
                <Receipt className="mx-auto h-8 w-8 text-navy-400" />
                <p className="mt-2 text-xs font-medium text-navy-500">No payments recorded for this event yet.</p>
                <Button asChild size="sm" variant="success" className="mt-3 rounded-xl font-bold">
                  <Link href={`/pay?eventId=${eventId}`}>
                    <IndianRupee className="mr-1 h-3.5 w-3.5" /> Record First Payment
                  </Link>
                </Button>
              </div>
            ) : (
              ledgerEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-2xl border border-navy-100 bg-white p-3 shadow-xs dark:border-navy-800 dark:bg-navy-900"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-navy-900 dark:text-navy-100">
                      {(entry.vendor as any)?.name || "Vendor"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-navy-400">
                      <span className="font-semibold uppercase">{entry.payment_mode}</span>
                      <span>·</span>
                      <span>{entry.txn_type}</span>
                      <span>·</span>
                      <span>{formatDate(entry.recorded_at)}</span>
                    </div>
                  </div>

                  <span
                    className={`text-sm font-black flex-shrink-0 ${
                      entry.txn_type === "REFUND"
                        ? "text-red-500"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {entry.txn_type === "REFUND" ? "-" : "+"}
                    {formatCurrency(Number(entry.amount))}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: FUNCTIONS */}
        {activeTab === "functions" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-navy-400">
                Multi-Day Functions ({subEvents.length})
              </h3>
              <Link
                href={`/events/${eventId}/sub-events`}
                className="text-xs font-bold text-navy-900 dark:text-navy-100"
              >
                Manage All →
              </Link>
            </div>

            {subEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-navy-200 p-8 text-center dark:border-navy-800">
                <PartyPopper className="mx-auto h-8 w-8 text-navy-400" />
                <p className="mt-2 text-xs font-medium text-navy-500">No sub-events planned (Mehendi, Sangeet, Haldi).</p>
                <Button asChild size="sm" className="mt-3 rounded-xl">
                  <Link href={`/events/${eventId}/sub-events`}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Function
                  </Link>
                </Button>
              </div>
            ) : (
              subEvents.map((se) => (
                <Link
                  key={se.id}
                  href={`/events/${eventId}/sub-events/${se.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-white p-3 shadow-xs transition active:scale-98 dark:border-navy-800 dark:bg-navy-900"
                >
                  <span className="text-xl flex-shrink-0">{TYPE_EMOJI[se.type] || "✨"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-xs text-navy-900 dark:text-navy-100">
                      {se.name}
                    </p>
                    <p className="truncate text-[10px] text-navy-400">
                      {se.date ? formatDate(se.date) : "Date TBD"}
                      {se.start_time ? ` · ${formatTime(se.start_time)}` : ""}
                      {se.venue ? ` · ${se.venue}` : ""}
                    </p>
                  </div>
                  {se.budget && (
                    <span className="text-xs font-bold text-navy-700 dark:text-navy-300">
                      {formatCurrency(Number(se.budget))}
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        )}

        {/* TAB 5: ALL TOOLS */}
        {activeTab === "tools" && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-navy-400">
              Event Planning Modules
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { href: `/events/${eventId}/tasks`, label: "Checklist", icon: ListChecks, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/40" },
                { href: `/events/${eventId}/guests`, label: "Guests", icon: Users, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/40" },
                { href: `/events/${eventId}/timeline`, label: "Timeline", icon: Clock, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40" },
                { href: `/events/${eventId}/payment-schedule`, label: "Milestones", icon: CreditCard, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" },
                { href: `/events/${eventId}/invite`, label: "E-Invite", icon: Send, color: "text-rose-600 bg-rose-50 dark:bg-rose-950/40" },
                { href: `/events/${eventId}/gallery`, label: "Gallery", icon: Camera, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40" },
                { href: `/events/${eventId}/seating`, label: "Seating", icon: Armchair, color: "text-orange-600 bg-orange-50 dark:bg-orange-950/40" },
                { href: `/events/${eventId}/checkin`, label: "Check-in", icon: UserCheck, color: "text-teal-600 bg-teal-50 dark:bg-teal-950/40" },
                { href: `/events/${eventId}/pnl`, label: "P&L", icon: TrendingUp, color: "text-lime-600 bg-lime-50 dark:bg-lime-950/40" },
              ].map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-navy-100 bg-white p-3 shadow-xs transition active:scale-95 dark:border-navy-800 dark:bg-navy-900"
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${tool.color}`}>
                    <tool.icon className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-bold text-navy-800 dark:text-navy-200">
                    {tool.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Mobile Bottom Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-navy-100 bg-white/95 p-3 backdrop-blur-md pb-[calc(0.75rem+var(--safe-area-bottom))] dark:border-navy-800 dark:bg-navy-900/95">
        <div className="mx-auto flex max-w-md items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="lg"
            className="flex-1 rounded-2xl py-5 font-bold text-xs"
          >
            <Link href={`/events/${eventId}/add-vendor`}>
              <Plus className="mr-1 h-4 w-4" /> Add Vendor
            </Link>
          </Button>
          <Button
            asChild
            variant="success"
            size="lg"
            className="flex-1 rounded-2xl py-5 font-black text-xs shadow-md shadow-emerald-200/60 active:scale-98 dark:shadow-none"
          >
            <Link href={`/pay?eventId=${eventId}`}>
              <IndianRupee className="mr-1.5 h-4 w-4 stroke-[3]" /> Record Payment
            </Link>
          </Button>
        </div>
      </div>

      {/* Save Template Dialog */}
      {showTemplateDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setShowTemplateDialog(false)}
        >
          <div
            className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl dark:border dark:border-navy-700 dark:bg-navy-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-1 text-base font-bold text-navy-900 dark:text-navy-100">
              Save as Template
            </h3>
            <p className="mb-4 text-xs text-navy-500">
              Reuse this checklist & vendor blueprint for future events.
            </p>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Royal Wedding Blueprint"
              className="rounded-xl text-xs h-10"
              autoFocus
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTemplateDialog(false)}
                disabled={savingTemplate}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={saveAsTemplate}
                disabled={savingTemplate || !templateName.trim()}
                className="rounded-xl font-bold"
              >
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
