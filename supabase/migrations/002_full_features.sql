-- ============================================
-- Event Khata - Full Feature Migration
-- ============================================

-- Add new columns to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add new columns to vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rating SMALLINT CHECK (rating BETWEEN 1 AND 5);

-- ============================================
-- Sub-Events (Mehendi, Sangeet, Haldi, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS sub_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mehendi','sangeet','haldi','wedding','reception','engagement','cocktail','vidaai','baraat','other')),
  date DATE,
  start_time TIME,
  end_time TIME,
  venue TEXT,
  budget NUMERIC(12,2),
  notes TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sub_events DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Payment Schedules (Due dates per vendor)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  label TEXT NOT NULL DEFAULT 'Payment',
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming','due','overdue','paid')),
  paid_at TIMESTAMPTZ,
  ledger_id UUID REFERENCES ledger(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payment_schedules DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Tasks / Checklist
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  sub_event_id UUID REFERENCES sub_events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Guest List
-- ============================================
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  group_name TEXT,
  side TEXT DEFAULT 'other' CHECK (side IN ('bride','groom','mutual','other')),
  rsvp_status TEXT DEFAULT 'pending' CHECK (rsvp_status IN ('pending','confirmed','declined','maybe')),
  meal_preference TEXT DEFAULT 'no_preference' CHECK (meal_preference IN ('veg','non_veg','jain','vegan','no_preference')),
  plus_count INT DEFAULT 0,
  sub_event_ids UUID[] DEFAULT '{}',
  table_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE guests DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Leads / Inquiries
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  event_type TEXT DEFAULT 'wedding',
  event_date DATE,
  venue TEXT,
  estimated_budget NUMERIC(12,2),
  source TEXT DEFAULT 'referral' CHECK (source IN ('referral','website','social_media','walk_in','other')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','proposal_sent','negotiating','won','lost')),
  notes TEXT,
  follow_up_date DATE,
  converted_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE leads DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Day-of Timeline
-- ============================================
CREATE TABLE IF NOT EXISTS timeline_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

ALTER TABLE timeline_items DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Invoices
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- Add sub_event_id to contracts (after sub_events table exists)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS sub_event_id UUID REFERENCES sub_events(id) ON DELETE SET NULL;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','completed','cancelled'));
