-- ============================================================
-- EVENT KHATA - MIGRATION 008: EXPANSION FEATURES
-- ============================================================
-- Adds: expense tracker, multi-currency, e-invites/RSVP,
--       budget alert thresholds, saved custom templates.
-- Safe to run multiple times (IF NOT EXISTS).
-- ============================================================

-- 1. MISC EXPENSES (non-vendor costs: travel, tips, emergency buys)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'other' CHECK (category IN (
    'travel', 'food', 'accommodation', 'tips', 'supplies',
    'transport', 'emergency', 'staff', 'misc', 'other'
  )),
  amount NUMERIC(12,2) NOT NULL,
  payment_mode TEXT DEFAULT 'CASH' CHECK (payment_mode IN ('CASH', 'UPI', 'NEFT', 'CHEQUE', 'CARD')),
  spent_on DATE DEFAULT CURRENT_DATE,
  paid_by TEXT,
  reimbursable BOOLEAN DEFAULT false,
  reimbursed BOOLEAN DEFAULT false,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_event ON expenses(event_id);
CREATE INDEX IF NOT EXISTS idx_expenses_agency ON expenses(agency_id);

-- 2. MULTI-CURRENCY: default currency on agency, optional override per event
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE events ADD COLUMN IF NOT EXISTS currency TEXT;

-- 3. BUDGET ALERT THRESHOLD (percentage 0-100) per event
ALTER TABLE events ADD COLUMN IF NOT EXISTS budget_alert_percent INTEGER DEFAULT 80;

-- 4. E-INVITE / PUBLIC RSVP
-- Public, shareable invite pages with guest self-RSVP.
CREATE TABLE IF NOT EXISTS event_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  host_names TEXT,
  venue TEXT,
  event_date DATE,
  event_time TEXT,
  theme_color TEXT DEFAULT '#0f172a',
  cover_image_url TEXT,
  collect_meal_preference BOOLEAN DEFAULT true,
  collect_plus_count BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON event_invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_event ON event_invites(event_id);

-- RSVP responses submitted by guests via the public invite page.
CREATE TABLE IF NOT EXISTS rsvp_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_id UUID REFERENCES event_invites(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  attending TEXT DEFAULT 'confirmed' CHECK (attending IN ('confirmed', 'declined', 'maybe')),
  plus_count INTEGER DEFAULT 0,
  meal_preference TEXT DEFAULT 'no_preference' CHECK (meal_preference IN ('veg', 'non_veg', 'jain', 'vegan', 'no_preference')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rsvp_invite ON rsvp_responses(invite_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_event ON rsvp_responses(event_id);

-- 5. SAVED CUSTOM TEMPLATES
-- event_templates table already exists from migration 002/005.
-- Ensure the columns we need are present for user-saved templates.
ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================================
-- RLS (kept permissive to match existing dev setup)
-- ============================================================
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_responses DISABLE ROW LEVEL SECURITY;
