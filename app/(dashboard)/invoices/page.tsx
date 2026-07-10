"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Plus, Loader2, FileText, Send, Download, MessageCircle } from "lucide-react";
import { formatCurrency, formatDate, timeAgo } from "@/lib/utils";
import { getInvoiceReminderMessage } from "@/lib/whatsapp";
import { checkWhatsAppAPI, sendWhatsAppMessage } from "@/lib/whatsapp-api";
import Link from "next/link";
import type { Invoice } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-navy-100 text-navy-500",
};

export default function InvoicesPage() {
  const supabase = createClient();
  const { addToast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  useEffect(() => { load(); }, []);
  useEffect(() => { checkWhatsAppAPI().then(setWhatsappEnabled); }, []);

  async function load() {
    const { data } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
    if (data) setInvoices(data);
    setLoading(false);
  }

  async function remindClient(inv: Invoice) {
    if (!inv.client_phone || sendingReminder) return;
    setSendingReminder(inv.id);
    const message = getInvoiceReminderMessage({
      clientName: inv.client_name,
      invoiceNumber: inv.invoice_number,
      balance: inv.total - inv.amount_paid,
      dueDate: inv.due_date ? formatDate(inv.due_date) : null,
    });
    const result = await sendWhatsAppMessage({ phone: inv.client_phone, message });
    if (result.success) {
      const sentAt = new Date().toISOString();
      await supabase.from("invoices").update({ reminder_sent_at: sentAt }).eq("id", inv.id);
      setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, reminder_sent_at: sentAt } : i)));
      addToast({ title: "Reminder sent", description: `WhatsApp reminder sent to ${inv.client_name}`, variant: "success" });
    } else {
      addToast({ title: "Failed to send", description: result.error || "Could not send WhatsApp message", variant: "destructive" });
    }
    setSendingReminder(null);
  }

  const filtered = filterStatus === "all" ? invoices : invoices.filter((i) => i.status === filterStatus);
  const totalOutstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + (i.total - i.amount_paid), 0);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Invoices</h1>
          <p className="text-sm text-navy-500">Outstanding: {formatCurrency(totalOutstanding)}</p>
        </div>
        <Link href="/invoices/new">
          <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Invoice</Button>
        </Link>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {["all", "draft", "sent", "paid", "overdue"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
              filterStatus === s ? "bg-navy-900 text-white" : "bg-navy-100 text-navy-600"
            }`}>{s}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((inv) => (
          <Link key={inv.id} href={`/invoices/${inv.id}`} className="block rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-100">
                  <FileText className="h-5 w-5 text-navy-600" />
                </div>
                <div>
                  <p className="font-semibold text-navy-900">{inv.invoice_number}</p>
                  <p className="text-xs text-navy-500">{inv.client_name}</p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[inv.status]}`}>
                {inv.status}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-navy-500">
                {inv.due_date && `Due: ${formatDate(inv.due_date)}`}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-navy-900">{formatCurrency(inv.total)}</p>
                {inv.amount_paid > 0 && inv.amount_paid < inv.total && (
                  <p className="text-xs text-navy-500">Paid: {formatCurrency(inv.amount_paid)}</p>
                )}
              </div>
            </div>
            {whatsappEnabled && (inv.status === "sent" || inv.status === "overdue") && inv.client_phone && (
              <div className="mt-3 flex items-center justify-between border-t border-navy-100 pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={sendingReminder === inv.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    remindClient(inv);
                  }}
                >
                  {sendingReminder === inv.id ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <MessageCircle className="mr-1 h-3 w-3" />
                  )}
                  Remind
                </Button>
                {inv.reminder_sent_at && (
                  <span className="text-xs text-navy-400">Reminded {timeAgo(inv.reminder_sent_at)}</span>
                )}
              </div>
            )}
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-navy-400">No invoices yet. Create your first invoice!</p>
        )}
      </div>
    </div>
  );
}
