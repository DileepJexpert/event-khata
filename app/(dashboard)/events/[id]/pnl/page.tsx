"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle,
  Percent, Check, Loader2, Pencil, X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Event, Vendor, Contract, LedgerEntry, Invoice, Expense } from "@/lib/types";

type ContractRow = Contract & { vendor: Vendor };

export default function EventPnlPage() {
  const params = useParams();
  const eventId = params.id as string;
  const supabase = createClient();
  const { addToast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Commission editing state
  const [editingContract, setEditingContract] = useState<string | null>(null);
  const [editPercent, setEditPercent] = useState("");
  const [savingContract, setSavingContract] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function loadData() {
    const [eventRes, contractsRes, ledgerRes, invoicesRes, expensesRes] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).single(),
      supabase.from("contracts").select("*, vendor:vendors(*)").eq("event_id", eventId),
      supabase.from("ledger").select("*").eq("event_id", eventId),
      supabase.from("invoices").select("*").eq("event_id", eventId),
      supabase.from("expenses").select("*").eq("event_id", eventId),
    ]);

    if (eventRes.error) console.error("[PnL] Failed to load event:", eventRes.error.message);
    if (contractsRes.error) console.error("[PnL] Failed to load contracts:", contractsRes.error.message);
    if (ledgerRes.error) console.error("[PnL] Failed to load ledger:", ledgerRes.error.message);

    if (eventRes.data) setEvent(eventRes.data);
    if (contractsRes.data) setContracts(contractsRes.data as unknown as ContractRow[]);
    if (ledgerRes.data) setLedgerEntries(ledgerRes.data);
    if (invoicesRes.data) setInvoices(invoicesRes.data);
    if (expensesRes.data) setExpenses(expensesRes.data);
    setLoading(false);
  }

  async function saveCommissionPercent(contract: ContractRow) {
    const percent = parseFloat(editPercent);
    if (isNaN(percent) || percent < 0 || percent > 100) {
      addToast({ title: "Enter a valid percentage (0–100)", variant: "destructive" });
      return;
    }
    setSavingContract(contract.id);
    const amount = Math.round(((Number(contract.agreed_amount) * percent) / 100) * 100) / 100;
    const received = Number(contract.commission_received) || 0;
    const status =
      percent <= 0 ? "none"
      : received <= 0 ? "pending"
      : received >= amount ? "received"
      : "partial";

    const { error } = await supabase
      .from("contracts")
      .update({ commission_percent: percent, commission_amount: amount, commission_status: status })
      .eq("id", contract.id);

    if (error) {
      addToast({ title: "Failed to update commission", description: error.message, variant: "destructive" });
    } else {
      addToast({ title: "Commission updated", variant: "success" });
      setEditingContract(null);
      setEditPercent("");
      await loadData();
    }
    setSavingContract(null);
  }

  async function markCommissionReceived(contract: ContractRow) {
    setSavingContract(contract.id);
    const { error } = await supabase
      .from("contracts")
      .update({
        commission_received: Number(contract.commission_amount) || 0,
        commission_status: "received",
      })
      .eq("id", contract.id);

    if (error) {
      addToast({ title: "Failed to mark received", description: error.message, variant: "destructive" });
    } else {
      addToast({ title: "Commission marked as received", variant: "success" });
      await loadData();
    }
    setSavingContract(null);
  }

  if (loading) {
    return (
      <div className="space-y-4 px-4 pt-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="px-4 pt-4 text-center">
        <p>Event not found.</p>
        <Button asChild className="mt-4">
          <Link href="/events">Back to Events</Link>
        </Button>
      </div>
    );
  }

  // ---------- Income ----------
  const activeInvoices = invoices.filter((i) => i.status !== "cancelled");
  const invoicedTotal = activeInvoices.reduce((s, i) => s + Number(i.total), 0);
  const receivedFromClient = activeInvoices.reduce((s, i) => s + Number(i.amount_paid), 0);

  const activeContracts = contracts.filter((c) => c.status !== "cancelled");
  const commissionEarned = activeContracts.reduce((s, c) => s + (Number(c.commission_amount) || 0), 0);
  const commissionReceived = activeContracts.reduce((s, c) => s + (Number(c.commission_received) || 0), 0);

  // ---------- Costs ----------
  const vendorPaid = ledgerEntries.reduce(
    (s, e) => (e.txn_type === "REFUND" ? s - Number(e.amount) : s + Number(e.amount)),
    0
  );
  const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalAgreed = activeContracts.reduce((s, c) => s + Number(c.agreed_amount), 0);

  // ---------- Profit ----------
  const actualIncome = receivedFromClient + commissionReceived;
  const actualCosts = vendorPaid + expensesTotal;
  const netProfit = actualIncome - actualCosts;

  const projectedIncome = invoicedTotal + commissionEarned;
  const projectedCosts = totalAgreed + expensesTotal;
  const projectedProfit = projectedIncome - projectedCosts;

  const marginPercent = actualIncome > 0 ? (netProfit / actualIncome) * 100 : null;

  // Vendor payments grouped by vendor
  const vendorPayments = new Map<string, number>();
  ledgerEntries.forEach((entry) => {
    const current = vendorPayments.get(entry.vendor_id) || 0;
    vendorPayments.set(
      entry.vendor_id,
      entry.txn_type === "REFUND" ? current - Number(entry.amount) : current + Number(entry.amount)
    );
  });

  const commissionBadge = (status: Contract["commission_status"]) => {
    switch (status) {
      case "received": return <Badge variant="success" className="text-[10px]">Received</Badge>;
      case "partial": return <Badge variant="warning" className="text-[10px]">Partial</Badge>;
      case "pending": return <Badge variant="secondary" className="text-[10px]">Pending</Badge>;
      default: return null;
    }
  };

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/events/${eventId}`} className="rounded-full p-2 hover:bg-navy-100 dark:hover:bg-navy-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Profit &amp; Loss</h1>
          <p className="text-sm text-navy-500">{event.client_name}</p>
        </div>
      </div>

      {/* Net Profit — big card */}
      <div
        className={`mb-4 rounded-2xl p-5 text-white shadow-md ${
          netProfit >= 0
            ? "bg-gradient-to-br from-emerald-600 to-emerald-700"
            : "bg-gradient-to-br from-red-600 to-red-700"
        }`}
      >
        <div className="flex items-center gap-2">
          {netProfit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          <p className="text-sm font-medium opacity-90">Net Profit (money in hand)</p>
        </div>
        <p className="mt-1 text-3xl font-extrabold">
          {netProfit < 0 ? "-" : ""}{formatCurrency(Math.abs(netProfit))}
        </p>
        <p className="mt-1 text-xs opacity-80">
          Received {formatCurrency(actualIncome)} &minus; Spent {formatCurrency(actualCosts)}
          {marginPercent !== null ? ` · ${Math.round(marginPercent)}% margin` : ""}
        </p>

        <div className="mt-4 rounded-xl bg-white/15 p-3">
          <p className="text-xs font-medium opacity-90">Projected Profit (when fully settled)</p>
          <p className={`text-xl font-bold`}>
            {projectedProfit < 0 ? "-" : ""}{formatCurrency(Math.abs(projectedProfit))}
          </p>
          <p className="mt-0.5 text-[11px] opacity-75">
            Invoiced + commissions {formatCurrency(projectedIncome)} &minus; Agreed + expenses {formatCurrency(projectedCosts)}
          </p>
        </div>
      </div>

      {/* Income */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowDownCircle className="h-4 w-4 text-emerald-600" /> Income
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <div className="flex items-center justify-between text-sm">
            <span className="text-navy-500">Invoiced to client</span>
            <span className="font-semibold text-navy-900 dark:text-navy-100">{formatCurrency(invoicedTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-navy-500">Received from client</span>
            <span className="font-semibold text-emerald-600">{formatCurrency(receivedFromClient)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-navy-500">Commission earned</span>
            <span className="font-semibold text-navy-900 dark:text-navy-100">{formatCurrency(commissionEarned)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-navy-500">Commission received</span>
            <span className="font-semibold text-emerald-600">{formatCurrency(commissionReceived)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-navy-100 pt-2 text-sm dark:border-navy-800">
            <span className="font-medium text-navy-700 dark:text-navy-300">Total received</span>
            <span className="font-bold text-emerald-600">{formatCurrency(actualIncome)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Costs */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowUpCircle className="h-4 w-4 text-red-500" /> Costs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <div className="flex items-center justify-between text-sm">
            <span className="text-navy-500">Vendor payments</span>
            <span className="font-semibold text-red-500">{formatCurrency(vendorPaid)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-navy-500">Out-of-pocket expenses</span>
            <span className="font-semibold text-red-500">{formatCurrency(expensesTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-navy-500">Vendor amounts still due</span>
            <span className="font-semibold text-amber-600">{formatCurrency(Math.max(0, totalAgreed - vendorPaid))}</span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-navy-100 pt-2 text-sm dark:border-navy-800">
            <span className="font-medium text-navy-700 dark:text-navy-300">Total spent</span>
            <span className="font-bold text-red-500">{formatCurrency(actualCosts)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Vendor breakdown */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Vendor Breakdown</h2>
        <span className="text-xs text-navy-500">{activeContracts.length} vendor{activeContracts.length === 1 ? "" : "s"}</span>
      </div>

      {activeContracts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-navy-500">
            No vendors added yet.{" "}
            <Link href={`/events/${eventId}/add-vendor`} className="font-medium text-navy-900 underline dark:text-navy-100">
              Add a vendor
            </Link>{" "}
            to start tracking payments and commission.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeContracts.map((contract) => {
            const agreed = Number(contract.agreed_amount);
            const paid = vendorPayments.get(contract.vendor_id) || 0;
            const commAmount = Number(contract.commission_amount) || 0;
            const commReceived = Number(contract.commission_received) || 0;
            const hasCommission = commAmount > 0;
            const isEditing = editingContract === contract.id;
            const isSaving = savingContract === contract.id;

            return (
              <Card key={contract.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-navy-900 dark:text-navy-100">{contract.vendor?.name || "Vendor"}</p>
                      <p className="text-xs capitalize text-navy-500">
                        {contract.vendor?.category?.replace("_", " ")}
                        {contract.description ? ` · ${contract.description}` : ""}
                      </p>
                    </div>
                    {hasCommission && commissionBadge(contract.commission_status)}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-navy-50 p-2 dark:bg-navy-800">
                      <p className="text-[10px] text-navy-500">Agreed</p>
                      <p className="text-sm font-bold text-navy-900 dark:text-navy-100">{formatCurrency(agreed)}</p>
                    </div>
                    <div className="rounded-lg bg-navy-50 p-2 dark:bg-navy-800">
                      <p className="text-[10px] text-navy-500">Paid</p>
                      <p className="text-sm font-bold text-emerald-600">{formatCurrency(paid)}</p>
                    </div>
                    <div className="rounded-lg bg-navy-50 p-2 dark:bg-navy-800">
                      <p className="text-[10px] text-navy-500">Commission</p>
                      <p className="text-sm font-bold text-navy-900 dark:text-navy-100">
                        {hasCommission ? formatCurrency(commAmount) : "—"}
                      </p>
                      {hasCommission && (
                        <p className="text-[10px] text-navy-500">{Number(contract.commission_percent) || 0}%</p>
                      )}
                    </div>
                  </div>

                  {/* Commission actions */}
                  {isEditing ? (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max="100"
                          step="0.5"
                          autoFocus
                          placeholder="Commission %"
                          value={editPercent}
                          onChange={(e) => setEditPercent(e.target.value)}
                          className="h-9 w-full rounded-lg border border-navy-200 bg-white px-3 pr-8 text-sm focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-100"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-navy-400">%</span>
                      </div>
                      <Button size="sm" onClick={() => saveCommissionPercent(contract)} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingContract(null); setEditPercent(""); }}
                        disabled={isSaving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {hasCommission && contract.commission_status !== "received" && (
                        <Button size="sm" onClick={() => markCommissionReceived(contract)} disabled={isSaving}>
                          {isSaving ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Mark commission received
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingContract(contract.id);
                          setEditPercent(contract.commission_percent ? String(Number(contract.commission_percent)) : "");
                        }}
                      >
                        {hasCommission ? (
                          <><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit %</>
                        ) : (
                          <><Percent className="mr-1.5 h-3.5 w-3.5" /> Add commission</>
                        )}
                      </Button>
                      {hasCommission && commReceived > 0 && contract.commission_status !== "received" && (
                        <span className="text-xs text-navy-500">
                          {formatCurrency(commReceived)} of {formatCurrency(commAmount)} received
                        </span>
                      )}
                      {contract.commission_status === "received" && (
                        <span className="text-xs text-emerald-600">
                          {formatCurrency(commReceived)} received
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
