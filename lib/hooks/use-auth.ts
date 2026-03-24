"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type AuthUser = { id: string; phone: string };

export function useAuth(requireAuth = true) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({ id: authUser.id, phone: authUser.phone || "" });
      } else if (requireAuth) {
        router.push("/login");
      }
      setLoading(false);
    }
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, phone: session.user.phone || "" });
      } else {
        setUser(null);
        if (requireAuth) router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
