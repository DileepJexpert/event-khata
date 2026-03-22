import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

// Use service role for public access (no RLS)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function ClientPortalPage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = getServiceClient();

  // Get token data
  const { data: tokenData } = await supabase
    .from("client_tokens")
    .select("*, event:events(*)")
    .eq("token", params.token)
    .single();

  if (!tokenData || !tokenData.event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50 p-4">
        <Card className="max-w-sm text-center">
          <CardContent className="p-8">
            <h1 className="mb-2 text-xl font-bold">Link Invalid or Expired</h1>
            <p className="text-sm text-navy-500">
              Please contact your event planner for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check expiry
  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50 p-4">
        <Card className="max-w-sm text-center">
          <CardContent className="p-8">
            <h1 className="mb-2 text-xl font-bold">Link Expired</h1>
            <p className="text-sm text-navy-500">
              Please contact your event planner for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const event = tokenData.event as any;

  // Get ledger data grouped by vendor category
  const { data: ledger } = await supabase
    .from("ledger")
    .select("*, vendor:vendors(name, category)")
    .eq("event_id", event.id);

  const entries = ledger || [];

  // Group spending by category
  const categorySpending = new Map<string, { spent: number; vendors: Set<string> }>();
  entries.forEach((entry: any) => {
    const category = entry.vendor?.category || "other";
    const current = categorySpending.get(category) || { spent: 0, vendors: new Set() };
    current.spent += entry.txn_type === "REFUND" ? -Number(entry.amount) : Number(entry.amount);
    if (entry.vendor?.name) current.vendors.add(entry.vendor.name);
    categorySpending.set(category, current);
  });

  const totalSpent = entries.reduce((sum: number, e: any) => {
    return e.txn_type === "REFUND" ? sum - Number(e.amount) : sum + Number(e.amount);
  }, 0);

  const budget = Number(event.total_budget) || 0;

  return (
    <div className="min-h-screen bg-navy-50">
      <div className="mx-auto max-w-lg px-4 py-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <Badge variant="success" className="mb-2">Live Budget</Badge>
          <h1 className="text-2xl font-bold text-navy-900">{event.client_name}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-sm text-navy-500">
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
                      {tokenData.show_vendor_names && (
                        <p className="text-xs text-navy-500">
                          {Array.from(data.vendors).join(", ")}
                        </p>
                      )}
                    </div>
                    {tokenData.show_vendor_amounts ? (
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
