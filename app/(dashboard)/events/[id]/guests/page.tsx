"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Plus, Loader2, Trash2, Search, Download, Users, Upload, MessageCircle } from "lucide-react";
import { GUEST_SIDES, RSVP_STATUSES, MEAL_PREFERENCES } from "@/lib/utils";
import Link from "next/link";
import type { Guest } from "@/lib/types";

export default function GuestsPage() {
  const supabase = createClient();
  const params = useParams();
  const { addToast } = useToast();
  const eventId = params.id as string;

  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSide, setFilterSide] = useState("all");
  const [filterRsvp, setFilterRsvp] = useState("all");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [groupName, setGroupName] = useState("");
  const [side, setSide] = useState("mutual");
  const [mealPref, setMealPref] = useState("no_preference");
  const [plusCount, setPlusCount] = useState("0");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("guests").select("*").eq("event_id", eventId).order("created_at");
    if (data) setGuests(data);
    setLoading(false);
  }

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("guests").insert({
      event_id: eventId,
      name: name.trim(),
      phone: phone || null,
      group_name: groupName || null,
      side,
      meal_preference: mealPref,
      plus_count: Number(plusCount) || 0,
    });
    if (error) {
      addToast({ title: "Failed to add", description: error.message, variant: "destructive" });
    } else {
      setName(""); setPhone(""); setGroupName(""); setSide("mutual"); setMealPref("no_preference"); setPlusCount("0");
      setShowForm(false);
      load();
    }
    setSaving(false);
  }

  async function updateRsvp(id: string, rsvp: string) {
    await supabase.from("guests").update({ rsvp_status: rsvp }).eq("id", id);
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from("guests").delete().eq("id", id);
    load();
  }

  function exportCSV() {
    const header = "Name,Phone,Group,Side,RSVP,Meal,Plus\n";
    const rows = guests.map((g) =>
      `"${g.name}","${g.phone || ""}","${g.group_name || ""}","${g.side}","${g.rsvp_status}","${g.meal_preference}","${g.plus_count}"`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guest-list.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const filtered = guests.filter((g) => {
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSide !== "all" && g.side !== filterSide) return false;
    if (filterRsvp !== "all" && g.rsvp_status !== filterRsvp) return false;
    return true;
  });

  const totalHeadcount = guests.reduce((sum, g) => sum + 1 + g.plus_count, 0);
  const confirmed = guests.filter((g) => g.rsvp_status === "confirmed").reduce((sum, g) => sum + 1 + g.plus_count, 0);

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").filter(Boolean);
    const header = lines[0].toLowerCase();
    const hasHeader = header.includes("name");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const guestsToInsert = dataLines.map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      return {
        event_id: eventId,
        name: cols[0] || "Guest",
        phone: cols[1] || null,
        group_name: cols[2] || null,
        side: (["bride", "groom", "mutual", "other"].includes(cols[3]?.toLowerCase()) ? cols[3].toLowerCase() : "other") as any,
        rsvp_status: "pending" as const,
        meal_preference: "no_preference" as const,
        plus_count: parseInt(cols[4]) || 0,
      };
    }).filter((g) => g.name && g.name !== "Guest");

    if (guestsToInsert.length === 0) {
      addToast({ title: "No guests found in CSV", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("guests").insert(guestsToInsert);
    if (error) {
      addToast({ title: "Import failed", description: error.message, variant: "destructive" });
    } else {
      addToast({ title: `Imported ${guestsToInsert.length} guests!`, variant: "success" });
      load();
    }
    e.target.value = "";
  }

  function broadcastWhatsApp() {
    const guestsWithPhone = guests.filter((g) => g.phone && g.rsvp_status !== "declined");
    if (guestsWithPhone.length === 0) {
      addToast({ title: "No guests with phone numbers", variant: "destructive" });
      return;
    }
    // Open WhatsApp for first guest - user can send message and then repeat
    const phone = guestsWithPhone[0].phone!.replace(/\D/g, "");
    const normalizedPhone = phone.length === 10 ? `91${phone}` : phone;
    const message = encodeURIComponent(`Dear ${guestsWithPhone[0].name}, you are cordially invited to our event. Please confirm your attendance. Thank you!`);
    window.open(`https://wa.me/${normalizedPhone}?text=${message}`, "_blank");
    addToast({ title: `${guestsWithPhone.length} guests with phone numbers. Opening WhatsApp...`, variant: "success" });
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/events/${eventId}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Guest List</h1>
          <p className="text-sm text-navy-500">{confirmed} confirmed / {totalHeadcount} total headcount</p>
        </div>
        <Button size="sm" variant="outline" onClick={broadcastWhatsApp} title="WhatsApp Broadcast"><MessageCircle className="h-4 w-4" /></Button>
        <label className="cursor-pointer">
          <Button size="sm" variant="outline" asChild><span><Upload className="h-4 w-4" /></span></Button>
          <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
        </label>
        <Button size="sm" variant="outline" onClick={exportCSV}><Download className="h-4 w-4" /></Button>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="mr-1 h-4 w-4" /> Add</Button>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        {RSVP_STATUSES.map((rs) => {
          const count = guests.filter((g) => g.rsvp_status === rs.value).length;
          return (
            <button key={rs.value} onClick={() => setFilterRsvp(filterRsvp === rs.value ? "all" : rs.value)}
              className={`rounded-lg p-2 text-center ${filterRsvp === rs.value ? rs.color + " ring-2 ring-navy-300" : "bg-navy-50"}`}>
              <p className="text-lg font-bold">{count}</p>
              <p className="text-[10px] font-medium">{rs.label}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guests..." className="pl-10" />
      </div>

      {/* Side filter */}
      <div className="mb-4 flex gap-2">
        <button onClick={() => setFilterSide("all")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filterSide === "all" ? "bg-navy-900 text-white" : "bg-navy-100 text-navy-600"}`}>All</button>
        {GUEST_SIDES.map((s) => (
          <button key={s.value} onClick={() => setFilterSide(filterSide === s.value ? "all" : s.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filterSide === s.value ? "bg-navy-900 text-white" : "bg-navy-100 text-navy-600"}`}>{s.label}</button>
        ))}
      </div>

      {showForm && (
        <div className="mb-4 space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name *" />
          <div className="grid grid-cols-2 gap-3">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" type="tel" />
            <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group (e.g. Family)" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Side</Label>
            <div className="flex gap-2">
              {GUEST_SIDES.map((s) => (
                <button key={s.value} onClick={() => setSide(s.value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${side === s.value ? "bg-navy-900 text-white" : "bg-navy-100 text-navy-600"}`}>{s.label}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Meal Preference</Label>
            <div className="flex flex-wrap gap-2">
              {MEAL_PREFERENCES.map((m) => (
                <button key={m.value} onClick={() => setMealPref(m.value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${mealPref === m.value ? "bg-navy-900 text-white" : "bg-navy-100 text-navy-600"}`}>{m.label}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Plus / Additional Guests</Label>
            <Input type="number" value={plusCount} onChange={(e) => setPlusCount(e.target.value)} min="0" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={saving || !name.trim()} size="sm" className="flex-1">
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Add Guest
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((guest) => {
          const rsvpStyle = RSVP_STATUSES.find((r) => r.value === guest.rsvp_status);
          return (
            <div key={guest.id} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy-100">
                <Users className="h-4 w-4 text-navy-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-navy-900">
                  {guest.name} {guest.plus_count > 0 && <span className="text-navy-400">+{guest.plus_count}</span>}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-navy-500">
                  <span className="capitalize">{guest.side}</span>
                  {guest.group_name && <span>&middot; {guest.group_name}</span>}
                  {guest.meal_preference !== "no_preference" && <span>&middot; {guest.meal_preference.replace("_", " ")}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={guest.rsvp_status}
                  onChange={(e) => updateRsvp(guest.id, e.target.value)}
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${rsvpStyle?.color}`}
                >
                  {RSVP_STATUSES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <button onClick={() => handleDelete(guest.id)} className="text-navy-300 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-navy-400">No guests yet. Start building your guest list!</p>
        )}
      </div>
    </div>
  );
}
