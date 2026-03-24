"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace("/events");
      } else {
        router.replace("/login");
      }
    }
    check();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900">
      <Loader2 className="h-8 w-8 animate-spin text-white" />
    </div>
  );
}
