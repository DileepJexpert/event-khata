"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, MapPin, Clock, Loader2, PartyPopper, CheckCircle2 } from "lucide-react";
import { formatDate, MEAL_PREFERENCES } from "@/lib/utils";
import type { EventInvite } from "@/lib/types";

export default function PublicInvitePage() {
  const params = useParams();
  const token = params.token as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<EventInvite | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [attending, setAttending] = useState<"confirmed" | "declined" | "maybe">("confirmed");
  const [plusCount, setPlusCount] = useState("0");
  const [mealPreference, setMealPreference] = useState("no_preference");
  const [message, setMessage] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("event_invites").select("*").eq("token", token).maybeSingle();
    if (!data || !data.is_active) {
      setError("This invitation link is invalid or no longer active.");
      setLoading(false);
      return;
    }
    setInvite(data as EventInvite);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!guestName.trim() || !invite) return;
    setSaving(true);
    const { error: rsvpErr } = await supabase.from("rsvp_responses").insert({
      invite_id: invite.id,
      event_id: invite.event_id,
      guest_name: guestName.trim(),
      guest_phone: guestPhone || null,
      attending,
      plus_count: attending === "confirmed" ? Number(plusCount) || 0 : 0,
      meal_preference: mealPreference,
      message: message || null,
    });

    // Also add to the event's guest list so planner sees it in one place.
    if (!rsvpErr) {
      await supabase.from("guests").insert({
        event_id: invite.event_id,
        name: guestName.trim(),
        phone: guestPhone || null,
        rsvp_status: attending,
        meal_preference: mealPreference,
        plus_count: attending === "confirmed" ? Number(plusCount) || 0 : 0,
        side: "other",
      });
    }

    setSaving(false);
    if (rsvpErr) {
      setError("Could not submit your RSVP. Please try again.");
    } else {
      setSubmitted(true);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50 dark:bg-navy-950">
        <Loader2 className="h-8 w-8 animate-spin text-navy-400" />
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-navy-50 px-4 text-center dark:bg-navy-950">
        <PartyPopper className="mb-4 h-12 w-12 text-navy-300" />
        <p className="text-navy-600 dark:text-navy-300">{error}</p>
      </div>
    );
  }

  const accent = invite?.theme_color || "#0f172a";

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center" style={{ background: `linear-gradient(160deg, ${accent}10, ${accent}05)` }}>
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}20` }}>
          <CheckCircle2 className="h-10 w-10" style={{ color: accent }} />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-navy-900">Thank You!</h1>
        <p className="max-w-xs text-navy-600">
          Your RSVP has been recorded. {attending === "confirmed" ? "We can't wait to celebrate with you!" : "Thank you for letting us know."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12" style={{ background: `linear-gradient(160deg, ${accent}12, ${accent}03)` }}>
      <div className="mx-auto max-w-md px-4 pt-10">
        {/* Cover / Header */}
        <div className="mb-6 overflow-hidden rounded-3xl bg-white shadow-lg">
          {invite?.cover_image_url && (
            <img src={invite.cover_image_url} alt="" className="h-44 w-full object-cover" />
          )}
          <div className="p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}18` }}>
              <PartyPopper className="h-6 w-6" style={{ color: accent }} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>You're Invited</p>
            <h1 className="mt-2 text-3xl font-bold text-navy-900">{invite?.title}</h1>
            {invite?.host_names && <p className="mt-1 text-navy-500">{invite.host_names}</p>}
            {invite?.message && <p className="mt-4 text-sm leading-relaxed text-navy-600">{invite.message}</p>}

            <div className="mt-5 space-y-2 text-sm text-navy-700">
              {invite?.event_date && (
                <p className="flex items-center justify-center gap-2">
                  <CalendarDays className="h-4 w-4" style={{ color: accent }} /> {formatDate(invite.event_date)}
                </p>
              )}
              {invite?.event_time && (
                <p className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" style={{ color: accent }} /> {invite.event_time}
                </p>
              )}
              {invite?.venue && (
                <p className="flex items-center justify-center gap-2">
                  <MapPin className="h-4 w-4" style={{ color: accent }} /> {invite.venue}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RSVP Form */}
        <div className="rounded-3xl bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-center text-lg font-bold text-navy-900">RSVP</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-navy-700">Your Name *</Label>
              <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Full name" className="bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-navy-700">Phone</Label>
              <Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} type="tel" placeholder="Optional" className="bg-white" />
            </div>

            <div className="space-y-2">
              <Label className="text-navy-700">Will you attend?</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "confirmed", label: "Yes!" },
                  { value: "maybe", label: "Maybe" },
                  { value: "declined", label: "Can't" },
                ] as const).map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setAttending(opt.value)}
                    className="rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-colors"
                    style={attending === opt.value
                      ? { borderColor: accent, backgroundColor: accent, color: "white" }
                      : { borderColor: "#e2e8f0", color: "#475569" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {attending === "confirmed" && invite?.collect_plus_count && (
              <div className="space-y-2">
                <Label className="text-navy-700">Number of guests (besides you)</Label>
                <Input type="number" min="0" value={plusCount} onChange={(e) => setPlusCount(e.target.value)} className="bg-white" />
              </div>
            )}

            {attending === "confirmed" && invite?.collect_meal_preference && (
              <div className="space-y-2">
                <Label className="text-navy-700">Meal Preference</Label>
                <div className="flex flex-wrap gap-2">
                  {MEAL_PREFERENCES.map((m) => (
                    <button key={m.value} type="button" onClick={() => setMealPreference(m.value)}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                      style={mealPreference === m.value
                        ? { backgroundColor: accent, color: "white" }
                        : { backgroundColor: "#f1f5f9", color: "#475569" }}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-navy-700">Message (optional)</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Your wishes..." className="bg-white" />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button onClick={handleSubmit} disabled={saving || !guestName.trim()} size="lg" className="w-full"
              style={{ backgroundColor: accent }}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send RSVP
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-navy-400">Powered by EventKhata</p>
      </div>
    </div>
  );
}
