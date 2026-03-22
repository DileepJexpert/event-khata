"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/currency-input";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import { SUB_EVENT_TYPES, formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import type { SubEvent } from "@/lib/types";

export default function SubEventsPage() {
  const supabase = createClient();
  const params = useParams();
  const { addToast } = useToast();
  const eventId = params.id as string;

  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState("wedding");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [venue, setVenue] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("sub_events").select("*").eq("event_id", eventId).order("sort_order");
    if (data) setSubEvents(data);
    setLoading(false);
  }

  function resetForm() {
    setName(""); setType("wedding"); setDate(""); setStartTime(""); setEndTime("");
    setVenue(""); setBudget(""); setNotes(""); setShowForm(false);
  }

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("sub_events").insert({
      event_id: eventId,
      name: name.trim(),
      type,
      date: date || null,
      start_time: startTime || null,
      end_time: endTime || null,
      venue: venue || null,
      budget: budget ? Number(budget) : null,
      notes: notes || null,
      sort_order: subEvents.length,
    });
    if (error) {
      addToast({ title: "Failed to add", description: error.message, variant: "destructive" });
    } else {
      addToast({ title: "Function added!", variant: "success" });
      resetForm();
      load();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("sub_events").delete().eq("id", id);
    if (!error) load();
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/events/${eventId}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Functions</h1>
          <p className="text-sm text-navy-500">Mehendi, Sangeet, Haldi, Wedding...</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <div className="space-y-2">
            <Label>Function Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sangeet Night" />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex flex-wrap gap-2">
              {SUB_EVENT_TYPES.map((t) => (
                <button key={t.value} type="button" onClick={() => { setType(t.value); if (!name) setName(t.label); }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    type === t.value ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 text-navy-600"
                  }`}>{t.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Budget</Label>
              <CurrencyInput value={budget} onChange={setBudget} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Venue</Label>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Location" />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={saving || !name.trim()} className="flex-1">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Add Function
            </Button>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      )}

      {subEvents.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-navy-400">No functions added yet.</p>
          <p className="mt-1 text-sm text-navy-400">Add Mehendi, Sangeet, Haldi, Wedding, Reception etc.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subEvents.map((se) => (
            <div key={se.id} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-navy-700">
                    {se.type.replace("_", " ")}
                  </span>
                </div>
                <h3 className="mt-1 text-base font-bold text-navy-900">{se.name}</h3>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-navy-500">
                  {se.date && <span>{formatDate(se.date)}</span>}
                  {se.start_time && <span>{se.start_time}{se.end_time ? ` - ${se.end_time}` : ""}</span>}
                  {se.venue && <span>{se.venue}</span>}
                </div>
                {se.budget && <p className="mt-1 text-sm font-semibold text-navy-700">{formatCurrency(se.budget)}</p>}
                {se.notes && <p className="mt-1 text-xs text-navy-400">{se.notes}</p>}
              </div>
              <button onClick={() => handleDelete(se.id)} className="rounded-lg p-2 text-navy-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
