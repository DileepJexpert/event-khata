"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  CalendarDays,
  Users,
  IndianRupee,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  Plus,
  ListChecks,
  FileText,
  BarChart3,
  Bell,
  Phone,
  MessageCircle,
  Sparkles,
  Search,
  RefreshCw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatDateTime, daysUntil } from "@/lib/utils";
import { GlobalSearch } from "@/components/global-search";
import { getPaymentReceiptMessage } from "@/lib/whatsapp";
import { fetchWithCache, invalidateCache } from "@/lib/cache";
import type { Event, LedgerEntry, PaymentSchedule, Lead } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type ActivityItem = {
  id: string;
  type: "payment" | "event" | "vendor" | "task" | "lead";
  title: string;
  subtitle: string;
  time: string;
  icon: "payment" | "event" | "vendor" | "task" | "lead";
};

type MonthlyPayment = {
  month: string;
  total: number;
};

type CategorySpending = {
  category: string;
  total: number;
};

type CountdownEvent = {
  id: string;
  client_name: string;
  venue: string | null;
  event_date: string;
  days_left: number;
  client_phone: string | null;
};

type RecentPaymentItem = LedgerEntry & {
  vendor_name: string;
  event_name: string;
  vendor_phone?: string | null;
};

const PIE_COLORS = [
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#a855f7", // purple-500
  "#f97316", // orange-500
  "#06b6d4", // cyan-500
  "#ec4899", // pink-500
  "#eab308", // yellow-500
  "#ef4444", // red-500
];

