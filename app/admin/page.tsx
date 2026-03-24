"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users, CalendarDays, IndianRupee, TrendingUp,
  Building2, Loader2, MapPin, Clock,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Stats = {
  totalAgencies: number;
  totalEvents: number;
  totalVendors: number;
  totalPayments: number;
  totalVolume: number;
  activeAgencies: number;
  newAgenciesToday: number;
  newAgenciesWeek: number;
  newAgenciesMonth: number;
  subscriptionBreakdown: { free: number; pro: number; enterprise: number };
  topCities: { city: string; count: number }[];
  topStates: { state: string; count: number }[];
  recentAgencies: any[];
  eventTypeBreakdown: { type: string; count: number }[];
  monthlySignups: { month: string; count: number }[];
};

export default function AdminDashboard() {
  const supabase = createClient();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const [
      agenciesRes,
      eventsRes,
      vendorsRes,
      ledgerRes,
    ] = await Promise.all([
      supabase.from("agencies").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("id, agency_id, event_type, status, created_at"),
      supabase.from("vendors").select("id, agency_id"),
      supabase.from("ledger").select("id, amount, txn_type, recorded_at"),
    ]);

    const agencies = agenciesRes.data || [];
    const events = eventsRes.data || [];
    const vendors = vendorsRes.data || [];
    const ledger = ledgerRes.data || [];

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Subscription breakdown
    const subscriptionBreakdown = { free: 0, pro: 0, enterprise: 0 };
    agencies.forEach((a) => {
      const status = (a.subscription_status || "free") as keyof typeof subscriptionBreakdown;
      if (status in subscriptionBreakdown) subscriptionBreakdown[status]++;
    });

    // City/state breakdown
    const cityMap = new Map<string, number>();
    const stateMap = new Map<string, number>();
    agencies.forEach((a) => {
      if (a.city) cityMap.set(a.city, (cityMap.get(a.city) || 0) + 1);
      if (a.state) stateMap.set(a.state, (stateMap.get(a.state) || 0) + 1);
    });
    const topCities = Array.from(cityMap.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const topStates = Array.from(stateMap.entries())
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Event type breakdown
    const eventTypeMap = new Map<string, number>();
    events.forEach((e) => {
      const t = e.event_type || "other";
      eventTypeMap.set(t, (eventTypeMap.get(t) || 0) + 1);
    });
    const eventTypeBreakdown = Array.from(eventTypeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Active agencies (have events)
    const agencyWithEvents = new Set(events.map((e) => e.agency_id));

    // Total payment volume
    const totalVolume = ledger.reduce((sum, l) => {
      return l.txn_type === "REFUND" ? sum - Number(l.amount) : sum + Number(l.amount);
    }, 0);

    // Monthly signups (last 6 months)
    const monthlySignups: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
      const count = agencies.filter((a) => a.created_at >= start && a.created_at < end).length;
      monthlySignups.push({ month: monthStr, count });
    }

    setStats({
      totalAgencies: agencies.length,
      totalEvents: events.length,
      totalVendors: vendors.length,
      totalPayments: ledger.length,
      totalVolume,
      activeAgencies: agencyWithEvents.size,
      newAgenciesToday: agencies.filter((a) => a.created_at?.startsWith(todayStr)).length,
      newAgenciesWeek: agencies.filter((a) => a.created_at >= weekAgo).length,
      newAgenciesMonth: agencies.filter((a) => a.created_at >= monthAgo).length,
      subscriptionBreakdown,
      topCities,
      topStates,
      recentAgencies: agencies.slice(0, 10),
      eventTypeBreakdown,
      monthlySignups,
    });

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!stats) return null;

  const maxSignup = Math.max(...stats.monthlySignups.map((m) => m.count), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard icon={Building2} label="Total Agencies" value={stats.totalAgencies} color="bg-blue-100 text-blue-600" />
        <MetricCard icon={CalendarDays} label="Total Events" value={stats.totalEvents} color="bg-purple-100 text-purple-600" />
        <MetricCard icon={Users} label="Total Vendors" value={stats.totalVendors} color="bg-emerald-100 text-emerald-600" />
        <MetricCard icon={IndianRupee} label="Payment Volume" value={formatCurrency(stats.totalVolume)} color="bg-amber-100 text-amber-600" />
      </div>

      {/* Growth Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" /> New Today
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.newAgenciesToday}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <TrendingUp className="h-4 w-4" /> This Week
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.newAgenciesWeek}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <TrendingUp className="h-4 w-4" /> This Month
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.newAgenciesMonth}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Signups Chart */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">Monthly Signups</h2>
          <div className="flex items-end gap-2" style={{ height: 120 }}>
            {stats.monthlySignups.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold text-slate-700">{m.count}</span>
                <div
                  className="w-full rounded-t bg-blue-500"
                  style={{ height: `${(m.count / maxSignup) * 80}px`, minHeight: m.count > 0 ? 4 : 0 }}
                />
                <span className="text-[10px] text-slate-500">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Breakdown */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">Subscription Plans</h2>
          <div className="space-y-3">
            {[
              { label: "Free", count: stats.subscriptionBreakdown.free, color: "bg-slate-400" },
              { label: "Pro", count: stats.subscriptionBreakdown.pro, color: "bg-emerald-500" },
              { label: "Enterprise", count: stats.subscriptionBreakdown.enterprise, color: "bg-amber-500" },
            ].map((plan) => (
              <div key={plan.label} className="flex items-center gap-3">
                <span className="w-20 text-sm font-medium text-slate-600">{plan.label}</span>
                <div className="flex-1">
                  <div className="h-6 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${plan.color}`}
                      style={{ width: `${stats.totalAgencies ? (plan.count / stats.totalAgencies) * 100 : 0}%`, minWidth: plan.count > 0 ? 20 : 0 }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-700">{plan.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Event Type Breakdown */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">Event Types</h2>
          {stats.eventTypeBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400">No events yet</p>
          ) : (
            <div className="space-y-2">
              {stats.eventTypeBreakdown.map((et) => (
                <div key={et.type} className="flex items-center justify-between">
                  <span className="text-sm capitalize text-slate-600">{et.type}</span>
                  <span className="text-sm font-bold text-slate-900">{et.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Locations */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">
            <MapPin className="mr-1 inline h-4 w-4" /> Top Locations
          </h2>
          {stats.topCities.length === 0 && stats.topStates.length === 0 ? (
            <p className="text-sm text-slate-400">No location data yet. Agencies can set city/state in settings.</p>
          ) : (
            <div className="space-y-2">
              {stats.topCities.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase text-slate-400">Cities</p>
                  {stats.topCities.map((c) => (
                    <div key={c.city} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{c.city}</span>
                      <span className="text-sm font-bold text-slate-900">{c.count}</span>
                    </div>
                  ))}
                </>
              )}
              {stats.topStates.length > 0 && (
                <>
                  <p className="mt-3 text-xs font-semibold uppercase text-slate-400">States</p>
                  {stats.topStates.map((s) => (
                    <div key={s.state} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{s.state}</span>
                      <span className="text-sm font-bold text-slate-900">{s.count}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Agencies */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-900">Recent Agencies</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
                <th className="pb-2 pr-4">Agency</th>
                <th className="pb-2 pr-4">Owner</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Plan</th>
                <th className="pb-2 pr-4">City</th>
                <th className="pb-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentAgencies.map((a) => (
                <tr key={a.id} className="border-b border-slate-50">
                  <td className="py-3 pr-4 font-medium text-slate-900">{a.name}</td>
                  <td className="py-3 pr-4 text-slate-600">{a.owner_name || "—"}</td>
                  <td className="py-3 pr-4 text-slate-600">{a.owner_email || a.owner_phone || "—"}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      a.subscription_status === "pro" ? "bg-emerald-100 text-emerald-700" :
                      a.subscription_status === "enterprise" ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {a.subscription_status || "free"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{a.city || "—"}</td>
                  <td className="py-3 text-slate-500">
                    {new Date(a.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Platform Activity */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-slate-900">{stats.activeAgencies}</p>
          <p className="text-xs text-slate-500">Active Agencies</p>
          <p className="text-xs text-slate-400">(with events)</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-slate-900">{stats.totalPayments}</p>
          <p className="text-xs text-slate-500">Total Payments</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-slate-900">
            {stats.totalAgencies ? (stats.totalEvents / stats.totalAgencies).toFixed(1) : 0}
          </p>
          <p className="text-xs text-slate-500">Avg Events/Agency</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-slate-900">
            {stats.totalAgencies ? (stats.totalVendors / stats.totalAgencies).toFixed(1) : 0}
          </p>
          <p className="text-xs text-slate-500">Avg Vendors/Agency</p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className={`mb-2 inline-flex rounded-lg p-2 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
