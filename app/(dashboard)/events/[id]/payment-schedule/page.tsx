"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/currency-input";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Plus, Loader2, Trash2, CheckCircle2, Clock, AlertTriangle, MessageCircle, Zap, IndianRupee } from "lucide-react";
import { formatCurrency, formatDate, daysUntil, timeAgo } from "@/lib/utils";
import { getWhatsAppShareURL, getScheduleReminderMessage } from "@/lib/whatsapp";
import { checkWhatsAppAPI, sendWhatsAppMessage } from "@/lib/whatsapp-api";
import { isRazorpayEnabled, createPaymentLink } from "@/lib/razorpay";
import Link from "next/link";
import type { PaymentSchedule, Contract, Vendor } from "@/lib/types";

export default function PaymentSchedulePage() {
  const supabase = createClient();
  const params = useParams();
  const { addToast } = useToast();
  const eventId = params.id as string;

  const [schedules, setSchedules] = useState<(PaymentSchedule & { vendor?: Vendor })[]>([]);
  const [contracts, setContracts] = useState<(Contract & { vendor: Vendor })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [whatsappAPI, setWhatsappAPI] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [sendingPaymentLink, setSendingPaymentLink] = useState<string | null>(null);

  const [contractId, setContractId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [label, setLabel] = useState("Payment");

  useEffect(() => { load(); }, []);
  useEffect(() => { checkWhatsAppAPI().then(setWhatsappAPI); }, []);
  useEffect(() => { isRazorpayEnabled().then(setRazorpayEnabled); }, []);

  async function load() {
    const [schRes, conRes] = await Promise.all([
      supabase.from("payment_schedules").select("*, vendor:vendors(*)").eq("event_id", eventId).order("due_date"),
      supabase.from("contracts").select("*, vendor:vendors(*)").eq("event_id", eventId),
    ]);
    if (schRes.data) {
      // Auto-update statuses based on current date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (const s of schRes.data as any[]) {
        if (s.status === "paid") continue;
        const due = new Date(s.due_date);
        due.setHours(0, 0, 0, 0);
        const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let newStatus = s.status;
        if (diff < 0) newStatus = "overdue";
        else if (diff <= 3) newStatus = "due";
        else newStatus = "upcoming";
        if (newStatus !== s.status) {
          await supabase.from("payment_schedules").update({ status: newStatus }).eq("id", s.id);
          s.status = newStatus;
        }
      }
      setSchedules(schRes.data as any);
    }
    if (conRes.data) setContracts(conRes.data as any);
    setLoading(false);
  }

  async function handleAdd() {
    if (!contractId || !amount || !dueDate) return;
    setSaving(true);
    const contract = contracts.find((c) => c.id === contractId);
    const { error } = await supabase.from("payment_schedules").insert({
      contract_id: contractId,
      event_id: eventId,
      vendor_id: contract?.vendor_id || "",
      amount: Number(amount),
      due_date: dueDate,
      label: label || "Payment",
    });
    if (error) addToast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      setContractId(""); setAmount(""); setDueDate(""); setLabel("Payment");
      setShowForm(false); load();
    }
    setSaving(false);
  }

  async function markPaid(id: string) {
    await supabase.from("payment_schedules").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from("payment_schedules").delete().eq("id", id);
    load();
  }

  async function remindVendor(sch: PaymentSchedule & { vendor?: Vendor }) {
    if (!sch.vendor?.phone) {
      addToast({ title: "No phone number", description: "Add a phone number for this vendor first.", variant: "destructive" });
      return;
    }
    const msg = getScheduleReminderMessage({
      vendorName: sch.vendor.name,
      amount: Number(sch.amount),
      label: sch.label,
      dueDate: formatDate(sch.due_date),
    });

    if (whatsappAPI) {
      setSendingReminder(sch.id);
      const result = await sendWhatsAppMessage({ phone: sch.vendor.phone, message: msg });
      if (result.success) {
        const sentAt = new Date().toISOString();
        await supabase.from("payment_schedules").update({ reminder_sent_at: sentAt }).eq("id", sch.id);
        setSchedules((prev) => prev.map((s) => (s.id === sch.id ? { ...s, reminder_sent_at: sentAt } : s)));
        addToast({ title: "Reminder sent", description: `WhatsApp message sent to ${sch.vendor.name}`, variant: "success" });
      } else {
        addToast({ title: "Failed to send", description: result.error || "Could not send WhatsApp message", variant: "destructive" });
      }
      setSendingReminder(null);
    } else {
      window.open(getWhatsAppShareURL(sch.vendor.phone, msg), "_blank");
    }
  }

  async function sendPaymentLinkForSchedule(sch: PaymentSchedule & { vendor?: Vendor }) {
    if (!sch.vendor) return;
    setSendingPaymentLink(sch.id);
    try {
      const result = await createPaymentLink({
        amount: sch.amount,
        currency: "INR",
        description: `${sch.label} - ${sch.vendor.name}`,
        customer_name: sch.vendor.name,
        customer_phone: sch.vendor.phone || undefined,
        customer_email: sch.vendor.email || undefined,
        reference_id: `ps_${sch.id}`,
      });

      addToast({ title: "Payment link created!", variant: "success" });

      if (sch.vendor.phone) {
        const msg = `Hi ${sch.vendor.name},\n\nHere is your payment link for ${sch.label}:\n\nAmount: ${formatCurrency(sch.amount)}\nDue: ${formatDate(sch.due_date)}\n\n${result.short_url}\n\nThank you!`;
        window.open(getWhatsAppShareURL(sch.vendor.phone, msg), "_blank");
      } else {
        await navigator.clipboard.writeText(result.short_url);
        addToast({ title: "Payment link copied to clipboard", variant: "success" });
      }
    } catch (err: any) {
      addToast({ title: "Failed to create payment link", description: err.message, variant: "destructive" });
    } finally {
      setSendingPaymentLink(null);
    }
  }

  const totalDue = schedules.filter((s) => s.status !== "paid").reduce((sum, s) => sum + s.amount, 0);
  const overdue = schedules.filter((s) => s.status === "overdue" || (s.status !== "paid" && s.due_date && new Date(s.due_date) < new Date()));

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/events/${eventId}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 dark:bg-navy-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Payment Schedule</h1>
          <p className="text-sm text-navy-500">
            {formatCurrency(totalDue)} remaining
            {overdue.length > 0 && <span className="ml-1 text-red-600">&middot; {overdue.length} overdue</span>}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 space-y-3 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
          <div className="space-y-2">
            <Label>Vendor *</Label>
            <select value={contractId} onChange={(e) => setContractId(e.target.value)}
              className="w-full rounded-lg border border-navy-200 p-3 text-sm dark:border-navy-700 dark:bg-navy-800 dark:text-navy-100">
              <option value="">Select vendor...</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>{c.vendor?.name} ({formatCurrency(c.agreed_amount)})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount *</Label>
              <CurrencyInput value={amount} onChange={setAmount} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Label</Label>
            <div className="flex gap-2">
              {["Advance", "1st Installment", "2nd Installment", "Final Payment"].map((l) => (
                <button key={l} onClick={() => setLabel(l)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${label === l ? "bg-navy-900 text-white" : "bg-navy-100 text-navy-600"}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={saving || !contractId || !amount || !dueDate} size="sm" className="flex-1">
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Schedule Payment
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {schedules.map((sch) => {
          const isOverdue = sch.status !== "paid" && sch.due_date && new Date(sch.due_date) < new Date();
          const days = daysUntil(sch.due_date);
          return (
            <div key={sch.id} className={`rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900 ${isOverdue ? "border-l-4 border-red-500" : sch.status === "paid" ? "border-l-4 border-emerald-500" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${
                    sch.status === "paid" ? "bg-emerald-100" : isOverdue ? "bg-red-100" : "bg-amber-100"
                  }`}>
                    {sch.status === "paid" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                     isOverdue ? <AlertTriangle className="h-4 w-4 text-red-600" /> :
                     <Clock className="h-4 w-4 text-amber-600" />}
                  </div>
                  <div>
                    <p className="font-semibold text-navy-900 dark:text-navy-100">{sch.vendor?.name}</p>
                    <p className="text-xs text-navy-500">{sch.label}</p>
                    <p className={`mt-1 text-xs ${isOverdue ? "font-medium text-red-600" : "text-navy-500"}`}>
                      {formatDate(sch.due_date)}
                      {sch.status !== "paid" && (isOverdue ? ` (${Math.abs(days)}d overdue)` : days <= 7 ? ` (${days}d left)` : "")}
                    </p>
                    {sch.status !== "paid" && sch.reminder_sent_at && (
                      <p className="mt-0.5 text-xs text-navy-400">Reminded {timeAgo(sch.reminder_sent_at)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-navy-900 dark:text-navy-100">{formatCurrency(sch.amount)}</p>
                </div>
              </div>
              {sch.status !== "paid" && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="success" onClick={() => markPaid(sch.id)} className="flex-1">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Mark Paid
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remindVendor(sch)} disabled={sendingReminder === sch.id} title={whatsappAPI ? "Auto-send WhatsApp reminder" : "Send WhatsApp reminder"}>
                    {sendingReminder === sch.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <MessageCircle className="h-3 w-3" />
                        {whatsappAPI && <Zap className="h-2 w-2 text-amber-500" />}
                      </>
                    )}
                  </Button>
                  {razorpayEnabled && (
                    <Button size="sm" variant="outline" onClick={() => sendPaymentLinkForSchedule(sch)} disabled={sendingPaymentLink === sch.id} title="Send payment link">
                      {sendingPaymentLink === sch.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <IndianRupee className="h-3 w-3 text-blue-600" />
                      )}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleDelete(sch.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {schedules.length === 0 && (
          <p className="py-12 text-center text-sm text-navy-400">No payment schedule set. Plan your vendor payments!</p>
        )}
      </div>
    </div>
  );
}
