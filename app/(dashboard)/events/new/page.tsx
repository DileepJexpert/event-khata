"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/currency-input";
import { ArrowLeft, Loader2, Save, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { EVENT_TYPES, isValidPhone } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { SYSTEM_TEMPLATES } from "@/lib/event-templates";

type TemplateShape = {
  name: string;
  event_type: string;
  sub_events: { name: string; type: string }[];
  tasks: { title: string; priority: string; days_before: number }[];
  budget_split: Record<string, number>;
  is_custom?: boolean;
};

export default function NewEventPage() {
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [templates, setTemplates] = useState<TemplateShape[]>(SYSTEM_TEMPLATES as unknown as TemplateShape[]);
  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    event_type: "wedding",
    total_budget: "",
    event_date: "",
    venue: "",
    notes: "",
  });

  useEffect(() => {
    // Load the agency's saved custom templates and append them after system ones.
    supabase.from("event_templates").select("*").eq("is_system", false).order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const custom: TemplateShape[] = data.map((t: any) => ({
            name: t.name,
            event_type: t.event_type,
            sub_events: t.sub_events || [],
            tasks: t.tasks || [],
            budget_split: t.budget_split || {},
            is_custom: true,
          }));
          setTemplates([...(SYSTEM_TEMPLATES as unknown as TemplateShape[]), ...custom]);
        }
      });
  }, []);

  function selectTemplate(index: number) {
    const template = templates[index];
    setSelectedTemplate(index);
    setForm({ ...form, event_type: template.event_type });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!form.client_name.trim()) newErrors.client_name = "Client name is required";
    if (form.client_phone && !isValidPhone(form.client_phone)) newErrors.client_phone = "Enter a valid 10-digit phone number";
    if (form.total_budget && Number(form.total_budget) < 0) newErrors.total_budget = "Budget cannot be negative";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
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
      addToast({ title: "Failed to create event", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (data && selectedTemplate !== null) {
      const template = templates[selectedTemplate];
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
        <Link href="/events" className="rounded-full p-2 hover:bg-navy-100 dark:hover:bg-navy-800">
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
            {templates.map((template, i) => (
              <button key={i} type="button" onClick={() => selectTemplate(i)}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  selectedTemplate === i
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950"
                    : "border-navy-100 bg-white hover:border-navy-200 dark:border-navy-700 dark:bg-navy-800 dark:hover:border-navy-600"
                }`}>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold text-navy-900 dark:text-navy-100">{template.name}</p>
                  {template.is_custom && (
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Saved</span>
                  )}
                </div>
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
            onChange={(e) => { setForm({ ...form, client_name: e.target.value }); setErrors({ ...errors, client_name: "" }); }}
            required
            autoFocus
            className={errors.client_name ? "border-red-500" : ""}
          />
          {errors.client_name && <p className="text-xs text-red-500">{errors.client_name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_phone">Client Phone</Label>
          <Input
            id="client_phone"
            type="tel"
            placeholder="98765 43210"
            value={form.client_phone}
            onChange={(e) => { setForm({ ...form, client_phone: e.target.value }); setErrors({ ...errors, client_phone: "" }); }}
            inputMode="numeric"
            className={errors.client_phone ? "border-red-500" : ""}
          />
          {errors.client_phone && <p className="text-xs text-red-500">{errors.client_phone}</p>}
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
                    ? "border-navy-900 bg-navy-900 text-white dark:border-navy-300 dark:bg-navy-700 dark:text-navy-100"
                    : "border-navy-200 bg-white text-navy-600 hover:border-navy-300 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-300 dark:hover:border-navy-600"
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
