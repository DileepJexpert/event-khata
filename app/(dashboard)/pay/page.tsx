"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/currency-input";
import { WhatsAppShare } from "@/components/whatsapp-share";
import { useToast } from "@/components/ui/toast";
import { Loader2, Check, IndianRupee, Plus } from "lucide-react";
import { formatCurrency, formatDate, PAYMENT_MODES, TXN_TYPES } from "@/lib/utils";
import { getPaymentReceiptMessage } from "@/lib/whatsapp";
import type { Event, Vendor, Contract } from "@/lib/types";

type SavedPayment = {
  eventName: string;
  vendorName: string;
  vendorPhone: string | null;
  amount: number;
  mode: string;
  date: string;
};

export default function QuickPayPage() {
  const supabase = createClient();
  const { addToast } = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [vendors, setVendors] = useState<(Contract & { vendor: Vendor })[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedPayment | null>(null);

  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [txnType, setTxnType] = useState("ADVANCE");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) loadVendors(selectedEvent);
    else setVendors([]);
    setSelectedVendor("");
  }, [selectedEvent]);

  async function loadEvents() {
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("status", "active")
      .order("event_date", { ascending: false, nullsFirst: false });
    if (data) setEvents(data);
    setLoading(false);
  }

  async function loadVendors(eventId: string) {
    const { data } = await supabase
      .from("contracts")
      .select("*, vendor:vendors(*)")
      .eq("event_id", eventId);
    if (data) setVendors(data as any);
  }

  async function handleSave() {
    if (!selectedEvent || !selectedVendor || !amount) return;
    setSaving(true);

    // DEV MODE: Use dev user instead of auth
    const { getDevUser } = await import("@/lib/dev-user");
    const user = getDevUser();

    const contract = vendors.find((v) => v.vendor_id === selectedVendor);
    const event = events.find((e) => e.id === selectedEvent);

    const { error } = await supabase.from("ledger").insert({
      agency_id: user.id,
      event_id: selectedEvent,
      vendor_id: selectedVendor,
      contract_id: contract?.id || null,
      amount: Number(amount),
      txn_type: txnType,
      payment_mode: paymentMode,
      reference_number: reference || null,
      notes: notes || null,
    });

    if (error) {
      addToast({ title: "Failed to save payment", description: error.message, variant: "destructive" });
    } else {
      setSaved({
        eventName: event?.client_name || "",
        vendorName: contract?.vendor?.name || "",
        vendorPhone: contract?.vendor?.phone || null,
        amount: Number(amount),
        mode: paymentMode,
        date: formatDate(new Date().toISOString()),
      });
      addToast({ title: "Payment saved!", variant: "success" });
    }
    setSaving(false);
  }

  function resetForm() {
    setSaved(null);
    setSelectedEvent("");
    setSelectedVendor("");
    setAmount("");
    setPaymentMode("CASH");
    setTxnType("ADVANCE");
    setReference("");
    setNotes("");
  }

  // Success screen
  if (saved) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-10 w-10 text-emerald-600" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-navy-900">Payment Saved!</h2>
        <p className="mb-1 text-navy-600">{saved.vendorName}</p>
        <p className="mb-6 text-3xl font-bold text-emerald-600">
          {formatCurrency(saved.amount)}
        </p>

        <div className="flex w-full max-w-xs flex-col gap-3">
          <WhatsAppShare
            phone={saved.vendorPhone}
            message={getPaymentReceiptMessage(saved)}
            label="Share on WhatsApp"
          />
          <Button onClick={resetForm} variant="outline" size="lg" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Log Another Payment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
          <IndianRupee className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Quick Pay</h1>
          <p className="text-sm text-navy-500">Log a payment in seconds</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Select Event */}
        <div className="space-y-2">
          <Label>Select Event *</Label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-navy-200 p-1">
            {loading ? (
              <p className="p-3 text-sm text-navy-400">Loading...</p>
            ) : events.length === 0 ? (
              <p className="p-3 text-sm text-navy-400">No active events. Create one first.</p>
            ) : (
              events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedEvent(event.id)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-3 text-left transition-colors ${
                    selectedEvent === event.id
                      ? "bg-navy-900 text-white"
                      : "hover:bg-navy-50"
                  }`}
                >
                  <span className="font-medium">{event.client_name}</span>
                  <span className={`text-xs ${selectedEvent === event.id ? "text-navy-300" : "text-navy-400"}`}>
                    {event.event_date ? formatDate(event.event_date) : event.event_type}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Select Vendor */}
        {selectedEvent && (
          <div className="space-y-2">
            <Label>Select Vendor *</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-navy-200 p-1">
              {vendors.length === 0 ? (
                <p className="p-3 text-sm text-navy-400">No vendors assigned to this event.</p>
              ) : (
                vendors.map((contract) => (
                  <button
                    key={contract.vendor_id}
                    type="button"
                    onClick={() => setSelectedVendor(contract.vendor_id)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-3 text-left transition-colors ${
                      selectedVendor === contract.vendor_id
                        ? "bg-navy-900 text-white"
                        : "hover:bg-navy-50"
                    }`}
                  >
                    <span className="font-medium">{contract.vendor?.name}</span>
                    <span className={`text-xs capitalize ${selectedVendor === contract.vendor_id ? "text-navy-300" : "text-navy-400"}`}>
                      {contract.vendor?.category?.replace("_", " ")}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Amount */}
        {selectedVendor && (
          <>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <CurrencyInput
                value={amount}
                onChange={setAmount}
                placeholder="0"
                autoFocus
              />
            </div>

            {/* Payment Mode */}
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setPaymentMode(mode.value)}
                    className={`rounded-lg border-2 px-3 py-3 text-sm font-semibold transition-colors ${
                      paymentMode === mode.value
                        ? "border-navy-900 bg-navy-900 text-white"
                        : "border-navy-200 bg-white text-navy-600"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction Type */}
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <div className="grid grid-cols-4 gap-2">
                {TXN_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setTxnType(type.value)}
                    className={`rounded-lg border-2 px-2 py-2.5 text-xs font-semibold transition-colors ${
                      txnType === type.value
                        ? "border-navy-900 bg-navy-900 text-white"
                        : "border-navy-200 bg-white text-navy-600"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="reference">Reference (optional)</Label>
              <Input
                id="reference"
                placeholder="UPI ref / cheque no."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Note (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              variant="success"
              size="xl"
              className="w-full"
              disabled={saving || !amount}
            >
              {saving ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Check className="mr-2 h-5 w-5" />
              )}
              SAVE PAYMENT
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
