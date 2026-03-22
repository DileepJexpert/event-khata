"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Bell, AlertTriangle, CalendarDays, CreditCard, CheckCircle2, Clock } from "lucide-react";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import Link from "next/link";
import type { Event, PaymentSchedule } from "@/lib/types";

type Notification = {
  id: string;
  type: "payment_overdue" | "payment_due" | "event_upcoming" | "task_overdue" | "lead_followup";
  title: string;
  description: string;
  link: string;
  urgency: "high" | "medium" | "low";
  date: string;
};

export default function NotificationsPage() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const [payRes, eventRes, taskRes, leadRes] = await Promise.all([
      supabase.from("payment_schedules").select("*, vendor:vendors(name), event:events(client_name, id)").in("status", ["upcoming", "due", "overdue"]),
      supabase.from("events").select("*").eq("status", "active").not("event_date", "is", null),
      supabase.from("tasks").select("*, event:events(client_name, id)").neq("status", "completed").not("due_date", "is", null),
      supabase.from("leads").select("*").not("follow_up_date", "is", null).neq("status", "won").neq("status", "lost"),
    ]);

    const notifs: Notification[] = [];

    // Overdue payments
    (payRes.data || []).forEach((p: any) => {
      const days = daysUntil(p.due_date);
      if (days < 0) {
        notifs.push({
          id: `pay-${p.id}`,
          type: "payment_overdue",
          title: `Payment overdue: ${p.vendor?.name}`,
          description: `${formatCurrency(p.amount)} was due ${formatDate(p.due_date)} for ${p.event?.client_name}`,
          link: `/events/${p.event?.id}/payment-schedule`,
          urgency: "high",
          date: p.due_date,
        });
      } else if (days <= 7) {
        notifs.push({
          id: `pay-due-${p.id}`,
          type: "payment_due",
          title: `Payment due soon: ${p.vendor?.name}`,
          description: `${formatCurrency(p.amount)} due in ${days} day${days !== 1 ? "s" : ""} for ${p.event?.client_name}`,
          link: `/events/${p.event?.id}/payment-schedule`,
          urgency: days <= 2 ? "high" : "medium",
          date: p.due_date,
        });
      }
    });

    // Upcoming events
    (eventRes.data || []).forEach((e) => {
      if (!e.event_date) return;
      const days = daysUntil(e.event_date);
      if (days >= 0 && days <= 14) {
        notifs.push({
          id: `event-${e.id}`,
          type: "event_upcoming",
          title: `Event in ${days} day${days !== 1 ? "s" : ""}`,
          description: `${e.client_name}${e.venue ? ` at ${e.venue}` : ""} on ${formatDate(e.event_date)}`,
          link: `/events/${e.id}`,
          urgency: days <= 3 ? "high" : days <= 7 ? "medium" : "low",
          date: e.event_date,
        });
      }
    });

    // Overdue tasks
    (taskRes.data || []).forEach((t: any) => {
      if (!t.due_date) return;
      const days = daysUntil(t.due_date);
      if (days < 0) {
        notifs.push({
          id: `task-${t.id}`,
          type: "task_overdue",
          title: `Overdue task: ${t.title}`,
          description: `Was due ${formatDate(t.due_date)} for ${t.event?.client_name || ""}`,
          link: t.event?.id ? `/events/${t.event.id}/tasks` : "/tasks",
          urgency: "medium",
          date: t.due_date,
        });
      }
    });

    // Lead follow-ups
    (leadRes.data || []).forEach((l: any) => {
      if (!l.follow_up_date) return;
      const days = daysUntil(l.follow_up_date);
      if (days <= 1 && days >= -3) {
        notifs.push({
          id: `lead-${l.id}`,
          type: "lead_followup",
          title: `Follow up: ${l.client_name}`,
          description: `${days < 0 ? "Overdue" : days === 0 ? "Today" : "Tomorrow"} - ${l.event_type}`,
          link: "/leads",
          urgency: days <= 0 ? "high" : "medium",
          date: l.follow_up_date,
        });
      }
    });

    // Sort by urgency then date
    notifs.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      return a.date.localeCompare(b.date);
    });

    setNotifications(notifs);
    setLoading(false);
  }

  const ICONS = {
    payment_overdue: AlertTriangle,
    payment_due: CreditCard,
    event_upcoming: CalendarDays,
    task_overdue: Clock,
    lead_followup: Bell,
  };

  const ICON_STYLES = {
    high: "bg-red-100 text-red-600",
    medium: "bg-amber-100 text-amber-600",
    low: "bg-blue-100 text-blue-600",
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-navy-900">Notifications</h1>
        <p className="text-sm text-navy-500">
          {notifications.filter((n) => n.urgency === "high").length} urgent items
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-navy-900">All caught up!</h2>
          <p className="mt-1 text-sm text-navy-500">No pending notifications or reminders.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = ICONS[notif.type];
            const iconStyle = ICON_STYLES[notif.urgency];
            return (
              <Link key={notif.id} href={notif.link}
                className={`flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm ${
                  notif.urgency === "high" ? "border-l-4 border-red-500" : ""
                }`}>
                <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${iconStyle}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy-900">{notif.title}</p>
                  <p className="text-xs text-navy-500">{notif.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
