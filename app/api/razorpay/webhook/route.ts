import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify signature if webhook secret is configured
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.error("Razorpay webhook signature mismatch");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 400 }
        );
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    if (event === "payment_link.paid") {
      const paymentLink = payload.payload?.payment_link?.entity;
      const referenceId = paymentLink?.reference_id;

      if (!referenceId) {
        // No reference_id to reconcile — acknowledge anyway
        return NextResponse.json({ status: "ok" });
      }

      const supabase = await createClient();

      if (referenceId.startsWith("inv_")) {
        const invoiceId = referenceId.slice(4);
        const { error } = await supabase
          .from("invoices")
          .update({
            status: "paid",
            amount_paid: paymentLink.amount / 100, // Convert paise to rupees
          })
          .eq("id", invoiceId);

        if (error) {
          console.error("Failed to update invoice:", error);
        }
      } else if (referenceId.startsWith("ps_")) {
        const scheduleId = referenceId.slice(3);
        const { error } = await supabase
          .from("payment_schedules")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("id", scheduleId);

        if (error) {
          console.error("Failed to update payment schedule:", error);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json({ status: "ok" });
  }
}
