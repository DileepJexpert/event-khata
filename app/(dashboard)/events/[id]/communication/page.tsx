"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft, Plus, Loader2, Phone, MessageCircle, Mail, Users,
  FileText, ArrowUpRight, ArrowDownLeft, Calendar, Trash2,
} from "lucide-react";
import { formatDate, formatDateTime, COMM_TYPES } from "@/lib/utils";
import Link from "next/link";
import type { CommunicationEntry, Vendor } from "@/lib/types";

const ICON_MAP: Record<string, any> = {
  call: Phone, whatsapp: MessageCircle, email: Mail, meeting: Users, note: FileText,
};

export default function CommunicationPage() {
  const supabase = createClient();
  const params = useParams();
  const { addToast } = useToast();
  const eventId = params.id as string;

  const [entries, setEntries] = useState<(CommunicationEntry & { vendor?: Vendor })[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState("all");

  // Form state
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [type, setType] = useState("call");
  const [direction, setDirection] = useState("outgoing");
  const [subject, setSubject] = useState("");
  const [summary, setSummary] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [vendorId, setVendorId] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const [entriesRes, contractsRes] = await Promise.all([
      supabase.from("communication_log").select("*, vendor:vendors(*)").eq("event_id", eventId).order("created_at", { ascending: false }),
      supabase.from("contracts").select("vendor:vendors(*)").eq("event_id", eventId),
    ]);
    if (entriesRes.data) setEntries(entriesRes.data as any);
    if (contractsRes.data) {
      const v = contractsRes.data.map((c: any) => c.vendor).filter(Boolean);
      setVendors(v);
    }
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!contactName.trim()) return;
    setSaving(true);
    const { requireUser } = await import("@/lib/auth");
    const user = await requireUser();
    const { error } = await supabase.from("communication_log").insert({
      agency_id: user.id,
      event_id: eventId,
      vendor_id: vendorId || null,
      contact_name: contactName.trim(),
      contact_phone: contactPhone.trim() || null,
      type,
      direction,
      subject: subject.trim() || null,
      summary: summary.trim() || null,
      follow_up_date: followUpDate || null,
    });
    if (error) {
      addToast({ title: "Failed to log", description: error.message, variant: "destructive" });
    } else {
      addToast({ title: "Communication logged!", variant: "success" });
      setContactName(""); setContactPhone(""); setSubject(""); setSummary("");
      setFollowUpDate(""); setVendorId(""); setShowForm(false);
      load();
    }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    await supabase.from("communication_log").delete().eq("id", id);
    addToast({ title: "Deleted", variant: "success" });
    load();
  }

  function quickWhatsApp(phone: string, name: string) {
    const clean = phone.replace(/\D/g, "");
    window.open(`https://wa.me/91${clean}`, "_blank");
  }

  const filtered = entries.filter((e) => filterType === "all" || e.type === filterType);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/events/${eventId}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Communication Log</h1>
          <p className="text-sm text-navy-500">{entries.length} entries</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> Log
        </Button>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        <button onClick={() => setFilterType("all")}
          className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${filterType === "all" ? "bg-navy-900 text-white" : "bg-white shadow-sm"}`}>
          All
        </button>
        {COMM_TYPES.map((t) => {
          const Icon = ICON_MAP[t.value];
          return (
            <button key={t.value} onClick={() => setFilterType(filterType === t.value ? "all" : t.value)}
              className={`flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${filterType === t.value ? "bg-navy-900 text-white" : "bg-white shadow-sm"}`}>
              <Icon className="h-3 w-3" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Log Communication</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm">
                  {COMM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Direction</Label>
                <select value={direction} onChange={(e) => setDirection(e.target.value)} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm">
                  <option value="outgoing">Outgoing</option>
                  <option value="incoming">Incoming</option>
                </select>
              </div>
            </div>
            {vendors.length > 0 && (
              <div>
                <Label>Vendor (optional)</Label>
                <select value={vendorId} onChange={(e) => {
                  setVendorId(e.target.value);
                  const v = vendors.find((v) => v.id === e.target.value);
                  if (v) { setContactName(v.name); setContactPhone(v.phone || ""); }
                }} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm">
                  <option value="">Select vendor...</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact Name *</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Vendor/Client name" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="9876543210" />
              </div>
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g., Discussed menu options" />
            </div>
            <div>
              <Label>Summary / Notes</Label>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3}
                className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm" placeholder="Key points from the conversation..." />
            </div>
            <div>
              <Label>Follow-up Date</Label>
              <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null} Save
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </form>
      )}

      {/* Entries */}
      <div className="space-y-2">
        {filtered.map((entry) => {
          const Icon = ICON_MAP[entry.type] || FileText;
          const typeStyle = COMM_TYPES.find((t) => t.value === entry.type);
          return (
            <div key={entry.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                  entry.type === "call" ? "bg-blue-100 text-blue-600" :
                  entry.type === "whatsapp" ? "bg-emerald-100 text-emerald-600" :
                  entry.type === "email" ? "bg-purple-100 text-purple-600" :
                  entry.type === "meeting" ? "bg-amber-100 text-amber-600" :
                  "bg-navy-100 text-navy-600"
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-navy-900">{entry.contact_name}</h3>
                    {entry.direction === "incoming" ? (
                      <ArrowDownLeft className="h-3 w-3 text-blue-500" />
                    ) : (
                      <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                    )}
                    <span className="text-xs text-navy-400">{typeStyle?.label}</span>
                  </div>
                  {entry.subject && <p className="mt-0.5 text-sm font-medium text-navy-700">{entry.subject}</p>}
                  {entry.summary && <p className="mt-1 text-xs text-navy-500">{entry.summary}</p>}
                  <div className="mt-2 flex items-center gap-3 text-xs text-navy-400">
                    <span>{formatDateTime(entry.created_at)}</span>
                    {entry.follow_up_date && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Calendar className="h-3 w-3" /> Follow up: {formatDate(entry.follow_up_date)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {entry.contact_phone && (
                    <button onClick={() => quickWhatsApp(entry.contact_phone!, entry.contact_name)} className="rounded-lg p-1.5 text-emerald-500 hover:bg-emerald-50">
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => deleteEntry(entry.id)} className="rounded-lg p-1.5 text-navy-300 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <MessageCircle className="mx-auto mb-3 h-12 w-12 text-navy-200" />
            <p className="text-sm text-navy-400">No communications logged yet.</p>
            <p className="text-xs text-navy-400">Track calls, WhatsApp messages, emails & meetings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
