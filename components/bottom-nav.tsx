"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, IndianRupee, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/vendors", label: "Vendors", icon: Users },
  { href: "/pay", label: "Quick Pay", icon: IndianRupee },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-navy-100 bg-white pb-[var(--safe-area-bottom)]">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const isPay = item.href === "/pay";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-[4rem] flex-col items-center gap-1 px-3 py-2 text-xs transition-colors",
                isActive
                  ? isPay
                    ? "text-emerald-600"
                    : "text-navy-900"
                  : "text-navy-400 hover:text-navy-600"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                  isPay && "bg-emerald-500 text-white shadow-lg shadow-emerald-200",
                  isPay && isActive && "bg-emerald-600",
                  !isPay && isActive && "bg-navy-100"
                )}
              >
                <item.icon className={cn("h-5 w-5", isPay && "h-4 w-4")} />
              </div>
              <span className={cn("font-medium", isActive && "font-semibold")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
