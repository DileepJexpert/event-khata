import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 503 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    if (event === "payment_link.paid") {
      const paymentLink = payload.payload?.payment_link?.entity;
      const referenceId = paymentLink?.reference_id;

      if (!referenceId) {
        return NextResponse.json({ status: "ok" });
      }

      const supabase = getServiceClient();

      if (referenceId.startsWith("inv_")) {
        const invoiceId = referenceId.slice(4);
        const { error } = await supabase
          .from("invoices")
          .update({
            status: "paid",
            amount_paid: paymentLink.amount / 100,
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
