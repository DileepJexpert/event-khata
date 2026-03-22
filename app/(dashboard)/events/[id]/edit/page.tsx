"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/currency-input";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { EVENT_TYPES } from "@/lib/utils";
import Link from "next/link";
import type { Event } from "@/lib/types";

export default function EditEventPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [eventType, setEventType] = useState("wedding");
  const [totalBudget, setTotalBudget] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venue, setVenue] = useState("");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadEvent();
  }, []);

  async function loadEvent() {
    const { data, error } = await supabase.from("events").select("*").eq("id", eventId).single();
    if (error || !data) {
      addToast({ title: "Event not found", variant: "destructive" });
      router.push("/events");
      return;
    }
    setClientName(data.client_name);
    setClientPhone(data.client_phone || "");
    setClientEmail(data.client_email || "");
    setEventType(data.event_type);
    setTotalBudget(data.total_budget ? String(data.total_budget) : "");
    setEventDate(data.event_date || "");
    setEndDate(data.end_date || "");
    setVenue(data.venue || "");
    setStatus(data.status);
    setNotes(data.notes || "");
    setLoading(false);
  }

  async function handleSave() {
    if (!clientName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("events")
      .update({
        client_name: clientName.trim(),
        client_phone: clientPhone || null,
        client_email: clientEmail || null,
        event_type: eventType,
        total_budget: totalBudget ? Number(totalBudget) : null,
        event_date: eventDate || null,
        end_date: endDate || null,
        venue: venue || null,
        status,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    if (error) {
      addToast({ title: "Failed to update", description: error.message, variant: "destructive" });
    } else {
      addToast({ title: "Event updated!", variant: "success" });
      router.push(`/events/${eventId}`);
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      addToast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      setDeleting(false);
    } else {
      addToast({ title: "Event deleted", variant: "success" });
      router.push("/events");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-400" />
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/events/${eventId}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Edit Event</h1>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Client Name *</Label>
          <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Client Phone</Label>
          <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} type="tel" />
        </div>
        <div className="space-y-2">
          <Label>Client Email</Label>
          <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} type="email" />
        </div>
        <div className="space-y-2">
          <Label>Event Type</Label>
          <div className="grid grid-cols-3 gap-2">
            {EVENT_TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => setEventType(t.value)}
                className={`rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                  eventType === t.value ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 bg-white text-navy-600"
                }`}>{t.label}</button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Total Budget</Label>
          <CurrencyInput value={totalBudget} onChange={setTotalBudget} placeholder="0" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Venue</Label>
          <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <div className="grid grid-cols-3 gap-2">
            {["active", "completed", "cancelled"].map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={`rounded-lg border-2 px-3 py-2.5 text-sm font-semibold capitalize transition-colors ${
                  status === s ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 bg-white text-navy-600"
                }`}>{s}</button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>

        <Button onClick={handleSave} size="lg" className="w-full" disabled={saving || !clientName.trim()}>
          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
          Save Changes
        </Button>

        <div className="border-t border-navy-200 pt-4">
          {!showDeleteConfirm ? (
            <Button variant="destructive" size="lg" className="w-full" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete Event
            </Button>
          ) : (
            <div className="space-y-2 rounded-xl bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">Delete this event and all its data?</p>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Yes, Delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
