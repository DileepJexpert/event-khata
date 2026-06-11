"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Loader2, Copy, ExternalLink, Share2, Check, X, HelpCircle } from "lucide-react";
import { formatDate, MEAL_PREFERENCES } from "@/lib/utils";
import Link from "next/link";
import type { EventInvite, RsvpResponse, Event } from "@/lib/types";

const THEME_COLORS = ["#0f172a", "#be123c", "#b45309", "#047857", "#7c3aed", "#0891b2", "#db2777"];

export default function EventInvitePage() {
  const supabase = createClient();
  const params = useParams();
  const { addToast } = useToast();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [invite, setInvite] = useState<EventInvite | null>(null);
  const [responses, setResponses] = useState<RsvpResponse[]>([]);

  const [title, setTitle] = useState("");
  const [hostNames, setHostNames] = useState("");
  const [message, setMessage] = useState("");
  const [venue, setVenue] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [themeColor, setThemeColor] = useState("#0f172a");

  useEffect(() => { load(); }, []);

  async function load() {
    const [evRes, invRes] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).single(),
      supabase.from("event_invites").select("*").eq("event_id", eventId).maybeSingle(),
    ]);
    if (evRes.data) {
      setEvent(evRes.data);
      setTitle((t) => t || evRes.data.client_name);
      setVenue((v) => v || evRes.data.venue || "");
    }
    if (invRes.data) {
      const inv = invRes.data as EventInvite;
      setInvite(inv);
      setTitle(inv.title);
      setHostNames(inv.host_names || "");
      setMessage(inv.message || "");
      setVenue(inv.venue || "");
      setEventTime(inv.event_time || "");
      setThemeColor(inv.theme_color);
      const { data: rsvps } = await supabase
        .from("rsvp_responses")
        .select("*")
        .eq("invite_id", inv.id)
        .order("created_at", { ascending: false });
      if (rsvps) setResponses(rsvps as RsvpResponse[]);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!title.trim() || !event) return;
    setSaving(true);
    const { requireUser } = await import("@/lib/auth");
    const user = await requireUser();

    const payload = {
      title: title.trim(),
      host_names: hostNames || null,
      message: message || null,
      venue: venue || null,
      event_date: event.event_date,
      event_time: eventTime || null,
      theme_color: themeColor,
    };

    if (invite) {
      const { error } = await supabase.from("event_invites").update(payload).eq("id", invite.id);
      if (error) addToast({ title: "Failed to update", description: error.message, variant: "destructive" });
      else addToast({ title: "Invite updated!", variant: "success" });
    } else {
      const token = `${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
      const { data, error } = await supabase.from("event_invites").insert({
        agency_id: user.id,
        event_id: eventId,
        token,
        ...payload,
      }).select().single();
      if (error) addToast({ title: "Failed to create", description: error.message, variant: "destructive" });
      else {
        setInvite(data as EventInvite);
        addToast({ title: "Invite created!", variant: "success" });
      }
    }
    setSaving(false);
    load();
  }

  const inviteUrl = invite ? `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${invite.token}` : "";

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl);
    addToast({ title: "Link copied!", variant: "success" });
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(`You're invited to ${title}! RSVP here: ${inviteUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  const confirmed = responses.filter((r) => r.attending === "confirmed");
  const totalHeadcount = confirmed.reduce((sum, r) => sum + 1 + (r.plus_count || 0), 0);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/events/${eventId}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 dark:bg-navy-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-navy-900 dark:text-navy-100">E-Invite & RSVP</h1>
          <p className="text-sm text-navy-500">Shareable invite with guest RSVP</p>
        </div>
      </div>

      {/* Share section (when invite exists) */}
      {invite && (
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
          <Label className="mb-2 block">Invite Link</Label>
          <div className="flex gap-2">
            <Input value={inviteUrl} readOnly className="text-xs" />
            <Button size="icon" variant="outline" onClick={copyLink}><Copy className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" asChild><a href={inviteUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
          </div>
          <Button onClick={shareWhatsApp} variant="success" size="sm" className="mt-3 w-full">
            <Share2 className="mr-2 h-4 w-4" /> Share on WhatsApp
          </Button>
        </div>
      )}

      {/* RSVP summary */}
      {invite && responses.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white p-3 text-center shadow-sm dark:bg-navy-900">
            <p className="text-xl font-bold text-emerald-600">{confirmed.length}</p>
            <p className="text-[10px] text-navy-500">Confirmed</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm dark:bg-navy-900">
            <p className="text-xl font-bold text-navy-900 dark:text-navy-100">{totalHeadcount}</p>
            <p className="text-[10px] text-navy-500">Headcount</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm dark:bg-navy-900">
            <p className="text-xl font-bold text-red-500">{responses.filter((r) => r.attending === "declined").length}</p>
            <p className="text-[10px] text-navy-500">Declined</p>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="mb-4 space-y-3 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-900">
        <h3 className="text-sm font-semibold text-navy-900 dark:text-navy-100">Customize Invite</h3>
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Aarav & Diya's Wedding" />
        </div>
        <div className="space-y-2">
          <Label>Host Names</Label>
          <Input value={hostNames} onChange={(e) => setHostNames(e.target.value)} placeholder="e.g., The Sharma Family" />
        </div>
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Request the pleasure of your company..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Venue</Label>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Time</Label>
            <Input value={eventTime} onChange={(e) => setEventTime(e.target.value)} placeholder="e.g., 7:00 PM" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Theme Color</Label>
          <div className="flex gap-2">
            {THEME_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setThemeColor(c)}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${themeColor === c ? "scale-110 border-navy-900 dark:border-white" : "border-transparent"}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {invite ? "Update Invite" : "Create Invite"}
        </Button>
      </div>

      {/* Responses */}
      {responses.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-navy-900 dark:text-navy-100">Responses ({responses.length})</h3>
          <div className="space-y-2">
            {responses.map((r) => {
              const meal = MEAL_PREFERENCES.find((m) => m.value === r.meal_preference);
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-navy-900">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    r.attending === "confirmed" ? "bg-emerald-100 dark:bg-emerald-900/30" : r.attending === "declined" ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"
                  }`}>
                    {r.attending === "confirmed" ? <Check className="h-4 w-4 text-emerald-600" /> :
                     r.attending === "declined" ? <X className="h-4 w-4 text-red-600" /> :
                     <HelpCircle className="h-4 w-4 text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-navy-900 dark:text-navy-100">{r.guest_name}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-navy-500">
                      {r.plus_count > 0 && <span>+{r.plus_count} guests</span>}
                      {r.attending === "confirmed" && meal && <span>&middot; {meal.label}</span>}
                      <span>&middot; {formatDate(r.created_at)}</span>
                    </div>
                    {r.message && <p className="mt-0.5 text-xs italic text-navy-400">&ldquo;{r.message}&rdquo;</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
