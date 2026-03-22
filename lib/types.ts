export type Agency = {
  id: string;
  name: string;
  owner_name: string | null;
  owner_phone: string;
  subscription_status: "free" | "pro" | "enterprise";
  created_at: string;
};

export type Event = {
  id: string;
  agency_id: string;
  client_name: string;
  client_phone: string | null;
  event_type: "wedding" | "corporate" | "birthday" | "other";
  total_budget: number | null;
  event_date: string | null;
  venue: string | null;
  status: "active" | "completed" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

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
  | "other";

export type Vendor = {
  id: string;
  agency_id: string;
  name: string;
  category: VendorCategory | null;
  phone: string | null;
  upi_id: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  notes: string | null;
  created_at: string;
};

export type Contract = {
  id: string;
  event_id: string;
  vendor_id: string;
  agreed_amount: number;
  description: string | null;
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

export type ClientToken = {
  id: string;
  event_id: string;
  token: string;
  show_vendor_names: boolean;
  show_vendor_amounts: boolean;
  expires_at: string | null;
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
