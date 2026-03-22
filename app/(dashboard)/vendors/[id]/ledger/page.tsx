"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import type { Vendor, LedgerEntry, Event } from "@/lib/types";

type LedgerRow = LedgerEntry & { event?: Event };

export default function VendorLedgerPage() {
  const supabase = createClient();
  const params = useParams();
  const vendorId = params.id as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [entries, setEntries] = useState<LedgerRow[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const [vRes, lRes, cRes] = await Promise.all([
      supabase.from("vendors").select("*").eq("id", vendorId).single(),
      supabase.from("ledger").select("*, event:events(client_name, id)").eq("vendor_id", vendorId).order("recorded_at", { ascending: false }),
      supabase.from("contracts").select("*, event:events(client_name)").eq("vendor_id", vendorId),
    ]);
    if (vRes.data) setVendor(vRes.data);
    if (lRes.data) setEntries(lRes.data as any);
    if (cRes.data) setContracts(cRes.data);
    setLoading(false);
  }

  const totalAgreed = contracts.reduce((s, c) => s + c.agreed_amount, 0);
  const totalPaid = entries.reduce((s, e) => s + (e.txn_type === "REFUND" ? -e.amount : e.amount), 0);
  const balance = totalAgreed - totalPaid;

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/vendors/${vendorId}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{vendor?.name} - Ledger</h1>
          <p className="text-sm capitalize text-navy-500">{vendor?.category?.replace("_", " ")}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-white p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-navy-900">{formatCurrency(totalAgreed)}</p>
          <p className="text-[10px] text-navy-500">Total Agreed</p>
        </div>
        <div className="rounded-xl bg-white p-3 text-center shadow-sm">
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
          <p className="text-[10px] text-navy-500">Total Paid</p>
        </div>
        <div className="rounded-xl bg-white p-3 text-center shadow-sm">
          <p className={`text-lg font-bold ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}>{formatCurrency(Math.abs(balance))}</p>
          <p className="text-[10px] text-navy-500">{balance > 0 ? "Balance Due" : "Settled"}</p>
        </div>
      </div>

      {/* Contracts */}
      <h2 className="mb-2 text-sm font-bold text-navy-700">Contracts</h2>
      <div className="mb-6 space-y-2">
        {contracts.map((c: any) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
            <div>
              <p className="text-sm font-medium text-navy-900">{c.event?.client_name}</p>
              <p className="text-xs text-navy-500">{c.description || "Contract"}</p>
            </div>
            <p className="font-bold text-navy-900">{formatCurrency(c.agreed_amount)}</p>
          </div>
        ))}
        {contracts.length === 0 && <p className="text-sm text-navy-400">No contracts</p>}
      </div>

      {/* Ledger entries */}
      <h2 className="mb-2 text-sm font-bold text-navy-700">Payment History</h2>
      <div className="space-y-2">
        {entries.map((entry) => {
          let runningBalance = 0;
          return (
            <div key={entry.id} className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
              <div className={`h-2 w-2 rounded-full ${entry.txn_type === "REFUND" ? "bg-red-500" : "bg-emerald-500"}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-navy-900">{(entry.event as any)?.client_name}</p>
                  <p className={`text-sm font-bold ${entry.txn_type === "REFUND" ? "text-red-600" : "text-emerald-600"}`}>
                    {entry.txn_type === "REFUND" ? "-" : "+"}{formatCurrency(entry.amount)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-navy-500">
                  <span>{formatDate(entry.recorded_at)}</span>
                  <span>&middot;</span>
                  <span>{entry.txn_type}</span>
                  <span>&middot;</span>
                  <span>{entry.payment_mode}</span>
                  {entry.reference_number && <span>&middot; Ref: {entry.reference_number}</span>}
                </div>
              </div>
            </div>
          );
        })}
        {entries.length === 0 && <p className="text-sm text-navy-400">No payments recorded</p>}
      </div>
    </div>
  );
}
