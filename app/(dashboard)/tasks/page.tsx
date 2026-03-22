"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Check, Circle, Clock, CalendarDays } from "lucide-react";
import { formatDate, TASK_PRIORITIES } from "@/lib/utils";
import Link from "next/link";
import type { Task, Event } from "@/lib/types";

export default function GlobalTasksPage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<(Task & { event?: Event })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("tasks").select("*, event:events(client_name, id)").order("due_date", { ascending: true, nullsFirst: false });
    if (data) setTasks(data as any);
    setLoading(false);
  }

  async function toggleStatus(task: Task) {
    const next = task.status === "pending" ? "in_progress" : task.status === "in_progress" ? "completed" : "pending";
    await supabase.from("tasks").update({ status: next, updated_at: new Date().toISOString() }).eq("id", task.id);
    load();
  }

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);
  const overdue = tasks.filter((t) => t.status !== "completed" && t.due_date && new Date(t.due_date) < new Date()).length;

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-navy-900">All Tasks</h1>
        <p className="text-sm text-navy-500">
          {tasks.filter((t) => t.status !== "completed").length} pending
          {overdue > 0 && <span className="ml-1 text-red-600">&middot; {overdue} overdue</span>}
        </p>
      </div>

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

      <div className="space-y-2">
        {filtered.map((task) => {
          const isOverdue = task.status !== "completed" && task.due_date && new Date(task.due_date) < new Date();
          const priorityStyle = TASK_PRIORITIES.find((p) => p.value === task.priority);
          return (
            <div key={task.id} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm">
              <button onClick={() => toggleStatus(task)} className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                task.status === "completed" ? "border-emerald-500 bg-emerald-500 text-white" :
                task.status === "in_progress" ? "border-amber-500 text-amber-500" : "border-navy-300 text-navy-300"
              }`}>
                {task.status === "completed" ? <Check className="h-3.5 w-3.5" /> :
                 task.status === "in_progress" ? <Clock className="h-3.5 w-3.5" /> :
                 <Circle className="h-3.5 w-3.5" />}
              </button>
              <div className="flex-1">
                <p className={`text-sm font-medium ${task.status === "completed" ? "text-navy-400 line-through" : "text-navy-900"}`}>
                  {task.title}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {task.event && (
                    <Link href={`/events/${task.event.id}`} className="flex items-center gap-1 text-xs text-blue-600">
                      <CalendarDays className="h-3 w-3" /> {(task.event as any).client_name}
                    </Link>
                  )}
                  {task.due_date && (
                    <span className={`text-xs ${isOverdue ? "font-medium text-red-600" : "text-navy-500"}`}>
                      {formatDate(task.due_date)}
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityStyle?.color}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-navy-400">No tasks found.</p>
        )}
      </div>
    </div>
  );
}
