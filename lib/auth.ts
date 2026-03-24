// Client-side auth helper - replaces dev-user.ts
// Use this in all client components to get the current user

import { createClient } from "@/lib/supabase/client";

export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { id: user.id, phone: user.phone || "" };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "/login";
    throw new Error("Not authenticated");
  }
  return user;
}
