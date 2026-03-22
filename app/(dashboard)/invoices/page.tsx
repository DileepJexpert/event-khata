"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Plus, Loader2, FileText, Send, Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import type { Invoice } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-navy-100 text-navy-500",
};

export default function InvoicesPage() {
  const supabase = createClient();
  const { addToast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
    if (data) setInvoices(data);
    setLoading(false);
  }

  const filtered = filterStatus === "all" ? invoices : invoices.filter((i) => i.status === filterStatus);
  const totalOutstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + (i.total - i.amount_paid), 0);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Invoices</h1>
          <p className="text-sm text-navy-500">Outstanding: {formatCurrency(totalOutstanding)}</p>
        </div>
        <Link href="/invoices/new">
          <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Invoice</Button>
        </Link>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {["all", "draft", "sent", "paid", "overdue"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
              filterStatus === s ? "bg-navy-900 text-white" : "bg-navy-100 text-navy-600"
            }`}>{s}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((inv) => (
          <Link key={inv.id} href={`/invoices/${inv.id}`} className="block rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-100">
                  <FileText className="h-5 w-5 text-navy-600" />
                </div>
                <div>
                  <p className="font-semibold text-navy-900">{inv.invoice_number}</p>
                  <p className="text-xs text-navy-500">{inv.client_name}</p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[inv.status]}`}>
                {inv.status}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-navy-500">
                {inv.due_date && `Due: ${formatDate(inv.due_date)}`}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-navy-900">{formatCurrency(inv.total)}</p>
                {inv.amount_paid > 0 && inv.amount_paid < inv.total && (
                  <p className="text-xs text-navy-500">Paid: {formatCurrency(inv.amount_paid)}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-navy-400">No invoices yet. Create your first invoice!</p>
        )}
      </div>
    </div>
  );
}
