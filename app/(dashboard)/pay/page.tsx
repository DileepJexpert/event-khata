"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/currency-input";
import { WhatsAppShare } from "@/components/whatsapp-share";
import { MobileHeader } from "@/components/mobile-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  Loader2,
  Check,
  IndianRupee,
  Plus,
  Camera,
  CalendarDays,
  User,
  CreditCard,
  Banknote,
  Building,
  FileCheck,
  Search,
} from "lucide-react";
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

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;

function QuickPayContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const initialEventId = searchParams.get("eventId") || "";
  const initialVendorId = searchParams.get("vendorId") || "";

  const { addToast } = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [vendors, setVendors] = useState<(Contract & { vendor: Vendor; paidSoFar?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<SavedPayment | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState(initialEventId);
  const [selectedVendor, setSelectedVendor] = useState(initialVendorId);
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [txnType, setTxnType] = useState("ADVANCE");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [eventSearch, setEventSearch] = useState("");

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadVendors(selectedEvent);
    } else {
      setVendors([]);
    }
  }, [selectedEvent]);

  async function loadEvents() {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("status", "active")
      .order("event_date", { ascending: false, nullsFirst: false });
    if (error) console.error("[QuickPay] Failed to load events:", error.message, error);
    if (data) {
      setEvents(data);
      if (initialEventId && data.some((e) => e.id === initialEventId)) {
        setSelectedEvent(initialEventId);
      }
    }
    setLoading(false);
  }

  async function loadVendors(eventId: string) {
    setVendorsLoading(true);
    const { data: contractsData, error } = await supabase
      .from("contracts")
      .select("*, vendor:vendors(*)")
      .eq("event_id", eventId);

    if (error) console.error("[QuickPay] Failed to load vendors:", error.message, error);

    if (contractsData) {
      // Also calculate paid amounts for each vendor in this event
      const { data: ledgerData } = await supabase
        .from("ledger")
        .select("vendor_id, amount, txn_type")
        .eq("event_id", eventId);

      const paidMap: Record<string, number> = {};
      (ledgerData || []).forEach((l) => {
        const amt = l.txn_type === "REFUND" ? -Number(l.amount) : Number(l.amount);
        paidMap[l.vendor_id] = (paidMap[l.vendor_id] || 0) + amt;
      });

      const enriched = (contractsData as any).map((c: any) => ({
        ...c,
        paidSoFar: paidMap[c.vendor_id] || 0,
      }));

      setVendors(enriched);
      if (initialVendorId && enriched.some((v: any) => v.vendor_id === initialVendorId)) {
        setSelectedVendor(initialVendorId);
      }
    }
    setVendorsLoading(false);
  }

  function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!allowed) {
      addToast({
        title: "Unsupported receipt",
        description: "Attach an image or PDF receipt.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    if (file.size > MAX_RECEIPT_SIZE) {
      addToast({
        title: "Receipt too large",
        description: "Please attach a file under 5 MB.",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }

    setConfirming(false);
    setReceiptFile(file);
    setReceiptPreview(null);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function handleSave() {
    if (!selectedEvent || !selectedVendor || !amount) return;
    const paymentAmount = Number(amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      addToast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      const { requireUser } = await import("@/lib/auth");
      const user = await requireUser();

      const contract = vendors.find((v) => v.vendor_id === selectedVendor);
      const event = events.find((e) => e.id === selectedEvent);

      // Upload receipt if provided
      let receiptUrl: string | null = null;
      if (receiptFile) {
        const ext = receiptFile.name.split(".").pop();
        const path = `receipts/${selectedEvent}/${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(path, receiptFile);
        if (uploadError) {
          addToast({
            title: "Receipt upload failed",
            description: uploadError.message,
            variant: "destructive",
          });
          return;
        }
        if (uploadData) {
          const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
          receiptUrl = urlData?.publicUrl || null;
        }
      }

      const { error } = await supabase.from("ledger").insert({
        agency_id: user.id,
        event_id: selectedEvent,
        vendor_id: selectedVendor,
        contract_id: contract?.id || null,
        amount: paymentAmount,
        txn_type: txnType,
        payment_mode: paymentMode,
        reference_number: reference || null,
        notes: notes || null,
        receipt_url: receiptUrl,
      });

      if (error) {
        console.error("[QuickPay] Failed to save payment:", error.message, error);
        addToast({
          title: "Failed to save payment",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setSaved({
          eventName: event?.client_name || "",
          vendorName: contract?.vendor?.name || "",
          vendorPhone: contract?.vendor?.phone || null,
          amount: paymentAmount,
          mode: paymentMode,
          date: formatDate(new Date().toISOString()),
        });
        addToast({ title: "Payment recorded successfully!", variant: "success" });
      }
    } finally {
      setSaving(false);
    }
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
    setReceiptFile(null);
    setReceiptPreview(null);
    setConfirming(false);
  }

  // Success Screen
  if (saved) {
    return (
      <div className="flex min-h-[85vh] flex-col items-center justify-center px-4 py-8 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 shadow-xl shadow-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 dark:shadow-none animate-in zoom-in-75 duration-300">
          <Check className="h-10 w-10 stroke-[3]" />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Payment Recorded
        </p>
        <h2 className="mt-1 text-2xl font-black text-navy-900 dark:text-navy-100">
          {saved.vendorName}
        </h2>
        <p className="text-xs text-navy-500">{saved.eventName}</p>

        <p className="my-5 text-4xl font-black text-emerald-600 dark:text-emerald-400">
          {formatCurrency(saved.amount)}
        </p>

        <div className="w-full max-w-xs space-y-2.5">
          <WhatsAppShare
            phone={saved.vendorPhone}
            message={getPaymentReceiptMessage(saved)}
            label="Share Receipt on WhatsApp"
          />

          <Button
            onClick={resetForm}
            variant="outline"
            size="lg"
            className="w-full rounded-2xl py-6 font-bold"
          >
            <Plus className="mr-2 h-4 w-4" />
            Record Another Payment
          </Button>
        </div>
      </div>
    );
  }

  const selectedContract = vendors.find((v) => v.vendor_id === selectedVendor);
  const selectedEventData = events.find((event) => event.id === selectedEvent);
  const canReview = Boolean(selectedEvent && selectedVendor && amount && Number(amount) > 0);

  const filteredEvents = events.filter((e) =>
    e.client_name.toLowerCase().includes(eventSearch.toLowerCase()) ||
    (e.venue || "").toLowerCase().includes(eventSearch.toLowerCase())
  );

  return (
    <div className="pb-28">
      <MobileHeader
        title="Quick Pay"
        subtitle="Log vendor payment in seconds"
      />

      <div className="p-4 space-y-4">
        {/* Step 1: Select Event */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-wider text-navy-500">
              Step 1 · Select Event *
            </Label>
            {selectedEvent && (
              <button
                type="button"
                onClick={() => {
                  setSelectedEvent("");
                  setSelectedVendor("");
                  setConfirming(false);
                }}
                className="text-xs font-bold text-navy-400 hover:text-navy-600"
              >
                Change
              </button>
            )}
          </div>

          {!selectedEvent ? (
            <div className="space-y-2">
              {events.length > 3 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-navy-400" />
                  <Input
                    placeholder="Search active events..."
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                    className="h-9 pl-9 text-xs rounded-xl"
                  />
                </div>
              )}

              <div className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5">
                {loading ? (
                  <p className="p-4 text-center text-xs text-navy-400">Loading events...</p>
                ) : events.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-navy-200 p-6 text-center dark:border-navy-800">
                    <CalendarDays className="mx-auto h-8 w-8 text-navy-400" />
                    <p className="mt-2 text-xs font-medium text-navy-500">
                      No active events found. Create one first!
                    </p>
                  </div>
                ) : (
                  filteredEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => {
                        setSelectedEvent(event.id);
                        setConfirming(false);
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-navy-100 bg-white p-3 text-left transition-all active:scale-98 dark:border-navy-800 dark:bg-navy-900"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-navy-900 dark:text-navy-100 text-sm">
                          {event.client_name}
                        </p>
                        <p className="text-[11px] text-navy-400 capitalize">
                          {event.event_type} {event.venue ? `· ${event.venue}` : ""}
                        </p>
                      </div>
                      <span className="flex-shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {event.event_date ? formatDate(event.event_date) : "Select →"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-300 bg-emerald-50/70 p-3.5 dark:border-emerald-800 dark:bg-emerald-950/40">
              <div>
                <p className="font-bold text-emerald-950 dark:text-emerald-100 text-sm">
                  {selectedEventData?.client_name}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 capitalize">
                  {selectedEventData?.event_type} · {selectedEventData?.venue || "No venue"}
                </p>
              </div>
              <Check className="h-5 w-5 text-emerald-600" />
            </div>
          )}
        </div>

        {/* Step 2: Select Vendor */}
        {selectedEvent && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy-500">
                Step 2 · Select Vendor *
              </Label>
              {selectedVendor && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVendor("");
                    setConfirming(false);
                  }}
                  className="text-xs font-bold text-navy-400 hover:text-navy-600"
                >
                  Change
                </button>
              )}
            </div>

            {!selectedVendor ? (
              <div className="max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
                {vendorsLoading ? (
                  <p className="p-4 text-center text-xs text-navy-400">Loading vendors...</p>
                ) : vendors.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-navy-200 p-5 text-center dark:border-navy-800">
                    <User className="mx-auto h-7 w-7 text-navy-400" />
                    <p className="mt-2 text-xs font-medium text-navy-500">
                      No vendors assigned to this event yet.
                    </p>
                    <a
                      href={`/events/${selectedEvent}/add-vendor`}
                      className="mt-2 inline-block rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-bold text-white dark:bg-navy-100 dark:text-navy-900"
                    >
                      + Add Vendor to Event
                    </a>
                  </div>
                ) : (
                  vendors.map((contract) => {
                    const agreed = Number(contract.agreed_amount) || 0;
                    const paid = contract.paidSoFar || 0;
                    const balance = Math.max(0, agreed - paid);

                    return (
                      <button
                        key={contract.vendor_id}
                        type="button"
                        onClick={() => {
                          setSelectedVendor(contract.vendor_id);
                          setConfirming(false);
                        }}
                        className="flex w-full items-center justify-between rounded-2xl border border-navy-100 bg-white p-3 text-left transition-all active:scale-98 dark:border-navy-800 dark:bg-navy-900"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-navy-900 dark:text-navy-100 text-sm">
                            {contract.vendor?.name}
                          </p>
                          <p className="text-[11px] capitalize text-navy-400">
                            {contract.vendor?.category?.replace("_", " ")}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-bold text-navy-800 dark:text-navy-200">
                            Balance: {formatCurrency(balance)}
                          </p>
                          <p className="text-[10px] text-navy-400">
                            Agreed: {formatCurrency(agreed)}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-2xl border border-emerald-300 bg-emerald-50/70 p-3.5 dark:border-emerald-800 dark:bg-emerald-950/40">
                <div>
                  <p className="font-bold text-emerald-950 dark:text-emerald-100 text-sm">
                    {selectedContract?.vendor?.name}
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 capitalize">
                    {selectedContract?.vendor?.category?.replace("_", " ")} · Balance:{" "}
                    {formatCurrency(
                      Math.max(
                        0,
                        Number(selectedContract?.agreed_amount || 0) -
                          Number(selectedContract?.paidSoFar || 0)
                      )
                    )}
                  </p>
                </div>
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Enter Amount */}
        {selectedVendor && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy-500">
                Step 3 · Amount (₹) *
              </Label>
              <CurrencyInput
                value={amount}
                onChange={(value) => {
                  setAmount(value);
                  setConfirming(false);
                }}
                placeholder="0"
                autoFocus
              />
            </div>

            {/* Step 4: Payment Mode Chips */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy-500">
                Payment Mode
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "CASH", label: "Cash", icon: Banknote },
                  { value: "UPI", label: "UPI / GPay", icon: CreditCard },
                  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Building },
                  { value: "CHEQUE", label: "Cheque", icon: FileCheck },
                ].map((mode) => {
                  const isSelected = paymentMode === mode.value;
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => {
                        setPaymentMode(mode.value);
                        setConfirming(false);
                      }}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 transition-all active:scale-95 ${
                        isSelected
                          ? "border-navy-900 bg-navy-900 text-white shadow-md dark:border-navy-100 dark:bg-navy-100 dark:text-navy-900"
                          : "border-navy-200/80 bg-white text-navy-700 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[11px] font-bold">{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transaction Type */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-navy-500">
                Payment Stage
              </Label>
              <div className="grid grid-cols-4 gap-1.5">
                {TXN_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      setTxnType(type.value);
                      setConfirming(false);
                    }}
                    className={`rounded-xl border py-2 text-center text-xs font-bold transition-all active:scale-95 ${
                      txnType === type.value
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-navy-200 bg-white text-navy-600 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-300"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Details Accordion / Fields */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label htmlFor="reference" className="text-xs font-medium text-navy-500">
                  Reference ID / UTR (optional)
                </Label>
                <Input
                  id="reference"
                  placeholder="UPI transaction ID / Cheque #"
                  value={reference}
                  onChange={(e) => {
                    setReference(e.target.value);
                    setConfirming(false);
                  }}
                  className="rounded-xl text-xs h-10"
                />
              </div>

              {/* Receipt Attachment */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-navy-500">
                  Attach Receipt (optional)
                </Label>
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-navy-200 bg-navy-50/50 p-3 transition-colors hover:border-navy-400 dark:border-navy-800 dark:bg-navy-900/50">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-navy-600 shadow-xs dark:bg-navy-800 dark:text-navy-300">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-navy-700 dark:text-navy-200">
                      {receiptFile ? receiptFile.name : "Tap to attach bill or photo"}
                    </p>
                    <p className="text-[10px] text-navy-400">Camera, screenshot or PDF</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    capture="environment"
                    onChange={handleReceiptChange}
                    className="hidden"
                  />
                </label>
                {receiptPreview && (
                  <div className="relative mt-2">
                    <Image
                      src={receiptPreview}
                      alt="Receipt"
                      width={240}
                      height={128}
                      unoptimized
                      className="max-h-28 w-auto rounded-xl object-cover border border-navy-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptFile(null);
                        setReceiptPreview(null);
                        setConfirming(false);
                      }}
                      className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-bold text-white"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Review & Submit Button */}
            <div className="pt-3">
              {confirming ? (
                <div className="space-y-3 rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4 dark:border-emerald-800 dark:bg-emerald-950/40 animate-in fade-in duration-200">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Review Payment
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Confirm before writing to Khata ledger
                    </p>
                  </div>

                  <div className="space-y-1 text-xs text-navy-700 dark:text-navy-200 border-t border-emerald-200/60 pt-2 dark:border-emerald-900/60">
                    <div className="flex justify-between">
                      <span className="text-navy-500">Event:</span>
                      <span className="font-bold">{selectedEventData?.client_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-navy-500">Vendor:</span>
                      <span className="font-bold">{selectedContract?.vendor?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-navy-500">Amount:</span>
                      <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">
                        {formatCurrency(Number(amount))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-navy-500">Mode:</span>
                      <span className="font-bold">
                        {txnType} via {paymentMode}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="outline"
                      onClick={() => setConfirming(false)}
                      disabled={saving}
                      className="rounded-xl py-5 font-bold"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={handleSave}
                      variant="success"
                      disabled={saving}
                      className="rounded-xl py-5 font-bold shadow-md shadow-emerald-200 dark:shadow-none"
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4 stroke-[3]" />
                      )}
                      CONFIRM & SAVE
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setConfirming(true)}
                  variant="success"
                  size="xl"
                  className="w-full rounded-2xl py-6 font-black shadow-lg shadow-emerald-200/70 active:scale-98 dark:shadow-none"
                  disabled={!canReview}
                >
                  <Check className="mr-2 h-5 w-5 stroke-[3]" />
                  REVIEW PAYMENT
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function QuickPayPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      }
    >
      <QuickPayContent />
    </Suspense>
  );
}
