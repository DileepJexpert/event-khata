"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Loader2, Send, Download, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { WhatsAppShare } from "@/components/whatsapp-share";
import Link from "next/link";
import type { Invoice } from "@/lib/types";

export default function InvoiceDetailPage() {
  const supabase = createClient();
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
    if (data) setInvoice(data);
    setLoading(false);
  }

  async function markSent() {
    await supabase.from("invoices").update({ status: "sent" }).eq("id", invoiceId);
    addToast({ title: "Marked as sent", variant: "success" });
    load();
  }

  async function markPaid() {
    await supabase.from("invoices").update({ status: "paid", amount_paid: invoice?.total }).eq("id", invoiceId);
    addToast({ title: "Marked as paid", variant: "success" });
    load();
  }

  async function handleDelete() {
    await supabase.from("invoices").delete().eq("id", invoiceId);
    addToast({ title: "Invoice deleted", variant: "success" });
    router.push("/invoices");
  }

  function getInvoiceText() {
    if (!invoice) return "";
    const lines = [
      `*INVOICE ${invoice.invoice_number}*`,
      `Client: ${invoice.client_name}`,
      `Date: ${formatDate(invoice.created_at)}`,
      invoice.due_date ? `Due: ${formatDate(invoice.due_date)}` : "",
      "",
      "*Items:*",
      ...(invoice.items || []).map((item: any) => `• ${item.description}: ${formatCurrency(item.amount)}`),
      "",
      `Subtotal: ${formatCurrency(invoice.subtotal)}`,
      `Tax (${invoice.tax_percent}%): ${formatCurrency(invoice.tax_amount)}`,
      `*Total: ${formatCurrency(invoice.total)}*`,
      "",
      invoice.notes || "",
    ].filter(Boolean);
    return lines.join("\n");
  }

  if (loading || !invoice) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/invoices" className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{invoice.invoice_number}</h1>
          <p className="text-sm capitalize text-navy-500">{invoice.status}</p>
        </div>
      </div>

      {/* Invoice Card */}
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex justify-between">
          <div>
            <p className="text-sm text-navy-500">Bill To</p>
            <p className="font-semibold text-navy-900">{invoice.client_name}</p>
            {invoice.client_phone && <p className="text-xs text-navy-500">{invoice.client_phone}</p>}
            {invoice.client_email && <p className="text-xs text-navy-500">{invoice.client_email}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm text-navy-500">Date</p>
            <p className="text-sm font-medium">{formatDate(invoice.created_at)}</p>
            {invoice.due_date && (
              <>
                <p className="mt-1 text-sm text-navy-500">Due</p>
                <p className="text-sm font-medium">{formatDate(invoice.due_date)}</p>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-navy-100 pt-4">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-navy-500">
                <th className="pb-2 text-left">Description</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item: any, i: number) => (
                <tr key={i} className="border-t border-navy-50">
                  <td className="py-2 text-sm text-navy-900">{item.description}</td>
                  <td className="py-2 text-right text-sm font-medium">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-1 border-t border-navy-100 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-navy-500">Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-navy-500">Tax ({invoice.tax_percent}%)</span>
            <span>{formatCurrency(invoice.tax_amount)}</span>
          </div>
          <div className="flex justify-between border-t border-navy-200 pt-2 text-lg font-bold">
            <span>Total</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
          {invoice.amount_paid > 0 && invoice.amount_paid < invoice.total && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Paid</span>
              <span>{formatCurrency(invoice.amount_paid)}</span>
            </div>
          )}
        </div>

        {invoice.notes && (
          <div className="mt-4 border-t border-navy-100 pt-4">
            <p className="text-xs text-navy-500">Notes</p>
            <p className="text-sm text-navy-700">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <WhatsAppShare phone={invoice.client_phone} message={getInvoiceText()} label="Share via WhatsApp" />
        {invoice.status === "draft" && (
          <Button onClick={markSent} size="lg" className="w-full">
            <Send className="mr-2 h-4 w-4" /> Mark as Sent
          </Button>
        )}
        {(invoice.status === "sent" || invoice.status === "overdue") && (
          <Button onClick={markPaid} variant="success" size="lg" className="w-full">
            Mark as Paid
          </Button>
        )}
        <Button onClick={handleDelete} variant="destructive" size="lg" className="w-full">
          <Trash2 className="mr-2 h-4 w-4" /> Delete Invoice
        </Button>
      </div>
    </div>
  );
}
