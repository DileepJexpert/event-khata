import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";

export async function GET() {
  const { user } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  return NextResponse.json({
    enabled: Boolean(token && phoneId),
  });
}
