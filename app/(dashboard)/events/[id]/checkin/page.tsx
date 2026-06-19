"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  UserCheck,
  Search,
  Users,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import type { Guest, Event } from "@/lib/types";

type CheckInGuest = Guest & {
  checked_in: boolean;
  checked_in_at: string | null;
};

type FilterTab = "all" | "pending" | "checked_in";

export default function CheckInPage() {
  const supabase = createClient();
  const params = useParams();
  const { addToast } = useToast();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [guests, setGuests] = useState<CheckInGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [showConfirmAll, setShowConfirmAll] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [eventRes, guestRes] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).single(),
      supabase
        .from("guests")
        .select("*")
        .eq("event_id", eventId)
        .order("name"),
    ]);
    if (eventRes.data) setEvent(eventRes.data);
    if (guestRes.data) setGuests(guestRes.data as CheckInGuest[]);
    setLoading(false);
  }

  async function handleCheckIn(guestId: string) {
    setCheckingIn(guestId);
    const { error } = await supabase
      .from("guests")
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
      })
      .eq("id", guestId);
    if (error) {
      addToast({
        title: "Check-in failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      addToast({ title: "Guest checked in!", variant: "success" });
      load();
    }
    setCheckingIn(null);
  }

  async function handleCheckInAll() {
    setCheckingAll(true);
    const pendingIds = guests
      .filter((g) => !g.checked_in)
      .map((g) => g.id);
    if (pendingIds.length === 0) {
      addToast({ title: "All guests are already checked in", variant: "default" });
      setCheckingAll(false);
      setShowConfirmAll(false);
      return;
    }
    const { error } = await supabase
      .from("guests")
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
      })
      .in("id", pendingIds);
    if (error) {
      addToast({
        title: "Bulk check-in failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      addToast({
        title: `${pendingIds.length} guests checked in!`,
        variant: "success",
      });
      load();
    }
    setCheckingAll(false);
    setShowConfirmAll(false);
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getSideBadgeVariant(side: string) {
    switch (side) {
      case "bride":
        return "default";
      case "groom":
        return "secondary";
      case "mutual":
        return "outline";
      default:
        return "outline";
    }
  }

  const filtered = guests.filter((g) => {
    if (search) {
      const q = search.toLowerCase();
      const matchesName = g.name.toLowerCase().includes(q);
      const matchesPhone = g.phone?.toLowerCase().includes(q);
      if (!matchesName && !matchesPhone) return false;
    }
    if (activeTab === "pending" && g.checked_in) return false;
    if (activeTab === "checked_in" && !g.checked_in) return false;
    return true;
  });

  const checkedInCount = guests.filter((g) => g.checked_in).length;
  const totalCount = guests.length;
  const progressPercent =
    totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0;
  const pendingCount = totalCount - checkedInCount;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-400" />
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/events/${eventId}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-navy-900">Guest Check-In</h1>
          {event && (
            <p className="text-sm text-navy-500">{event.client_name}</p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
          <UserCheck className="h-5 w-5 text-emerald-600" />
        </div>
      </div>

      {/* Live Stats Bar */}
      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-navy-900">
            Checked In: {checkedInCount} / Total: {totalCount}
          </span>
          <span className="text-sm font-bold text-emerald-600">
            {progressPercent}%
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-navy-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-2 flex gap-4 text-xs text-navy-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            {checkedInCount} arrived
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-navy-200" />
            {pendingCount} pending
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="pl-10"
        />
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-2">
        {(
          [
            { key: "all", label: "All", count: totalCount },
            { key: "pending", label: "Pending", count: pendingCount },
            { key: "checked_in", label: "Checked In", count: checkedInCount },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === tab.key
                ? "bg-navy-900 text-white"
                : "bg-navy-100 text-navy-600"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Guest Cards */}
      <div className="space-y-2">
        {filtered.map((guest) => (
          <div
            key={guest.id}
            className={`rounded-xl bg-white p-4 shadow-sm transition-all ${
              guest.checked_in
                ? "border border-emerald-200 bg-emerald-50/50"
                : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                  guest.checked_in
                    ? "bg-emerald-100"
                    : "bg-navy-100"
                }`}
              >
                {guest.checked_in ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Users className="h-4 w-4 text-navy-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-navy-900 truncate">
                    {guest.name}
                  </p>
                  {guest.plus_count > 0 && (
                    <span className="flex-shrink-0 text-xs font-medium text-navy-400">
                      +{guest.plus_count}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  {guest.phone && (
                    <span className="text-xs text-navy-400">{guest.phone}</span>
                  )}
                  <Badge
                    variant={getSideBadgeVariant(guest.side)}
                    className="text-[10px] capitalize"
                  >
                    {guest.side}
                  </Badge>
                </div>
              </div>

              <div className="flex-shrink-0">
                {guest.checked_in ? (
                  <div className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <div className="text-right">
                      <p className="text-[10px] font-semibold leading-tight">
                        Checked in
                      </p>
                      {guest.checked_in_at && (
                        <p className="flex items-center gap-0.5 text-[10px] text-emerald-500">
                          <Clock className="h-2.5 w-2.5" />
                          {formatTime(guest.checked_in_at)}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => handleCheckIn(guest.id)}
                    disabled={checkingIn === guest.id}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    {checkingIn === guest.id ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="mr-1 h-4 w-4" />
                    )}
                    Check In
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-navy-200" />
            <p className="text-sm text-navy-400">
              {search
                ? "No guests match your search"
                : activeTab === "checked_in"
                  ? "No guests checked in yet"
                  : activeTab === "pending"
                    ? "All guests have been checked in!"
                    : "No guests found for this event"}
            </p>
          </div>
        )}
      </div>

      {/* Check In All Button */}
      {pendingCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4">
          <div className="mx-auto max-w-lg">
            {showConfirmAll ? (
              <div className="rounded-xl bg-white p-4 shadow-lg border border-navy-200">
                <p className="mb-3 text-sm font-semibold text-navy-900">
                  Check in all {pendingCount} pending guests?
                </p>
                <p className="mb-4 text-xs text-navy-500">
                  This will mark all remaining guests as checked in. This action
                  cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowConfirmAll(false)}
                    disabled={checkingAll}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={handleCheckInAll}
                    disabled={checkingAll}
                  >
                    {checkingAll ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="mr-1 h-4 w-4" />
                    )}
                    Confirm Check In All
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg"
                size="lg"
                onClick={() => setShowConfirmAll(true)}
              >
                <UserCheck className="mr-2 h-5 w-5" />
                Check In All ({pendingCount} pending)
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
