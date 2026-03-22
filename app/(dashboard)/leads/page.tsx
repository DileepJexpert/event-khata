"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Plus, Search, Loader2, Phone, Calendar, ArrowRight } from "lucide-react";
import { formatCurrency, formatDate, LEAD_STATUSES, LEAD_SOURCES } from "@/lib/utils";
import Link from "next/link";
import type { Lead } from "@/lib/types";

export default function LeadsPage() {
  const supabase = createClient();
  const { addToast } = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (data) setLeads(data);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("leads").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  async function convertToEvent(lead: Lead) {
    const { getDevUser } = await import("@/lib/dev-user");
    const user = getDevUser();
    const { data, error } = await supabase.from("events").insert({
      agency_id: user.id,
      client_name: lead.client_name,
      client_phone: lead.client_phone,
      client_email: lead.client_email,
      event_type: lead.event_type || "wedding",
      total_budget: lead.estimated_budget,
      event_date: lead.event_date,
      venue: lead.venue,
      status: "active",
    }).select("id").single();

    if (error) {
      addToast({ title: "Failed to convert", description: error.message, variant: "destructive" });
    } else if (data) {
      await supabase.from("leads").update({ status: "won", converted_event_id: data.id }).eq("id", lead.id);
      addToast({ title: "Lead converted to event!", variant: "success" });
      load();
    }
  }

  const filtered = leads.filter((l) => {
    if (search && !l.client_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    return true;
  });

  const stats = LEAD_STATUSES.map((s) => ({
    ...s,
    count: leads.filter((l) => l.status === s.value).length,
  }));

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Leads</h1>
          <p className="text-sm text-navy-500">{leads.length} total inquiries</p>
        </div>
        <Link href="/leads/new">
          <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Lead</Button>
        </Link>
      </div>

      {/* Pipeline stats */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        <button onClick={() => setFilterStatus("all")}
          className={`flex-shrink-0 rounded-lg px-3 py-2 text-center ${filterStatus === "all" ? "bg-navy-900 text-white" : "bg-white shadow-sm"}`}>
          <p className="text-lg font-bold">{leads.length}</p>
          <p className="text-[10px]">All</p>
        </button>
        {stats.map((s) => (
          <button key={s.value} onClick={() => setFilterStatus(filterStatus === s.value ? "all" : s.value)}
            className={`flex-shrink-0 rounded-lg px-3 py-2 text-center ${filterStatus === s.value ? s.color + " ring-2 ring-navy-300" : "bg-white shadow-sm"}`}>
            <p className="text-lg font-bold">{s.count}</p>
            <p className="text-[10px]">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." className="pl-10" />
      </div>

      <div className="space-y-3">
        {filtered.map((lead) => {
          const statusStyle = LEAD_STATUSES.find((s) => s.value === lead.status);
          return (
            <div key={lead.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-navy-900">{lead.client_name}</h3>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-navy-500">
                    {lead.event_type && <span className="capitalize">{lead.event_type}</span>}
                    {lead.event_date && <span>&middot; {formatDate(lead.event_date)}</span>}
                    {lead.venue && <span>&middot; {lead.venue}</span>}
                  </div>
                  {lead.estimated_budget && (
                    <p className="mt-1 text-sm font-semibold text-navy-700">{formatCurrency(lead.estimated_budget)}</p>
                  )}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle?.color}`}>
                  {statusStyle?.label}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {lead.client_phone && (
                  <a href={`tel:${lead.client_phone}`} className="flex items-center gap-1 rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-medium text-navy-700">
                    <Phone className="h-3 w-3" /> Call
                  </a>
                )}
                {lead.follow_up_date && (
                  <span className="flex items-center gap-1 text-xs text-navy-500">
                    <Calendar className="h-3 w-3" /> Follow up: {formatDate(lead.follow_up_date)}
                  </span>
                )}
                <div className="ml-auto flex gap-1">
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    className="rounded-lg border border-navy-200 px-2 py-1 text-xs"
                  >
                    {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  {lead.status !== "won" && lead.status !== "lost" && (
                    <button onClick={() => convertToEvent(lead)} className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      Convert <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                  {lead.converted_event_id && (
                    <Link href={`/events/${lead.converted_event_id}`} className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      View Event <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-navy-400">No leads yet. Add your first inquiry!</p>
        )}
      </div>
    </div>
  );
}
