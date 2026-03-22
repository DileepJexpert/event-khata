"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Phone, CreditCard } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Vendor, LedgerEntry, Event } from "@/lib/types";

export default function VendorDetailPage() {
  const params = useParams();
  const vendorId = params.id as string;
  const supabase = createClient();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [payments, setPayments] = useState<(LedgerEntry & { event: Event })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [vendorId]);

  async function loadData() {
    const [vendorRes, paymentsRes] = await Promise.all([
      supabase.from("vendors").select("*").eq("id", vendorId).single(),
      supabase.from("ledger").select("*, event:events(*)").eq("vendor_id", vendorId).order("recorded_at", { ascending: false }),
    ]);

    if (vendorRes.data) setVendor(vendorRes.data);
    if (paymentsRes.data) setPayments(paymentsRes.data as any);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-4 px-4 pt-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!vendor) return <div className="p-4 text-center">Vendor not found.</div>;

  const totalPaid = payments.reduce((sum, p) => {
    return p.txn_type === "REFUND" ? sum - Number(p.amount) : sum + Number(p.amount);
  }, 0);

  return (
    <div className="px-4 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/vendors" className="rounded-full p-2 hover:bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{vendor.name}</h1>
          {vendor.category && (
            <Badge variant="secondary" className="capitalize">
              {vendor.category.replace("_", " ")}
            </Badge>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <Card className="mb-4">
        <CardContent className="p-4 space-y-2">
          {vendor.phone && (
            <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-navy-400" /> {vendor.phone}
            </a>
          )}
          {vendor.upi_id && (
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="h-4 w-4 text-navy-400" /> UPI: {vendor.upi_id}
            </div>
          )}
          {vendor.bank_name && (
            <div className="text-sm text-navy-600">
              {vendor.bank_name} {vendor.account_number && `• ${vendor.account_number}`} {vendor.ifsc_code && `• ${vendor.ifsc_code}`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total */}
      <Card className="mb-4">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-navy-500">Total Paid Across All Events</p>
          <p className="text-3xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
        </CardContent>
      </Card>

      {/* Payment History */}
      <h2 className="mb-3 text-lg font-semibold">Payment History</h2>
      {payments.length === 0 ? (
        <p className="py-8 text-center text-sm text-navy-500">No payments yet.</p>
      ) : (
        <div className="space-y-2">
          {payments.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium text-sm">{(entry.event as any)?.client_name || "Event"}</p>
                  <div className="flex gap-2 text-xs text-navy-500">
                    <Badge variant="secondary" className="text-xs">{entry.payment_mode}</Badge>
                    <Badge variant={entry.txn_type === "REFUND" ? "warning" : "secondary"} className="text-xs">{entry.txn_type}</Badge>
                    <span>{formatDateTime(entry.recorded_at)}</span>
                  </div>
                </div>
                <span className={`font-bold ${entry.txn_type === "REFUND" ? "text-red-500" : "text-emerald-600"}`}>
                  {entry.txn_type === "REFUND" ? "-" : "+"}{formatCurrency(Number(entry.amount))}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
