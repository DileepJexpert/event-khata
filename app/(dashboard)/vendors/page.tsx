"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileHeader } from "@/components/mobile-header";
import { fetchWithCache, invalidateCache } from "@/lib/cache";
import {
  Plus,
  Search,
  Users,
  Phone,
  GitCompare,
  Star,
  MessageCircle,
  IndianRupee,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatCurrency, VENDOR_CATEGORIES } from "@/lib/utils";
import type { Vendor } from "@/lib/types";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<(Vendor & { total_paid: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const supabase = createClient();

  useEffect(() => {
    loadVendors();
  }, []);

  async function loadVendors(forceFresh = false) {
    if (forceFresh) setRefreshing(true);

    try {
      const data = await fetchWithCache(
        "vendors:list_with_paid",
        async () => {
          // Parallel 2 queries (No N+1 loop)
          const [vendorsRes, ledgerRes] = await Promise.all([
            supabase.from("vendors").select("*").order("name"),
            supabase.from("ledger").select("vendor_id, amount, txn_type"),
          ]);

          if (vendorsRes.error) {
            console.error("[VendorsPage] Failed to load vendors:", vendorsRes.error.message);
            return [];
          }

          const vendorsData = vendorsRes.data || [];
          const ledgerData = ledgerRes.data || [];

          // Group paid amounts by vendor_id in memory (0ms)
          const paidMap: Record<string, number> = {};
          ledgerData.forEach((entry) => {
            if (!entry.vendor_id) return;
            const amt = entry.txn_type === "REFUND" ? -Number(entry.amount) : Number(entry.amount);
            paidMap[entry.vendor_id] = (paidMap[entry.vendor_id] || 0) + amt;
          });

          return vendorsData.map((vendor) => ({
            ...vendor,
            total_paid: paidMap[vendor.id] || 0,
          }));
        },
        { ttlMs: 45000, tags: ["vendors", "ledger"], forceFresh }
      );

      setVendors(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleManualRefresh = () => {
    invalidateCache(["vendors", "ledger"]);
    loadVendors(true);
  };

  const filtered = vendors.filter((v) => {
    const matchSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.phone || "").includes(search);
    const matchCategory = categoryFilter === "all" || v.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const handleCall = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    e.preventDefault();
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (e: React.MouseEvent, phone: string, name: string) => {
    e.stopPropagation();
    e.preventDefault();
    const clean = phone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Namaste ${name}! Checking in from EventKhata.`);
    window.open(`https://wa.me/${clean}?text=${msg}`, "_blank");
  };

  return (
    <div className="pb-28">
      <MobileHeader
        title="Vendors"
        subtitle={`${vendors.length} vendors in directory`}
        rightAction={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-full text-navy-600 hover:bg-navy-100 active:scale-95 dark:text-navy-300 dark:hover:bg-navy-800 disabled:opacity-50"
              title="Refresh vendors"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <Link href="/vendors/compare">
              <Button variant="ghost" size="sm" className="h-8 gap-1 px-2.5 text-xs font-semibold">
                <GitCompare className="h-3.5 w-3.5" />
                Compare
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <Input
            placeholder="Search by vendor name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 rounded-2xl text-xs bg-white dark:bg-navy-900 border-navy-100 dark:border-navy-800"
          />
        </div>

        {/* Category Horizontal Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
              categoryFilter === "all"
                ? "bg-navy-900 text-white shadow-xs dark:bg-navy-100 dark:text-navy-900"
                : "bg-white text-navy-600 border border-navy-100 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-300"
            }`}
          >
            All
          </button>
          {VENDOR_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategoryFilter(cat.value)}
              className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                categoryFilter === cat.value
                  ? "bg-navy-900 text-white shadow-xs dark:bg-navy-100 dark:text-navy-900"
                  : "bg-white text-navy-600 border border-navy-100 dark:border-navy-800 dark:bg-navy-900 dark:text-navy-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-navy-100 bg-white p-4 dark:border-navy-800 dark:bg-navy-900"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="mb-1.5 h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No vendors found"
            description={
              search || categoryFilter !== "all"
                ? "No vendors match your search filters."
                : "Add your first vendor to start tracking payments."
            }
            actionLabel="Add Vendor"
            actionHref="/vendors/new"
          />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((vendor) => (
              <Link key={vendor.id} href={`/vendors/${vendor.id}`} className="block">
                <Card className="rounded-2xl border-navy-100 bg-white transition-all hover:shadow-md active:scale-[0.99] dark:border-navy-800 dark:bg-navy-900">
                  <CardContent className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-bold text-navy-900 dark:text-navy-100 text-sm">
                            {vendor.name}
                          </h3>
                          {vendor.rating && vendor.rating > 0 ? (
                            <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-500">
                              <Star className="h-3 w-3 fill-amber-400" /> {vendor.rating}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {vendor.category && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] capitalize font-medium px-2 py-0.5"
                            >
                              {vendor.category.replace("_", " ")}
                            </Badge>
                          )}
                          {vendor.address && (
                            <span className="text-[11px] text-navy-400 font-medium">
                              · {vendor.address}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-navy-400">Total Paid</p>
                        <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatCurrency(vendor.total_paid)}
                        </p>
                      </div>
                    </div>

                    {/* Quick Action Buttons on Card */}
                    <div className="mt-2.5 flex items-center justify-between border-t border-navy-50 pt-2 dark:border-navy-800/60">
                      <div className="flex items-center gap-1.5">
                        {vendor.phone && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleCall(e, vendor.phone!)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-50 text-navy-600 hover:bg-navy-100 active:scale-95 dark:bg-navy-800 dark:text-navy-300"
                              title="Call Vendor"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleWhatsApp(e, vendor.phone!, vendor.name)}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:scale-95 dark:bg-emerald-950/40 dark:text-emerald-400"
                              title="Message Vendor on WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>

                      <Link
                        href={`/pay?vendorId=${vendor.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 active:scale-95 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        <IndianRupee className="h-3 w-3" />
                        Pay Vendor
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <Link
        href="/vendors/new"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-white shadow-xl shadow-navy-900/30 transition-transform active:scale-90 dark:bg-navy-100 dark:text-navy-900"
        aria-label="Add Vendor"
      >
        <Plus className="h-6 w-6 stroke-[2.5]" />
      </Link>
    </div>
  );
}
