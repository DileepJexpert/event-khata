import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";

export async function GET() {
  const { user } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enabled = !!process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({ enabled });
}
