"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Users, Phone, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { formatCurrency, VENDOR_CATEGORIES } from "@/lib/utils";
import type { Vendor } from "@/lib/types";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<(Vendor & { total_paid: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const supabase = createClient();

  useEffect(() => {
    loadVendors();
  }, []);

  async function loadVendors() {
    const { data: vendorsData, error } = await supabase
      .from("vendors")
      .select("*")
      .order("name");

    if (error) console.error("[VendorsPage] Failed to load vendors:", error.message, error);

    if (vendorsData) {
      const vendorsWithPaid = await Promise.all(
        vendorsData.map(async (vendor) => {
          const { data: ledgerData, error: ledgerError } = await supabase
            .from("ledger")
            .select("amount, txn_type")
            .eq("vendor_id", vendor.id);

          if (ledgerError) console.error("[VendorsPage] Failed to load ledger for vendor:", vendor.id, ledgerError.message, ledgerError);

          const total_paid = (ledgerData || []).reduce((sum, entry) => {
            return entry.txn_type === "REFUND" ? sum - Number(entry.amount) : sum + Number(entry.amount);
          }, 0);

          return { ...vendor, total_paid };
        })
      );
      setVendors(vendorsWithPaid);
    }
    setLoading(false);
  }

  const filtered = vendors.filter((v) => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || v.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Vendors</h1>
          <p className="text-sm text-navy-500">{vendors.length} vendors</p>
        </div>
        <Link href="/vendors/compare">
          <Button variant="outline" size="sm">
            <GitCompare className="mr-1 h-4 w-4" /> Compare
          </Button>
        </Link>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCategoryFilter("all")}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            categoryFilter === "all" ? "bg-navy-900 text-white" : "bg-white text-navy-600"
          }`}
        >
          All
        </button>
        {VENDOR_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategoryFilter(cat.value)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              categoryFilter === cat.value ? "bg-navy-900 text-white" : "bg-white text-navy-600"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No vendors yet"
          description="Add your first vendor to start tracking payments."
          actionLabel="Add Vendor"
          actionHref="/vendors/new"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((vendor) => (
            <Link key={vendor.id} href={`/vendors/${vendor.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-semibold">{vendor.name}</h3>
                    <div className="mt-1 flex items-center gap-2">
                      {vendor.category && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {vendor.category.replace("_", " ")}
                        </Badge>
                      )}
                      {vendor.phone && (
                        <span className="flex items-center gap-1 text-xs text-navy-400">
                          <Phone className="h-3 w-3" /> {vendor.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  {vendor.total_paid > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-navy-500">Total Paid</p>
                      <p className="font-semibold text-emerald-600">{formatCurrency(vendor.total_paid)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Link
        href="/vendors/new"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-white shadow-lg transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
