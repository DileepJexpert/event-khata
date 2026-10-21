"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileHeader } from "@/components/mobile-header";
import {
  Phone,
  CreditCard,
  Pencil,
  BookOpen,
  Star,
  MessageCircle,
  IndianRupee,
  CheckCircle2,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { StarRating } from "@/components/star-rating";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils";
import { fetchWithCache, invalidateCache } from "@/lib/cache";
import type { Vendor, LedgerEntry, Event } from "@/lib/types";

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;
  const supabase = createClient();

  const { addToast } = useToast();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [payments, setPayments] = useState<(LedgerEntry & { event: Event })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [vendorId]);

  async function loadData(forceFresh = false) {
    if (forceFresh) setRefreshing(true);
    try {
      const result = await fetchWithCache(
        `vendor:detail:${vendorId}`,
        async () => {
          const [vendorRes, paymentsRes] = await Promise.all([
            supabase.from("vendors").select("*").eq("id", vendorId).single(),
            supabase
              .from("ledger")
              .select("*, event:events(*)")
              .eq("vendor_id", vendorId)
              .order("recorded_at", { ascending: false }),
          ]);

          if (vendorRes.error) console.error("[VendorDetail] Failed to load vendor:", vendorRes.error.message);
          if (paymentsRes.error) console.error("[VendorDetail] Failed to load payments:", paymentsRes.error.message);

          return {
            vendor: vendorRes.data || null,
            payments: (paymentsRes.data as any) || [],
          };
        },
        { ttlMs: 45000, tags: [`vendor:${vendorId}`, "vendors", "ledger"], forceFresh }
      );

      if (result.vendor) setVendor(result.vendor);
      setPayments(result.payments);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleManualRefresh = () => {
    invalidateCache([`vendor:${vendorId}`, "vendors", "ledger"]);
    loadData(true);
  };

  async function handleRate(rating: number) {
    await supabase.from("vendors").update({ rating }).eq("id", vendorId);
    invalidateCache([`vendor:${vendorId}`, "vendors"]);
    addToast({ title: `Rated ${rating} stars`, variant: "success" });
    setVendor((prev) => (prev ? { ...prev, rating } : prev));
  }

  const handleCall = () => {
    if (vendor?.phone) window.location.href = `tel:${vendor.phone}`;
  };

  const handleWhatsApp = () => {
    if (vendor?.phone) {
      const clean = vendor.phone.replace(/\D/g, "");
      const msg = encodeURIComponent(`Namaste ${vendor.name}! Checking in from EventKhata.`);
      window.open(`https://wa.me/${clean}?text=${msg}`, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 px-4 pt-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-8 text-center">
        <p className="text-navy-500 text-sm">Vendor not found.</p>
        <Button asChild className="mt-4 rounded-xl">
          <Link href="/vendors">Back to Vendors</Link>
        </Button>
      </div>
    );
  }

  const totalPaid = payments.reduce((sum, p) => {
    return p.txn_type === "REFUND" ? sum - Number(p.amount) : sum + Number(p.amount);
  }, 0);

  return (
    <div className="pb-32">
      <MobileHeader
        title={vendor.name}
        subtitle={vendor.category ? vendor.category.replace("_", " ") : "Vendor"}
        showBack
        backHref="/vendors"
        rightAction={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Refresh vendor data"
              className="flex h-9 w-9 items-center justify-center rounded-full text-navy-600 hover:bg-navy-100 active:scale-95 dark:text-navy-300 dark:hover:bg-navy-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <Link
              href={`/vendors/${vendorId}/edit`}
              className="flex h-9 w-9 items-center justify-center rounded-full text-navy-600 hover:bg-navy-100 dark:text-navy-300 dark:hover:bg-navy-800"
              title="Edit Vendor"
            >
              <Pencil className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <div className="p-4 space-y-3.5">
        {/* Contact & Communication Hero */}
        <Card className="rounded-2xl border-navy-100 bg-white shadow-xs dark:border-navy-800 dark:bg-navy-900">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-navy-900 dark:text-navy-100">{vendor.name}</h2>
                <div className="mt-1 flex items-center gap-2">
                  {vendor.category && (
                    <Badge variant="secondary" className="capitalize text-xs font-semibold">
                      {vendor.category.replace("_", " ")}
                    </Badge>
                  )}
                  {vendor.address && (
                    <span className="text-xs text-navy-400 font-medium">· {vendor.address}</span>
                  )}
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-2">
                {vendor.phone && (
                  <>
                    <button
                      type="button"
                      onClick={handleCall}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 active:scale-95 dark:bg-blue-950/40 dark:text-blue-400 shadow-xs"
                      title="Call"
                    >
                      <Phone className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleWhatsApp}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 active:scale-95 dark:bg-emerald-950/40 dark:text-emerald-400 shadow-xs"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Payment Details */}
            <div className="border-t border-navy-50 pt-2.5 text-xs text-navy-600 dark:border-navy-800 dark:text-navy-400 space-y-1">
              {vendor.upi_id && (
                <div className="flex items-center gap-1.5 font-medium">
                  <CreditCard className="h-3.5 w-3.5 text-navy-400" />
                  <span>UPI: <strong className="text-navy-900 dark:text-navy-200">{vendor.upi_id}</strong></span>
                </div>
              )}
              {vendor.bank_name && (
                <div className="truncate text-[11px] text-navy-400">
                  {vendor.bank_name} {vendor.account_number && `· A/C: ${vendor.account_number}`} {vendor.ifsc_code && `· IFSC: ${vendor.ifsc_code}`}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Paid KPI Ribbon */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-navy-100 bg-white p-3.5 shadow-xs dark:border-navy-800 dark:bg-navy-900">
            <p className="text-[11px] font-medium text-navy-400">Total Paid (All Time)</p>
            <p className="mt-0.5 text-xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalPaid)}
            </p>
          </div>
          <div className="rounded-2xl border border-navy-100 bg-white p-3.5 shadow-xs dark:border-navy-800 dark:bg-navy-900 flex flex-col justify-between">
            <p className="text-[11px] font-medium text-navy-400">Your Rating</p>
            <div className="mt-1">
              <StarRating rating={vendor.rating || 0} onRate={handleRate} size="sm" />
            </div>
          </div>
        </div>

        {/* Secondary Tool Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="rounded-xl py-5 text-xs font-bold">
            <Link href={`/vendors/${vendorId}/ledger`}>
              <BookOpen className="mr-1.5 h-4 w-4" /> Full Statement
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl py-5 text-xs font-bold">
            <Link href={`/vendors/${vendorId}/review`}>
              <Star className="mr-1.5 h-4 w-4" /> Reviews
            </Link>
          </Button>
        </div>

        {/* Payment History */}
        <div className="space-y-2 pt-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-navy-400 dark:text-navy-500">
            Transaction History ({payments.length})
          </h3>
          {payments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-navy-200 p-6 text-center dark:border-navy-800">
              <p className="text-xs text-navy-400">No payments recorded for this vendor yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-2xl border border-navy-100 bg-white p-3 shadow-xs dark:border-navy-800 dark:bg-navy-900"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-navy-900 dark:text-navy-100">
                      {(entry.event as any)?.client_name || "Event Payment"}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-navy-400">
                      <span className="font-semibold uppercase">{entry.payment_mode}</span>
                      <span>·</span>
                      <span>{formatDate(entry.recorded_at)}</span>
                    </div>
                  </div>

                  <span
                    className={`text-sm font-black flex-shrink-0 ${
                      entry.txn_type === "REFUND"
                        ? "text-red-500"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {entry.txn_type === "REFUND" ? "-" : "+"}
                    {formatCurrency(Number(entry.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Mobile Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-navy-100 bg-white/95 p-3 backdrop-blur-md pb-[calc(0.75rem+var(--safe-area-bottom))] dark:border-navy-800 dark:bg-navy-900/95">
        <div className="mx-auto max-w-md">
          <Button
            asChild
            variant="success"
            size="xl"
            className="w-full rounded-2xl py-6 font-black shadow-lg shadow-emerald-200/70 active:scale-98 dark:shadow-none"
          >
            <Link href={`/pay?vendorId=${vendorId}`}>
              <IndianRupee className="mr-2 h-5 w-5 stroke-[3]" />
              RECORD PAYMENT TO VENDOR
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
