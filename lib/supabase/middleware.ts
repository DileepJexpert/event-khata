import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // DEV MODE: Skip all auth checks — redirect root to /events
  if (request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/events";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
