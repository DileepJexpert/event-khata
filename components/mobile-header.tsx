"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  className?: string;
}

export function MobileHeader({
  title,
  subtitle,
  backHref,
  showBack = false,
  rightAction,
  className,
}: MobileHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center justify-between border-b border-navy-100 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-navy-800 dark:bg-navy-950/90",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-navy-600 transition-colors hover:bg-navy-100 active:scale-95 dark:text-navy-300 dark:hover:bg-navy-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold leading-tight text-navy-900 dark:text-navy-100">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs font-medium text-navy-500 dark:text-navy-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {rightAction && (
        <div className="flex flex-shrink-0 items-center gap-1">
          {rightAction}
        </div>
      )}
    </header>
  );
}
