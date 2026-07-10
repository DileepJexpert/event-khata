"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/currency-input";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { formatCurrency, isValidPhone, isValidEmail } from "@/lib/utils";
import Link from "next/link";
import type { Event, GstType, InvoiceItem } from "@/lib/types";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function NewInvoicePage() {
  const supabase = createClient();
  const router = useRouter();
  const { addToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString(36).toUpperCase()}`);
  const [dueDate, setDueDate] = useState("");
  const [taxPercent, setTaxPercent] = useState("18");
  const [notes, setNotes] = useState("");
  const [clientGstin, setClientGstin] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [gstType, setGstType] = useState<GstType>("none");
  const [hsnSac, setHsnSac] = useState("998596");
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", category: "", amount: 0 }]);

  useEffect(() => {
    supabase.from("events").select("*").eq("status", "active").then(({ data }) => {
      if (data) setEvents(data);
    });
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      const event = events.find((e) => e.id === selectedEvent);
      if (event) {
        setClientName(event.client_name);
        setClientPhone(event.client_phone || "");
        setClientEmail(event.client_email || "");
        // Load contracts as line items
        supabase.from("contracts").select("*, vendor:vendors(name, category)").eq("event_id", event.id).then(({ data }) => {
          if (data && data.length > 0) {
            setItems(data.map((c: any) => ({
              description: c.vendor?.name || "Vendor",
              category: c.vendor?.category || "",
              amount: c.agreed_amount,
            })));
          }
        });
      }
    }
  }, [selectedEvent]);

  function addItem() {
    setItems([...items, { description: "", category: "", amount: 0 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof InvoiceItem, value: string | number) {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  }

  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const taxAmount = gstType === "none" ? 0 : subtotal * (Number(taxPercent) / 100);
  const total = subtotal + taxAmount;
  const cgstAmount = gstType === "cgst_sgst" ? taxAmount / 2 : 0;
  const sgstAmount = gstType === "cgst_sgst" ? taxAmount / 2 : 0;
  const igstAmount = gstType === "igst" ? taxAmount : 0;
  const halfRate = Number(taxPercent) / 2;

  async function handleSave() {
    const newErrors: Record<string, string> = {};
    if (!clientName.trim()) newErrors.clientName = "Client name is required";
    if (clientPhone && !isValidPhone(clientPhone)) newErrors.clientPhone = "Enter a valid 10-digit phone number";
    if (clientEmail && !isValidEmail(clientEmail)) newErrors.clientEmail = "Enter a valid email address";
    if (items.every((item) => !item.description.trim() && !item.amount)) newErrors.items = "Add at least one item";
    if (clientGstin && !GSTIN_REGEX.test(clientGstin.trim().toUpperCase())) newErrors.clientGstin = "Enter a valid 15-character GSTIN";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    const { requireUser } = await import("@/lib/auth");
    const user = await requireUser();
    const { error } = await supabase.from("invoices").insert({
      agency_id: user.id,
      event_id: selectedEvent || null,
      invoice_number: invoiceNumber,
      client_name: clientName.trim(),
      client_phone: clientPhone || null,
      client_email: clientEmail || null,
      items,
      subtotal,
      tax_percent: gstType === "none" ? 0 : Number(taxPercent),
      tax_amount: taxAmount,
      total,
      client_gstin: clientGstin ? clientGstin.trim().toUpperCase() : null,
      place_of_supply: placeOfSupply.trim() || null,
      gst_type: gstType,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      hsn_sac: hsnSac.trim() || "998596",
      due_date: dueDate || null,
      notes: notes || null,
      status: "draft",
    });
    if (error) {
      addToast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      addToast({ title: "Invoice created!", variant: "success" });
      router.push("/invoices");
    }
    setSaving(false);
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/invoices" className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 dark:bg-navy-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">New Invoice</h1>
      </div>

      <div className="space-y-4">
        {/* Select Event */}
        <div className="space-y-2">
          <Label>Link to Event (optional)</Label>
          <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full rounded-lg border border-navy-200 p-3 text-sm dark:border-navy-700 dark:bg-navy-800 dark:text-navy-100">
            <option value="">Select event...</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.client_name}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Invoice Number</Label>
          <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Client Name *</Label>
          <Input
            value={clientName}
            onChange={(e) => { setClientName(e.target.value); setErrors({ ...errors, clientName: "" }); }}
            className={errors.clientName ? "border-red-500" : ""}
          />
          {errors.clientName && <p className="text-xs text-red-500">{errors.clientName}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={clientPhone}
              onChange={(e) => { setClientPhone(e.target.value); setErrors({ ...errors, clientPhone: "" }); }}
              type="tel"
              className={errors.clientPhone ? "border-red-500" : ""}
            />
            {errors.clientPhone && <p className="text-xs text-red-500">{errors.clientPhone}</p>}
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={clientEmail}
              onChange={(e) => { setClientEmail(e.target.value); setErrors({ ...errors, clientEmail: "" }); }}
              type="email"
              className={errors.clientEmail ? "border-red-500" : ""}
            />
            {errors.clientEmail && <p className="text-xs text-red-500">{errors.clientEmail}</p>}
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Line Items</Label>
            <Button variant="outline" size="sm" onClick={addItem}><Plus className="mr-1 h-3 w-3" /> Add Item</Button>
          </div>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 rounded-lg bg-navy-50 p-3 dark:bg-navy-800">
                <div className="flex-1 space-y-2">
                  <Input value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)}
                    placeholder="Description" className="bg-white" />
                  <CurrencyInput value={String(item.amount || "")} onChange={(v) => updateItem(i, "amount", Number(v))}
                    placeholder="Amount" />
                </div>
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="self-start text-navy-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* GST */}
        <div className="space-y-3 rounded-xl border border-navy-200 p-4 dark:border-navy-700">
          <Label>GST</Label>
          <div className="flex gap-1 rounded-lg bg-navy-100 p-1 dark:bg-navy-800">
            {([
              { value: "none" as const, label: "No GST" },
              { value: "cgst_sgst" as const, label: "CGST + SGST" },
              { value: "igst" as const, label: "IGST" },
            ]).map(({ value, label }) => (
              <button key={value} type="button" onClick={() => setGstType(value)}
                className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
                  gstType === value ? "bg-white text-navy-900 shadow-sm dark:bg-navy-700 dark:text-navy-100" : "text-navy-500"
                }`}>
                {label}
              </button>
            ))}
          </div>
          {gstType !== "none" && (
            <>
              <p className="text-xs text-navy-400">
                {gstType === "cgst_sgst" ? "Intra-state supply: tax splits equally into CGST and SGST." : "Inter-state supply: full tax charged as IGST."}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>GST Rate %</Label>
                  <Input type="number" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>HSN/SAC</Label>
                  <Input value={hsnSac} onChange={(e) => setHsnSac(e.target.value)} placeholder="998596" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Client GSTIN (optional)</Label>
                  <Input
                    value={clientGstin}
                    onChange={(e) => { setClientGstin(e.target.value.toUpperCase()); setErrors({ ...errors, clientGstin: "" }); }}
                    placeholder="e.g. 27ABCDE1234F1Z5"
                    className={errors.clientGstin ? "border-red-500" : ""}
                  />
                  {errors.clientGstin && <p className="text-xs text-red-500">{errors.clientGstin}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Place of Supply</Label>
                  <Input value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} placeholder="e.g. 27-Maharashtra" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        {/* Totals */}
        <div className="rounded-xl bg-navy-50 p-4 space-y-2 dark:bg-navy-800">
          <div className="flex justify-between text-sm">
            <span className="text-navy-600">Subtotal</span>
            <span className="font-semibold">{formatCurrency(subtotal)}</span>
          </div>
          {gstType === "cgst_sgst" && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-navy-600">CGST @ {halfRate}%</span>
                <span className="font-semibold">{formatCurrency(cgstAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-navy-600">SGST @ {halfRate}%</span>
                <span className="font-semibold">{formatCurrency(sgstAmount)}</span>
              </div>
            </>
          )}
          {gstType === "igst" && (
            <div className="flex justify-between text-sm">
              <span className="text-navy-600">IGST @ {taxPercent}%</span>
              <span className="font-semibold">{formatCurrency(igstAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-navy-200 pt-2 text-lg dark:border-navy-600">
            <span className="font-bold text-navy-900 dark:text-navy-100">Total</span>
            <span className="font-bold text-navy-900 dark:text-navy-100">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Payment terms, bank details..." />
        </div>

        <Button onClick={handleSave} size="lg" className="w-full" disabled={saving || !clientName.trim()}>
          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
          Create Invoice
        </Button>
      </div>
    </div>
  );
}
