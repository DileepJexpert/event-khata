"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import type { Agency, Invoice } from "@/lib/types";

function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function GstReportPage() {
  const supabase = createClient();

  const initial = monthRange(currentMonth());
  const [month, setMonth] = useState(currentMonth());
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("agencies")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAgency(data);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fromDate || !toDate) return;
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  async function loadInvoices() {
    setLoading(true);
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .neq("status", "cancelled")
      .gte("created_at", `${fromDate}T00:00:00`)
      .lte("created_at", `${toDate}T23:59:59`)
      .order("created_at", { ascending: true });
    setInvoices(data || []);
    setLoading(false);
  }

  function handleMonthChange(value: string) {
    setMonth(value);
    if (value) {
      const { from, to } = monthRange(value);
      setFromDate(from);
      setToDate(to);
    }
  }

  const totals = invoices.reduce(
    (acc, inv) => ({
      taxable: acc.taxable + Number(inv.subtotal || 0),
      cgst: acc.cgst + Number(inv.cgst_amount || 0),
      sgst: acc.sgst + Number(inv.sgst_amount || 0),
      igst: acc.igst + Number(inv.igst_amount || 0),
      total: acc.total + Number(inv.total || 0),
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
  );

  function exportCSV() {
    let csv = "Invoice No,Date,Client,Client GSTIN,Place of Supply,HSN/SAC,GST Type,Taxable Value,CGST,SGST,IGST,Total\n";
    invoices.forEach((inv) => {
      csv += [
        `"${inv.invoice_number}"`,
        formatDate(inv.created_at),
        `"${inv.client_name}"`,
        `"${inv.client_gstin || ""}"`,
        `"${inv.place_of_supply || ""}"`,
        `"${inv.hsn_sac || ""}"`,
        inv.gst_type || "none",
        Number(inv.subtotal || 0),
        Number(inv.cgst_amount || 0),
        Number(inv.sgst_amount || 0),
        Number(inv.igst_amount || 0),
        Number(inv.total || 0),
      ].join(",") + "\n";
    });
    csv += ["TOTAL", "", "", "", "", "", "", totals.taxable, totals.cgst, totals.sgst, totals.igst, totals.total].join(",") + "\n";
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eventkhata-gst-report-${fromDate}-to-${toDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/reports" className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 dark:bg-navy-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-navy-900 dark:text-navy-100">GST Summary</h1>
          <p className="text-xs text-navy-500">Outward supplies for GSTR filing</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={invoices.length === 0}>
          <Download className="mr-2 h-4 w-4" /> CSV
        </Button>
      </div>

      {agency?.gstin && (
        <p className="mb-4 text-xs text-navy-500">
          {agency.name} &middot; GSTIN: <span className="font-medium text-navy-700 dark:text-navy-300">{agency.gstin}</span>
          {agency.gst_state_code ? ` · State Code: ${agency.gst_state_code}` : ""}
        </p>
      )}

      {/* Period picker */}
      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
        <div className="space-y-2">
          <Label>Month</Label>
          <Input type="month" value={month} onChange={(e) => handleMonthChange(e.target.value)} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>From</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
          <p className="text-xs text-navy-500">Taxable Value</p>
          <p className="text-lg font-bold text-navy-900 dark:text-navy-100">{formatCurrency(totals.taxable)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
          <p className="text-xs text-navy-500">Total GST</p>
          <p className="text-lg font-bold text-navy-900 dark:text-navy-100">{formatCurrency(totals.cgst + totals.sgst + totals.igst)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
          <p className="text-xs text-navy-500">CGST + SGST</p>
          <p className="text-lg font-bold text-navy-900 dark:text-navy-100">{formatCurrency(totals.cgst + totals.sgst)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
          <p className="text-xs text-navy-500">IGST</p>
          <p className="text-lg font-bold text-navy-900 dark:text-navy-100">{formatCurrency(totals.igst)}</p>
        </div>
      </div>

      {/* Invoice table */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : invoices.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices in this period" description="Invoices created in the selected period will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm dark:bg-navy-900">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-left text-xs text-navy-500 dark:border-navy-800">
                <th className="p-3 font-semibold">Invoice</th>
                <th className="p-3 font-semibold">Date</th>
                <th className="p-3 font-semibold">Client / GSTIN</th>
                <th className="p-3 font-semibold">Place of Supply</th>
                <th className="p-3 text-right font-semibold">Taxable</th>
                <th className="p-3 text-right font-semibold">CGST</th>
                <th className="p-3 text-right font-semibold">SGST</th>
                <th className="p-3 text-right font-semibold">IGST</th>
                <th className="p-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-navy-50 dark:border-navy-800">
                  <td className="p-3">
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-navy-900 underline-offset-2 hover:underline dark:text-navy-100">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap p-3 text-navy-600 dark:text-navy-400">{formatDate(inv.created_at)}</td>
                  <td className="p-3">
                    <p className="text-navy-900 dark:text-navy-100">{inv.client_name}</p>
                    {inv.client_gstin && <p className="text-xs text-navy-500">{inv.client_gstin}</p>}
                  </td>
                  <td className="p-3 text-navy-600 dark:text-navy-400">{inv.place_of_supply || "-"}</td>
                  <td className="p-3 text-right font-medium">{formatCurrency(Number(inv.subtotal || 0))}</td>
                  <td className="p-3 text-right">{formatCurrency(Number(inv.cgst_amount || 0))}</td>
                  <td className="p-3 text-right">{formatCurrency(Number(inv.sgst_amount || 0))}</td>
                  <td className="p-3 text-right">{formatCurrency(Number(inv.igst_amount || 0))}</td>
                  <td className="p-3 text-right font-semibold">{formatCurrency(Number(inv.total || 0))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-navy-50 font-bold text-navy-900 dark:bg-navy-800 dark:text-navy-100">
                <td className="p-3" colSpan={4}>Total ({invoices.length} invoice{invoices.length > 1 ? "s" : ""})</td>
                <td className="p-3 text-right">{formatCurrency(totals.taxable)}</td>
                <td className="p-3 text-right">{formatCurrency(totals.cgst)}</td>
                <td className="p-3 text-right">{formatCurrency(totals.sgst)}</td>
                <td className="p-3 text-right">{formatCurrency(totals.igst)}</td>
                <td className="p-3 text-right">{formatCurrency(totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
