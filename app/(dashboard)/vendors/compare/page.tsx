"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Star, Phone, Check } from "lucide-react";
import { formatCurrency, VENDOR_CATEGORIES } from "@/lib/utils";
import Link from "next/link";
import type { Vendor } from "@/lib/types";

type VendorWithStats = Vendor & {
  totalPaid: number;
  eventCount: number;
  avgDeal: number;
};

export default function CompareVendorsPage() {
  const supabase = createClient();
  const [vendors, setVendors] = useState<VendorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const [vRes, lRes, cRes] = await Promise.all([
      supabase.from("vendors").select("*"),
      supabase.from("ledger").select("vendor_id, amount, txn_type"),
      supabase.from("contracts").select("vendor_id, agreed_amount"),
    ]);

    const ledger = lRes.data || [];
    const contracts = cRes.data || [];

    const vendorStats = (vRes.data || []).map((v) => {
      const payments = ledger.filter((l) => l.vendor_id === v.id);
      const vendorContracts = contracts.filter((c) => c.vendor_id === v.id);
      const totalPaid = payments.reduce((s, p) => s + (p.txn_type === "REFUND" ? -Number(p.amount) : Number(p.amount)), 0);
      const eventCount = new Set(vendorContracts.map((c) => c.vendor_id)).size ? vendorContracts.length : 0;
      const avgDeal = eventCount > 0 ? vendorContracts.reduce((s, c) => s + Number(c.agreed_amount), 0) / eventCount : 0;
      return { ...v, totalPaid, eventCount, avgDeal };
    });

    setVendors(vendorStats);
    setLoading(false);
  }

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  const filtered = filterCategory === "all"
    ? vendors
    : vendors.filter((v) => v.category === filterCategory);

  const selectedVendors = vendors.filter((v) => selected.includes(v.id));
  const usedCategories = Array.from(new Set(vendors.map((v) => v.category).filter(Boolean)));

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/vendors" className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Compare Vendors</h1>
          <p className="text-sm text-navy-500">Select up to 3 vendors to compare</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        <button onClick={() => setFilterCategory("all")}
          className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${filterCategory === "all" ? "bg-navy-900 text-white" : "bg-navy-100 text-navy-600"}`}>All</button>
        {usedCategories.map((cat) => {
          const label = VENDOR_CATEGORIES.find((c) => c.value === cat)?.label || cat;
          return (
            <button key={cat} onClick={() => setFilterCategory(cat!)}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${filterCategory === cat ? "bg-navy-900 text-white" : "bg-navy-100 text-navy-600"}`}>{label}</button>
          );
        })}
      </div>

      {/* Comparison Table */}
      {selectedVendors.length >= 2 && (
        <div className="mb-6 overflow-x-auto rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-navy-700">Comparison</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-100">
                <th className="py-2 text-left text-xs text-navy-500">Attribute</th>
                {selectedVendors.map((v) => (
                  <th key={v.id} className="py-2 text-center text-xs font-bold text-navy-900">{v.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-navy-50">
                <td className="py-2 text-xs text-navy-500">Category</td>
                {selectedVendors.map((v) => (
                  <td key={v.id} className="py-2 text-center text-xs capitalize">{v.category?.replace("_", " ") || "-"}</td>
                ))}
              </tr>
              <tr className="border-b border-navy-50">
                <td className="py-2 text-xs text-navy-500">Rating</td>
                {selectedVendors.map((v) => (
                  <td key={v.id} className="py-2 text-center">
                    {v.rating ? (
                      <div className="flex items-center justify-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3 w-3 ${s <= (v.rating || 0) ? "fill-amber-400 text-amber-400" : "text-navy-200"}`} />
                        ))}
                      </div>
                    ) : <span className="text-xs text-navy-300">-</span>}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-navy-50">
                <td className="py-2 text-xs text-navy-500">Total Paid</td>
                {selectedVendors.map((v) => (
                  <td key={v.id} className="py-2 text-center text-xs font-bold text-emerald-600">{formatCurrency(v.totalPaid)}</td>
                ))}
              </tr>
              <tr className="border-b border-navy-50">
                <td className="py-2 text-xs text-navy-500">Avg. Deal Size</td>
                {selectedVendors.map((v) => (
                  <td key={v.id} className="py-2 text-center text-xs font-medium">{v.avgDeal > 0 ? formatCurrency(v.avgDeal) : "-"}</td>
                ))}
              </tr>
              <tr className="border-b border-navy-50">
                <td className="py-2 text-xs text-navy-500">Events</td>
                {selectedVendors.map((v) => (
                  <td key={v.id} className="py-2 text-center text-xs">{v.eventCount}</td>
                ))}
              </tr>
              <tr className="border-b border-navy-50">
                <td className="py-2 text-xs text-navy-500">Phone</td>
                {selectedVendors.map((v) => (
                  <td key={v.id} className="py-2 text-center text-xs">{v.phone || "-"}</td>
                ))}
              </tr>
              <tr>
                <td className="py-2 text-xs text-navy-500">UPI</td>
                {selectedVendors.map((v) => (
                  <td key={v.id} className="py-2 text-center text-xs">{v.upi_id || "-"}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Vendor Selection List */}
      <div className="space-y-2">
        {filtered.map((v) => {
          const isSelected = selected.includes(v.id);
          return (
            <button key={v.id} onClick={() => toggleSelect(v.id)}
              className={`flex w-full items-center gap-3 rounded-xl p-4 text-left shadow-sm transition-colors ${isSelected ? "bg-navy-900 text-white" : "bg-white"}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isSelected ? "bg-white/20" : "bg-navy-100"}`}>
                {isSelected ? <Check className="h-4 w-4" /> : <span className="text-xs font-bold">{v.name[0]}</span>}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{v.name}</p>
                <div className="flex gap-2 text-xs opacity-70">
                  <span className="capitalize">{v.category?.replace("_", " ")}</span>
                  {v.totalPaid > 0 && <span>&middot; {formatCurrency(v.totalPaid)} paid</span>}
                </div>
              </div>
              {v.rating && (
                <div className="flex items-center gap-0.5">
                  <Star className={`h-3 w-3 ${isSelected ? "fill-amber-300 text-amber-300" : "fill-amber-400 text-amber-400"}`} />
                  <span className="text-xs font-medium">{v.rating}</span>
                </div>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-navy-400">No vendors found in this category.</p>
        )}
      </div>
    </div>
  );
}
