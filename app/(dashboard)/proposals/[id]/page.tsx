"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Loader2, Send, FileText, Check, X, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, formatDate, PROPOSAL_STATUSES, VENDOR_CATEGORIES } from "@/lib/utils";
import Link from "next/link";
import type { Proposal } from "@/lib/types";

export default function ProposalDetailPage() {
  const supabase = createClient();
  const params = useParams();
  const { addToast } = useToast();
  const proposalId = params.id as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [proposalId]);

  async function load() {
    const { data } = await supabase.from("proposals").select("*").eq("id", proposalId).single();
    if (data) setProposal(data);
    setLoading(false);
  }

  async function updateStatus(status: string) {
    await supabase.from("proposals").update({ status }).eq("id", proposalId);
    addToast({ title: `Marked as ${status}`, variant: "success" });
    load();
  }

  function shareViaWhatsApp() {
    if (!proposal) return;
    const items = proposal.items.map((i: any) => `• ${i.description}: ${formatCurrency(i.amount)}`).join("\n");
    const msg = `*Proposal: ${proposal.proposal_number}*\n\nDear ${proposal.client_name},\n\nThank you for your interest! Here's our detailed quotation:\n\n${items}\n\n*Subtotal:* ${formatCurrency(proposal.subtotal)}${proposal.discount_amount > 0 ? `\n*Discount (${proposal.discount_percent}%):* -${formatCurrency(proposal.discount_amount)}` : ""}${proposal.tax_amount > 0 ? `\n*Tax (${proposal.tax_percent}%):* +${formatCurrency(proposal.tax_amount)}` : ""}\n\n*Grand Total: ${formatCurrency(proposal.total)}*${proposal.valid_until ? `\n\n_Valid until: ${formatDate(proposal.valid_until)}_` : ""}${proposal.terms_and_conditions ? `\n\n*Terms & Conditions:*\n${proposal.terms_and_conditions}` : ""}\n\nPlease let us know if you'd like to proceed!`;
    const phone = proposal.client_phone?.replace(/\D/g, "") || "";
    const url = phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    updateStatus("sent");
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;
  if (!proposal) return <div className="px-4 pt-4 text-center"><p>Proposal not found.</p></div>;

  const statusStyle = PROPOSAL_STATUSES.find((s) => s.value === proposal.status);

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link href="/proposals" className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-navy-400" />
            <span className="font-mono text-sm text-navy-500">{proposal.proposal_number}</span>
          </div>
          <h1 className="text-xl font-bold text-navy-900">{proposal.client_name}</h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle?.color}`}>
          {statusStyle?.label}
        </span>
      </div>

      {/* Event Info */}
      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-navy-500">Event Type</span>
            <p className="font-medium capitalize">{proposal.event_type}</p>
          </div>
          {proposal.event_date && (
            <div>
              <span className="text-navy-500">Date</span>
              <p className="font-medium">{formatDate(proposal.event_date)}</p>
            </div>
          )}
          {proposal.venue && (
            <div className="col-span-2">
              <span className="text-navy-500">Venue</span>
              <p className="font-medium">{proposal.venue}</p>
            </div>
          )}
          {proposal.client_phone && (
            <div>
              <span className="text-navy-500">Phone</span>
              <p className="font-medium">{proposal.client_phone}</p>
            </div>
          )}
          {proposal.client_email && (
            <div>
              <span className="text-navy-500">Email</span>
              <p className="font-medium">{proposal.client_email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-navy-900">Quotation Items</h2>
        <div className="space-y-2">
          {proposal.items.map((item: any, i: number) => {
            const cat = VENDOR_CATEGORIES.find((c) => c.value === item.category);
            return (
              <div key={i} className="flex items-center justify-between rounded-lg bg-navy-50 p-3">
                <div>
                  <p className="text-sm font-medium text-navy-900">{item.description}</p>
                  {cat && <span className="text-xs text-navy-500">{cat.label}</span>}
                </div>
                <span className="text-sm font-bold text-navy-900">{formatCurrency(item.amount)}</span>
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="mt-4 space-y-2 border-t border-navy-100 pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-navy-500">Subtotal</span>
            <span className="font-semibold">{formatCurrency(proposal.subtotal)}</span>
          </div>
          {proposal.discount_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-navy-500">Discount ({proposal.discount_percent}%)</span>
              <span className="text-red-500">-{formatCurrency(proposal.discount_amount)}</span>
            </div>
          )}
          {proposal.tax_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-navy-500">Tax ({proposal.tax_percent}%)</span>
              <span className="text-navy-600">+{formatCurrency(proposal.tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-navy-200 pt-2 text-lg">
            <span className="font-bold text-navy-900">Grand Total</span>
            <span className="font-bold text-emerald-600">{formatCurrency(proposal.total)}</span>
          </div>
        </div>
      </div>

      {/* Terms */}
      {proposal.terms_and_conditions && (
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-navy-900">Terms & Conditions</h2>
          <p className="whitespace-pre-wrap text-sm text-navy-600">{proposal.terms_and_conditions}</p>
        </div>
      )}

      {proposal.valid_until && (
        <p className="mb-4 text-center text-sm text-navy-500">Valid until <span className="font-semibold">{formatDate(proposal.valid_until)}</span></p>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <Button onClick={shareViaWhatsApp} className="w-full bg-emerald-500 hover:bg-emerald-600">
          <Send className="mr-2 h-4 w-4" /> Send via WhatsApp
        </Button>
        <div className="flex gap-2">
          {proposal.status !== "accepted" && (
            <Button onClick={() => updateStatus("accepted")} variant="outline" className="flex-1 text-emerald-600">
              <Check className="mr-1 h-4 w-4" /> Accept
            </Button>
          )}
          {proposal.status !== "rejected" && (
            <Button onClick={() => updateStatus("rejected")} variant="outline" className="flex-1 text-red-600">
              <X className="mr-1 h-4 w-4" /> Reject
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
