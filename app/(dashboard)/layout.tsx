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
      <div className="min-h-screen bg-navy-50">
        <div className="mx-auto max-w-lg pb-safe">{children}</div>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
