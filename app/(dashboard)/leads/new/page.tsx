"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/currency-input";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { EVENT_TYPES, LEAD_SOURCES } from "@/lib/utils";
import Link from "next/link";

export default function NewLeadPage() {
  const supabase = createClient();
  const router = useRouter();
  const { addToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [eventType, setEventType] = useState("wedding");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [estimatedBudget, setEstimatedBudget] = useState("");
  const [source, setSource] = useState("referral");
  const [followUpDate, setFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSave() {
    if (!clientName.trim()) return;
    setSaving(true);
    const { requireUser } = await import("@/lib/auth");
    const user = await requireUser();
    const { error } = await supabase.from("leads").insert({
      agency_id: user.id,
      client_name: clientName.trim(),
      client_phone: clientPhone || null,
      client_email: clientEmail || null,
      event_type: eventType,
      event_date: eventDate || null,
      venue: venue || null,
      estimated_budget: estimatedBudget ? Number(estimatedBudget) : null,
      source,
      follow_up_date: followUpDate || null,
      notes: notes || null,
    });
    if (error) {
      addToast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      addToast({ title: "Lead added!", variant: "success" });
      router.push("/leads");
    }
    setSaving(false);
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/leads" className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">New Lead</h1>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Client Name *</Label>
          <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} type="tel" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} type="email" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Event Type</Label>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => setEventType(t.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${eventType === t.value ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 text-navy-600"}`}>{t.label}</button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Source</Label>
          <div className="flex flex-wrap gap-2">
            {LEAD_SOURCES.map((s) => (
              <button key={s.value} type="button" onClick={() => setSource(s.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${source === s.value ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 text-navy-600"}`}>{s.label}</button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Estimated Budget</Label>
          <CurrencyInput value={estimatedBudget} onChange={setEstimatedBudget} placeholder="0" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Event Date</Label>
            <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Follow Up Date</Label>
            <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Venue</Label>
          <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>

        <Button onClick={handleSave} size="lg" className="w-full" disabled={saving || !clientName.trim()}>
          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
          Save Lead
        </Button>
      </div>
    </div>
  );
}
