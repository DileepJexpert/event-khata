-- ============================================
-- Event Khata - Complete Database Schema
-- Safe to run even if some tables already exist
-- Will DROP all existing tables and recreate
-- ⚠️  WARNING: This deletes ALL existing data!
-- ============================================

-- ============================================
-- DROP ALL EXISTING TABLES (reverse dependency order)
-- ============================================
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS timeline_items CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS payment_schedules CASCADE;
DROP TABLE IF EXISTS client_tokens CASCADE;
DROP TABLE IF EXISTS ledger CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS sub_events CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS agencies CASCADE;

-- Drop existing trigger function
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- ============================================
-- 1. AGENCIES (tenants)
-- ============================================
CREATE TABLE agencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_name TEXT,
  owner_phone TEXT UNIQUE NOT NULL,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. EVENTS
-- ============================================
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  event_type TEXT DEFAULT 'wedding' CHECK (event_type IN ('wedding', 'corporate', 'birthday', 'engagement', 'reception', 'other')),
  total_budget NUMERIC(12,2),
  event_date DATE,
  end_date DATE,
  venue TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. VENDORS
-- ============================================
CREATE TABLE vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN (
    'decorator', 'caterer', 'photographer', 'videographer',
    'lighting', 'dj', 'tent_house', 'florist', 'makeup',
    'transport', 'invitation', 'entertainment', 'venue',
    'pandit', 'choreographer', 'anchor', 'mehndi_artist',
    'fireworks', 'gifting', 'other'
  )),
  phone TEXT,
  email TEXT,
  upi_id TEXT,
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  address TEXT,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. SUB-EVENTS (Mehendi, Sangeet, Haldi, etc.)
-- ============================================
CREATE TABLE sub_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'mehendi', 'sangeet', 'haldi', 'wedding', 'reception',
    'engagement', 'cocktail', 'vidaai', 'baraat', 'other'
  )),
  date DATE,
  start_time TIME,
  end_time TIME,
  venue TEXT,
  budget NUMERIC(12,2),
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. CONTRACTS (Event-Vendor agreements)
-- ============================================
CREATE TABLE contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  sub_event_id UUID REFERENCES sub_events(id) ON DELETE SET NULL,
  agreed_amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, vendor_id)
);

-- ============================================
-- 6. LEDGER (Immutable append-only payments)
-- ============================================
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

-- ============================================
-- 7. CLIENT PORTAL TOKENS
-- ============================================
CREATE TABLE client_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  show_vendor_names BOOLEAN DEFAULT true,
  show_vendor_amounts BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 8. PAYMENT SCHEDULES (Due dates per vendor)
-- ============================================
CREATE TABLE payment_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  label TEXT NOT NULL DEFAULT 'Payment',
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'due', 'overdue', 'paid')),
  paid_at TIMESTAMPTZ,
  ledger_id UUID REFERENCES ledger(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 9. TASKS / CHECKLIST
-- ============================================
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  sub_event_id UUID REFERENCES sub_events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 10. GUEST LIST
-- ============================================
CREATE TABLE guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  group_name TEXT,
  side TEXT DEFAULT 'other' CHECK (side IN ('bride', 'groom', 'mutual', 'other')),
  rsvp_status TEXT DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'confirmed', 'declined', 'maybe')),
  meal_preference TEXT DEFAULT 'no_preference' CHECK (meal_preference IN ('veg', 'non_veg', 'jain', 'vegan', 'no_preference')),
  plus_count INT DEFAULT 0,
  sub_event_ids UUID[] DEFAULT '{}',
  table_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 11. LEADS / INQUIRIES
-- ============================================
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  event_type TEXT DEFAULT 'wedding',
  event_date DATE,
  venue TEXT,
  estimated_budget NUMERIC(12,2),
  source TEXT DEFAULT 'referral' CHECK (source IN ('referral', 'website', 'social_media', 'walk_in', 'other')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'proposal_sent', 'negotiating', 'won', 'lost')),
  notes TEXT,
  follow_up_date DATE,
  converted_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 12. DAY-OF TIMELINE
-- ============================================
CREATE TABLE timeline_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  sub_event_id UUID REFERENCES sub_events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  location TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 13. INVOICES
-- ============================================
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_percent NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_events_agency ON events(agency_id);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_vendors_agency ON vendors(agency_id);
CREATE INDEX idx_contracts_event ON contracts(event_id);
CREATE INDEX idx_contracts_sub_event ON contracts(sub_event_id);
CREATE INDEX idx_ledger_agency ON ledger(agency_id);
CREATE INDEX idx_ledger_event ON ledger(event_id);
CREATE INDEX idx_ledger_vendor ON ledger(vendor_id);
CREATE INDEX idx_ledger_recorded ON ledger(recorded_at DESC);
CREATE INDEX idx_client_tokens_token ON client_tokens(token);
CREATE INDEX idx_sub_events_event ON sub_events(event_id);
CREATE INDEX idx_tasks_event ON tasks(event_id);
CREATE INDEX idx_tasks_sub_event ON tasks(sub_event_id);
CREATE INDEX idx_guests_event ON guests(event_id);
CREATE INDEX idx_leads_agency ON leads(agency_id);
CREATE INDEX idx_timeline_event ON timeline_items(event_id);
CREATE INDEX idx_timeline_sub_event ON timeline_items(sub_event_id);
CREATE INDEX idx_payment_schedules_event ON payment_schedules(event_id);
CREATE INDEX idx_payment_schedules_contract ON payment_schedules(contract_id);
CREATE INDEX idx_invoices_event ON invoices(event_id);

-- ============================================
-- TRIGGERS
-- ============================================
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

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DISABLE RLS FOR DEV MODE
-- ============================================
ALTER TABLE agencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE sub_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- ============================================
-- SEED: Dev agency
-- ============================================
INSERT INTO agencies (id, name, owner_name, owner_phone)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dev Agency', 'Dev User', '+919999999999')
ON CONFLICT (owner_phone) DO NOTHING;
