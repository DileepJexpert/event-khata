-- Agencies (tenants)
CREATE TABLE agencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_name TEXT,
  owner_phone TEXT UNIQUE NOT NULL,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Events
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  event_type TEXT DEFAULT 'wedding' CHECK (event_type IN ('wedding', 'corporate', 'birthday', 'other')),
  total_budget NUMERIC(12,2),
  event_date DATE,
  venue TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vendors
CREATE TABLE vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('decorator', 'caterer', 'photographer', 'videographer', 'lighting', 'dj', 'tent_house', 'florist', 'makeup', 'transport', 'invitation', 'entertainment', 'other')),
  phone TEXT,
  upi_id TEXT,
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Event-Vendor Contracts
CREATE TABLE contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  agreed_amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, vendor_id)
);

-- Financial Ledger (IMMUTABLE — append-only, never update or delete)
CREATE TABLE ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  contract_id UUID REFERENCES contracts(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  txn_type TEXT NOT NULL CHECK (txn_type IN ('ADVANCE', 'PARTIAL', 'FINAL', 'REFUND')),
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('CASH', 'UPI', 'NEFT', 'CHEQUE', 'CARD')),
  reference_number TEXT,
  notes TEXT,
  receipt_url TEXT,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Client Portal Tokens
CREATE TABLE client_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  show_vendor_names BOOLEAN DEFAULT true,
  show_vendor_amounts BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_events_agency ON events(agency_id);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_vendors_agency ON vendors(agency_id);
CREATE INDEX idx_contracts_event ON contracts(event_id);
CREATE INDEX idx_ledger_agency ON ledger(agency_id);
CREATE INDEX idx_ledger_event ON ledger(event_id);
CREATE INDEX idx_ledger_vendor ON ledger(vendor_id);
CREATE INDEX idx_ledger_recorded ON ledger(recorded_at DESC);
CREATE INDEX idx_client_tokens_token ON client_tokens(token);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
