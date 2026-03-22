"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/currency-input";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Plus, Loader2, Trash2, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
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

  const [contractId, setContractId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [label, setLabel] = useState("Payment");

  useEffect(() => { load(); }, []);

  async function load() {
    const [schRes, conRes] = await Promise.all([
      supabase.from("payment_schedules").select("*, vendor:vendors(*)").eq("event_id", eventId).order("due_date"),
      supabase.from("contracts").select("*, vendor:vendors(*)").eq("event_id", eventId),
    ]);
    if (schRes.data) setSchedules(schRes.data as any);
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

  const totalDue = schedules.filter((s) => s.status !== "paid").reduce((sum, s) => sum + s.amount, 0);
  const overdue = schedules.filter((s) => s.status === "overdue" || (s.status !== "paid" && s.due_date && new Date(s.due_date) < new Date()));

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/events/${eventId}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
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
        <div className="mb-4 space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="space-y-2">
            <Label>Vendor *</Label>
            <select value={contractId} onChange={(e) => setContractId(e.target.value)}
              className="w-full rounded-lg border border-navy-200 p-3 text-sm">
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
            <div key={sch.id} className={`rounded-xl bg-white p-4 shadow-sm ${isOverdue ? "border-l-4 border-red-500" : sch.status === "paid" ? "border-l-4 border-emerald-500" : ""}`}>
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
                    <p className="font-semibold text-navy-900">{sch.vendor?.name}</p>
                    <p className="text-xs text-navy-500">{sch.label}</p>
                    <p className={`mt-1 text-xs ${isOverdue ? "font-medium text-red-600" : "text-navy-500"}`}>
                      {formatDate(sch.due_date)}
                      {sch.status !== "paid" && (isOverdue ? ` (${Math.abs(days)}d overdue)` : days <= 7 ? ` (${days}d left)` : "")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-navy-900">{formatCurrency(sch.amount)}</p>
                </div>
              </div>
              {sch.status !== "paid" && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="success" onClick={() => markPaid(sch.id)} className="flex-1">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Mark Paid
                  </Button>
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
