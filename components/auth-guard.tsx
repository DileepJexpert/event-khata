"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setActiveCurrency } from "@/lib/utils";
import { fetchWithCache } from "@/lib/cache";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const authenticatedRef = useRef(false);

  useEffect(() => {
    async function check() {
      // If already authenticated in current session, don't block route transition
      if (authenticatedRef.current) {
        setChecked(true);
        return;
      }

      // Fast session check
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        // Fallback to getUser if session is validating
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          router.replace("/login");
          return;
        }
      }

      const activeUserId = user?.id || (await supabase.auth.getUser()).data.user?.id;
      if (!activeUserId) {
        router.replace("/login");
        return;
      }

      // Load agency with runtime cache so page navigation is instant
      const agency = await fetchWithCache(
        `agency:${activeUserId}`,
        async () => {
          const { data } = await supabase
            .from("agencies")
            .select("id, currency, is_active, name")
            .eq("id", activeUserId)
            .maybeSingle();
          return data;
        },
        { ttlMs: 10 * 60 * 1000, tags: ["agency"] } // 10 min cache
      );

      // Blocked by admin → sign out and bounce to login
      if (agency && (agency as any).is_active === false) {
        await supabase.auth.signOut();
        router.replace("/login?disabled=1");
        return;
      }

      setActiveCurrency((agency as any)?.currency || "INR");
      authenticatedRef.current = true;
      setChecked(true);
    }

    check();
  }, [pathname]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-50 dark:bg-navy-950">
        <Loader2 className="h-8 w-8 animate-spin text-navy-400" />
      </div>
    );
  }

  return <>{children}</>;
}
