import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";

export async function POST(req: NextRequest) {
  const { user } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: "Razorpay is not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const {
      amount,
      currency = "INR",
      description,
      customer_name,
      customer_phone,
      customer_email,
      reference_id,
      callback_url,
    } = body;

    if (!amount || !description || !customer_name) {
      return NextResponse.json(
        { error: "amount, description, and customer_name are required" },
        { status: 400 }
      );
    }

    const amountInPaise = Math.round(amount * 100);

    const payload: Record<string, unknown> = {
      amount: amountInPaise,
      currency,
      description,
      customer: {
        name: customer_name,
        ...(customer_phone && { contact: customer_phone }),
        ...(customer_email && { email: customer_email }),
      },
      notify: {
        sms: Boolean(customer_phone),
        email: Boolean(customer_email),
      },
      reminder_enable: true,
    };

    if (reference_id) payload.reference_id = reference_id;
    if (callback_url) payload.callback_url = callback_url;

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Razorpay API error:", response.status, errorData);
      return NextResponse.json(
        { error: errorData?.error?.description || "Failed to create payment link" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      short_url: data.short_url,
      id: data.id,
      status: data.status,
    });
  } catch (error) {
    console.error("Create payment link error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
