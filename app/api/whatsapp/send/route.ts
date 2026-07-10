import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";

function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (!cleaned.startsWith("91")) {
    cleaned = `91${cleaned}`;
  }
  return cleaned;
}

const ALLOWED_TEMPLATES = [
  "event_invitation",
  "payment_reminder",
  "booking_confirmation",
  "event_update",
];

export async function POST(req: NextRequest) {
  const { user, supabase } = await requireAuth();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    return NextResponse.json(
      { success: false, error: "WhatsApp Business API not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { phone, message, template_name, template_params } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    if (template_name && !ALLOWED_TEMPLATES.includes(template_name)) {
      return NextResponse.json(
        { success: false, error: "Template not allowed" },
        { status: 400 }
      );
    }

    if (message && message.length > 4096) {
      return NextResponse.json(
        { success: false, error: "Message too long" },
        { status: 400 }
      );
    }

    const cleanedPhone = phone.replace(/\D/g, "");
    const { data: vendorMatch } = await supabase
      .from("vendors")
      .select("id")
      .eq("phone", cleanedPhone)
      .limit(1);
    const { data: guestMatch } = await supabase
      .from("guests")
      .select("id")
      .eq("phone", cleanedPhone)
      .limit(1);
    const { data: eventClientMatch } = await supabase
      .from("events")
      .select("id")
      .in("client_phone", [phone, cleanedPhone])
      .limit(1);
    const { data: invoiceClientMatch } = await supabase
      .from("invoices")
      .select("id")
      .in("client_phone", [phone, cleanedPhone])
      .limit(1);

    if (
      (!vendorMatch || vendorMatch.length === 0) &&
      (!guestMatch || guestMatch.length === 0) &&
      (!eventClientMatch || eventClientMatch.length === 0) &&
      (!invoiceClientMatch || invoiceClientMatch.length === 0)
    ) {
      return NextResponse.json(
        { success: false, error: "Phone number does not belong to any of your contacts" },
        { status: 403 }
      );
    }

    const formattedPhone = formatPhone(phone);
    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

    let payload: Record<string, unknown>;

    if (template_name) {
      payload = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
          name: template_name,
          language: { code: "en" },
          components: template_params
            ? [
                {
                  type: "body",
                  parameters: template_params.map((p: string) => ({
                    type: "text",
                    text: p,
                  })),
                },
              ]
            : undefined,
        },
      };
    } else {
      if (!message) {
        return NextResponse.json(
          { success: false, error: "Message is required for text messages" },
          { status: 400 }
        );
      }
      payload = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: { body: message },
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error?.message || "Failed to send message",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message_id: data.messages?.[0]?.id || null,
    });
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
