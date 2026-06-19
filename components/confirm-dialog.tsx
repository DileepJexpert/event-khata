"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "destructive" | "default";
  onConfirm: () => void | Promise<void>;
  children: React.ReactNode;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  variant = "destructive",
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    setOpen(false);
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>{children}</div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-900 dark:border dark:border-navy-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-bold text-navy-900 dark:text-navy-100">{title}</h3>
            <p className="mb-6 text-sm text-navy-600">{message}</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant={variant}
                className="flex-1"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? "..." : confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
