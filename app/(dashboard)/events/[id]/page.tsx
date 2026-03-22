"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorPaymentCard } from "@/components/vendor-payment-card";
import { BudgetDonut } from "@/components/budget-donut";
import {
  ArrowLeft, Plus, Share2, CalendarDays, MapPin, Phone, Pencil,
  ListChecks, Users, Clock, CreditCard, PartyPopper, FileText,
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, formatTime, daysUntil } from "@/lib/utils";
import type { Event, Vendor, Contract, LedgerEntry, SubEvent } from "@/lib/types";

const TYPE_EMOJI: Record<string, string> = {
  mehendi: "🌿", sangeet: "🎶", haldi: "💛", wedding: "💍",
  reception: "🎉", engagement: "💎", cocktail: "🍸",
  vidaai: "🥺", baraat: "🐴", other: "✨",
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const supabase = createClient();

  const [event, setEvent] = useState<Event | null>(null);
  const [contracts, setContracts] = useState<(Contract & { vendor: Vendor })[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<(LedgerEntry & { vendor: Vendor })[]>([]);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [eventId]);

  async function loadData() {
    const [eventRes, contractsRes, ledgerRes, subEventsRes] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).single(),
      supabase.from("contracts").select("*, vendor:vendors(*)").eq("event_id", eventId),
      supabase.from("ledger").select("*, vendor:vendors(*)").eq("event_id", eventId).order("recorded_at", { ascending: false }),
      supabase.from("sub_events").select("*").eq("event_id", eventId).order("date", { ascending: true, nullsFirst: false }).order("sort_order"),
    ]);

    if (eventRes.error) console.error("[EventDetail] Failed to load event:", eventRes.error.message, eventRes.error);
    if (contractsRes.error) console.error("[EventDetail] Failed to load contracts:", contractsRes.error.message, contractsRes.error);
    if (ledgerRes.error) console.error("[EventDetail] Failed to load ledger:", ledgerRes.error.message, ledgerRes.error);

    if (eventRes.data) setEvent(eventRes.data);
    if (contractsRes.data) setContracts(contractsRes.data as any);
    if (ledgerRes.data) setLedgerEntries(ledgerRes.data as any);
    if (subEventsRes.data) setSubEvents(subEventsRes.data);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-4 px-4 pt-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="px-4 pt-4 text-center">
        <p>Event not found.</p>
        <Button asChild className="mt-4">
          <Link href="/events">Back to Events</Link>
        </Button>
      </div>
    );
  }

  const totalSpent = ledgerEntries.reduce((sum, e) => {
    return e.txn_type === "REFUND" ? sum - Number(e.amount) : sum + Number(e.amount);
  }, 0);

  // Group payments by vendor
  const vendorPayments = new Map<string, number>();
  ledgerEntries.forEach((entry) => {
    const current = vendorPayments.get(entry.vendor_id) || 0;
    vendorPayments.set(
      entry.vendor_id,
      entry.txn_type === "REFUND" ? current - Number(entry.amount) : current + Number(entry.amount)
    );
  });

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link href="/events" className="rounded-full p-2 hover:bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{event.client_name}</h1>
          <div className="flex items-center gap-2">
            <Badge variant={event.status === "active" ? "success" : "secondary"}>
              {event.status}
            </Badge>
            <span className="text-sm capitalize text-navy-500">{event.event_type}</span>
          </div>
        </div>
      </div>

      {/* Event Info */}
      <div className="mb-4 flex flex-wrap gap-3 text-sm text-navy-500">
        {event.event_date && (
          <span className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" /> {formatDate(event.event_date)}
          </span>
        )}
        {event.venue && (
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" /> {event.venue}
          </span>
        )}
        {event.client_phone && (
          <a href={`tel:${event.client_phone}`} className="flex items-center gap-1 text-navy-700">
            <Phone className="h-4 w-4" /> {event.client_phone}
          </a>
        )}
      </div>

      {/* Budget Summary */}
      {event.total_budget && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <BudgetDonut totalBudget={Number(event.total_budget)} totalSpent={totalSpent} />
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="mb-4 flex gap-2">
        <Button asChild className="flex-1" variant="outline">
          <Link href={`/events/${eventId}/add-vendor`}>
            <Plus className="mr-2 h-4 w-4" /> Add Vendor
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/events/${eventId}/edit`}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/events/${eventId}/share`}>
            <Share2 className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Feature Grid */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        <Link href={`/events/${eventId}/sub-events`} className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 shadow-sm">
          <PartyPopper className="h-5 w-5 text-pink-600" />
          <span className="text-[10px] font-medium text-navy-700">Functions</span>
        </Link>
        <Link href={`/events/${eventId}/tasks`} className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 shadow-sm">
          <ListChecks className="h-5 w-5 text-blue-600" />
          <span className="text-[10px] font-medium text-navy-700">Checklist</span>
        </Link>
        <Link href={`/events/${eventId}/guests`} className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 shadow-sm">
          <Users className="h-5 w-5 text-purple-600" />
          <span className="text-[10px] font-medium text-navy-700">Guests</span>
        </Link>
        <Link href={`/events/${eventId}/timeline`} className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 shadow-sm">
          <Clock className="h-5 w-5 text-amber-600" />
          <span className="text-[10px] font-medium text-navy-700">Timeline</span>
        </Link>
        <Link href={`/events/${eventId}/payment-schedule`} className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 shadow-sm">
          <CreditCard className="h-5 w-5 text-emerald-600" />
          <span className="text-[10px] font-medium text-navy-700">Payments</span>
        </Link>
        <Link href={`/events/${eventId}/documents`} className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 shadow-sm">
          <FileText className="h-5 w-5 text-navy-600" />
          <span className="text-[10px] font-medium text-navy-700">Documents</span>
        </Link>
      </div>

      {/* Multi-Day Functions */}
      {subEvents.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Functions ({subEvents.length})</h2>
            <Link href={`/events/${eventId}/sub-events`} className="text-sm font-medium text-navy-600">View All</Link>
          </div>
          <div className="space-y-2">
            {subEvents.slice(0, 5).map((se) => {
              const dLeft = se.date ? daysUntil(se.date) : null;
              return (
                <Link key={se.id} href={`/events/${eventId}/sub-events/${se.id}`}
                  className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
                  <span className="text-lg">{TYPE_EMOJI[se.type] || "✨"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-navy-900">{se.name}</p>
                    <div className="flex gap-2 text-xs text-navy-500">
                      {se.date && <span>{formatDate(se.date)}</span>}
                      {se.start_time && <span>{formatTime(se.start_time)}</span>}
                      {se.venue && <span>{se.venue}</span>}
                    </div>
                  </div>
                  {se.budget && (
                    <span className="text-xs font-bold text-navy-700">{formatCurrency(Number(se.budget))}</span>
                  )}
                  {dLeft !== null && dLeft >= 0 && dLeft <= 14 && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      dLeft <= 3 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {dLeft === 0 ? "Today" : `${dLeft}d`}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Vendors */}
      {contracts.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-3 text-lg font-semibold">Vendors ({contracts.length})</h2>
          <div className="space-y-3">
            {contracts.map((contract) => (
              <VendorPaymentCard
                key={contract.id}
                vendor={contract.vendor}
                agreedAmount={Number(contract.agreed_amount)}
                totalPaid={vendorPayments.get(contract.vendor_id) || 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      {ledgerEntries.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-3 text-lg font-semibold">Payment History</h2>
          <div className="space-y-2">
            {ledgerEntries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium">{(entry.vendor as any)?.name || "Vendor"}</p>
                    <div className="flex gap-2 text-xs text-navy-500">
                      <Badge variant="secondary" className="text-xs">{entry.payment_mode}</Badge>
                      <Badge variant={entry.txn_type === "REFUND" ? "warning" : "secondary"} className="text-xs">
                        {entry.txn_type}
                      </Badge>
                      <span>{formatDateTime(entry.recorded_at)}</span>
                    </div>
                    {entry.notes && <p className="mt-1 text-xs text-navy-500">{entry.notes}</p>}
                  </div>
                  <span className={`text-lg font-bold ${entry.txn_type === "REFUND" ? "text-red-500" : "text-emerald-600"}`}>
                    {entry.txn_type === "REFUND" ? "-" : "+"}{formatCurrency(Number(entry.amount))}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
