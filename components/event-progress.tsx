"use client";

import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

type CheckItem = {
  label: string;
  done: boolean;
  warning?: boolean;
};

interface EventProgressProps {
  items: CheckItem[];
}

export function EventProgress({ items }: EventProgressProps) {
  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-navy-900">Event Readiness</span>
        <span className="text-xs font-medium text-navy-500">{completed}/{total} ({percent}%)</span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-navy-100">
        <div
          className={`h-full rounded-full transition-all ${
            percent === 100 ? "bg-emerald-500" : percent >= 60 ? "bg-amber-500" : "bg-red-500"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {item.done ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : item.warning ? (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            ) : (
              <Circle className="h-4 w-4 text-navy-300" />
            )}
            <span className={item.done ? "text-navy-500 line-through" : "text-navy-700"}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
