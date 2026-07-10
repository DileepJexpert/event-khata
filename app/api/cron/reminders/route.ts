import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getInvoiceReminderMessage,
  getScheduleReminderMessage,
} from "@/lib/whatsapp";

// Runs on a schedule (see vercel.json crons). No user session — uses the
// service-role client to read across all agencies and send WhatsApp nudges
// for overdue client invoices and due/overdue vendor payment schedules.
//
// Fails closed: returns 503 if CRON_SECRET or WhatsApp env vars are missing,
// and 401 if the caller's bearer token does not match CRON_SECRET.

export const dynamic = "force-dynamic";

const REMINDER_COOLDOWN_DAYS = 3;

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
}

async function sendWhatsApp(
  token: string,
  phoneId: string,
  phone: string,
  message: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formatPhone(phone),
          type: "text",
          text: { body: message },
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

function daysAgoISO(days: number): string {
  const ms = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!token || !phoneId) {
    return NextResponse.json(
      { error: "WhatsApp Business API not configured" },
      { status: 503 }
    );
  }

  const supabase = serviceClient();
  const today = new Date().toISOString().slice(0, 10);
  const cooldownCutoff = daysAgoISO(REMINDER_COOLDOWN_DAYS);

  let invoicesReminded = 0;
  let schedulesReminded = 0;

  // 1. Overdue client invoices (sent/overdue, past due, with a client phone)
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, client_name, client_phone, total, amount_paid, due_date, status, reminder_sent_at")
    .in("status", ["sent", "overdue"])
    .not("client_phone", "is", null)
    .lt("due_date", today);

  for (const inv of invoices || []) {
    if (!inv.client_phone) continue;
    if (inv.reminder_sent_at && inv.reminder_sent_at > cooldownCutoff) continue;
    const balance = Number(inv.total || 0) - Number(inv.amount_paid || 0);
    if (balance <= 0) continue;

    const message = getInvoiceReminderMessage({
      clientName: inv.client_name,
      invoiceNumber: inv.invoice_number,
      balance,
      dueDate: inv.due_date,
    });
    const ok = await sendWhatsApp(token, phoneId, inv.client_phone, message);
    if (ok) {
      await supabase
        .from("invoices")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", inv.id);
      invoicesReminded++;
    }
  }

  // 2. Vendor payment schedules due today or overdue (due/overdue status)
  const { data: schedules } = await supabase
    .from("payment_schedules")
    .select("id, amount, due_date, label, status, reminder_sent_at, vendor:vendors(name, phone)")
    .in("status", ["due", "overdue"])
    .lte("due_date", today);

  for (const sch of (schedules as any[]) || []) {
    const vendor = sch.vendor;
    if (!vendor?.phone) continue;
    if (sch.reminder_sent_at && sch.reminder_sent_at > cooldownCutoff) continue;

    const message = getScheduleReminderMessage({
      vendorName: vendor.name,
      amount: Number(sch.amount || 0),
      label: sch.label,
      dueDate: sch.due_date,
    });
    const ok = await sendWhatsApp(token, phoneId, vendor.phone, message);
    if (ok) {
      await supabase
        .from("payment_schedules")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", sch.id);
      schedulesReminded++;
    }
  }

  return NextResponse.json({
    ok: true,
    invoicesReminded,
    schedulesReminded,
  });
}
