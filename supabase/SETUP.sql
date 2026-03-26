-- ============================================================
-- EVENT KHATA - COMPLETE FIRST-TIME SETUP
-- ============================================================
--
-- Run this ONCE in your Supabase SQL Editor to set up everything.
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT).
--
-- AFTER running this file, you must:
--   1. Replace 'YOUR_EMAIL@example.com' at the bottom with your
--      actual admin email address
--   2. Sign up through the app with that same email
--   3. Run the admin INSERT at the bottom
--
-- ============================================================


-- ============================================================
-- STEP 1: CORE TABLES
-- ============================================================

-- 1. AGENCIES (tenants)
CREATE TABLE IF NOT EXISTS agencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'enterprise')),
  city TEXT,
  state TEXT,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. EVENTS
CREATE TABLE IF NOT EXISTS events (
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

-- 3. VENDORS
CREATE TABLE IF NOT EXISTS vendors (
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

-- 4. SUB-EVENTS
CREATE TABLE IF NOT EXISTS sub_events (
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

-- 5. CONTRACTS
CREATE TABLE IF NOT EXISTS contracts (
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

-- 6. LEDGER (Immutable payments)
CREATE TABLE IF NOT EXISTS ledger (
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

-- 7. CLIENT PORTAL TOKENS
CREATE TABLE IF NOT EXISTS client_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  show_vendor_names BOOLEAN DEFAULT true,
  show_vendor_amounts BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. PAYMENT SCHEDULES
CREATE TABLE IF NOT EXISTS payment_schedules (
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

-- 9. TASKS
CREATE TABLE IF NOT EXISTS tasks (
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

-- 10. GUESTS
CREATE TABLE IF NOT EXISTS guests (
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

-- 11. LEADS
CREATE TABLE IF NOT EXISTS leads (
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

-- 12. TIMELINE ITEMS
CREATE TABLE IF NOT EXISTS timeline_items (
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

-- 13. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
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

-- 14. ADMIN USERS
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'support')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. PROPOSALS
CREATE TABLE IF NOT EXISTS proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  proposal_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  event_type TEXT DEFAULT 'wedding',
  event_date DATE,
  venue TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  tax_percent NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  terms_and_conditions TEXT,
  valid_until DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 16. TEAM MEMBERS
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT DEFAULT 'coordinator' CHECK (role IN ('owner', 'planner', 'coordinator', 'assistant', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. COMMUNICATION LOG
CREATE TABLE IF NOT EXISTS communication_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT,
  type TEXT NOT NULL CHECK (type IN ('call', 'whatsapp', 'email', 'meeting', 'note')),
  direction TEXT DEFAULT 'outgoing' CHECK (direction IN ('incoming', 'outgoing')),
  subject TEXT,
  summary TEXT,
  follow_up_date DATE,
  logged_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 18. EVENT TEMPLATES
CREATE TABLE IF NOT EXISTS event_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_type TEXT DEFAULT 'wedding',
  is_system BOOLEAN DEFAULT false,
  sub_events JSONB NOT NULL DEFAULT '[]',
  tasks JSONB NOT NULL DEFAULT '[]',
  vendor_categories JSONB NOT NULL DEFAULT '[]',
  budget_split JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. REMINDERS
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  remind_at TIMESTAMPTZ NOT NULL,
  type TEXT DEFAULT 'general' CHECK (type IN ('payment', 'follow_up', 'task', 'event', 'general')),
  is_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- STEP 2: INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_events_agency ON events(agency_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_vendors_agency ON vendors(agency_id);
CREATE INDEX IF NOT EXISTS idx_contracts_event ON contracts(event_id);
CREATE INDEX IF NOT EXISTS idx_contracts_sub_event ON contracts(sub_event_id);
CREATE INDEX IF NOT EXISTS idx_ledger_agency ON ledger(agency_id);
CREATE INDEX IF NOT EXISTS idx_ledger_event ON ledger(event_id);
CREATE INDEX IF NOT EXISTS idx_ledger_vendor ON ledger(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ledger_recorded ON ledger(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_tokens_token ON client_tokens(token);
CREATE INDEX IF NOT EXISTS idx_sub_events_event ON sub_events(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_event ON tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sub_event ON tasks(sub_event_id);
CREATE INDEX IF NOT EXISTS idx_guests_event ON guests(event_id);
CREATE INDEX IF NOT EXISTS idx_leads_agency ON leads(agency_id);
CREATE INDEX IF NOT EXISTS idx_timeline_event ON timeline_items(event_id);
CREATE INDEX IF NOT EXISTS idx_timeline_sub_event ON timeline_items(sub_event_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_event ON payment_schedules(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_contract ON payment_schedules(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_event ON invoices(event_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_agency ON proposals(agency_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_event ON proposals(event_id);
CREATE INDEX IF NOT EXISTS idx_team_members_agency ON team_members(agency_id);
CREATE INDEX IF NOT EXISTS idx_comm_log_agency ON communication_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_comm_log_event ON communication_log(event_id);
CREATE INDEX IF NOT EXISTS idx_comm_log_vendor ON communication_log(vendor_id);
CREATE INDEX IF NOT EXISTS idx_event_templates_agency ON event_templates(agency_id);
CREATE INDEX IF NOT EXISTS idx_reminders_agency ON reminders(agency_id);
CREATE INDEX IF NOT EXISTS idx_reminders_event ON reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at);


-- ============================================================
-- STEP 3: TRIGGERS (auto-update updated_at)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- STEP 4: DISABLE RLS (for dev mode - enable for production)
-- ============================================================

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
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE communication_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 5: STORAGE BUCKET (for document uploads)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760,
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DO $$ BEGIN
  CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated reads" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated deletes" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow authenticated updates" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public reads" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'documents');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- STEP 6: SETUP ADMIN USER
-- ============================================================
--
-- INSTRUCTIONS:
-- 1. First, sign up through the app with your email
-- 2. Then run the query below AFTER replacing the email
-- 3. The admin panel will appear in Settings page
--
-- Find your user ID:
--   SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL@example.com';
--
-- Then insert admin (replace both values):
--   INSERT INTO admin_users (user_id, email, name, role, is_active)
--   VALUES (
--     'PASTE_USER_ID_HERE',
--     'YOUR_EMAIL@example.com',
--     'Your Name',
--     'super_admin',
--     true
--   );
--
-- ============================================================
-- QUICK ONE-LINER (auto-finds user ID from email):
-- Just replace the email in both places below and run:
-- ============================================================
--
-- INSERT INTO admin_users (user_id, email, name, role, is_active)
-- SELECT id, email, 'Admin', 'super_admin', true
-- FROM auth.users
-- WHERE email = 'YOUR_EMAIL@example.com'
-- ON CONFLICT DO NOTHING;
--

-- ============================================================
-- DONE! Your Event Khata instance is ready.
-- ============================================================
