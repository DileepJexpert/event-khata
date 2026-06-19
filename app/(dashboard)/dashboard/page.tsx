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
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatDateTime, daysUntil } from "@/lib/utils";
import { GlobalSearch } from "@/components/global-search";
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
  recentPayments: (LedgerEntry & { vendor_name: string; event_name: string })[];
  upcomingEvents: Event[];
  newLeads: number;
  overduePayments: number;
  pendingTasks: number;
  recentActivity: ActivityItem[];
};

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
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

  async function loadDashboard() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      eventsRes,
      vendorsRes,
      ledgerRes,
      monthLedgerRes,
      schedulesRes,
      leadsRes,
      tasksRes,
    ] = await Promise.all([
      supabase.from("events").select("*").eq("status", "active"),
      supabase.from("vendors").select("id", { count: "exact" }),
      supabase.from("ledger").select("*, vendor:vendors(name), event:events(client_name)").order("recorded_at", { ascending: false }).limit(5),
      supabase.from("ledger").select("amount, txn_type").gte("recorded_at", monthStart),
      supabase.from("payment_schedules").select("*, vendor:vendors(name), event:events(client_name)").in("status", ["upcoming", "due", "overdue"]).order("due_date", { ascending: true }).limit(5),
      supabase.from("leads").select("id", { count: "exact" }).eq("status", "new"),
      supabase.from("tasks").select("id", { count: "exact" }).in("status", ["pending", "in_progress"]),
    ]);

    const activeEvents = eventsRes.data || [];
    const monthPayments = monthLedgerRes.data || [];
    const totalPaidThisMonth = monthPayments.reduce((sum, p) => sum + (p.txn_type === "REFUND" ? -p.amount : p.amount), 0);

    // Calculate outstanding from contracts vs ledger
    const contractsRes = await supabase.from("contracts").select("agreed_amount, event_id, vendor_id");
    const allLedgerRes = await supabase.from("ledger").select("amount, txn_type, event_id, vendor_id");
    const contracts = contractsRes.data || [];
    const allPayments = allLedgerRes.data || [];

    const totalAgreed = contracts.reduce((s, c) => s + c.agreed_amount, 0);
    const totalPaid = allPayments.reduce((s, p) => s + (p.txn_type === "REFUND" ? -p.amount : p.amount), 0);

    const upcomingPayments = (schedulesRes.data || []).map((s: any) => ({
      ...s,
      vendor_name: s.vendor?.name || "Unknown",
      event_name: s.event?.client_name || "Unknown",
    }));

    const recentPayments = (ledgerRes.data || []).map((l: any) => ({
      ...l,
      vendor_name: l.vendor?.name || "Unknown",
      event_name: l.event?.client_name || "Unknown",
    }));

    const overdueCount = upcomingPayments.filter((p: any) => p.status === "overdue").length;

    // Build activity feed from recent payments
    const activity: ActivityItem[] = recentPayments.map((p: any) => ({
      id: p.id,
      type: "payment" as const,
      title: `${p.txn_type === "REFUND" ? "Refund" : "Payment"} to ${p.vendor_name}`,
      subtitle: `${formatCurrency(Number(p.amount))} - ${p.event_name}`,
      time: p.recorded_at,
      icon: "payment" as const,
    }));

    setData({
      activeEvents: activeEvents.length,
      totalVendors: vendorsRes.count || 0,
      totalPaidThisMonth,
      totalOutstanding: Math.max(0, totalAgreed - totalPaid),
      upcomingPayments,
      recentPayments,
      upcomingEvents: activeEvents.filter((e) => e.event_date && daysUntil(e.event_date) >= 0 && daysUntil(e.event_date) <= 30).slice(0, 3),
      newLeads: leadsRes.count || 0,
      overduePayments: overdueCount,
      pendingTasks: tasksRes.count || 0,
      recentActivity: activity,
    });

    // --- Countdown: find nearest upcoming event ---
    const todayStr = new Date().toISOString().split("T")[0];
    const { data: nearestEvents } = await supabase
      .from("events")
      .select("id, client_name, venue, event_date")
      .gte("event_date", todayStr)
      .order("event_date", { ascending: true })
      .limit(1);

    if (nearestEvents && nearestEvents.length > 0) {
      const evt = nearestEvents[0];
      setCountdownEvent({
        id: evt.id,
        client_name: evt.client_name,
        venue: evt.venue,
        event_date: evt.event_date,
        days_left: daysUntil(evt.event_date),
      });
    }

    // --- Monthly Payment Trend (last 6 months) ---
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString();

    const { data: monthlyLedger } = await supabase
      .from("ledger")
      .select("amount, txn_type, recorded_at")
      .gte("recorded_at", sixMonthsAgoStr)
      .order("recorded_at", { ascending: true });

    if (monthlyLedger && monthlyLedger.length > 0) {
      const monthMap: Record<string, number> = {};
      // Pre-fill last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        monthMap[key] = 0;
      }
      monthlyLedger.forEach((entry) => {
        const d = new Date(entry.recorded_at);
        const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        if (key in monthMap) {
          const amt = entry.txn_type === "REFUND" ? -Number(entry.amount) : Number(entry.amount);
          monthMap[key] += amt;
        }
      });
      setMonthlyPayments(
        Object.entries(monthMap).map(([month, total]) => ({ month, total: Math.max(0, total) }))
      );
    }

    // --- Category Spending (pie chart) ---
    const { data: categoryLedger } = await supabase
      .from("ledger")
      .select("amount, txn_type, vendor:vendors(category)");

    if (categoryLedger && categoryLedger.length > 0) {
      const catMap: Record<string, number> = {};
      categoryLedger.forEach((entry: any) => {
        const cat = entry.vendor?.category || "other";
        const label = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, " ");
        const amt = entry.txn_type === "REFUND" ? -Number(entry.amount) : Number(entry.amount);
        catMap[label] = (catMap[label] || 0) + amt;
      });
      setCategorySpending(
        Object.entries(catMap)
          .filter(([, total]) => total > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([category, total]) => ({ category, total }))
      );
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="px-4 pb-24 pt-4">
        <div className="mb-4">
          <Skeleton className="mb-2 h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="mb-6 h-11 w-full rounded-lg" />
        <div className="mb-6 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="mb-3 h-5 w-40" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="mb-2 h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-navy-900 dark:text-navy-100">Dashboard</h1>
        <p className="text-sm text-navy-500">Your event business at a glance</p>
      </div>

      {/* Global Search */}
      <div className="mb-6">
        <GlobalSearch />
      </div>

      {/* Event Countdown Widget */}
      {countdownEvent && (
        <Link
          href={`/events/${countdownEvent.id}`}
          className="mb-6 block overflow-hidden rounded-xl bg-gradient-to-r from-navy-800 to-navy-700 p-5 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-navy-300">
                Next Event
              </p>
              <h3 className="mt-1 text-lg font-bold text-white">
                {countdownEvent.client_name}
              </h3>
              {countdownEvent.venue && (
                <p className="mt-0.5 text-sm text-navy-300">{countdownEvent.venue}</p>
              )}
              <p className="mt-1 text-sm text-navy-400">
                {formatDate(countdownEvent.event_date)}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 px-5 py-3 backdrop-blur-sm">
              {countdownEvent.days_left === 0 ? (
                <span className="text-2xl font-extrabold text-emerald-400">TODAY!</span>
              ) : (
                <>
                  <span className="text-4xl font-extrabold leading-none text-emerald-400">
                    {countdownEvent.days_left}
                  </span>
                  <span className="mt-1 text-xs font-semibold text-navy-300">
                    {countdownEvent.days_left === 1 ? "day to go" : "days to go"}
                  </span>
                </>
              )}
            </div>
          </div>
        </Link>
      )}

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link href="/events" className="rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <CalendarDays className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-navy-900 dark:text-navy-100">{data.activeEvents}</p>
          <p className="text-xs text-navy-500">Active Events</p>
        </Link>

        <Link href="/vendors" className="rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
            <Users className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-navy-900 dark:text-navy-100">{data.totalVendors}</p>
          <p className="text-xs text-navy-500">Total Vendors</p>
        </Link>

        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(data.totalPaidThisMonth)}</p>
          <p className="text-xs text-navy-500">Paid This Month</p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
            <IndianRupee className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(data.totalOutstanding)}</p>
          <p className="text-xs text-navy-500">Outstanding</p>
        </div>
      </div>

      {/* Alerts */}
      {(data.overduePayments > 0 || data.newLeads > 0 || data.pendingTasks > 0) && (
        <div className="mb-6 space-y-2">
          {data.overduePayments > 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-red-50 p-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-700">
                {data.overduePayments} overdue payment{data.overduePayments > 1 ? "s" : ""}
              </span>
            </div>
          )}
          {data.pendingTasks > 0 && (
            <Link href="/tasks" className="flex items-center gap-3 rounded-xl bg-amber-50 p-3">
              <ListChecks className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">
                {data.pendingTasks} pending task{data.pendingTasks > 1 ? "s" : ""}
              </span>
              <ArrowRight className="ml-auto h-4 w-4 text-amber-600" />
            </Link>
          )}
          {data.newLeads > 0 && (
            <Link href="/leads" className="flex items-center gap-3 rounded-xl bg-blue-50 p-3">
              <Plus className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                {data.newLeads} new lead{data.newLeads > 1 ? "s" : ""} to follow up
              </span>
              <ArrowRight className="ml-auto h-4 w-4 text-blue-600" />
            </Link>
          )}
        </div>
      )}

      {/* Upcoming Events */}
      {data.upcomingEvents.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy-900 dark:text-navy-100">Upcoming Events</h2>
            <Link href="/events" className="text-sm font-medium text-navy-600">View All</Link>
          </div>
          <div className="space-y-2">
            {data.upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900"
              >
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-navy-100 dark:bg-navy-800">
                  <span className="text-xs font-bold text-navy-600">
                    {event.event_date ? new Date(event.event_date).toLocaleDateString("en-IN", { day: "2-digit" }) : "--"}
                  </span>
                  <span className="text-[10px] uppercase text-navy-500">
                    {event.event_date ? new Date(event.event_date).toLocaleDateString("en-IN", { month: "short" }) : ""}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-navy-900 dark:text-navy-100">{event.client_name}</p>
                  <p className="text-xs text-navy-500">{event.venue || event.event_type}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-navy-500">
                    {event.event_date ? `${daysUntil(event.event_date)}d left` : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Payments */}
      {data.upcomingPayments.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-bold text-navy-900 dark:text-navy-100">Upcoming Payments</h2>
          <div className="space-y-2">
            {data.upcomingPayments.map((payment: any) => (
              <div key={payment.id} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  payment.status === "overdue" ? "bg-red-50" : "bg-amber-50"
                }`}>
                  <Clock className={`h-5 w-5 ${payment.status === "overdue" ? "text-red-600" : "text-amber-600"}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy-900 dark:text-navy-100">{payment.vendor_name}</p>
                  <p className="text-xs text-navy-500">{payment.event_name} &middot; {payment.label}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-navy-900 dark:text-navy-100">{formatCurrency(payment.amount)}</p>
                  <p className={`text-xs ${payment.status === "overdue" ? "font-medium text-red-600" : "text-navy-500"}`}>
                    {formatDate(payment.due_date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Payments */}
      {data.recentPayments.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy-900 dark:text-navy-100">Recent Payments</h2>
            <Link href="/reports" className="text-sm font-medium text-navy-600">Reports</Link>
          </div>
          <div className="space-y-2">
            {data.recentPayments.map((payment: any) => (
              <div key={payment.id} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy-900 dark:text-navy-100">{payment.vendor_name}</p>
                  <p className="text-xs text-navy-500">{payment.event_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-navy-500">{formatDate(payment.recorded_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-bold text-navy-900 dark:text-navy-100">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          <Link href="/events/new" className="flex flex-col items-center gap-2 rounded-xl bg-navy-900 p-4 text-white">
            <CalendarDays className="h-5 w-5" />
            <span className="text-xs font-semibold">New Event</span>
          </Link>
          <Link href="/pay" className="flex flex-col items-center gap-2 rounded-xl bg-emerald-600 p-4 text-white">
            <IndianRupee className="h-5 w-5" />
            <span className="text-xs font-semibold">Quick Pay</span>
          </Link>
          <Link href="/vendors/new" className="flex flex-col items-center gap-2 rounded-xl bg-purple-600 p-4 text-white">
            <Users className="h-5 w-5" />
            <span className="text-xs font-semibold">Add Vendor</span>
          </Link>
          <Link href="/leads/new" className="flex flex-col items-center gap-2 rounded-xl bg-blue-600 p-4 text-white">
            <Plus className="h-5 w-5" />
            <span className="text-xs font-semibold">New Lead</span>
          </Link>
          <Link href="/proposals/new" className="flex flex-col items-center gap-2 rounded-xl bg-pink-600 p-4 text-white">
            <FileText className="h-5 w-5" />
            <span className="text-xs font-semibold">Proposal</span>
          </Link>
          <Link href="/invoices/new" className="flex flex-col items-center gap-2 rounded-xl bg-amber-600 p-4 text-white">
            <FileText className="h-5 w-5" />
            <span className="text-xs font-semibold">Invoice</span>
          </Link>
        </div>
      </div>

      {/* Analytics Charts */}
      {(monthlyPayments.length > 0 || categorySpending.length > 0) && (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-navy-600" />
            <h2 className="text-lg font-bold text-navy-900 dark:text-navy-100">Analytics</h2>
          </div>

          {/* Monthly Payment Trend */}
          {monthlyPayments.length > 0 && (
            <div className="mb-4 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
              <h3 className="mb-3 text-sm font-semibold text-navy-700 dark:text-navy-300">
                Monthly Payment Trend
              </h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyPayments} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                      }
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Total"]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Category Spending Pie */}
          {categorySpending.length > 0 && (
            <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
              <h3 className="mb-3 text-sm font-semibold text-navy-700 dark:text-navy-300">
                Spending by Category
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySpending}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
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
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {categorySpending.map((item, index) => (
                  <div key={item.category} className="flex items-center gap-1.5">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    <span className="text-xs text-navy-600 dark:text-navy-400">{item.category}</span>
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
