"use client";

import { BottomNav } from "@/components/bottom-nav";
import { AuthGuard } from "@/components/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-navy-100/50 dark:bg-black/60 sm:py-0">
        <div className="relative mx-auto min-h-screen w-full max-w-md bg-navy-50 shadow-2xl pb-safe dark:bg-navy-950 sm:border-x sm:border-navy-200/60 dark:sm:border-navy-800/80">
          {children}
        </div>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
