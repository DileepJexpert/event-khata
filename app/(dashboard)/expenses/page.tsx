"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/currency-input";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Plus, Loader2, Trash2, Receipt, Wallet, RotateCcw } from "lucide-react";
import { formatCurrency, formatDate, EXPENSE_CATEGORIES, PAYMENT_MODES } from "@/lib/utils";
import type { Expense, Event } from "@/lib/types";

export default function ExpensesPage() {
  const supabase = createClient();
  const { addToast } = useToast();

  const [expenses, setExpenses] = useState<(Expense & { event?: { client_name: string } })[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eventFilter, setEventFilter] = useState("all");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
  const [amount, setAmount] = useState("");
  const [eventId, setEventId] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [spentOn, setSpentOn] = useState(new Date().toISOString().split("T")[0]);
  const [paidBy, setPaidBy] = useState("");
  const [reimbursable, setReimbursable] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const [expRes, evRes] = await Promise.all([
      supabase.from("expenses").select("*, event:events(client_name)").order("spent_on", { ascending: false }),
      supabase.from("events").select("*").order("created_at", { ascending: false }),
    ]);
    if (expRes.data) setExpenses(expRes.data as any);
    if (evRes.data) setEvents(evRes.data);
    setLoading(false);
  }

  async function handleAdd() {
    if (!title.trim() || !amount) return;
    setSaving(true);
    const { requireUser } = await import("@/lib/auth");
    const user = await requireUser();
    const { error } = await supabase.from("expenses").insert({
      agency_id: user.id,
      event_id: eventId || null,
      title: title.trim(),
      category,
      amount: Number(amount),
      payment_mode: paymentMode,
      spent_on: spentOn,
      paid_by: paidBy || null,
      reimbursable,
      notes: notes || null,
    });
    if (error) {
      addToast({ title: "Failed to add expense", description: error.message, variant: "destructive" });
    } else {
      setTitle(""); setCategory("other"); setAmount(""); setEventId("");
      setPaymentMode("CASH"); setPaidBy(""); setReimbursable(false); setNotes("");
      setSpentOn(new Date().toISOString().split("T")[0]);
      setShowForm(false);
      addToast({ title: "Expense added!", variant: "success" });
      load();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await supabase.from("expenses").delete().eq("id", id);
    load();
  }

  async function toggleReimbursed(exp: Expense) {
    await supabase.from("expenses").update({ reimbursed: !exp.reimbursed }).eq("id", exp.id);
    load();
  }

  const filtered = eventFilter === "all"
    ? expenses
    : eventFilter === "none"
    ? expenses.filter((e) => !e.event_id)
    : expenses.filter((e) => e.event_id === eventFilter);

  const total = filtered.reduce((sum, e) => sum + Number(e.amount), 0);
  const pendingReimbursement = filtered
    .filter((e) => e.reimbursable && !e.reimbursed)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Category breakdown
  const byCategory = EXPENSE_CATEGORIES.map((cat) => ({
    ...cat,
    total: filtered.filter((e) => e.category === cat.value).reduce((s, e) => s + Number(e.amount), 0),
  })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 dark:text-navy-100">Expenses</h1>
          <p className="text-sm text-navy-500">Track misc costs beyond vendor payments</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      {/* Summary */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
            <Wallet className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-xl font-bold text-navy-900 dark:text-navy-100">{formatCurrency(total)}</p>
          <p className="text-xs text-navy-500">Total Spent</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <RotateCcw className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-amber-600">{formatCurrency(pendingReimbursement)}</p>
          <p className="text-xs text-navy-500">To Reimburse</p>
        </div>
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
          <h3 className="mb-3 text-sm font-semibold text-navy-900 dark:text-navy-100">By Category</h3>
          <div className="space-y-2">
            {byCategory.map((cat) => {
              const percent = total > 0 ? (cat.total / total) * 100 : 0;
              return (
                <div key={cat.value}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-navy-600 dark:text-navy-300">{cat.label}</span>
                    <span className="font-medium text-navy-900 dark:text-navy-100">{formatCurrency(cat.total)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-navy-100 dark:bg-navy-800">
                    <div className="h-full rounded-full bg-navy-600" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setEventFilter("all")}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${eventFilter === "all" ? "bg-navy-900 text-white dark:bg-navy-100 dark:text-navy-900" : "bg-white text-navy-600 dark:bg-navy-800 dark:text-navy-300"}`}>
          All
        </button>
        <button onClick={() => setEventFilter("none")}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${eventFilter === "none" ? "bg-navy-900 text-white dark:bg-navy-100 dark:text-navy-900" : "bg-white text-navy-600 dark:bg-navy-800 dark:text-navy-300"}`}>
          General
        </button>
        {events.map((ev) => (
          <button key={ev.id} onClick={() => setEventFilter(ev.id)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${eventFilter === ev.id ? "bg-navy-900 text-white dark:bg-navy-100 dark:text-navy-900" : "bg-white text-navy-600 dark:bg-navy-800 dark:text-navy-300"}`}>
            {ev.client_name}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="mb-4 space-y-3 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Cab to venue" />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${category === cat.value ? "bg-navy-900 text-white dark:bg-navy-100 dark:text-navy-900" : "bg-navy-100 text-navy-600 dark:bg-navy-800 dark:text-navy-300"}`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount *</Label>
              <CurrencyInput value={amount} onChange={setAmount} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Link to Event (optional)</Label>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)}
              className="w-full rounded-lg border border-navy-200 p-3 text-sm dark:border-navy-700 dark:bg-navy-800 dark:text-navy-100">
              <option value="">General (no event)</option>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.client_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full rounded-lg border border-navy-200 p-3 text-sm dark:border-navy-700 dark:bg-navy-800 dark:text-navy-100">
                {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Paid By</Label>
              <Input value={paidBy} onChange={(e) => setPaidBy(e.target.value)} placeholder="Name" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-navy-700 dark:text-navy-300">
            <input type="checkbox" checked={reimbursable} onChange={(e) => setReimbursable(e.target.checked)}
              className="h-4 w-4 rounded border-navy-300" />
            Mark as reimbursable
          </label>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={saving || !title.trim() || !amount} size="sm" className="flex-1">
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Add Expense
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Track travel, tips, supplies and other costs that don't go to a vendor contract."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((exp) => {
            const cat = EXPENSE_CATEGORIES.find((c) => c.value === exp.category);
            return (
              <div key={exp.id} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-navy-100 dark:bg-navy-800">
                  <Receipt className="h-4 w-4 text-navy-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy-900 dark:text-navy-100">{exp.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-navy-500">
                    <span className="rounded bg-navy-100 px-1.5 py-0.5 dark:bg-navy-800">{cat?.label}</span>
                    <span>{formatDate(exp.spent_on)}</span>
                    {exp.event?.client_name && <span>&middot; {exp.event.client_name}</span>}
                    {exp.paid_by && <span>&middot; {exp.paid_by}</span>}
                  </div>
                  {exp.reimbursable && (
                    <button onClick={() => toggleReimbursed(exp)}
                      className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        exp.reimbursed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}>
                      {exp.reimbursed ? "Reimbursed" : "Tap when reimbursed"}
                    </button>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-lg font-bold text-navy-900 dark:text-navy-100">{formatCurrency(Number(exp.amount))}</span>
                  <ConfirmDialog
                    title="Delete expense?"
                    message={`Remove "${exp.title}" (${formatCurrency(Number(exp.amount))})?`}
                    confirmLabel="Delete"
                    onConfirm={() => handleDelete(exp.id)}
                  >
                    <button className="text-navy-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </ConfirmDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
