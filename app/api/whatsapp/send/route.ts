import { NextRequest, NextResponse } from "next/server";

function formatPhone(phone: string): string {
  // Strip all non-digit characters
  let cleaned = phone.replace(/\D/g, "");
  // Remove leading + if present (already stripped by \D)
  // Add 91 prefix if not present (Indian numbers)
  if (!cleaned.startsWith("91")) {
    cleaned = `91${cleaned}`;
  }
  return cleaned;
}

export async function POST(req: NextRequest) {
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

    const formattedPhone = formatPhone(phone);
    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

    let payload: Record<string, unknown>;

    if (template_name) {
      // Template message
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
      // Text message
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
