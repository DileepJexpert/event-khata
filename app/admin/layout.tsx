"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, BarChart3, Users, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/agencies", label: "Agencies", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: adminData } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!adminData) {
      console.error("[Admin] Access denied for user:", user.id);
      router.push("/dashboard");
      return;
    }

    setAuthorized(true);
    setChecking(false);
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
          <p className="mt-2 text-sm text-slate-500">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Top Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-amber-400" />
            <span className="text-lg font-bold">EventKhata Admin</span>
          </div>
          <Link href="/dashboard" className="flex items-center gap-1 text-sm text-slate-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to App
          </Link>
        </div>
        <div className="mx-auto flex max-w-6xl gap-1 px-4">
          {adminNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-50 text-slate-900"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
