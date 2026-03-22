"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Plus, Loader2, Check, Circle, Clock, Trash2 } from "lucide-react";
import { TASK_PRIORITIES, formatDate } from "@/lib/utils";
import Link from "next/link";
import type { Task } from "@/lib/types";

const STATUS_ICONS = {
  pending: Circle,
  in_progress: Clock,
  completed: Check,
};

export default function EventTasksPage() {
  const supabase = createClient();
  const params = useParams();
  const { addToast } = useToast();
  const eventId = params.id as string;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("tasks").select("*").eq("event_id", eventId).order("sort_order").order("created_at");
    if (data) setTasks(data);
    setLoading(false);
  }

  async function handleAdd() {
    if (!title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      event_id: eventId,
      title: title.trim(),
      description: description || null,
      due_date: dueDate || null,
      priority,
      assigned_to: assignedTo || null,
      sort_order: tasks.length,
    });
    if (error) {
      addToast({ title: "Failed to add task", description: error.message, variant: "destructive" });
    } else {
      setTitle(""); setDescription(""); setDueDate(""); setPriority("medium"); setAssignedTo("");
      setShowForm(false);
      load();
    }
    setSaving(false);
  }

  async function toggleStatus(task: Task) {
    const next = task.status === "pending" ? "in_progress" : task.status === "in_progress" ? "completed" : "pending";
    await supabase.from("tasks").update({ status: next, updated_at: new Date().toISOString() }).eq("id", task.id);
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    load();
  }

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);
  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    pending: tasks.filter((t) => t.status === "pending").length,
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/events/${eventId}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Checklist</h1>
          <p className="text-sm text-navy-500">{stats.completed}/{stats.total} completed</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      {/* Progress bar */}
      {stats.total > 0 && (
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-navy-100">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(stats.completed / stats.total) * 100}%` }} />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {(["all", "pending", "in_progress", "completed"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === f ? "bg-navy-900 text-white" : "bg-navy-100 text-navy-600"
            }`}>
            {f === "all" ? "All" : f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="mb-4 space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title *" />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Assign to" />
          </div>
          <div className="flex gap-2">
            {TASK_PRIORITIES.map((p) => (
              <button key={p.value} onClick={() => setPriority(p.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  priority === p.value ? p.color + " ring-2 ring-offset-1 ring-navy-300" : "bg-navy-50 text-navy-500"
                }`}>{p.label}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={saving || !title.trim()} size="sm" className="flex-1">
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Add Task
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((task) => {
          const Icon = STATUS_ICONS[task.status];
          const priorityStyle = TASK_PRIORITIES.find((p) => p.value === task.priority);
          return (
            <div key={task.id} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm">
              <button onClick={() => toggleStatus(task)} className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                task.status === "completed" ? "border-emerald-500 bg-emerald-500 text-white" :
                task.status === "in_progress" ? "border-amber-500 text-amber-500" : "border-navy-300 text-navy-300"
              }`}>
                <Icon className="h-3.5 w-3.5" />
              </button>
              <div className="flex-1">
                <p className={`text-sm font-medium ${task.status === "completed" ? "text-navy-400 line-through" : "text-navy-900"}`}>
                  {task.title}
                </p>
                {task.description && <p className="text-xs text-navy-400">{task.description}</p>}
                <div className="mt-1 flex flex-wrap gap-2">
                  {task.due_date && (
                    <span className="text-xs text-navy-500">{formatDate(task.due_date)}</span>
                  )}
                  {task.assigned_to && (
                    <span className="rounded bg-navy-100 px-1.5 py-0.5 text-xs text-navy-600">{task.assigned_to}</span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityStyle?.color}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
              <button onClick={() => handleDelete(task.id)} className="text-navy-300 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-navy-400">No tasks yet. Add your first task!</p>
        )}
      </div>
    </div>
  );
}
