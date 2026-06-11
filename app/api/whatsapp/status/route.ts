import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  return NextResponse.json({
    enabled: Boolean(token && phoneId),
  });
}
