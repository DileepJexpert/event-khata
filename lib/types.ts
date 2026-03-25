export type Agency = {
  id: string;
  name: string;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  subscription_status: "free" | "pro" | "enterprise";
  created_at: string;
};

export type Event = {
  id: string;
  agency_id: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  event_type: EventType;
  total_budget: number | null;
  event_date: string | null;
  end_date: string | null;
  venue: string | null;
  status: "active" | "completed" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type EventType = "wedding" | "corporate" | "birthday" | "engagement" | "reception" | "other";

export type SubEvent = {
  id: string;
  event_id: string;
  name: string;
  type: SubEventType;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  budget: number | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
};

export type SubEventType =
  | "mehendi"
  | "sangeet"
  | "haldi"
  | "wedding"
  | "reception"
  | "engagement"
  | "cocktail"
  | "vidaai"
  | "baraat"
  | "other";

export type VendorCategory =
  | "decorator"
  | "caterer"
  | "photographer"
  | "videographer"
  | "lighting"
  | "dj"
  | "tent_house"
  | "florist"
  | "makeup"
  | "transport"
  | "invitation"
  | "entertainment"
  | "venue"
  | "pandit"
  | "choreographer"
  | "anchor"
  | "mehndi_artist"
  | "fireworks"
  | "gifting"
  | "other";

export type Vendor = {
  id: string;
  agency_id: string;
  name: string;
  category: VendorCategory | null;
  phone: string | null;
  email: string | null;
  upi_id: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  address: string | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
};

export type Contract = {
  id: string;
  event_id: string;
  vendor_id: string;
  sub_event_id: string | null;
  agreed_amount: number;
  description: string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  created_at: string;
};

export type TxnType = "ADVANCE" | "PARTIAL" | "FINAL" | "REFUND";
export type PaymentMode = "CASH" | "UPI" | "NEFT" | "CHEQUE" | "CARD";

export type LedgerEntry = {
  id: string;
  agency_id: string;
  event_id: string;
  vendor_id: string;
  contract_id: string | null;
  amount: number;
  txn_type: TxnType;
  payment_mode: PaymentMode;
  reference_number: string | null;
  notes: string | null;
  receipt_url: string | null;
  recorded_at: string;
};

export type PaymentSchedule = {
  id: string;
  contract_id: string;
  event_id: string;
  vendor_id: string;
  amount: number;
  due_date: string;
  label: string;
  status: "upcoming" | "due" | "overdue" | "paid";
  paid_at: string | null;
  ledger_id: string | null;
  notes: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  event_id: string;
  sub_event_id: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Guest = {
  id: string;
  event_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  group_name: string | null;
  side: "bride" | "groom" | "mutual" | "other";
  rsvp_status: "pending" | "confirmed" | "declined" | "maybe";
  meal_preference: "veg" | "non_veg" | "jain" | "vegan" | "no_preference";
  plus_count: number;
  sub_event_ids: string[];
  table_number: string | null;
  notes: string | null;
  created_at: string;
};

export type Lead = {
  id: string;
  agency_id: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  event_type: EventType;
  event_date: string | null;
  venue: string | null;
  estimated_budget: number | null;
  source: "referral" | "website" | "social_media" | "walk_in" | "other";
  status: "new" | "contacted" | "proposal_sent" | "negotiating" | "won" | "lost";
  notes: string | null;
  follow_up_date: string | null;
  converted_event_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TimelineItem = {
  id: string;
  event_id: string;
  sub_event_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  vendor_id: string | null;
  location: string | null;
  sort_order: number;
  created_at: string;
};

export type Invoice = {
  id: string;
  agency_id: string;
  event_id: string;
  invoice_number: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  items: InvoiceItem[];
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceItem = {
  description: string;
  category: string;
  amount: number;
};

export type ClientToken = {
  id: string;
  event_id: string;
  token: string;
  show_vendor_names: boolean;
  show_vendor_amounts: boolean;
  expires_at: string | null;
  created_at: string;
};

// ============================================
// NEW FEATURES
// ============================================

export type ProposalItem = {
  description: string;
  category: string;
  amount: number;
  notes?: string;
};

export type Proposal = {
  id: string;
  agency_id: string;
  lead_id: string | null;
  event_id: string | null;
  proposal_number: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  event_type: EventType;
  event_date: string | null;
  venue: string | null;
  items: ProposalItem[];
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  tax_percent: number;
  tax_amount: number;
  total: number;
  terms_and_conditions: string | null;
  valid_until: string | null;
  status: "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  id: string;
  agency_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: "owner" | "planner" | "coordinator" | "assistant" | "viewer";
  is_active: boolean;
  created_at: string;
};

export type CommunicationEntry = {
  id: string;
  agency_id: string;
  event_id: string | null;
  vendor_id: string | null;
  contact_name: string;
  contact_phone: string | null;
  type: "call" | "whatsapp" | "email" | "meeting" | "note";
  direction: "incoming" | "outgoing";
  subject: string | null;
  summary: string | null;
  follow_up_date: string | null;
  logged_by: string | null;
  created_at: string;
};

export type EventTemplate = {
  id: string;
  agency_id: string | null;
  name: string;
  event_type: EventType;
  is_system: boolean;
  sub_events: { name: string; type: SubEventType }[];
  tasks: { title: string; priority: "low" | "medium" | "high"; days_before: number }[];
  vendor_categories: string[];
  budget_split: Record<string, number>;
  created_at: string;
};

export type Reminder = {
  id: string;
  agency_id: string;
  event_id: string | null;
  vendor_id: string | null;
  title: string;
  description: string | null;
  remind_at: string;
  type: "payment" | "follow_up" | "task" | "event" | "general";
  is_done: boolean;
  created_at: string;
};

// Joined types for UI
export type ContractWithVendor = Contract & {
  vendor: Vendor;
  total_paid: number;
};

export type LedgerEntryWithDetails = LedgerEntry & {
  vendor?: Vendor;
  event?: Event;
};

export type PaymentScheduleWithDetails = PaymentSchedule & {
  vendor?: Vendor;
  event?: Event;
};
