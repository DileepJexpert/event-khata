import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";

export async function GET() {
  const { user } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  return NextResponse.json({
    enabled: Boolean(keyId && keySecret),
  });
}