type DashboardData = {
  activeEvents: number;
  totalVendors: number;
  totalPaidThisMonth: number;
  totalOutstanding: number;
  upcomingPayments: (PaymentSchedule & { vendor_name: string; event_name: string })[];
  recentPayments: RecentPaymentItem[];
  upcomingEvents: Event[];
  newLeads: number;
  overduePayments: number;
  pendingTasks: number;
  recentActivity: ActivityItem[];
};

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agencyName, setAgencyName] = useState("Event Planner");
  const [data, setData] = useState<DashboardData>({
    activeEvents: 0,
    totalVendors: 0,
    totalPaidThisMonth: 0,
    totalOutstanding: 0,
    upcomingPayments: [],
    recentPayments: [],
    upcomingEvents: [],
    newLeads: 0,
    overduePayments: 0,
    pendingTasks: 0,
    recentActivity: [],
  });
  const [countdownEvent, setCountdownEvent] = useState<CountdownEvent | null>(null);
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([]);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard(forceFresh = false) {
    if (forceFresh) setRefreshing(true);

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const todayStr = now.toISOString().split("T")[0];

      // Use High-Performance In-Memory Cache
      const result = await fetchWithCache(
        "dashboard:aggregate",
        async () => {
          // Parallel consolidated execution (NO duplicate ledger queries)
          const [
            agencyUserRes,
            eventsRes,
            vendorsRes,
            allLedgerRes,
            contractsRes,
            schedulesRes,
            leadsRes,
            tasksRes,
            nearestEventsRes,
          ] = await Promise.all([
            supabase.auth.getUser(),
            supabase.from("events").select("*").eq("status", "active"),
            supabase.from("vendors").select("id", { count: "exact" }),
            supabase
              .from("ledger")
              .select("id, amount, txn_type, recorded_at, payment_mode, vendor_id, event_id, vendor:vendors(name, phone, category), event:events(client_name)")
              .order("recorded_at", { ascending: false }),
            supabase.from("contracts").select("agreed_amount, event_id, vendor_id"),
            supabase
              .from("payment_schedules")
              .select("*, vendor:vendors(name), event:events(client_name)")
              .in("status", ["upcoming", "due", "overdue"])
              .order("due_date", { ascending: true })
              .limit(5),
            supabase.from("leads").select("id", { count: "exact" }).eq("status", "new"),
            supabase.from("tasks").select("id", { count: "exact" }).in("status", ["pending", "in_progress"]),
            supabase
              .from("events")
              .select("id, client_name, venue, event_date, client_phone")
              .gte("event_date", todayStr)
              .order("event_date", { ascending: true })
              .limit(1),
          ]);

          const user = agencyUserRes.data.user;
          let fetchedAgencyName = "Event Planner";
          if (user) {
            const { data: agency } = await supabase
              .from("agencies")
              .select("name")
              .eq("id", user.id)
              .maybeSingle();
            if (agency?.name) fetchedAgencyName = agency.name;
          }

          const activeEvents = eventsRes.data || [];
          const allLedger = allLedgerRes.data || [];
          const contracts = contractsRes.data || [];

          // Compute financials in-memory (0ms)
          let totalPaid = 0;
          let totalPaidThisMonth = 0;
          const monthMap: Record<string, number> = {};
          const catMap: Record<string, number> = {};

          const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${MONTH_SHORT[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
            monthMap[key] = 0;
          }

          allLedger.forEach((entry: any) => {
            const amt = entry.txn_type === "REFUND" ? -Number(entry.amount) : Number(entry.amount);
            totalPaid += amt;

            if (entry.recorded_at >= monthStart) {
              totalPaidThisMonth += amt;
            }

            // Monthly breakdown
            const d = new Date(entry.recorded_at);
            const key = `${MONTH_SHORT[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
            if (key in monthMap) {
              monthMap[key] += amt;
            }

            // Category breakdown
            const cat = entry.vendor?.category || "other";
            const label = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, " ");
            catMap[label] = (catMap[label] || 0) + amt;
          });

          const totalAgreed = contracts.reduce((s, c) => s + Number(c.agreed_amount), 0);
          const totalOutstanding = Math.max(0, totalAgreed - totalPaid);

          const upcomingPayments = (schedulesRes.data || []).map((s: any) => ({
            ...s,
            vendor_name: s.vendor?.name || "Unknown",
            event_name: s.event?.client_name || "Unknown",
          }));

          const recentPayments: RecentPaymentItem[] = allLedger.slice(0, 5).map((l: any) => ({
            ...l,
            vendor_name: l.vendor?.name || "Unknown",
            vendor_phone: l.vendor?.phone || null,
            event_name: l.event?.client_name || "Unknown",
          }));

          const overdueCount = upcomingPayments.filter((p: any) => p.status === "overdue").length;

          const activity: ActivityItem[] = recentPayments.map((p: any) => ({
            id: p.id,
            type: "payment" as const,
            title: `${p.txn_type === "REFUND" ? "Refund" : "Payment"} to ${p.vendor_name}`,
            subtitle: `${formatCurrency(Number(p.amount))} - ${p.event_name}`,
            time: p.recorded_at,
            icon: "payment" as const,
          }));

          let countdown: CountdownEvent | null = null;
          if (nearestEventsRes.data && nearestEventsRes.data.length > 0) {
            const evt = nearestEventsRes.data[0];
            countdown = {
              id: evt.id,
              client_name: evt.client_name,
              venue: evt.venue,
              event_date: evt.event_date,
              days_left: daysUntil(evt.event_date),
              client_phone: evt.client_phone,
            };
          }

          const monthlyPaymentsTrend = Object.entries(monthMap).map(([month, total]) => ({
            month,
            total: Math.max(0, total),
          }));

          const categorySpendingList = Object.entries(catMap)
            .map(([category, total]) => ({ category, total: Math.max(0, total) }))
            .filter((item) => item.total > 0)
            .sort((a, b) => b.total - a.total);

          return {
            agencyName: fetchedAgencyName,
            dashboardData: {
              activeEvents: activeEvents.length,
              totalVendors: vendorsRes.count || 0,
              totalPaidThisMonth,
              totalOutstanding,
              upcomingPayments,
              recentPayments,
              upcomingEvents: activeEvents
                .filter((e) => e.event_date && daysUntil(e.event_date) >= 0 && daysUntil(e.event_date) <= 30)
                .slice(0, 3),
              newLeads: leadsRes.count || 0,
              overduePayments: overdueCount,
              pendingTasks: tasksRes.count || 0,
              recentActivity: activity,
            },
            countdownEvent: countdown,
            monthlyPayments: monthlyPaymentsTrend,
            categorySpending: categorySpendingList,
          };
        },
        { ttlMs: 30000, tags: ["dashboard", "ledger", "events", "vendors"], forceFresh }
      );

      setAgencyName(result.agencyName);
      setData(result.dashboardData);
      setCountdownEvent(result.countdownEvent);
      setMonthlyPayments(result.monthlyPayments);
      setCategorySpending(result.categorySpending);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleManualRefresh = () => {
    invalidateCache(["dashboard", "ledger", "events", "vendors"]);
    loadDashboard(true);
  };

  const handleShareReceipt = (payment: RecentPaymentItem) => {
    const msg = getPaymentReceiptMessage({
      eventName: payment.event_name,
      vendorName: payment.vendor_name,
      amount: Number(payment.amount),
      mode: payment.payment_mode || "CASH",
      date: formatDate(payment.recorded_at),
    });

    if (payment.vendor_phone) {
      const clean = payment.vendor_phone.replace(/\D/g, "");
      window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      if (navigator.share) {
        navigator.share({ text: msg });
      } else {
        navigator.clipboard.writeText(msg);
        alert("Receipt copied to clipboard!");
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 px-4 pb-24 pt-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const isFreshWorkspace =
    data.activeEvents === 0 &&
    data.totalVendors === 0 &&
    data.recentPayments.length === 0 &&
    data.upcomingPayments.length === 0 &&
    data.pendingTasks === 0;

  return (
    <div className="px-4 pb-24 pt-3">
      {/* Mobile App Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-lg font-bold text-white shadow-md">
            ₹
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-400 dark:text-navy-500">
              Namaste, Planner 🙏
            </p>
            <h1 className="truncate text-base font-extrabold leading-tight text-navy-900 dark:text-navy-100">
              {agencyName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-navy-600 shadow-xs hover:bg-navy-50 active:scale-95 dark:bg-navy-800 dark:text-navy-300 disabled:opacity-50"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-navy-600 shadow-xs hover:bg-navy-50 active:scale-95 dark:bg-navy-800 dark:text-navy-300"
            aria-label="Alerts"
          >
            <Bell className="h-4 w-4" />
            {data.overduePayments > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {data.overduePayments}
              </span>
            )}
          </Link>
          <Link
            href="/muhurat"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-amber-500 shadow-xs hover:bg-amber-50 active:scale-95 dark:bg-navy-800 dark:text-amber-400"
            title="Auspicious Muhurat Dates"
          >
            <Sparkles className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Global Search */}
      <div className="mb-4">
        <GlobalSearch />
      </div>

      {/* 4 Primary One-Tap Mobile Action Pills */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        <Link
          href="/pay"
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-center transition-all active:scale-95 dark:border-emerald-900/60 dark:bg-emerald-950/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none">
            <IndianRupee className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold text-emerald-950 dark:text-emerald-200">
            Quick Pay
          </span>
        </Link>

        <Link
          href="/events/new"
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-blue-200/80 bg-blue-50/70 p-3 text-center transition-all active:scale-95 dark:border-blue-900/60 dark:bg-blue-950/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none">
            <CalendarDays className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold text-blue-950 dark:text-blue-200">
            + Event
          </span>
        </Link>

        <Link
          href="/vendors/new"
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-purple-200/80 bg-purple-50/70 p-3 text-center transition-all active:scale-95 dark:border-purple-900/60 dark:bg-purple-950/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white shadow-md shadow-purple-200 dark:shadow-none">
            <Users className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold text-purple-950 dark:text-purple-200">
            + Vendor
          </span>
        </Link>

        <Link
          href="/reminders"
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3 text-center transition-all active:scale-95 dark:border-amber-900/60 dark:bg-amber-950/40"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-none">
            <Bell className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold text-amber-950 dark:text-amber-200">
            Reminders
          </span>
        </Link>
      </div>

      {isFreshWorkspace && (
        <div className="mb-4 rounded-2xl border border-navy-100 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-900">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Ready to start
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-navy-900 dark:text-navy-100">
            Create your first event
          </h2>
          <p className="mt-1 text-xs text-navy-500">
            Set up the client, budget, date, and venue, then track vendor payments effortlessly.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/events/new"
              className="flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-bold text-white active:scale-95 dark:bg-navy-100 dark:text-navy-900"
            >
              <CalendarDays className="h-4 w-4" />
              New Event
            </Link>
            <Link
              href="/vendors/new"
              className="flex items-center justify-center gap-2 rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-xs font-bold text-navy-700 active:scale-95 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-100"
            >
              <Users className="h-4 w-4" />
              Add Vendor
            </Link>
          </div>
        </div>
      )}

      {/* Event Countdown Card with 1-Tap Client Communication */}
      {countdownEvent && (
        <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 p-4 text-white shadow-lg border border-navy-700/60">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="inline-block rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Next Upcoming Event
              </span>
              <h3 className="mt-1 truncate text-lg font-bold text-white">
                {countdownEvent.client_name}
              </h3>
              <p className="truncate text-xs text-navy-300">
                {countdownEvent.venue ? `${countdownEvent.venue} · ` : ""}
                {formatDate(countdownEvent.event_date)}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 px-3.5 py-2.5 backdrop-blur-sm text-center">
              {countdownEvent.days_left === 0 ? (
                <span className="text-xl font-extrabold text-emerald-400 animate-pulse">
                  TODAY!
                </span>
              ) : (
                <>
                  <span className="text-3xl font-extrabold leading-none text-emerald-400">
                    {countdownEvent.days_left}
                  </span>
                  <span className="text-[10px] font-semibold text-navy-200">
                    {countdownEvent.days_left === 1 ? "day left" : "days left"}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
            <div className="flex items-center gap-2">
              {countdownEvent.client_phone && (
                <>
                  <a
                    href={`tel:${countdownEvent.client_phone}`}
                    className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20 active:scale-95"
                  >
                    <Phone className="h-3 w-3" /> Call
                  </a>
                  <a
                    href={`https://wa.me/${countdownEvent.client_phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 active:scale-95"
                  >
                    <MessageCircle className="h-3 w-3" /> WhatsApp
                  </a>
                </>
              )}
            </div>
            <Link
              href={`/events/${countdownEvent.id}`}
              className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300"
            >
              Open Event <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {/* 4 Financial & Operational Stat Cards */}
      <div className="mb-4 grid grid-cols-2 gap-2.5">
        <Link
          href="/events"
          className="rounded-2xl border border-navy-100 bg-white p-3.5 shadow-xs transition active:scale-98 dark:border-navy-800 dark:bg-navy-900"
        >
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <CalendarDays className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black text-navy-900 dark:text-navy-100">
            {data.activeEvents}
          </p>
          <p className="text-[11px] font-medium text-navy-500 dark:text-navy-400">
            Active Events
          </p>
        </Link>

        <Link
          href="/vendors"
          className="rounded-2xl border border-navy-100 bg-white p-3.5 shadow-xs transition active:scale-98 dark:border-navy-800 dark:bg-navy-900"
        >
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
            <Users className="h-4 w-4" />
          </div>
          <p className="text-2xl font-black text-navy-900 dark:text-navy-100">
            {data.totalVendors}
          </p>
          <p className="text-[11px] font-medium text-navy-500 dark:text-navy-400">
            Total Vendors
          </p>
        </Link>

        <div className="rounded-2xl border border-navy-100 bg-white p-3.5 shadow-xs dark:border-navy-800 dark:bg-navy-900">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="truncate text-xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(data.totalPaidThisMonth)}
          </p>
          <p className="text-[11px] font-medium text-navy-500 dark:text-navy-400">
            Paid This Month
          </p>
        </div>

        <div className="rounded-2xl border border-navy-100 bg-white p-3.5 shadow-xs dark:border-navy-800 dark:bg-navy-900">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <IndianRupee className="h-4 w-4" />
          </div>
          <p className="truncate text-xl font-black text-amber-600 dark:text-amber-400">
            {formatCurrency(data.totalOutstanding)}
          </p>
          <p className="text-[11px] font-medium text-navy-500 dark:text-navy-400">
            Khata Outstanding
          </p>
        </div>
      </div>

      {/* Actionable Alerts Ribbon */}
      {(data.overduePayments > 0 || data.newLeads > 0 || data.pendingTasks > 0) && (
        <div className="mb-4 space-y-2">
          {data.overduePayments > 0 && (
            <Link
              href="/reminders"
              className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-red-900 transition active:scale-98 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/50">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-tight">
                  {data.overduePayments} overdue payment{data.overduePayments > 1 ? "s" : ""} pending
                </p>
                <p className="text-[11px] text-red-700 dark:text-red-300">
                  Tap to view schedule & send WhatsApp reminders
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-red-600" />
            </Link>
          )}

          {data.pendingTasks > 0 && (
            <Link
              href="/tasks"
              className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900 transition active:scale-98 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50">
                <ListChecks className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-tight">
                  {data.pendingTasks} pending tasks
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Keep event checklist on schedule
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-600" />
            </Link>
          )}

          {data.newLeads > 0 && (
            <Link
              href="/leads"
              className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-blue-900 transition active:scale-98 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50">
                <Plus className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-tight">
                  {data.newLeads} new inquiry{data.newLeads > 1 ? "s" : ""}
                </p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  Follow up with prospective clients
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-blue-600" />
            </Link>
          )}
        </div>
      )}

      {/* Upcoming Payments with Quick Action */}
      {data.upcomingPayments.length > 0 && (
        <div className="mb-4">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-navy-500 dark:text-navy-400">
              Upcoming Payments
            </h2>
            <Link
              href="/pay"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              Pay Now
            </Link>
          </div>
          <div className="space-y-2">
            {data.upcomingPayments.map((payment: any) => (
              <div
                key={payment.id}
                className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-white p-3 shadow-xs dark:border-navy-800 dark:bg-navy-900"
              >
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                    payment.status === "overdue"
                      ? "bg-red-50 text-red-600 dark:bg-red-950/40"
                      : "bg-amber-50 text-amber-600 dark:bg-amber-950/40"
                  }`}
                >
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-navy-900 dark:text-navy-100">
                    {payment.vendor_name}
                  </p>
                  <p className="truncate text-[10px] text-navy-500 dark:text-navy-400">
                    {payment.event_name} · {payment.label}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-navy-900 dark:text-navy-100">
                    {formatCurrency(payment.amount)}
                  </p>
                  <p
                    className={`text-[10px] font-semibold ${
                      payment.status === "overdue"
                        ? "text-red-600"
                        : "text-navy-500 dark:text-navy-400"
                    }`}
                  >
                    {formatDate(payment.due_date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Payments with 1-Tap WhatsApp Receipt Share */}
      {data.recentPayments.length > 0 && (
        <div className="mb-4">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-navy-500 dark:text-navy-400">
              Recent Payments
            </h2>
            <Link
              href="/reports"
              className="text-xs font-bold text-navy-600 hover:text-navy-800 dark:text-navy-400"
            >
              All Ledger
            </Link>
          </div>
          <div className="space-y-2">
            {data.recentPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center gap-3 rounded-2xl border border-navy-100 bg-white p-3 shadow-xs dark:border-navy-800 dark:bg-navy-900"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-navy-900 dark:text-navy-100">
                    {payment.vendor_name}
                  </p>
                  <p className="truncate text-[10px] text-navy-500 dark:text-navy-400">
                    {payment.event_name} · {payment.payment_mode || "CASH"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(Number(payment.amount))}
                    </p>
                    <p className="text-[10px] text-navy-400">
                      {formatDate(payment.recorded_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleShareReceipt(payment)}
                    title="Send WhatsApp Receipt"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:scale-95 dark:bg-emerald-950/40 dark:text-emerald-400"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      {(monthlyPayments.length > 0 || categorySpending.length > 0) && (
        <div className="mb-4">
          <div className="mb-2.5 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-navy-600 dark:text-navy-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-navy-500 dark:text-navy-400">
              Cashflow & Spending
            </h2>
          </div>

          {/* Monthly Payment Trend */}
          {monthlyPayments.length > 0 && (
            <div className="mb-3 rounded-2xl border border-navy-100 bg-white p-4 shadow-xs dark:border-navy-800 dark:bg-navy-900">
              <h3 className="mb-2 text-xs font-bold text-navy-700 dark:text-navy-300">
                Payment Trends (Last 6 Months)
              </h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyPayments} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 100000
                          ? `${(v / 100000).toFixed(1)}L`
                          : v >= 1000
                          ? `${(v / 1000).toFixed(0)}K`
                          : String(v)
                      }
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Total"]}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        fontSize: "11px",
                      }}
                    />
                    <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Category Spending Pie */}
          {categorySpending.length > 0 && (
            <div className="rounded-2xl border border-navy-100 bg-white p-4 shadow-xs dark:border-navy-800 dark:bg-navy-900">
              <h3 className="mb-2 text-xs font-bold text-navy-700 dark:text-navy-300">
                Vendor Category Breakdown
              </h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySpending}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {categorySpending.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Spent"]}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        fontSize: "11px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {categorySpending.map((item, index) => (
                  <div key={item.category} className="flex items-center gap-1">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    <span className="text-[10px] text-navy-600 dark:text-navy-400">
                      {item.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
