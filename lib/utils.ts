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

export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return phone;
}

export function daysUntil(dateString: string): number {
  const target = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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
  { value: "venue", label: "Venue" },
  { value: "pandit", label: "Pandit / Priest" },
  { value: "choreographer", label: "Choreographer" },
  { value: "anchor", label: "Anchor / MC" },
  { value: "mehndi_artist", label: "Mehndi Artist" },
  { value: "fireworks", label: "Fireworks" },
  { value: "gifting", label: "Gifting" },
  { value: "other", label: "Other" },
] as const;

export const EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "engagement", label: "Engagement" },
  { value: "reception", label: "Reception" },
  { value: "corporate", label: "Corporate" },
  { value: "birthday", label: "Birthday" },
  { value: "other", label: "Other" },
] as const;

export const SUB_EVENT_TYPES = [
  { value: "mehendi", label: "Mehendi" },
  { value: "sangeet", label: "Sangeet" },
  { value: "haldi", label: "Haldi" },
  { value: "wedding", label: "Wedding" },
  { value: "reception", label: "Reception" },
  { value: "engagement", label: "Engagement" },
  { value: "cocktail", label: "Cocktail" },
  { value: "vidaai", label: "Vidaai" },
  { value: "baraat", label: "Baraat" },
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

export const TASK_PRIORITIES = [
  { value: "low", label: "Low", color: "text-blue-600 bg-blue-50" },
  { value: "medium", label: "Medium", color: "text-amber-600 bg-amber-50" },
  { value: "high", label: "High", color: "text-red-600 bg-red-50" },
] as const;

export const LEAD_SOURCES = [
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
  { value: "social_media", label: "Social Media" },
  { value: "walk_in", label: "Walk-in" },
  { value: "other", label: "Other" },
] as const;

export const LEAD_STATUSES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-700" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-700" },
  { value: "proposal_sent", label: "Proposal Sent", color: "bg-purple-100 text-purple-700" },
  { value: "negotiating", label: "Negotiating", color: "bg-orange-100 text-orange-700" },
  { value: "won", label: "Won", color: "bg-emerald-100 text-emerald-700" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-700" },
] as const;

export const MEAL_PREFERENCES = [
  { value: "veg", label: "Veg" },
  { value: "non_veg", label: "Non-Veg" },
  { value: "jain", label: "Jain" },
  { value: "vegan", label: "Vegan" },
  { value: "no_preference", label: "No Preference" },
] as const;

export const GUEST_SIDES = [
  { value: "bride", label: "Bride Side" },
  { value: "groom", label: "Groom Side" },
  { value: "mutual", label: "Mutual" },
  { value: "other", label: "Other" },
] as const;

export const RSVP_STATUSES = [
  { value: "pending", label: "Pending", color: "bg-gray-100 text-gray-600" },
  { value: "confirmed", label: "Confirmed", color: "bg-emerald-100 text-emerald-700" },
  { value: "declined", label: "Declined", color: "bg-red-100 text-red-700" },
  { value: "maybe", label: "Maybe", color: "bg-amber-100 text-amber-700" },
] as const;

export const PROPOSAL_STATUSES = [
  { value: "draft", label: "Draft", color: "bg-gray-100 text-gray-600" },
  { value: "sent", label: "Sent", color: "bg-blue-100 text-blue-700" },
  { value: "viewed", label: "Viewed", color: "bg-purple-100 text-purple-700" },
  { value: "accepted", label: "Accepted", color: "bg-emerald-100 text-emerald-700" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
  { value: "expired", label: "Expired", color: "bg-amber-100 text-amber-700" },
] as const;

export const TEAM_ROLES = [
  { value: "owner", label: "Owner", color: "bg-purple-100 text-purple-700" },
  { value: "planner", label: "Planner", color: "bg-blue-100 text-blue-700" },
  { value: "coordinator", label: "Coordinator", color: "bg-emerald-100 text-emerald-700" },
  { value: "assistant", label: "Assistant", color: "bg-amber-100 text-amber-700" },
  { value: "viewer", label: "Viewer", color: "bg-gray-100 text-gray-600" },
] as const;

export const COMM_TYPES = [
  { value: "call", label: "Phone Call", icon: "Phone" },
  { value: "whatsapp", label: "WhatsApp", icon: "MessageCircle" },
  { value: "email", label: "Email", icon: "Mail" },
  { value: "meeting", label: "Meeting", icon: "Users" },
  { value: "note", label: "Note", icon: "FileText" },
] as const;

export const REMINDER_TYPES = [
  { value: "payment", label: "Payment Due", color: "bg-emerald-100 text-emerald-700" },
  { value: "follow_up", label: "Follow Up", color: "bg-blue-100 text-blue-700" },
  { value: "task", label: "Task", color: "bg-amber-100 text-amber-700" },
  { value: "event", label: "Event", color: "bg-purple-100 text-purple-700" },
  { value: "general", label: "General", color: "bg-gray-100 text-gray-600" },
] as const;
