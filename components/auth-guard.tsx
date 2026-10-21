"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setActiveCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      // Safely load the agency's record
      const { data: agency } = await supabase
        .from("agencies")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      // Blocked by admin → sign out and bounce to login with a notice.
      if (agency && (agency as any).is_active === false) {
        await supabase.auth.signOut();
        router.replace("/login?disabled=1");
        return;
      }

      setActiveCurrency((agency as any)?.currency || "INR");
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
