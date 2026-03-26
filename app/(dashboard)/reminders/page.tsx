"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
  Plus, Loader2, Bell, Check, Clock, Calendar, Trash2,
  Phone, MessageCircle, AlertTriangle,
} from "lucide-react";
import { formatDate, formatDateTime, REMINDER_TYPES, daysUntil } from "@/lib/utils";
import type { Reminder } from "@/lib/types";

export default function RemindersPage() {
  const supabase = createClient();
  const { addToast } = useToast();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [type, setType] = useState("general");

  useEffect(() => { load(); }, []);

  async function load() {
    const { requireUser } = await import("@/lib/auth");
    const user = await requireUser();
    const { data } = await supabase.from("reminders").select("*").eq("agency_id", user.id).order("remind_at", { ascending: true });
    if (data) setReminders(data);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !remindAt) return;
    setSaving(true);
    const { requireUser } = await import("@/lib/auth");
    const user = await requireUser();
    const { error } = await supabase.from("reminders").insert({
      agency_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      remind_at: new Date(remindAt).toISOString(),
      type,
    });
    if (error) {
      addToast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      addToast({ title: "Reminder set!", variant: "success" });
      setTitle(""); setDescription(""); setRemindAt(""); setType("general");
      setShowForm(false);
      load();
    }
    setSaving(false);
  }

  async function markDone(id: string) {
    await supabase.from("reminders").update({ is_done: true }).eq("id", id);
    load();
  }

  async function markUndone(id: string) {
    await supabase.from("reminders").update({ is_done: false }).eq("id", id);
    load();
  }

  async function deleteReminder(id: string) {
    await supabase.from("reminders").delete().eq("id", id);
    addToast({ title: "Deleted", variant: "success" });
    load();
  }

  function sendWhatsAppReminder(reminder: Reminder) {
    const msg = `Reminder: ${reminder.title}${reminder.description ? `\n${reminder.description}` : ""}\nDue: ${formatDate(reminder.remind_at)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const pending = reminders.filter((r) => !r.is_done);
  const completed = reminders.filter((r) => r.is_done);

  const overdue = pending.filter((r) => new Date(r.remind_at) < new Date());
  const today = pending.filter((r) => {
    const d = daysUntil(r.remind_at);
    return d === 0 && new Date(r.remind_at) >= new Date();
  });
  const upcoming = pending.filter((r) => daysUntil(r.remind_at) > 0);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  function ReminderCard({ reminder, showDone = true }: { reminder: Reminder; showDone?: boolean }) {
    const typeStyle = REMINDER_TYPES.find((t) => t.value === reminder.type);
    const isOverdue = new Date(reminder.remind_at) < new Date() && !reminder.is_done;
    return (
      <div className={`rounded-xl bg-white p-4 shadow-sm ${reminder.is_done ? "opacity-60" : ""}`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${typeStyle?.color || "bg-navy-100"}`}>
            {isOverdue ? <AlertTriangle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-semibold ${reminder.is_done ? "text-navy-500 line-through" : "text-navy-900"}`}>{reminder.title}</h3>
            {reminder.description && <p className="mt-0.5 text-xs text-navy-500">{reminder.description}</p>}
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className={`flex items-center gap-1 ${isOverdue ? "font-semibold text-red-600" : "text-navy-400"}`}>
                <Clock className="h-3 w-3" /> {formatDateTime(reminder.remind_at)}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeStyle?.color}`}>
                {typeStyle?.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => sendWhatsAppReminder(reminder)} className="rounded-lg p-1.5 text-emerald-500 hover:bg-emerald-50">
              <MessageCircle className="h-4 w-4" />
            </button>
            {showDone && !reminder.is_done && (
              <button onClick={() => markDone(reminder.id)} className="rounded-lg p-1.5 text-emerald-500 hover:bg-emerald-50">
                <Check className="h-4 w-4" />
              </button>
            )}
            {reminder.is_done && (
              <button onClick={() => markUndone(reminder.id)} className="rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50">
                Undo
              </button>
            )}
            <button onClick={() => deleteReminder(reminder.id)} className="rounded-lg p-1.5 text-navy-300 hover:bg-red-50 hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Reminders</h1>
          <p className="text-sm text-navy-500">{pending.length} pending{overdue.length > 0 ? ` · ${overdue.length} overdue` : ""}</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="mb-4 flex gap-2">
        {overdue.length > 0 && (
          <div className="flex-1 rounded-lg bg-red-50 p-3 text-center">
            <p className="text-lg font-bold text-red-600">{overdue.length}</p>
            <p className="text-[10px] font-medium text-red-500">Overdue</p>
          </div>
        )}
        <div className="flex-1 rounded-lg bg-amber-50 p-3 text-center">
          <p className="text-lg font-bold text-amber-600">{today.length}</p>
          <p className="text-[10px] font-medium text-amber-500">Today</p>
        </div>
        <div className="flex-1 rounded-lg bg-blue-50 p-3 text-center">
          <p className="text-lg font-bold text-blue-600">{upcoming.length}</p>
          <p className="text-[10px] font-medium text-blue-500">Upcoming</p>
        </div>
        <div className="flex-1 rounded-lg bg-emerald-50 p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">{completed.length}</p>
          <p className="text-[10px] font-medium text-emerald-500">Done</p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Set Reminder</h3>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Follow up with decorator" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date & Time *</Label>
                <Input type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} />
              </div>
              <div>
                <Label>Type</Label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm">
                  {REMINDER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm" placeholder="Additional details..." />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null} Set Reminder
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </form>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-600">
            <AlertTriangle className="h-4 w-4" /> Overdue
          </h2>
          <div className="space-y-2">
            {overdue.map((r) => <ReminderCard key={r.id} reminder={r} />)}
          </div>
        </div>
      )}

      {/* Today */}
      {today.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-amber-600">Today</h2>
          <div className="space-y-2">
            {today.map((r) => <ReminderCard key={r.id} reminder={r} />)}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-navy-700">Upcoming</h2>
          <div className="space-y-2">
            {upcoming.map((r) => <ReminderCard key={r.id} reminder={r} />)}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="mb-4">
          <button onClick={() => setShowCompleted(!showCompleted)} className="mb-2 text-sm font-semibold text-navy-500 hover:text-navy-700">
            {showCompleted ? "Hide" : "Show"} Completed ({completed.length})
          </button>
          {showCompleted && (
            <div className="space-y-2">
              {completed.map((r) => <ReminderCard key={r.id} reminder={r} showDone={false} />)}
            </div>
          )}
        </div>
      )}

      {pending.length === 0 && completed.length === 0 && !showForm && (
        <div className="py-12 text-center">
          <Bell className="mx-auto mb-3 h-12 w-12 text-navy-200" />
          <p className="text-sm text-navy-400">No reminders set.</p>
          <p className="text-xs text-navy-400">Never forget a follow-up or payment deadline.</p>
        </div>
      )}
    </div>
  );
}
