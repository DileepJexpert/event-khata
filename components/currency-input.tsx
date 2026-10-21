"use client";

import { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  showQuickChips?: boolean;
}

// Helper to convert number to readable Indian shorthand words (e.g. 5 Lakh, 1.25 Crore)
function formatIndianWords(num: number): string | null {
  if (num < 1000) return null;
  if (num >= 10000000) {
    const cr = num / 10000000;
    return `${cr % 1 === 0 ? cr : cr.toFixed(2)} Crore`;
  }
  if (num >= 100000) {
    const lakh = num / 100000;
    return `${lakh % 1 === 0 ? lakh : lakh.toFixed(2)} Lakh`;
  }
  if (num >= 1000) {
    const k = num / 1000;
    return `${k % 1 === 0 ? k : k.toFixed(1)} Thousand`;
  }
  return null;
}

// Parses string including Indian shorthand: 5L -> 500000, 25k -> 25000, 1.5cr -> 15000000
function parseIndianShorthand(input: string): number | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // Check for Crore (cr)
  const crMatch = trimmed.match(/^([\d.]+)\s*cr$/i);
  if (crMatch) {
    const val = parseFloat(crMatch[1]);
    return isNaN(val) ? null : Math.round(val * 10000000);
  }

  // Check for Lakh (l)
  const lMatch = trimmed.match(/^([\d.]+)\s*l$/i);
  if (lMatch) {
    const val = parseFloat(lMatch[1]);
    return isNaN(val) ? null : Math.round(val * 100000);
  }

  // Check for Thousand (k)
  const kMatch = trimmed.match(/^([\d.]+)\s*k$/i);
  if (kMatch) {
    const val = parseFloat(kMatch[1]);
    return isNaN(val) ? null : Math.round(val * 1000);
  }

  const raw = trimmed.replace(/[^\d]/g, "");
  if (!raw) return null;
  const num = parseInt(raw, 10);
  return isNaN(num) ? null : num;
}

const QUICK_INCREMENTS = [
  { label: "+10K", amount: 10000 },
  { label: "+50K", amount: 50000 },
  { label: "+1L", amount: 100000 },
  { label: "+5L", amount: 500000 },
];

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, showQuickChips = true, ...props }, ref) => {
    const [rawText, setRawText] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      setRawText(input);

      // Check if shorthand pattern matches
      const parsed = parseIndianShorthand(input);
      if (parsed !== null) {
        onChange(String(parsed));
      } else if (!input.trim()) {
        onChange("");
      }
    };

    const handleBlur = () => {
      // Clear temporary raw text on blur to show formatted Indian commas
      setRawText(null);
    };

    const handleAddAmount = (add: number) => {
      const current = parseInt(value, 10) || 0;
      const next = current + add;
      setRawText(null);
      onChange(String(next));
    };

    const handleClear = () => {
      setRawText(null);
      onChange("");
    };

    const currentNumber = parseInt(value, 10) || 0;
    const wordsLabel = formatIndianWords(currentNumber);

    const displayValue =
      rawText !== null
        ? rawText
        : value
        ? (parseInt(value, 10) || 0).toLocaleString("en-IN")
        : "";

    return (
      <div className="space-y-1.5">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-semibold text-navy-400">
            ₹
          </span>
          <input
            ref={ref}
            type="text"
            className={cn(
              "flex h-14 w-full rounded-lg border border-navy-200 bg-white pl-10 pr-4 text-2xl font-semibold ring-offset-white placeholder:text-navy-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-navy-700 dark:bg-navy-800 dark:text-navy-100 dark:placeholder:text-navy-500 dark:ring-offset-navy-900",
              className
            )}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="0"
            {...props}
          />
        </div>

        {/* Indian denomination words display */}
        {wordsLabel && (
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            ≈ {wordsLabel}
          </p>
        )}

        {/* Quick addition chips */}
        {showQuickChips && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {QUICK_INCREMENTS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleAddAmount(chip.amount)}
                className="rounded-md border border-navy-200 bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy-700 transition hover:bg-navy-100 active:scale-95 dark:border-navy-700 dark:bg-navy-900 dark:text-navy-300 dark:hover:bg-navy-800"
              >
                {chip.label}
              </button>
            ))}
            {currentNumber > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-md px-2 py-1 text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
