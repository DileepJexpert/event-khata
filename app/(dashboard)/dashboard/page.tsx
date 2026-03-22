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
} from "lucide-react";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import type { Event, LedgerEntry, PaymentSchedule, Lead } from "@/lib/types";

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
  });

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
    ] = await Promise.all([
      supabase.from("events").select("*").eq("status", "active"),
      supabase.from("vendors").select("id", { count: "exact" }),
      supabase.from("ledger").select("*, vendor:vendors(name), event:events(client_name)").order("recorded_at", { ascending: false }).limit(5),
      supabase.from("ledger").select("amount, txn_type").gte("recorded_at", monthStart),
      supabase.from("payment_schedules").select("*, vendor:vendors(name), event:events(client_name)").in("status", ["upcoming", "due", "overdue"]).order("due_date", { ascending: true }).limit(5),
      supabase.from("leads").select("id", { count: "exact" }).eq("status", "new"),
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
    });
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-200 border-t-navy-900" />
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Dashboard</h1>
        <p className="text-sm text-navy-500">Your event business at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link href="/events" className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <CalendarDays className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-navy-900">{data.activeEvents}</p>
          <p className="text-xs text-navy-500">Active Events</p>
        </Link>

        <Link href="/vendors" className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
            <Users className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-navy-900">{data.totalVendors}</p>
          <p className="text-xs text-navy-500">Total Vendors</p>
        </Link>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(data.totalPaidThisMonth)}</p>
          <p className="text-xs text-navy-500">Paid This Month</p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
            <IndianRupee className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(data.totalOutstanding)}</p>
          <p className="text-xs text-navy-500">Outstanding</p>
        </div>
      </div>

      {/* Alerts */}
      {(data.overduePayments > 0 || data.newLeads > 0) && (
        <div className="mb-6 space-y-2">
          {data.overduePayments > 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-red-50 p-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-700">
                {data.overduePayments} overdue payment{data.overduePayments > 1 ? "s" : ""}
              </span>
            </div>
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
            <h2 className="text-lg font-bold text-navy-900">Upcoming Events</h2>
            <Link href="/events" className="text-sm font-medium text-navy-600">View All</Link>
          </div>
          <div className="space-y-2">
            {data.upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
              >
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-navy-100">
                  <span className="text-xs font-bold text-navy-600">
                    {event.event_date ? new Date(event.event_date).toLocaleDateString("en-IN", { day: "2-digit" }) : "--"}
                  </span>
                  <span className="text-[10px] uppercase text-navy-500">
                    {event.event_date ? new Date(event.event_date).toLocaleDateString("en-IN", { month: "short" }) : ""}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-navy-900">{event.client_name}</p>
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
          <h2 className="mb-3 text-lg font-bold text-navy-900">Upcoming Payments</h2>
          <div className="space-y-2">
            {data.upcomingPayments.map((payment: any) => (
              <div key={payment.id} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  payment.status === "overdue" ? "bg-red-50" : "bg-amber-50"
                }`}>
                  <Clock className={`h-5 w-5 ${payment.status === "overdue" ? "text-red-600" : "text-amber-600"}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy-900">{payment.vendor_name}</p>
                  <p className="text-xs text-navy-500">{payment.event_name} &middot; {payment.label}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-navy-900">{formatCurrency(payment.amount)}</p>
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
            <h2 className="text-lg font-bold text-navy-900">Recent Payments</h2>
            <Link href="/reports" className="text-sm font-medium text-navy-600">Reports</Link>
          </div>
          <div className="space-y-2">
            {data.recentPayments.map((payment: any) => (
              <div key={payment.id} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy-900">{payment.vendor_name}</p>
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
        <h2 className="mb-3 text-lg font-bold text-navy-900">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/events/new" className="flex items-center gap-2 rounded-xl bg-navy-900 p-4 text-white">
            <CalendarDays className="h-5 w-5" />
            <span className="text-sm font-semibold">New Event</span>
          </Link>
          <Link href="/pay" className="flex items-center gap-2 rounded-xl bg-emerald-600 p-4 text-white">
            <IndianRupee className="h-5 w-5" />
            <span className="text-sm font-semibold">Quick Pay</span>
          </Link>
          <Link href="/vendors/new" className="flex items-center gap-2 rounded-xl bg-purple-600 p-4 text-white">
            <Users className="h-5 w-5" />
            <span className="text-sm font-semibold">Add Vendor</span>
          </Link>
          <Link href="/leads/new" className="flex items-center gap-2 rounded-xl bg-blue-600 p-4 text-white">
            <Plus className="h-5 w-5" />
            <span className="text-sm font-semibold">New Lead</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
