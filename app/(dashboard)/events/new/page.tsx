"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/currency-input";
import { ArrowLeft, Loader2, Save, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { EVENT_TYPES } from "@/lib/utils";
import { SYSTEM_TEMPLATES } from "@/lib/event-templates";

export default function NewEventPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    event_type: "wedding",
    total_budget: "",
    event_date: "",
    venue: "",
    notes: "",
  });

  function selectTemplate(index: number) {
    const template = SYSTEM_TEMPLATES[index];
    setSelectedTemplate(index);
    setForm({ ...form, event_type: template.event_type });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { requireUser } = await import("@/lib/auth");
    const user = await requireUser();

    const { data, error } = await supabase
      .from("events")
      .insert({
        agency_id: user.id,
        client_name: form.client_name,
        client_phone: form.client_phone || null,
        event_type: form.event_type,
        total_budget: form.total_budget ? Number(form.total_budget) : null,
        event_date: form.event_date || null,
        venue: form.venue || null,
        notes: form.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[NewEvent] Failed to create event:", error.message, error);
      setLoading(false);
      return;
    }

    if (data && selectedTemplate !== null) {
      const template = SYSTEM_TEMPLATES[selectedTemplate];
      const eventDate = form.event_date ? new Date(form.event_date) : null;
      const budget = form.total_budget ? Number(form.total_budget) : null;

      // Create sub-events from template
      if (template.sub_events.length > 0) {
        const subEventsData = template.sub_events.map((se, i) => ({
          event_id: data.id,
          name: se.name,
          type: se.type,
          sort_order: i,
          budget: budget
            ? Math.round(budget * ((template.budget_split as unknown as Record<string, number>)[se.type] || 0) / 100) || null
            : null,
        }));
        await supabase.from("sub_events").insert(subEventsData);
      }

      // Create tasks from template
      if (template.tasks.length > 0) {
        const tasksData = template.tasks.map((task, i) => ({
          event_id: data.id,
          title: task.title,
          priority: task.priority,
          status: "pending",
          sort_order: i,
          due_date: eventDate
            ? new Date(eventDate.getTime() - task.days_before * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
            : null,
        }));
        await supabase.from("tasks").insert(tasksData);
      }
    }

    if (data) {
      router.push(`/events/${data.id}`);
    }
    setLoading(false);
  };

  return (
    <div className="px-4 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/events" className="rounded-full p-2 hover:bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">New Event</h1>
      </div>

      {/* Template Selection */}
      <div className="mb-4">
        <button onClick={() => setShowTemplates(!showTemplates)}
          className="mb-2 flex w-full items-center justify-between rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-navy-900">Start from Template</span>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
              Auto-creates tasks & functions
            </span>
          </div>
          {showTemplates ? <ChevronUp className="h-4 w-4 text-navy-400" /> : <ChevronDown className="h-4 w-4 text-navy-400" />}
        </button>
        {showTemplates && (
          <div className="grid grid-cols-2 gap-2">
            {SYSTEM_TEMPLATES.map((template, i) => (
              <button key={i} type="button" onClick={() => selectTemplate(i)}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  selectedTemplate === i
                    ? "border-purple-500 bg-purple-50"
                    : "border-navy-100 bg-white hover:border-navy-200"
                }`}>
                <p className="text-sm font-semibold text-navy-900">{template.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">
                    {template.sub_events.length} functions
                  </span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                    {template.tasks.length} tasks
                  </span>
                </div>
              </button>
            ))}
            {selectedTemplate !== null && (
              <button type="button" onClick={() => setSelectedTemplate(null)}
                className="rounded-lg border-2 border-dashed border-navy-200 p-3 text-sm text-navy-500 hover:border-navy-300">
                No Template (blank)
              </button>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="client_name">Client Name *</Label>
          <Input
            id="client_name"
            placeholder="e.g., Sharma Family"
            value={form.client_name}
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_phone">Client Phone</Label>
          <Input
            id="client_phone"
            type="tel"
            placeholder="98765 43210"
            value={form.client_phone}
            onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
            inputMode="numeric"
          />
        </div>

        <div className="space-y-2">
          <Label>Event Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {EVENT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setForm({ ...form, event_type: type.value })}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  form.event_type === type.value
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-navy-200 bg-white text-navy-600 hover:border-navy-300"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget">Total Budget</Label>
          <CurrencyInput
            value={form.total_budget}
            onChange={(v) => setForm({ ...form, total_budget: v })}
            placeholder="0"
          />
          {selectedTemplate !== null && form.total_budget && (
            <p className="text-xs text-purple-600">
              Budget will be auto-split across functions based on template
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="event_date">Event Date</Label>
          <Input
            id="event_date"
            type="date"
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
          />
          {selectedTemplate !== null && form.event_date && (
            <p className="text-xs text-purple-600">
              Task due dates will be auto-calculated based on this date
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="venue">Venue</Label>
          <Input
            id="venue"
            placeholder="e.g., The Grand Palace, Dwarka"
            value={form.venue}
            onChange={(e) => setForm({ ...form, venue: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Any additional details..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {selectedTemplate !== null ? "Create Event from Template" : "Create Event"}
        </Button>
      </form>
    </div>
  );
}
