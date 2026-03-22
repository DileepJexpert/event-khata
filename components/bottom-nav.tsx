"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, IndianRupee, Users, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import {
  BarChart3,
  UserPlus,
  FileText,
  Settings,
  ClipboardList,
  Bell,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/pay", label: "Pay", icon: IndianRupee },
  { href: "/vendors", label: "Vendors", icon: Users },
];

const moreItems = [
  { href: "/leads", label: "Leads", icon: UserPlus },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isMoreActive = moreItems.some((item) => pathname.startsWith(item.href));

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

        {/* More Menu */}
        <div ref={moreRef} className="relative">
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              "flex min-w-[4rem] flex-col items-center gap-1 px-3 py-2 text-xs transition-colors",
              isMoreActive ? "text-navy-900" : "text-navy-400 hover:text-navy-600"
            )}
          >
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
              isMoreActive && "bg-navy-100"
            )}>
              <MoreHorizontal className="h-5 w-5" />
            </div>
            <span className={cn("font-medium", isMoreActive && "font-semibold")}>More</span>
          </button>

          {showMore && (
            <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl border border-navy-100 bg-white py-2 shadow-lg">
              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                    pathname.startsWith(item.href)
                      ? "bg-navy-50 font-semibold text-navy-900"
                      : "text-navy-600 hover:bg-navy-50"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
