"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { BarChart3, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Event, LedgerEntry } from "@/lib/types";

type EventReport = {
  event: Event;
  totalSpent: number;
  budget: number;
};

type VendorReport = {
  vendorId: string;
  vendorName: string;
  category: string | null;
  totalPaid: number;
};

export default function ReportsPage() {
  const supabase = createClient();
  const [eventReports, setEventReports] = useState<EventReport[]>([]);
  const [vendorReports, setVendorReports] = useState<VendorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"events" | "vendors">("events");

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    const [eventsRes, ledgerRes, vendorsRes] = await Promise.all([
      supabase.from("events").select("*").order("event_date", { ascending: false }),
      supabase.from("ledger").select("*"),
      supabase.from("vendors").select("id, name, category"),
    ]);

    if (eventsRes.error) console.error("[Reports] Failed to load events:", eventsRes.error.message, eventsRes.error);
    if (ledgerRes.error) console.error("[Reports] Failed to load ledger:", ledgerRes.error.message, ledgerRes.error);
    if (vendorsRes.error) console.error("[Reports] Failed to load vendors:", vendorsRes.error.message, vendorsRes.error);

    const events = eventsRes.data || [];
    const ledger = ledgerRes.data || [];
    const vendors = vendorsRes.data || [];

    // Event reports
    const eReports: EventReport[] = events.map((event) => {
      const eventLedger = ledger.filter((l) => l.event_id === event.id);
      const totalSpent = eventLedger.reduce((sum, e) => {
        return e.txn_type === "REFUND" ? sum - Number(e.amount) : sum + Number(e.amount);
      }, 0);
      return { event, totalSpent, budget: Number(event.total_budget) || 0 };
    });

    // Vendor reports
    const vendorTotals = new Map<string, number>();
    ledger.forEach((entry) => {
      const current = vendorTotals.get(entry.vendor_id) || 0;
      vendorTotals.set(
        entry.vendor_id,
        entry.txn_type === "REFUND" ? current - Number(entry.amount) : current + Number(entry.amount)
      );
    });

    const vReports: VendorReport[] = vendors
      .map((v) => ({
        vendorId: v.id,
        vendorName: v.name,
        category: v.category,
        totalPaid: vendorTotals.get(v.id) || 0,
      }))
      .filter((v) => v.totalPaid > 0)
      .sort((a, b) => b.totalPaid - a.totalPaid);

    setEventReports(eReports);
    setVendorReports(vReports);
    setLoading(false);
  }

  function exportCSV() {
    let csv = "";
    if (activeTab === "events") {
      csv = "Event,Type,Date,Budget,Spent,Remaining\n";
      eventReports.forEach((r) => {
        csv += `"${r.event.client_name}","${r.event.event_type}","${r.event.event_date || ""}",${r.budget},${r.totalSpent},${r.budget - r.totalSpent}\n`;
      });
    } else {
      csv = "Vendor,Category,Total Paid\n";
      vendorReports.forEach((r) => {
        csv += `"${r.vendorName}","${r.category || ""}",${r.totalPaid}\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eventkhata-${activeTab}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Reports</h1>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="mr-2 h-4 w-4" /> CSV
        </Button>
      </div>

      <div className="mb-4 flex gap-2">
        {(["events", "vendors"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? "bg-navy-900 text-white" : "bg-white text-navy-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : activeTab === "events" ? (
        eventReports.length === 0 ? (
          <EmptyState icon={BarChart3} title="No data yet" description="Create events and log payments to see reports." />
        ) : (
          <div className="space-y-3">
            {eventReports.map((report) => (
              <Card key={report.event.id}>
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
                        <div
                          className={`h-full rounded-full ${
                            report.budget > 0 && report.totalSpent / report.budget > 0.9
                              ? "bg-red-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min((report.totalSpent / report.budget) * 100, 100)}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-navy-500">Spent: {formatCurrency(report.totalSpent)} (no budget set)</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : vendorReports.length === 0 ? (
        <EmptyState icon={BarChart3} title="No data yet" description="Log payments to see vendor reports." />
      ) : (
        <div className="space-y-3">
          {vendorReports.map((report) => (
            <Card key={report.vendorId}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-semibold">{report.vendorName}</h3>
                  {report.category && (
                    <span className="text-xs capitalize text-navy-500">{report.category.replace("_", " ")}</span>
                  )}
                </div>
                <span className="text-lg font-bold text-emerald-600">{formatCurrency(report.totalPaid)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
