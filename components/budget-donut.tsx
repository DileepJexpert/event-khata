"use client";

import { formatCurrency } from "@/lib/utils";

interface BudgetDonutProps {
  totalBudget: number;
  totalSpent: number;
}

export function BudgetDonut({ totalBudget, totalSpent }: BudgetDonutProps) {
  const remaining = Math.max(totalBudget - totalSpent, 0);
  const percentage = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  // SVG donut chart
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const color =
    percentage > 90 ? "#ef4444" : percentage > 70 ? "#f59e0b" : "#10b981";

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28 flex-shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>
            {Math.round(percentage)}%
          </span>
          <span className="text-[10px] text-navy-500">spent</span>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-xs text-navy-500">Total Budget</p>
          <p className="text-lg font-bold">{formatCurrency(totalBudget)}</p>
        </div>
        <div>
          <p className="text-xs text-navy-500">Spent</p>
          <p className="font-semibold text-navy-700">{formatCurrency(totalSpent)}</p>
        </div>
        <div>
          <p className="text-xs text-navy-500">Remaining</p>
          <p className="font-semibold text-emerald-600">{formatCurrency(remaining)}</p>
        </div>
      </div>
    </div>
  );
}
