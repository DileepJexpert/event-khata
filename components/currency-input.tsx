"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, "");
      onChange(raw);
    };

    const formatDisplay = (raw: string): string => {
      if (!raw) return "";
      const num = parseInt(raw, 10);
      if (isNaN(num)) return "";
      return num.toLocaleString("en-IN");
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-semibold text-navy-400">
          ₹
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          className={cn(
            "flex h-14 w-full rounded-lg border border-navy-200 bg-white pl-10 pr-4 text-2xl font-semibold ring-offset-white placeholder:text-navy-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          value={formatDisplay(value)}
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
