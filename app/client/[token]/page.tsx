"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ClientPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [categorySpending, setCategorySpending] = useState<Map<string, { spent: number; vendors: Set<string> }>>(new Map());
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    // Get token data
    const { data: td } = await supabase
      .from("client_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (!td) {
      setError("Link Invalid or Expired");
      setLoading(false);
      return;
    }

    // Check expiry
    if (td.expires_at && new Date(td.expires_at) < new Date()) {
      setError("Link Expired");
      setLoading(false);
      return;
    }

    // Get event
    const { data: ev } = await supabase
      .from("events")
      .select("*")
      .eq("id", td.event_id)
      .single();

    if (!ev) {
      setError("Event not found");
      setLoading(false);
      return;
    }

    setTokenData(td);
    setEvent(ev);

    // Get ledger data grouped by vendor category
    const { data: ledger } = await supabase
      .from("ledger")
      .select("*, vendor:vendors(name, category)")
      .eq("event_id", ev.id);

    const entries = ledger || [];

    // Group spending by category
    const catSpending = new Map<string, { spent: number; vendors: Set<string> }>();
    entries.forEach((entry: any) => {
      const category = entry.vendor?.category || "other";
      const current = catSpending.get(category) || { spent: 0, vendors: new Set() };
      current.spent += entry.txn_type === "REFUND" ? -Number(entry.amount) : Number(entry.amount);
      if (entry.vendor?.name) current.vendors.add(entry.vendor.name);
      catSpending.set(category, current);
    });

    setCategorySpending(catSpending);
    setTotalSpent(entries.reduce((sum: number, e: any) => {
      return e.txn_type === "REFUND" ? sum - Number(e.amount) : sum + Number(e.amount);
    }, 0));

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50">
        <Loader2 className="h-8 w-8 animate-spin text-navy-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50 p-4">
        <Card className="max-w-sm text-center">
          <CardContent className="p-8">
            <h1 className="mb-2 text-xl font-bold">{error}</h1>
            <p className="text-sm text-navy-500">
              Please contact your event planner for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const budget = Number(event?.total_budget) || 0;

  return (
    <div className="min-h-screen bg-navy-50">
      <div className="mx-auto max-w-lg px-4 py-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <Badge variant="success" className="mb-2">Live Budget</Badge>
          <h1 className="text-2xl font-bold text-navy-900">{event?.client_name}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-sm text-navy-500">
            {event?.event_date && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" /> {formatDate(event.event_date)}
              </span>
            )}
            {event?.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {event.venue}
              </span>
            )}
          </div>
        </div>

        {/* Budget Overview */}
        {budget > 0 && (
          <Card className="mb-6">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-navy-500">Total Budget</p>
              <p className="text-3xl font-bold text-navy-900">{formatCurrency(budget)}</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-navy-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min((totalSpent / budget) * 100, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-navy-500">Spent: {formatCurrency(totalSpent)}</span>
                <span className="text-emerald-600">Remaining: {formatCurrency(budget - totalSpent)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Breakdown */}
        <h2 className="mb-3 text-lg font-semibold">Budget Breakdown</h2>
        <div className="space-y-3">
          {Array.from(categorySpending.entries())
            .sort((a, b) => b[1].spent - a[1].spent)
            .map(([category, data]) => (
              <Card key={category}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold capitalize">{category.replace("_", " ")}</h3>
                      {tokenData?.show_vendor_names && (
                        <p className="text-xs text-navy-500">
                          {Array.from(data.vendors).join(", ")}
                        </p>
                      )}
                    </div>
                    {tokenData?.show_vendor_amounts ? (
                      <span className="text-lg font-bold text-navy-900">
                        {formatCurrency(data.spent)}
                      </span>
                    ) : (
                      <Badge variant="secondary">
                        {budget > 0 ? `${Math.round((data.spent / budget) * 100)}%` : "—"}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-navy-400">
          <p>Powered by EventKhata</p>
          <p>Your digital bahi khata for events</p>
        </div>
      </div>
    </div>
  );
}
