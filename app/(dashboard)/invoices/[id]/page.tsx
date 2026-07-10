"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Loader2, Send, Download, Trash2, FileDown, IndianRupee } from "lucide-react";
import { generateInvoicePDF, downloadPDF } from "@/lib/pdf-generator";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { WhatsAppShare } from "@/components/whatsapp-share";
import { isRazorpayEnabled, createPaymentLink } from "@/lib/razorpay";
import { getWhatsAppShareURL } from "@/lib/whatsapp";
import Link from "next/link";
import type { Agency, Invoice } from "@/lib/types";

export default function InvoiceDetailPage() {
  const supabase = createClient();
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [sendingPaymentLink, setSendingPaymentLink] = useState(false);

  useEffect(() => { load(); }, []);
  useEffect(() => { isRazorpayEnabled().then(setRazorpayEnabled); }, []);

  async function load() {
    const { data } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
    if (data) {
      setInvoice(data);
      const { data: agencyData } = await supabase.from("agencies").select("*").eq("id", data.agency_id).single();
      if (agencyData) setAgency(agencyData);
    }
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

  function handleDownloadPDF() {
    if (!invoice) return;
    const doc = generateInvoicePDF({
      ...invoice,
      items: invoice.items || [],
      agency_name: agency?.name,
      agency_gstin: agency?.gstin,
    });
    downloadPDF(doc, `${invoice.invoice_number}.pdf`);
  }

  function getInvoiceText() {
    if (!invoice) return "";
    const gstType = invoice.gst_type || "none";
    const halfRate = invoice.tax_percent / 2;
    const taxLines =
      gstType === "cgst_sgst"
        ? [
            `CGST @ ${halfRate}%: ${formatCurrency(invoice.cgst_amount || 0)}`,
            `SGST @ ${halfRate}%: ${formatCurrency(invoice.sgst_amount || 0)}`,
          ]
        : gstType === "igst"
          ? [`IGST @ ${invoice.tax_percent}%: ${formatCurrency(invoice.igst_amount || 0)}`]
          : invoice.tax_percent > 0
            ? [`Tax (${invoice.tax_percent}%): ${formatCurrency(invoice.tax_amount)}`]
            : [];
    const lines = [
      `*${gstType !== "none" ? "TAX INVOICE" : "INVOICE"} ${invoice.invoice_number}*`,
      agency?.gstin ? `GSTIN: ${agency.gstin}` : "",
      `Client: ${invoice.client_name}`,
      invoice.client_gstin ? `Client GSTIN: ${invoice.client_gstin}` : "",
      invoice.place_of_supply ? `Place of Supply: ${invoice.place_of_supply}` : "",
      gstType !== "none" && invoice.hsn_sac ? `HSN/SAC: ${invoice.hsn_sac}` : "",
      `Date: ${formatDate(invoice.created_at)}`,
      invoice.due_date ? `Due: ${formatDate(invoice.due_date)}` : "",
      "",
      "*Items:*",
      ...(invoice.items || []).map((item: any) => `• ${item.description}: ${formatCurrency(item.amount)}`),
      "",
      `Subtotal: ${formatCurrency(invoice.subtotal)}`,
      ...taxLines,
      `*Total: ${formatCurrency(invoice.total)}*`,
      "",
      invoice.notes || "",
    ].filter(Boolean);
    return lines.join("\n");
  }

  async function sendPaymentLink() {
    if (!invoice) return;
    setSendingPaymentLink(true);
    try {
      const result = await createPaymentLink({
        amount: invoice.total - (invoice.amount_paid || 0),
        currency: "INR",
        description: `Invoice ${invoice.invoice_number}`,
        customer_name: invoice.client_name,
        customer_phone: invoice.client_phone || undefined,
        customer_email: invoice.client_email || undefined,
        reference_id: `inv_${invoice.id}`,
      });

      addToast({ title: "Payment link created!", variant: "success" });

      // Open WhatsApp with the payment link
      const msg = `Hi ${invoice.client_name},\n\nHere is your payment link for Invoice ${invoice.invoice_number}:\n\nAmount: ${formatCurrency(invoice.total - (invoice.amount_paid || 0))}\n\n${result.short_url}\n\nPlease complete the payment at your convenience. Thank you!`;
      const phone = invoice.client_phone || "";
      if (phone) {
        window.open(getWhatsAppShareURL(phone, msg), "_blank");
      } else {
        // Copy link to clipboard if no phone
        await navigator.clipboard.writeText(result.short_url);
        addToast({ title: "Payment link copied to clipboard", variant: "success" });
      }
    } catch (err: any) {
      addToast({ title: "Failed to create payment link", description: err.message, variant: "destructive" });
    } finally {
      setSendingPaymentLink(false);
    }
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
        {(invoice.gst_type === "cgst_sgst" || invoice.gst_type === "igst") && (
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-navy-500">Tax Invoice</p>
        )}
        {agency && (
          <div className="mb-4 border-b border-navy-100 pb-4">
            <p className="font-bold text-navy-900">{agency.name}</p>
            {agency.gstin && <p className="text-xs text-navy-500">GSTIN: {agency.gstin}</p>}
            {agency.gst_state_code && <p className="text-xs text-navy-500">State Code: {agency.gst_state_code}</p>}
          </div>
        )}
        <div className="mb-4 flex justify-between">
          <div>
            <p className="text-sm text-navy-500">Bill To</p>
            <p className="font-semibold text-navy-900">{invoice.client_name}</p>
            {invoice.client_gstin && <p className="text-xs text-navy-500">GSTIN: {invoice.client_gstin}</p>}
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

        {(invoice.place_of_supply || (invoice.gst_type && invoice.gst_type !== "none" && invoice.hsn_sac)) && (
          <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-navy-50 p-3 text-xs">
            {invoice.place_of_supply && (
              <p><span className="text-navy-500">Place of Supply:</span> <span className="font-medium text-navy-900">{invoice.place_of_supply}</span></p>
            )}
            {invoice.gst_type && invoice.gst_type !== "none" && invoice.hsn_sac && (
              <p><span className="text-navy-500">HSN/SAC:</span> <span className="font-medium text-navy-900">{invoice.hsn_sac}</span></p>
            )}
          </div>
        )}

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
            <span className="text-navy-500">Subtotal (Taxable Value)</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.gst_type === "cgst_sgst" ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-navy-500">CGST @ {invoice.tax_percent / 2}%</span>
                <span>{formatCurrency(invoice.cgst_amount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-navy-500">SGST @ {invoice.tax_percent / 2}%</span>
                <span>{formatCurrency(invoice.sgst_amount || 0)}</span>
              </div>
            </>
          ) : invoice.gst_type === "igst" ? (
            <div className="flex justify-between text-sm">
              <span className="text-navy-500">IGST @ {invoice.tax_percent}%</span>
              <span>{formatCurrency(invoice.igst_amount || 0)}</span>
            </div>
          ) : invoice.tax_percent > 0 ? (
            <div className="flex justify-between text-sm">
              <span className="text-navy-500">Tax ({invoice.tax_percent}%)</span>
              <span>{formatCurrency(invoice.tax_amount)}</span>
            </div>
          ) : null}
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
        <Button onClick={handleDownloadPDF} variant="outline" size="lg" className="w-full">
          <FileDown className="mr-2 h-4 w-4" /> Download PDF
        </Button>
        <WhatsAppShare phone={invoice.client_phone} message={getInvoiceText()} label="Share via WhatsApp" />
        {razorpayEnabled && ["draft", "sent", "overdue"].includes(invoice.status) && (
          <Button onClick={sendPaymentLink} variant="outline" size="lg" className="w-full" disabled={sendingPaymentLink}>
            {sendingPaymentLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <IndianRupee className="mr-2 h-4 w-4 text-blue-600" />}
            Send Payment Link
          </Button>
        )}
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
        <ConfirmDialog
          title="Delete Invoice"
          message={`Are you sure you want to delete invoice ${invoice.invoice_number}? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
        >
          <Button variant="destructive" size="lg" className="w-full">
            <Trash2 className="mr-2 h-4 w-4" /> Delete Invoice
          </Button>
        </ConfirmDialog>
      </div>
    </div>
  );
}
