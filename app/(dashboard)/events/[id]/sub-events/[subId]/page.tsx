"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/currency-input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft, Pencil, Trash2, Loader2, MapPin, Clock as ClockIcon,
  IndianRupee, Users, ListChecks, Plus, Check, Circle,
  ChevronDown, ChevronUp, Save,
} from "lucide-react";
import { SUB_EVENT_TYPES, formatDate, formatCurrency, formatTime, daysUntil, TASK_PRIORITIES } from "@/lib/utils";
import Link from "next/link";
import type { SubEvent, Contract, Vendor, Task, TimelineItem } from "@/lib/types";

const TYPE_EMOJI: Record<string, string> = {
  mehendi: "🌿", sangeet: "🎶", haldi: "💛", wedding: "💍",
  reception: "🎉", engagement: "💎", cocktail: "🍸",
  vidaai: "🥺", baraat: "🐴", other: "✨",
};

export default function FunctionDetailPage() {
  const supabase = createClient();
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const eventId = params.id as string;
  const subId = params.subId as string;

  const [fn, setFn] = useState<SubEvent | null>(null);
  const [contracts, setContracts] = useState<(Contract & { vendor: Vendor })[]>([]);
  const [allContracts, setAllContracts] = useState<(Contract & { vendor: Vendor })[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeline, setTimeline] = useState<(TimelineItem & { vendor?: Vendor })[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Add task inline
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");

  // Assign vendor
  const [showAssignVendor, setShowAssignVendor] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const [fnRes, conRes, allConRes, taskRes, tlRes] = await Promise.all([
      supabase.from("sub_events").select("*").eq("id", subId).single(),
      supabase.from("contracts").select("*, vendor:vendors(*)").eq("event_id", eventId).eq("sub_event_id", subId),
      supabase.from("contracts").select("*, vendor:vendors(*)").eq("event_id", eventId),
      supabase.from("tasks").select("*").eq("event_id", eventId).eq("sub_event_id", subId).order("sort_order"),
      supabase.from("timeline_items").select("*, vendor:vendors(*)").eq("event_id", eventId).eq("sub_event_id", subId).order("start_time"),
    ]);

    if (fnRes.data) {
      setFn(fnRes.data);
      setEditName(fnRes.data.name);
      setEditType(fnRes.data.type);
      setEditDate(fnRes.data.date || "");
      setEditStartTime(fnRes.data.start_time || "");
      setEditEndTime(fnRes.data.end_time || "");
      setEditVenue(fnRes.data.venue || "");
      setEditBudget(fnRes.data.budget ? String(fnRes.data.budget) : "");
      setEditNotes(fnRes.data.notes || "");
    }
    if (conRes.data) setContracts(conRes.data as any);
    if (allConRes.data) setAllContracts(allConRes.data as any);
    if (taskRes.data) setTasks(taskRes.data);
    if (tlRes.data) setTimeline(tlRes.data as any);
    setLoading(false);
  }

  async function handleSave() {
    if (!editName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("sub_events").update({
      name: editName.trim(),
      type: editType,
      date: editDate || null,
      start_time: editStartTime || null,
      end_time: editEndTime || null,
      venue: editVenue || null,
      budget: editBudget ? Number(editBudget) : null,
      notes: editNotes || null,
    }).eq("id", subId);
    if (error) addToast({ title: "Failed to save", variant: "destructive" });
    else { addToast({ title: "Updated!", variant: "success" }); setEditing(false); load(); }
    setSaving(false);
  }

  async function handleDelete() {
    const { error } = await supabase.from("sub_events").delete().eq("id", subId);
    if (!error) { addToast({ title: "Function deleted", variant: "success" }); router.push(`/events/${eventId}/sub-events`); }
  }

  async function assignVendor(contractId: string) {
    await supabase.from("contracts").update({ sub_event_id: subId }).eq("id", contractId);
    setShowAssignVendor(false);
    load();
  }

  async function unassignVendor(contractId: string) {
    await supabase.from("contracts").update({ sub_event_id: null }).eq("id", contractId);
    load();
  }

  async function addTask() {
    if (!newTaskTitle.trim()) return;
    await supabase.from("tasks").insert({
      event_id: eventId,
      sub_event_id: subId,
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
      sort_order: tasks.length,
    });
    setNewTaskTitle(""); setShowAddTask(false);
    load();
  }

  async function toggleTask(task: Task) {
    const next = task.status === "completed" ? "pending" : "completed";
    await supabase.from("tasks").update({ status: next, updated_at: new Date().toISOString() }).eq("id", task.id);
    load();
  }

  async function deleteTask(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    load();
  }

  // Budget tracking
  const fnBudget = fn?.budget ? Number(fn.budget) : 0;
  const fnAgreed = contracts.reduce((s, c) => s + Number(c.agreed_amount), 0);
  const unassignedContracts = allContracts.filter((c) => !c.sub_event_id && !contracts.find((fc) => fc.id === c.id));
  const tasksDone = tasks.filter((t) => t.status === "completed").length;

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;
  if (!fn) return <div className="p-4 text-center">Function not found.</div>;

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/events/${eventId}/sub-events`} className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{TYPE_EMOJI[fn.type] || "✨"}</span>
            <h1 className="text-xl font-bold">{fn.name}</h1>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-navy-500">
            {fn.date && <span>{formatDate(fn.date)}</span>}
            {fn.start_time && <span>{formatTime(fn.start_time)}{fn.end_time ? ` - ${formatTime(fn.end_time)}` : ""}</span>}
            {fn.venue && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{fn.venue}</span>}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      {/* Days countdown */}
      {fn.date && daysUntil(fn.date) >= 0 && (
        <div className={`mb-4 rounded-xl p-3 text-center ${
          daysUntil(fn.date) <= 3 ? "bg-red-50" : daysUntil(fn.date) <= 7 ? "bg-amber-50" : "bg-blue-50"
        }`}>
          <p className="text-2xl font-bold text-navy-900">
            {daysUntil(fn.date) === 0 ? "Today!" : daysUntil(fn.date) === 1 ? "Tomorrow!" : `${daysUntil(fn.date)} days to go`}
          </p>
        </div>
      )}

      {/* Edit Form */}
      {editing && (
        <div className="mb-4 space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Function name" />
          <div className="flex flex-wrap gap-2">
            {SUB_EVENT_TYPES.map((t) => (
              <button key={t.value} onClick={() => setEditType(t.value)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${editType === t.value ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 text-navy-600"}`}>
                {TYPE_EMOJI[t.value]} {t.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            <CurrencyInput value={editBudget} onChange={setEditBudget} placeholder="Budget" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} />
            <Input type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} />
          </div>
          <Input value={editVenue} onChange={(e) => setEditVenue(e.target.value)} placeholder="Venue" />
          <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} placeholder="Theme, dress code, notes..." />
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} size="sm" className="flex-1">
              <Save className="mr-1 h-4 w-4" /> Save
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Budget Card */}
      {fnBudget > 0 && (
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-navy-500">Function Budget</span>
            <span className="text-lg font-bold text-navy-900">{formatCurrency(fnBudget)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-navy-500">Vendor cost: {formatCurrency(fnAgreed)}</span>
            <span className={`font-semibold ${fnAgreed <= fnBudget ? "text-emerald-600" : "text-red-600"}`}>
              {fnAgreed <= fnBudget ? `${formatCurrency(fnBudget - fnAgreed)} remaining` : `${formatCurrency(fnAgreed - fnBudget)} over budget`}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-navy-100">
            <div className={`h-full rounded-full ${fnAgreed / fnBudget > 0.9 ? "bg-red-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min((fnAgreed / fnBudget) * 100, 100)}%` }} />
          </div>
        </div>
      )}

      {/* ============ VENDORS ============ */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-navy-900">
            <Users className="mr-1 inline h-4 w-4" /> Vendors ({contracts.length})
          </h2>
          <Button size="sm" variant="outline" onClick={() => setShowAssignVendor(!showAssignVendor)}>
            <Plus className="mr-1 h-3 w-3" /> Assign
          </Button>
        </div>

        {showAssignVendor && unassignedContracts.length > 0 && (
          <div className="mb-3 rounded-lg border border-navy-200 bg-white p-2">
            <p className="mb-2 text-xs text-navy-500">Assign an event vendor to this function:</p>
            {unassignedContracts.map((c) => (
              <button key={c.id} onClick={() => assignVendor(c.id)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-navy-50">
                <span className="text-sm font-medium">{c.vendor?.name}</span>
                <span className="text-xs text-navy-500">{formatCurrency(c.agreed_amount)}</span>
              </button>
            ))}
          </div>
        )}
        {showAssignVendor && unassignedContracts.length === 0 && (
          <p className="mb-3 rounded-lg bg-navy-50 p-3 text-xs text-navy-500">
            All event vendors are already assigned. <Link href={`/events/${eventId}/add-vendor`} className="font-semibold text-navy-700 underline">Add a new vendor</Link> first.
          </p>
        )}

        {contracts.length > 0 ? (
          <div className="space-y-2">
            {contracts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy-900">{c.vendor?.name}</p>
                  <p className="text-xs capitalize text-navy-500">{c.vendor?.category?.replace("_", " ")}</p>
                </div>
                <span className="text-sm font-bold text-navy-900">{formatCurrency(c.agreed_amount)}</span>
                <button onClick={() => unassignVendor(c.id)} className="text-navy-300 hover:text-red-500" title="Remove from function">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-navy-50 p-3 text-center text-xs text-navy-400">No vendors assigned to this function yet.</p>
        )}
      </div>

      {/* ============ TASKS / CHECKLIST ============ */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-navy-900">
            <ListChecks className="mr-1 inline h-4 w-4" /> Checklist ({tasksDone}/{tasks.length})
          </h2>
          <Button size="sm" variant="outline" onClick={() => setShowAddTask(!showAddTask)}>
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </div>

        {tasks.length > 0 && (
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-navy-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: tasks.length > 0 ? `${(tasksDone / tasks.length) * 100}%` : "0%" }} />
          </div>
        )}

        {showAddTask && (
          <div className="mb-3 flex gap-2">
            <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task title..." className="flex-1" onKeyDown={(e) => e.key === "Enter" && addTask()} />
            <Button size="sm" onClick={addTask} disabled={!newTaskTitle.trim()}>Add</Button>
          </div>
        )}

        <div className="space-y-1">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2 rounded-lg bg-white p-2.5 shadow-sm">
              <button onClick={() => toggleTask(task)} className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                task.status === "completed" ? "border-emerald-500 bg-emerald-500 text-white" : "border-navy-300"
              }`}>
                {task.status === "completed" && <Check className="h-3 w-3" />}
              </button>
              <span className={`flex-1 text-sm ${task.status === "completed" ? "text-navy-400 line-through" : "text-navy-900"}`}>
                {task.title}
              </span>
              <button onClick={() => deleteTask(task.id)} className="text-navy-300 hover:text-red-500">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {tasks.length === 0 && !showAddTask && (
          <p className="rounded-lg bg-navy-50 p-3 text-center text-xs text-navy-400">
            No tasks yet. Add checklist items for {fn.name}.
          </p>
        )}
      </div>

      {/* ============ TIMELINE ============ */}
      {timeline.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 text-base font-bold text-navy-900">
            <ClockIcon className="mr-1 inline h-4 w-4" /> Timeline
          </h2>
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-navy-200" />
            <div className="space-y-3">
              {timeline.map((item) => (
                <div key={item.id} className="relative flex gap-3 pl-1">
                  <div className="relative z-10 mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-navy-900">
                    <ClockIcon className="h-2.5 w-2.5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-navy-900">{item.title}</p>
                    <p className="text-xs text-navy-600">{formatTime(item.start_time)}{item.end_time ? ` - ${formatTime(item.end_time)}` : ""}</p>
                    {item.vendor && <span className="text-xs text-purple-600">{item.vendor.name}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Link to full timeline & tasks */}
      <div className="flex gap-2">
        <Link href={`/events/${eventId}/timeline`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            <ClockIcon className="mr-1 h-4 w-4" /> Full Timeline
          </Button>
        </Link>
        <Link href={`/events/${eventId}/tasks`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            <ListChecks className="mr-1 h-4 w-4" /> All Tasks
          </Button>
        </Link>
      </div>
    </div>
  );
}
