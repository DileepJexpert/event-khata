"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Plus, Loader2, Trash2, Clock } from "lucide-react";
import { formatTime } from "@/lib/utils";
import Link from "next/link";
import type { TimelineItem, Vendor, SubEvent } from "@/lib/types";

export default function TimelinePage() {
  const supabase = createClient();
  const params = useParams();
  const { addToast } = useToast();
  const eventId = params.id as string;

  const [items, setItems] = useState<(TimelineItem & { vendor?: Vendor })[]>([]);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterSubEvent, setFilterSubEvent] = useState("all");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [subEventId, setSubEventId] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const [tlRes, seRes, vRes] = await Promise.all([
      supabase.from("timeline_items").select("*, vendor:vendors(*)").eq("event_id", eventId).order("start_time"),
      supabase.from("sub_events").select("*").eq("event_id", eventId).order("sort_order"),
      supabase.from("contracts").select("vendor:vendors(*)").eq("event_id", eventId),
    ]);
    if (tlRes.data) setItems(tlRes.data as any);
    if (seRes.data) setSubEvents(seRes.data);
    const uniqueVendors = (vRes.data || []).map((c: any) => c.vendor).filter(Boolean);
    setVendors(uniqueVendors);
    setLoading(false);
  }

  async function handleAdd() {
    if (!title.trim() || !startTime) return;
    setSaving(true);
    const { error } = await supabase.from("timeline_items").insert({
      event_id: eventId,
      title: title.trim(),
      description: description || null,
      start_time: startTime,
      end_time: endTime || null,
      vendor_id: vendorId || null,
      sub_event_id: subEventId || null,
      location: location || null,
      sort_order: items.length,
    });
    if (error) addToast({ title: "Failed", description: error.message, variant: "destructive" });
    else {
      setTitle(""); setDescription(""); setStartTime(""); setEndTime("");
      setVendorId(""); setSubEventId(""); setLocation(""); setShowForm(false);
      load();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await supabase.from("timeline_items").delete().eq("id", id);
    load();
  }

  const filtered = filterSubEvent === "all" ? items : items.filter((i) => i.sub_event_id === filterSubEvent);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/events/${eventId}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Day-of Timeline</h1>
          <p className="text-sm text-navy-500">Minute-by-minute event schedule</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      {/* Sub-event filter */}
      {subEvents.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto">
          <button onClick={() => setFilterSubEvent("all")}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${filterSubEvent === "all" ? "bg-navy-900 text-white" : "bg-navy-100 text-navy-600"}`}>All</button>
          {subEvents.map((se) => (
            <button key={se.id} onClick={() => setFilterSubEvent(se.id)}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${filterSubEvent === se.id ? "bg-navy-900 text-white" : "bg-navy-100 text-navy-600"}`}>{se.name}</button>
          ))}
        </div>
      )}

      {showForm && (
        <div className="mb-4 space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Activity title *" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Start Time *</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. Main Hall)" />
          {subEvents.length > 0 && (
            <select value={subEventId} onChange={(e) => setSubEventId(e.target.value)} className="w-full rounded-lg border border-navy-200 p-2 text-sm">
              <option value="">Select function (optional)</option>
              {subEvents.map((se) => <option key={se.id} value={se.id}>{se.name}</option>)}
            </select>
          )}
          {vendors.length > 0 && (
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full rounded-lg border border-navy-200 p-2 text-sm">
              <option value="">Assign vendor (optional)</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          )}
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={saving || !title.trim() || !startTime} size="sm" className="flex-1">
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Add
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {filtered.length > 0 && <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-navy-200" />}
        <div className="space-y-4">
          {filtered.map((item) => (
            <div key={item.id} className="relative flex gap-4 pl-2">
              <div className="relative z-10 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-navy-900">
                <Clock className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex-1 rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-navy-900">{item.title}</p>
                    <p className="text-xs font-medium text-navy-600">
                      {formatTime(item.start_time)}
                      {item.end_time && ` - ${formatTime(item.end_time)}`}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="text-navy-300 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {item.description && <p className="mt-1 text-xs text-navy-500">{item.description}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.vendor && (
                    <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">{item.vendor.name}</span>
                  )}
                  {item.location && (
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{item.location}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-navy-400">No timeline items yet. Plan your event schedule!</p>
      )}
    </div>
  );
}
