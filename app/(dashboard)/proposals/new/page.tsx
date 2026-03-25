"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { formatCurrency, VENDOR_CATEGORIES, EVENT_TYPES } from "@/lib/utils";
import Link from "next/link";

type LineItem = { description: string; category: string; amount: number };

export default function NewProposalPage() {
  const supabase = createClient();
  const router = useRouter();
  const { addToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [eventType, setEventType] = useState("wedding");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [terms, setTerms] = useState("1. 50% advance required to confirm booking.\n2. Balance payment due 3 days before event.\n3. Prices valid for the mentioned date only.\n4. Changes in guest count may affect pricing.");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", category: "other", amount: 0 },
  ]);

  function addItem() {
    setItems([...items, { description: "", category: "other", amount: 0 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  }

  const subtotal = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (taxPercent / 100);
  const total = afterDiscount + taxAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) return addToast({ title: "Client name required", variant: "destructive" });
    if (items.length === 0 || items.every((i) => !i.description)) return addToast({ title: "Add at least one item", variant: "destructive" });

    setSaving(true);
    const { requireUser } = await import("@/lib/auth");
    const user = await requireUser();

    // Get proposal count for numbering
    const { count } = await supabase.from("proposals").select("*", { count: "exact", head: true }).eq("agency_id", user.id);
    const num = (count || 0) + 1;

    const { error } = await supabase.from("proposals").insert({
      agency_id: user.id,
      proposal_number: `PROP-${String(num).padStart(3, "0")}`,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim() || null,
      client_email: clientEmail.trim() || null,
      event_type: eventType,
      event_date: eventDate || null,
      venue: venue.trim() || null,
      items: items.filter((i) => i.description.trim()),
      subtotal,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      tax_percent: taxPercent,
      tax_amount: taxAmount,
      total,
      terms_and_conditions: terms.trim() || null,
      valid_until: validUntil || null,
      notes: notes.trim() || null,
      status: "draft",
    });

    if (error) {
      addToast({ title: "Failed to create proposal", description: error.message, variant: "destructive" });
    } else {
      addToast({ title: "Proposal created!", variant: "success" });
      router.push("/proposals");
    }
    setSaving(false);
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/proposals" className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">New Proposal</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Info */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-navy-900">Client Details</h2>
          <div className="space-y-3">
            <div>
              <Label>Client Name *</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Sharma Family" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="9876543210" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@email.com" />
              </div>
            </div>
          </div>
        </div>

        {/* Event Info */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-navy-900">Event Details</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Event Type</Label>
                <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm">
                  {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Event Date</Label>
                <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Venue</Label>
              <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Grand Palace, Mumbai" />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-navy-900">Quotation Items</h2>
            <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs font-semibold text-navy-600">
              <Plus className="h-3 w-3" /> Add Item
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="rounded-lg border border-navy-100 p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Decoration - Stage setup" />
                    <div className="grid grid-cols-2 gap-2">
                      <select value={item.category} onChange={(e) => updateItem(i, "category", e.target.value)} className="rounded-lg border border-navy-200 px-2 py-1.5 text-xs">
                        {VENDOR_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      <Input type="number" value={item.amount || ""} onChange={(e) => updateItem(i, "amount", Number(e.target.value))} placeholder="Amount" />
                    </div>
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="mt-1 p-1 text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 space-y-2 border-t border-navy-100 pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-navy-500">Subtotal</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-navy-500">Discount</span>
                <Input type="number" value={discountPercent || ""} onChange={(e) => setDiscountPercent(Number(e.target.value))} className="w-16 text-xs" placeholder="%" />
                <span className="text-xs text-navy-400">%</span>
              </div>
              {discountAmount > 0 && <span className="text-sm text-red-500">-{formatCurrency(discountAmount)}</span>}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-navy-500">Tax</span>
                <Input type="number" value={taxPercent || ""} onChange={(e) => setTaxPercent(Number(e.target.value))} className="w-16 text-xs" placeholder="%" />
                <span className="text-xs text-navy-400">%</span>
              </div>
              {taxAmount > 0 && <span className="text-sm text-navy-600">+{formatCurrency(taxAmount)}</span>}
            </div>
            <div className="flex justify-between border-t border-navy-200 pt-2 text-base">
              <span className="font-bold text-navy-900">Total</span>
              <span className="font-bold text-emerald-600">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Terms & Validity */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-navy-900">Terms & Validity</h2>
          <div className="space-y-3">
            <div>
              <Label>Valid Until</Label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
            <div>
              <Label>Terms & Conditions</Label>
              <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={4} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <Label>Internal Notes</Label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm" placeholder="Notes (not visible to client)" />
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create Proposal
        </Button>
      </form>
    </div>
  );
}
