"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Plus, Search, Loader2, FileText, ArrowRight, Send, Eye, Copy } from "lucide-react";
import { formatCurrency, formatDate, PROPOSAL_STATUSES } from "@/lib/utils";
import Link from "next/link";
import type { Proposal } from "@/lib/types";

export default function ProposalsPage() {
  const supabase = createClient();
  const { addToast } = useToast();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("proposals").select("*").order("created_at", { ascending: false });
    if (data) setProposals(data);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("proposals").update({ status }).eq("id", id);
    load();
  }

  async function duplicateProposal(proposal: Proposal) {
    const { requireUser } = await import("@/lib/auth");
    const user = await requireUser();
    const count = proposals.length + 1;
    const { error } = await supabase.from("proposals").insert({
      agency_id: user.id,
      proposal_number: `PROP-${String(count).padStart(3, "0")}`,
      client_name: proposal.client_name,
      client_phone: proposal.client_phone,
      client_email: proposal.client_email,
      event_type: proposal.event_type,
      event_date: proposal.event_date,
      venue: proposal.venue,
      items: proposal.items,
      subtotal: proposal.subtotal,
      discount_percent: proposal.discount_percent,
      discount_amount: proposal.discount_amount,
      tax_percent: proposal.tax_percent,
      tax_amount: proposal.tax_amount,
      total: proposal.total,
      terms_and_conditions: proposal.terms_and_conditions,
      valid_until: null,
      status: "draft",
      notes: proposal.notes,
    });
    if (!error) {
      addToast({ title: "Proposal duplicated!", variant: "success" });
      load();
    }
  }

  async function convertToEvent(proposal: Proposal) {
    const { requireUser } = await import("@/lib/auth");
    const user = await requireUser();
    const { data, error } = await supabase.from("events").insert({
      agency_id: user.id,
      client_name: proposal.client_name,
      client_phone: proposal.client_phone,
      client_email: proposal.client_email,
      event_type: proposal.event_type || "wedding",
      total_budget: proposal.total,
      event_date: proposal.event_date,
      venue: proposal.venue,
      status: "active",
    }).select("id").single();

    if (error) {
      addToast({ title: "Failed to convert", description: error.message, variant: "destructive" });
    } else if (data) {
      await supabase.from("proposals").update({ status: "accepted", event_id: data.id }).eq("id", proposal.id);
      addToast({ title: "Proposal accepted & event created!", variant: "success" });
      load();
    }
  }

  function shareViaWhatsApp(proposal: Proposal) {
    const items = proposal.items.map((i: any) => `• ${i.description}: ${formatCurrency(i.amount)}`).join("\n");
    const msg = `*Proposal: ${proposal.proposal_number}*\n\nDear ${proposal.client_name},\n\nHere's your quotation:\n\n${items}\n\n*Subtotal:* ${formatCurrency(proposal.subtotal)}${proposal.discount_amount > 0 ? `\n*Discount:* -${formatCurrency(proposal.discount_amount)}` : ""}${proposal.tax_amount > 0 ? `\n*Tax:* ${formatCurrency(proposal.tax_amount)}` : ""}\n*Total: ${formatCurrency(proposal.total)}*${proposal.valid_until ? `\n\nValid until: ${formatDate(proposal.valid_until)}` : ""}${proposal.terms_and_conditions ? `\n\nTerms:\n${proposal.terms_and_conditions}` : ""}`;
    const phone = proposal.client_phone?.replace(/\D/g, "") || "";
    const url = phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    updateStatus(proposal.id, "sent");
  }

  const filtered = proposals.filter((p) => {
    if (search && !p.client_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  const stats = PROPOSAL_STATUSES.map((s) => ({
    ...s,
    count: proposals.filter((p) => p.status === s.value).length,
  }));

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Proposals</h1>
          <p className="text-sm text-navy-500">{proposals.length} quotations</p>
        </div>
        <Link href="/proposals/new">
          <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Proposal</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        <button onClick={() => setFilterStatus("all")}
          className={`flex-shrink-0 rounded-lg px-3 py-2 text-center ${filterStatus === "all" ? "bg-navy-900 text-white" : "bg-white shadow-sm"}`}>
          <p className="text-lg font-bold">{proposals.length}</p>
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
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search proposals..." className="pl-10" />
      </div>

      <div className="space-y-3">
        {filtered.map((proposal) => {
          const statusStyle = PROPOSAL_STATUSES.find((s) => s.value === proposal.status);
          return (
            <div key={proposal.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-navy-400" />
                    <span className="text-xs font-mono text-navy-500">{proposal.proposal_number}</span>
                  </div>
                  <h3 className="mt-1 font-semibold text-navy-900">{proposal.client_name}</h3>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-navy-500">
                    {proposal.event_type && <span className="capitalize">{proposal.event_type}</span>}
                    {proposal.event_date && <span>&middot; {formatDate(proposal.event_date)}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle?.color}`}>
                    {statusStyle?.label}
                  </span>
                  <p className="mt-2 text-lg font-bold text-navy-900">{formatCurrency(proposal.total)}</p>
                </div>
              </div>

              {/* Items preview */}
              {proposal.items.length > 0 && (
                <div className="mt-2 border-t border-navy-100 pt-2">
                  <p className="text-xs text-navy-500">{proposal.items.length} items &middot; {proposal.items.map((i: any) => i.description).slice(0, 3).join(", ")}{proposal.items.length > 3 ? "..." : ""}</p>
                </div>
              )}

              {proposal.valid_until && (
                <p className="mt-1 text-xs text-navy-400">Valid until {formatDate(proposal.valid_until)}</p>
              )}

              <div className="mt-3 flex items-center gap-2">
                <Link href={`/proposals/${proposal.id}`} className="flex items-center gap-1 rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-medium text-navy-700">
                  <Eye className="h-3 w-3" /> View
                </Link>
                <button onClick={() => shareViaWhatsApp(proposal)} className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                  <Send className="h-3 w-3" /> WhatsApp
                </button>
                <button onClick={() => duplicateProposal(proposal)} className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
                  <Copy className="h-3 w-3" /> Duplicate
                </button>
                {(proposal.status === "sent" || proposal.status === "viewed") && !proposal.event_id && (
                  <button onClick={() => convertToEvent(proposal)} className="ml-auto flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">
                    Accept <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-navy-400">No proposals yet. Create your first quotation!</p>
        )}
      </div>
    </div>
  );
}
