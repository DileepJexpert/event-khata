import { BottomNav } from "@/components/bottom-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-navy-50">
      <div className="mx-auto max-w-lg pb-safe">{children}</div>
      <BottomNav />
    </div>
  );
}
