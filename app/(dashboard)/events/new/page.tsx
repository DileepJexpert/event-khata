"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/currency-input";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { EVENT_TYPES } from "@/lib/utils";

export default function NewEventPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    event_type: "wedding",
    total_budget: "",
    event_date: "",
    venue: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // DEV MODE: Use dev user instead of auth
    const { getDevUser } = await import("@/lib/dev-user");
    const user = getDevUser();

    const { data, error } = await supabase
      .from("events")
      .insert({
        agency_id: user.id,
        client_name: form.client_name,
        client_phone: form.client_phone || null,
        event_type: form.event_type,
        total_budget: form.total_budget ? Number(form.total_budget) : null,
        event_date: form.event_date || null,
        venue: form.venue || null,
        notes: form.notes || null,
      })
      .select()
      .single();

    if (!error && data) {
      router.push(`/events/${data.id}`);
    }
    setLoading(false);
  };

  return (
    <div className="px-4 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/events" className="rounded-full p-2 hover:bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">New Event</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="client_name">Client Name *</Label>
          <Input
            id="client_name"
            placeholder="e.g., Sharma Family"
            value={form.client_name}
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_phone">Client Phone</Label>
          <Input
            id="client_phone"
            type="tel"
            placeholder="98765 43210"
            value={form.client_phone}
            onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
            inputMode="numeric"
          />
        </div>

        <div className="space-y-2">
          <Label>Event Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {EVENT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setForm({ ...form, event_type: type.value })}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  form.event_type === type.value
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-navy-200 bg-white text-navy-600 hover:border-navy-300"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget">Total Budget</Label>
          <CurrencyInput
            value={form.total_budget}
            onChange={(v) => setForm({ ...form, total_budget: v })}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="event_date">Event Date</Label>
          <Input
            id="event_date"
            type="date"
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="venue">Venue</Label>
          <Input
            id="venue"
            placeholder="e.g., The Grand Palace, Dwarka"
            value={form.venue}
            onChange={(e) => setForm({ ...form, venue: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Any additional details..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Create Event
        </Button>
      </form>
    </div>
  );
}
