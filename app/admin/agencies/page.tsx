"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, Loader2, ChevronDown, ChevronUp,
  CalendarDays, Users, IndianRupee,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type AgencyRow = {
  id: string;
  name: string;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  subscription_status: string;
  city: string | null;
  state: string | null;
  created_at: string;
  last_active_at: string | null;
  eventCount: number;
  vendorCount: number;
  totalVolume: number;
};

export default function AgenciesPage() {
  const supabase = createClient();
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"created_at" | "eventCount" | "totalVolume">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<any>(null);

  useEffect(() => {
    loadAgencies();
  }, []);

  async function loadAgencies() {
    const [agRes, evRes, venRes, ledRes] = await Promise.all([
      supabase.from("agencies").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("id, agency_id"),
      supabase.from("vendors").select("id, agency_id"),
      supabase.from("ledger").select("agency_id, amount, txn_type"),
    ]);

    const events = evRes.data || [];
    const vendors = venRes.data || [];
    const ledger = ledRes.data || [];

    const eventsByAgency = new Map<string, number>();
    events.forEach((e) => eventsByAgency.set(e.agency_id, (eventsByAgency.get(e.agency_id) || 0) + 1));

    const vendorsByAgency = new Map<string, number>();
    vendors.forEach((v) => vendorsByAgency.set(v.agency_id, (vendorsByAgency.get(v.agency_id) || 0) + 1));

    const volumeByAgency = new Map<string, number>();
    ledger.forEach((l) => {
      const prev = volumeByAgency.get(l.agency_id) || 0;
      const amt = l.txn_type === "REFUND" ? -Number(l.amount) : Number(l.amount);
      volumeByAgency.set(l.agency_id, prev + amt);
    });

    const rows: AgencyRow[] = (agRes.data || []).map((a) => ({
      ...a,
      eventCount: eventsByAgency.get(a.id) || 0,
      vendorCount: vendorsByAgency.get(a.id) || 0,
      totalVolume: volumeByAgency.get(a.id) || 0,
    }));

    setAgencies(rows);
    setLoading(false);
  }

  async function loadAgencyDetail(agencyId: string) {
    if (expandedId === agencyId) {
      setExpandedId(null);
      setExpandedData(null);
      return;
    }

    const [evRes, venRes, ledRes] = await Promise.all([
      supabase.from("events").select("id, client_name, event_type, status, event_date, total_budget").eq("agency_id", agencyId).order("created_at", { ascending: false }).limit(10),
      supabase.from("vendors").select("id, name, category").eq("agency_id", agencyId).limit(10),
      supabase.from("ledger").select("id, amount, txn_type, payment_mode, recorded_at").eq("agency_id", agencyId).order("recorded_at", { ascending: false }).limit(10),
    ]);

    setExpandedId(agencyId);
    setExpandedData({
      events: evRes.data || [],
      vendors: venRes.data || [],
      recentPayments: ledRes.data || [],
    });
  }

  function handleSort(col: typeof sortBy) {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  }

  const filtered = agencies
    .filter((a) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        (a.owner_name || "").toLowerCase().includes(q) ||
        (a.owner_phone || "").includes(q) ||
        (a.owner_email || "").toLowerCase().includes(q) ||
        (a.city || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortBy === "created_at") return mul * a.created_at.localeCompare(b.created_at);
      if (sortBy === "eventCount") return mul * (a.eventCount - b.eventCount);
      return mul * (a.totalVolume - b.totalVolume);
    });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">All Agencies ({agencies.length})</h1>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name, owner, phone, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant={sortBy === "created_at" ? "default" : "outline"} onClick={() => handleSort("created_at")}>
            Joined {sortBy === "created_at" && (sortDir === "desc" ? <ChevronDown className="ml-1 h-3 w-3" /> : <ChevronUp className="ml-1 h-3 w-3" />)}
          </Button>
          <Button size="sm" variant={sortBy === "eventCount" ? "default" : "outline"} onClick={() => handleSort("eventCount")}>
            Events {sortBy === "eventCount" && (sortDir === "desc" ? <ChevronDown className="ml-1 h-3 w-3" /> : <ChevronUp className="ml-1 h-3 w-3" />)}
          </Button>
          <Button size="sm" variant={sortBy === "totalVolume" ? "default" : "outline"} onClick={() => handleSort("totalVolume")}>
            Volume {sortBy === "totalVolume" && (sortDir === "desc" ? <ChevronDown className="ml-1 h-3 w-3" /> : <ChevronUp className="ml-1 h-3 w-3" />)}
          </Button>
        </div>
      </div>

      {/* Agency List */}
      <div className="space-y-2">
        {filtered.map((a) => (
          <div key={a.id}>
            <button
              onClick={() => loadAgencyDetail(a.id)}
              className="w-full rounded-xl bg-white p-4 shadow-sm text-left transition-colors hover:bg-slate-50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{a.name}</h3>
                  <p className="text-sm text-slate-500">
                    {a.owner_name || "No owner"} &middot; {a.owner_email || a.owner_phone || "—"}
                  </p>
                  {(a.city || a.state) && (
                    <p className="text-xs text-slate-400">{[a.city, a.state].filter(Boolean).join(", ")}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    a.subscription_status === "pro" ? "bg-emerald-100 text-emerald-700" :
                    a.subscription_status === "enterprise" ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {a.subscription_status || "free"}
                  </span>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(a.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-4">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" /> {a.eventCount} events
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Users className="h-3.5 w-3.5" /> {a.vendorCount} vendors
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <IndianRupee className="h-3.5 w-3.5" /> {formatCurrency(a.totalVolume)}
                </div>
              </div>
            </button>

            {/* Expanded Detail */}
            {expandedId === a.id && expandedData && (
              <div className="ml-4 mt-1 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
                {/* Recent Events */}
                <div>
                  <h4 className="mb-2 text-sm font-bold text-slate-700">Recent Events</h4>
                  {expandedData.events.length === 0 ? (
                    <p className="text-xs text-slate-400">No events</p>
                  ) : (
                    <div className="space-y-1">
                      {expandedData.events.map((ev: any) => (
                        <div key={ev.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700">{ev.client_name}</span>
                          <div className="flex gap-2">
                            <span className="capitalize text-slate-500">{ev.event_type}</span>
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                              ev.status === "active" ? "bg-green-100 text-green-700" :
                              ev.status === "completed" ? "bg-blue-100 text-blue-700" :
                              "bg-red-100 text-red-700"
                            }`}>{ev.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vendors */}
                <div>
                  <h4 className="mb-2 text-sm font-bold text-slate-700">Vendors ({expandedData.vendors.length})</h4>
                  {expandedData.vendors.length === 0 ? (
                    <p className="text-xs text-slate-400">No vendors</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {expandedData.vendors.map((v: any) => (
                        <span key={v.id} className="rounded bg-white px-2 py-0.5 text-xs text-slate-600 border">
                          {v.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Payments */}
                <div>
                  <h4 className="mb-2 text-sm font-bold text-slate-700">Recent Payments</h4>
                  {expandedData.recentPayments.length === 0 ? (
                    <p className="text-xs text-slate-400">No payments</p>
                  ) : (
                    <div className="space-y-1">
                      {expandedData.recentPayments.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">{new Date(p.recorded_at).toLocaleDateString("en-IN")}</span>
                          <div className="flex gap-2">
                            <span className="text-slate-500">{p.payment_mode}</span>
                            <span className={`font-semibold ${p.txn_type === "REFUND" ? "text-red-600" : "text-emerald-600"}`}>
                              {p.txn_type === "REFUND" ? "-" : "+"}{formatCurrency(Number(p.amount))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-slate-400">
          No agencies found matching your search.
        </div>
      )}
    </div>
  );
}
