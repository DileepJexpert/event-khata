import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return phone;
}

export const VENDOR_CATEGORIES = [
  { value: "decorator", label: "Decorator" },
  { value: "caterer", label: "Caterer" },
  { value: "photographer", label: "Photographer" },
  { value: "videographer", label: "Videographer" },
  { value: "lighting", label: "Lighting" },
  { value: "dj", label: "DJ" },
  { value: "tent_house", label: "Tent House" },
  { value: "florist", label: "Florist" },
  { value: "makeup", label: "Makeup" },
  { value: "transport", label: "Transport" },
  { value: "invitation", label: "Invitation" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" },
] as const;

export const EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "corporate", label: "Corporate" },
  { value: "birthday", label: "Birthday" },
  { value: "other", label: "Other" },
] as const;

export const PAYMENT_MODES = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "NEFT", label: "NEFT" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARD", label: "Card" },
] as const;

export const TXN_TYPES = [
  { value: "ADVANCE", label: "Advance" },
  { value: "PARTIAL", label: "Partial" },
  { value: "FINAL", label: "Final" },
  { value: "REFUND", label: "Refund" },
] as const;
