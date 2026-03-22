"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { BarChart3, Download, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, VENDOR_CATEGORIES } from "@/lib/utils";
import Link from "next/link";
import type { Event, LedgerEntry, Contract } from "@/lib/types";

type EventReport = { event: Event; totalSpent: number; budget: number; totalAgreed: number; profit: number };
type VendorReport = { vendorId: string; vendorName: string; category: string | null; totalPaid: number };
type CategoryReport = { category: string; label: string; totalAgreed: number; totalPaid: number; vendorCount: number };

export default function ReportsPage() {
  const supabase = createClient();
  const [eventReports, setEventReports] = useState<EventReport[]>([]);
  const [vendorReports, setVendorReports] = useState<VendorReport[]>([]);
  const [categoryReports, setCategoryReports] = useState<CategoryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"events" | "vendors" | "categories" | "pnl">("events");

  // P&L data
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalAgreed, setTotalAgreed] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);

  useEffect(() => { loadReports(); }, []);

  async function loadReports() {
    const [eventsRes, ledgerRes, vendorsRes, contractsRes] = await Promise.all([
      supabase.from("events").select("*").order("event_date", { ascending: false }),
      supabase.from("ledger").select("*"),
      supabase.from("vendors").select("id, name, category"),
      supabase.from("contracts").select("*, vendor:vendors(category)"),
    ]);

    const events = eventsRes.data || [];
    const ledger = ledgerRes.data || [];
    const vendors = vendorsRes.data || [];
    const contracts = contractsRes.data || [];

    // Event reports with P&L
    const eReports: EventReport[] = events.map((event) => {
      const eventLedger = ledger.filter((l) => l.event_id === event.id);
      const eventContracts = contracts.filter((c) => c.event_id === event.id);
      const totalSpent = eventLedger.reduce((sum, e) => e.txn_type === "REFUND" ? sum - Number(e.amount) : sum + Number(e.amount), 0);
      const evtAgreed = eventContracts.reduce((s, c) => s + Number(c.agreed_amount), 0);
      const budget = Number(event.total_budget) || 0;
      return { event, totalSpent, budget, totalAgreed: evtAgreed, profit: budget - evtAgreed };
    });

    // Vendor totals
    const vendorTotals = new Map<string, number>();
    ledger.forEach((entry) => {
      const current = vendorTotals.get(entry.vendor_id) || 0;
      vendorTotals.set(entry.vendor_id, entry.txn_type === "REFUND" ? current - Number(entry.amount) : current + Number(entry.amount));
    });
    const vReports: VendorReport[] = vendors
      .map((v) => ({ vendorId: v.id, vendorName: v.name, category: v.category, totalPaid: vendorTotals.get(v.id) || 0 }))
      .filter((v) => v.totalPaid > 0)
      .sort((a, b) => b.totalPaid - a.totalPaid);

    // Category reports
    const catMap = new Map<string, { agreed: number; paid: number; vendors: Set<string> }>();
    contracts.forEach((c: any) => {
      const cat = c.vendor?.category || "other";
      const existing = catMap.get(cat) || { agreed: 0, paid: 0, vendors: new Set() };
      existing.agreed += Number(c.agreed_amount);
      existing.vendors.add(c.vendor_id);
      catMap.set(cat, existing);
    });
    ledger.forEach((l) => {
      const vendor = vendors.find((v) => v.id === l.vendor_id);
      const cat = vendor?.category || "other";
      const existing = catMap.get(cat) || { agreed: 0, paid: 0, vendors: new Set() };
      existing.paid += l.txn_type === "REFUND" ? -Number(l.amount) : Number(l.amount);
      catMap.set(cat, existing);
    });
    const cReports: CategoryReport[] = Array.from(catMap.entries())
      .map(([cat, data]) => ({
        category: cat,
        label: VENDOR_CATEGORIES.find((c) => c.value === cat)?.label || cat,
        totalAgreed: data.agreed,
        totalPaid: data.paid,
        vendorCount: data.vendors.size,
      }))
      .sort((a, b) => b.totalPaid - a.totalPaid);

    // Totals
    const tBudget = events.reduce((s, e) => s + (Number(e.total_budget) || 0), 0);
    const tAgreed = contracts.reduce((s, c) => s + Number(c.agreed_amount), 0);
    const tPaid = ledger.reduce((s, l) => s + (l.txn_type === "REFUND" ? -Number(l.amount) : Number(l.amount)), 0);

    setEventReports(eReports);
    setVendorReports(vReports);
    setCategoryReports(cReports);
    setTotalBudget(tBudget);
    setTotalAgreed(tAgreed);
    setTotalPaid(tPaid);
    setTotalProfit(tBudget - tAgreed);
    setLoading(false);
  }

  function exportCSV() {
    let csv = "";
    if (activeTab === "events") {
      csv = "Event,Type,Status,Budget,Agreed,Spent,Profit\n";
      eventReports.forEach((r) => {
        csv += `"${r.event.client_name}","${r.event.event_type}","${r.event.status}",${r.budget},${r.totalAgreed},${r.totalSpent},${r.profit}\n`;
      });
    } else if (activeTab === "vendors") {
      csv = "Vendor,Category,Total Paid\n";
      vendorReports.forEach((r) => {
        csv += `"${r.vendorName}","${r.category || ""}",${r.totalPaid}\n`;
      });
    } else if (activeTab === "categories") {
      csv = "Category,Vendors,Agreed,Paid\n";
      categoryReports.forEach((r) => {
        csv += `"${r.label}",${r.vendorCount},${r.totalAgreed},${r.totalPaid}\n`;
      });
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `eventkhata-${activeTab}-report.csv`; a.click();
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-900">Reports</h1>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="mr-2 h-4 w-4" /> CSV
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-navy-100 p-1">
        {(["events", "vendors", "categories", "pnl"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
              activeTab === tab ? "bg-white text-navy-900 shadow-sm" : "text-navy-500"
            }`}>
            {tab === "pnl" ? "P&L" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : activeTab === "pnl" ? (
        <div className="space-y-4">
          {/* P&L Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs text-navy-500">Total Budget (Revenue)</p>
              <p className="text-xl font-bold text-navy-900">{formatCurrency(totalBudget)}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs text-navy-500">Total Vendor Cost</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalAgreed)}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs text-navy-500">Total Paid Out</p>
              <p className="text-xl font-bold text-amber-600">{formatCurrency(totalPaid)}</p>
            </div>
            <div className={`rounded-xl p-4 shadow-sm ${totalProfit >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
              <p className="text-xs text-navy-500">Estimated Profit</p>
              <div className="flex items-center gap-1">
                {totalProfit >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                <p className={`text-xl font-bold ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(Math.abs(totalProfit))}
                </p>
              </div>
            </div>
          </div>

          {/* Per-event P&L */}
          <h2 className="text-lg font-bold text-navy-900">Event-wise P&L</h2>
          <div className="space-y-2">
            {eventReports.filter((r) => r.budget > 0).map((r) => (
              <Link key={r.event.id} href={`/events/${r.event.id}`} className="block rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-navy-900">{r.event.client_name}</p>
                    <p className="text-xs text-navy-500">Budget: {formatCurrency(r.budget)} &middot; Cost: {formatCurrency(r.totalAgreed)}</p>
                  </div>
                  <div className={`text-right ${r.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    <p className="text-lg font-bold">{r.profit >= 0 ? "+" : ""}{formatCurrency(r.profit)}</p>
                    <p className="text-xs">{r.budget > 0 ? `${((r.profit / r.budget) * 100).toFixed(0)}% margin` : ""}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : activeTab === "categories" ? (
        categoryReports.length === 0 ? (
          <EmptyState icon={BarChart3} title="No data yet" description="Add vendors and contracts to see category breakdown." />
        ) : (
          <div className="space-y-3">
            {categoryReports.map((r) => {
              const percent = totalPaid > 0 ? (r.totalPaid / totalPaid) * 100 : 0;
              return (
                <div key={r.category} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold capitalize text-navy-900">{r.label}</h3>
                      <p className="text-xs text-navy-500">{r.vendorCount} vendor{r.vendorCount > 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-navy-900">{formatCurrency(r.totalPaid)}</p>
                      <p className="text-xs text-navy-500">{percent.toFixed(1)}% of total</p>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-navy-100">
                    <div className="h-full rounded-full bg-navy-600" style={{ width: `${Math.min(percent, 100)}%` }} />
                  </div>
                  {r.totalAgreed > 0 && (
                    <p className="mt-1 text-xs text-navy-500">Agreed: {formatCurrency(r.totalAgreed)} &middot; Paid: {((r.totalPaid / r.totalAgreed) * 100).toFixed(0)}%</p>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === "events" ? (
        eventReports.length === 0 ? (
          <EmptyState icon={BarChart3} title="No data yet" description="Create events and log payments to see reports." />
        ) : (
          <div className="space-y-3">
            {eventReports.map((report) => (
              <Link key={report.event.id} href={`/events/${report.event.id}`}>
                <Card>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold">{report.event.client_name}</h3>
                      <span className="text-xs capitalize text-navy-500">{report.event.status}</span>
                    </div>
                    {report.budget > 0 ? (
                      <>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="text-navy-500">Spent: {formatCurrency(report.totalSpent)}</span>
                          <span className="font-medium">Budget: {formatCurrency(report.budget)}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-navy-100">
                          <div className={`h-full rounded-full ${
                            report.budget > 0 && report.totalSpent / report.budget > 0.9 ? "bg-red-500" :
                            report.totalSpent / report.budget > 0.7 ? "bg-amber-500" : "bg-emerald-500"
                          }`} style={{ width: `${Math.min((report.totalSpent / report.budget) * 100, 100)}%` }} />
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-navy-500">Spent: {formatCurrency(report.totalSpent)} (no budget set)</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )
      ) : vendorReports.length === 0 ? (
        <EmptyState icon={BarChart3} title="No data yet" description="Log payments to see vendor reports." />
      ) : (
        <div className="space-y-3">
          {vendorReports.map((report) => (
            <Link key={report.vendorId} href={`/vendors/${report.vendorId}/ledger`}>
              <Card>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-semibold">{report.vendorName}</h3>
                    {report.category && <span className="text-xs capitalize text-navy-500">{report.category.replace("_", " ")}</span>}
                  </div>
                  <span className="text-lg font-bold text-emerald-600">{formatCurrency(report.totalPaid)}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
