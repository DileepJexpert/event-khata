"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Home,
  CalendarDays,
  IndianRupee,
  Users,
  MoreHorizontal,
  X,
  BarChart3,
  UserPlus,
  FileText,
  Settings,
  ClipboardList,
  Bell,
  CalendarCheck,
  Receipt,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/pay", label: "Pay", icon: IndianRupee },
  { href: "/vendors", label: "Vendors", icon: Users },
];

const moreItems = [
  { href: "/leads", label: "Leads", desc: "Inquiries & pipeline", icon: UserPlus, group: "Business" },
  { href: "/proposals", label: "Proposals", desc: "Quotations & estimates", icon: FileText, group: "Business" },
  { href: "/invoices", label: "Invoices", desc: "Client billing & GST", icon: FileText, group: "Business" },
  { href: "/reports", label: "Reports", desc: "P&L and Analytics", icon: BarChart3, group: "Business" },
  { href: "/expenses", label: "Expenses", desc: "Petty cash & staff", icon: Receipt, group: "Money" },
  { href: "/tasks", label: "Tasks", desc: "Kanban & checklist", icon: ClipboardList, group: "Planning" },
  { href: "/reminders", label: "Reminders", desc: "WhatsApp & alerts", icon: Bell, group: "Planning" },
  { href: "/events/calendar", label: "Calendar", desc: "Event schedules", icon: CalendarCheck, group: "Planning" },
  { href: "/muhurat", label: "Muhurat", desc: "Auspicious dates", icon: Sparkles, group: "Planning" },
  { href: "/team", label: "Team", desc: "Staff & coordinators", icon: Users, group: "Account" },
  { href: "/notifications", label: "Alerts", desc: "Budget & milestone warnings", icon: Bell, group: "Account" },
  { href: "/settings", label: "Settings", desc: "Profile & preferences", icon: Settings, group: "Account" },
];

const moreGroups = ["Business", "Money", "Planning", "Account"];

export function BottomNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowMore(false);
    }
    if (showMore) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [showMore]);

  // Close on route change
  useEffect(() => {
    setShowMore(false);
  }, [pathname]);

  const isMoreActive = moreItems.some((item) => pathname.startsWith(item.href));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-navy-100 bg-white pb-[var(--safe-area-bottom)] dark:border-navy-800 dark:bg-navy-900">
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
                      : "text-navy-900 dark:text-navy-100"
                    : "text-navy-400 hover:text-navy-600 dark:text-navy-500 dark:hover:text-navy-300"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                    isPay && "bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40",
                    isPay && isActive && "bg-emerald-600",
                    !isPay && isActive && "bg-navy-100 dark:bg-navy-800"
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

          {/* More Menu Trigger */}
          <button
            onClick={() => setShowMore(true)}
            className={cn(
              "flex min-w-[4rem] flex-col items-center gap-1 px-3 py-2 text-xs transition-colors",
              isMoreActive || showMore
                ? "text-navy-900 dark:text-navy-100"
                : "text-navy-400 hover:text-navy-600 dark:text-navy-500 dark:hover:text-navy-300"
            )}
            aria-label="Open more menu"
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                (isMoreActive || showMore) && "bg-navy-100 dark:bg-navy-800"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
            </div>
            <span className={cn("font-medium", (isMoreActive || showMore) && "font-semibold")}>
              More
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Sheet Drawer */}
      {showMore && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setShowMore(false)}
          />

          {/* Sheet Modal */}
          <div
            ref={sheetRef}
            className="relative z-50 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl border-t border-navy-100 bg-white p-5 pb-[calc(1.5rem+var(--safe-area-bottom))] shadow-2xl dark:border-navy-800 dark:bg-navy-900"
          >
            {/* Pill drag bar */}
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-navy-200 dark:bg-navy-700" />

            {/* Header */}
            <div className="mb-4 flex items-center justify-between border-b border-navy-100 pb-3 dark:border-navy-800">
              <div>
                <h3 className="text-base font-bold text-navy-900 dark:text-navy-100">
                  All Modules & Tools
                </h3>
                <p className="text-xs text-navy-500">
                  Quick access to all business, planning, and finance tools
                </p>
              </div>
              <button
                onClick={() => setShowMore(false)}
                className="rounded-full p-2 text-navy-400 hover:bg-navy-100 hover:text-navy-600 dark:hover:bg-navy-800 dark:hover:text-navy-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Group List */}
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {moreGroups.map((group) => {
                const groupItems = moreItems.filter((item) => item.group === group);
                return (
                  <div key={group} className="space-y-1">
                    <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-navy-500">
                      {group}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {groupItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setShowMore(false)}
                            className={cn(
                              "flex items-center gap-2.5 rounded-xl border p-2.5 transition active:scale-98",
                              isActive
                                ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                                : "border-navy-100 bg-navy-50/50 text-navy-800 hover:bg-navy-100 dark:border-navy-800 dark:bg-navy-800/60 dark:text-navy-200 dark:hover:bg-navy-800"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                                isActive
                                  ? "bg-emerald-500 text-white"
                                  : "bg-white text-navy-700 shadow-xs dark:bg-navy-700 dark:text-navy-200"
                              )}
                            >
                              <item.icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold leading-tight">
                                {item.label}
                              </p>
                              <p className="truncate text-[10px] text-navy-500 dark:text-navy-400">
                                {item.desc}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
