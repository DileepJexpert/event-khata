-- ============================================================
-- EventKhata — Complete Database Schema (Fresh Install)
-- ============================================================
-- Run this ONCE in Supabase SQL Editor for a new project.
-- Creates all tables, indexes, triggers, RLS policies,
-- storage buckets, and seeds the super admin.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. AGENCIES (tenants — id = auth.uid)
-- ============================================================
CREATE TABLE agencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'enterprise')),
  currency TEXT DEFAULT 'INR',
  gstin TEXT,
  gst_state_code TEXT,
  city TEXT,
  state TEXT,
  is_active BOOLEAN DEFAULT true,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. EVENTS
-- ============================================================
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
  currency TEXT,
  budget_alert_percent INTEGER DEFAULT 80,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. VENDORS
-- ============================================================
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

-- ============================================================
-- 4. SUB-EVENTS (Mehendi, Sangeet, Haldi, etc.)
-- ============================================================
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

-- ============================================================
-- 5. CONTRACTS (Event–Vendor agreements)
-- ============================================================
CREATE TABLE contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  sub_event_id UUID REFERENCES sub_events(id) ON DELETE SET NULL,
  agreed_amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  commission_percent NUMERIC(5,2) DEFAULT 0,
  commission_amount NUMERIC(12,2) DEFAULT 0,
  commission_received NUMERIC(12,2) DEFAULT 0,
  commission_status TEXT DEFAULT 'none' CHECK (commission_status IN ('none', 'pending', 'partial', 'received')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, vendor_id)
);

-- ============================================================
-- 6. LEDGER (Immutable append-only payments)
-- ============================================================
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

-- ============================================================
-- 7. CLIENT PORTAL TOKENS
-- ============================================================
CREATE TABLE client_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  show_vendor_names BOOLEAN DEFAULT true,
  show_vendor_amounts BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. PAYMENT SCHEDULES
-- ============================================================
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
  reminder_sent_at TIMESTAMPTZ,
  ledger_id UUID REFERENCES ledger(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. SEATING TABLES
-- ============================================================
CREATE TABLE seating_tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 10,
  table_type TEXT DEFAULT 'round' CHECK (table_type IN ('round', 'rectangle', 'long')),
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 10. TASKS / CHECKLIST
-- ============================================================
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

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 11. GUEST LIST
-- ============================================================
CREATE TABLE guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  seating_table_id UUID REFERENCES seating_tables(id) ON DELETE SET NULL,
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
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 12. LEADS / INQUIRIES
-- ============================================================
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

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 13. DAY-OF TIMELINE
-- ============================================================
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

-- ============================================================
-- 14. INVOICES
-- ============================================================
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
  client_gstin TEXT,
  place_of_supply TEXT,
  gst_type TEXT DEFAULT 'none' CHECK (gst_type IN ('none', 'cgst_sgst', 'igst')),
  cgst_amount NUMERIC(12,2) DEFAULT 0,
  sgst_amount NUMERIC(12,2) DEFAULT 0,
  igst_amount NUMERIC(12,2) DEFAULT 0,
  hsn_sac TEXT DEFAULT '998596',
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 15. PROPOSALS / QUOTATIONS
-- ============================================================
CREATE TABLE proposals (
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

CREATE TRIGGER proposals_updated_at BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 16. TEAM MEMBERS
-- ============================================================
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT DEFAULT 'coordinator' CHECK (role IN ('owner', 'planner', 'coordinator', 'assistant', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 17. COMMUNICATION LOG
-- ============================================================
CREATE TABLE communication_log (
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

-- ============================================================
-- 18. EVENT TEMPLATES
-- ============================================================
CREATE TABLE event_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'wedding',
  is_system BOOLEAN DEFAULT false,
  sub_events JSONB NOT NULL DEFAULT '[]',
  tasks JSONB NOT NULL DEFAULT '[]',
  vendor_categories JSONB NOT NULL DEFAULT '[]',
  budget_split JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 19. REMINDERS
-- ============================================================
CREATE TABLE reminders (
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
-- 20. VENDOR REVIEWS
-- ============================================================
CREATE TABLE vendor_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  punctuality INTEGER CHECK (punctuality >= 1 AND punctuality <= 5),
  quality INTEGER CHECK (quality >= 1 AND quality <= 5),
  value_for_money INTEGER CHECK (value_for_money >= 1 AND value_for_money <= 5),
  communication INTEGER CHECK (communication >= 1 AND communication <= 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 21. ACTIVITY LOG
-- ============================================================
CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('event', 'vendor', 'payment', 'invoice', 'proposal', 'lead', 'task', 'guest')),
  entity_id UUID,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed', 'payment_made', 'shared')),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 22. EXPENSES (misc non-vendor costs)
-- ============================================================
CREATE TABLE expenses (
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

-- ============================================================
-- 23. E-INVITES
-- ============================================================
CREATE TABLE event_invites (
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

-- ============================================================
-- 24. RSVP RESPONSES
-- ============================================================
CREATE TABLE rsvp_responses (
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

-- ============================================================
-- 25. EVENT PHOTOS
-- ============================================================
CREATE TABLE event_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 26. ADMIN USERS (Super Admin)
-- ============================================================
CREATE TABLE admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'support')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
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
CREATE INDEX idx_seating_tables_event ON seating_tables(event_id);
CREATE INDEX idx_tasks_event ON tasks(event_id);
CREATE INDEX idx_tasks_sub_event ON tasks(sub_event_id);
CREATE INDEX idx_guests_event ON guests(event_id);
CREATE INDEX idx_leads_agency ON leads(agency_id);
CREATE INDEX idx_timeline_event ON timeline_items(event_id);
CREATE INDEX idx_timeline_sub_event ON timeline_items(sub_event_id);
CREATE INDEX idx_payment_schedules_event ON payment_schedules(event_id);
CREATE INDEX idx_payment_schedules_contract ON payment_schedules(contract_id);
CREATE INDEX idx_invoices_event ON invoices(event_id);
CREATE INDEX idx_invoices_agency ON invoices(agency_id);
CREATE INDEX idx_proposals_agency ON proposals(agency_id);
CREATE INDEX idx_proposals_lead ON proposals(lead_id);
CREATE INDEX idx_proposals_event ON proposals(event_id);
CREATE INDEX idx_team_members_agency ON team_members(agency_id);
CREATE INDEX idx_comm_log_agency ON communication_log(agency_id);
CREATE INDEX idx_comm_log_event ON communication_log(event_id);
CREATE INDEX idx_comm_log_vendor ON communication_log(vendor_id);
CREATE INDEX idx_event_templates_agency ON event_templates(agency_id);
CREATE INDEX idx_reminders_agency ON reminders(agency_id);
CREATE INDEX idx_reminders_event ON reminders(event_id);
CREATE INDEX idx_reminders_remind_at ON reminders(remind_at);
CREATE INDEX idx_vendor_reviews_vendor ON vendor_reviews(vendor_id);
CREATE INDEX idx_vendor_reviews_agency ON vendor_reviews(agency_id);
CREATE INDEX idx_activity_log_agency ON activity_log(agency_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_expenses_event ON expenses(event_id);
CREATE INDEX idx_expenses_agency ON expenses(agency_id);
CREATE INDEX idx_invites_token ON event_invites(token);
CREATE INDEX idx_invites_event ON event_invites(event_id);
CREATE INDEX idx_rsvp_invite ON rsvp_responses(invite_id);
CREATE INDEX idx_rsvp_event ON rsvp_responses(event_id);
CREATE INDEX idx_event_photos_event ON event_photos(event_id);
CREATE INDEX idx_event_photos_agency ON event_photos(agency_id);
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Tables with direct agency_id
CREATE POLICY "agency_own" ON agencies FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "events_agency" ON events FOR ALL TO authenticated USING (agency_id = auth.uid()) WITH CHECK (agency_id = auth.uid());
CREATE POLICY "vendors_agency" ON vendors FOR ALL TO authenticated USING (agency_id = auth.uid()) WITH CHECK (agency_id = auth.uid());
CREATE POLICY "ledger_read" ON ledger FOR SELECT USING (agency_id = auth.uid());
CREATE POLICY "ledger_insert" ON ledger FOR INSERT WITH CHECK (agency_id = auth.uid());
CREATE POLICY "leads_agency" ON leads FOR ALL USING (agency_id = auth.uid()) WITH CHECK (agency_id = auth.uid());
CREATE POLICY "invoices_agency" ON invoices FOR ALL USING (agency_id = auth.uid()) WITH CHECK (agency_id = auth.uid());
CREATE POLICY "proposals_agency" ON proposals FOR ALL USING (agency_id = auth.uid()) WITH CHECK (agency_id = auth.uid());
CREATE POLICY "team_members_agency" ON team_members FOR ALL USING (agency_id = auth.uid()) WITH CHECK (agency_id = auth.uid());
CREATE POLICY "comm_log_agency" ON communication_log FOR ALL USING (agency_id = auth.uid()) WITH CHECK (agency_id = auth.uid());
CREATE POLICY "templates_agency" ON event_templates FOR ALL USING (agency_id = auth.uid() OR is_system = true) WITH CHECK (agency_id = auth.uid());
CREATE POLICY "reminders_agency" ON reminders FOR ALL USING (agency_id = auth.uid()) WITH CHECK (agency_id = auth.uid());
CREATE POLICY "vendor_reviews_agency" ON vendor_reviews FOR ALL USING (agency_id = auth.uid()) WITH CHECK (agency_id = auth.uid());
CREATE POLICY "activity_log_agency" ON activity_log FOR ALL USING (agency_id = auth.uid()) WITH CHECK (agency_id = auth.uid());
CREATE POLICY "expenses_agency" ON expenses FOR ALL USING (agency_id = auth.uid()) WITH CHECK (agency_id = auth.uid());
CREATE POLICY "invites_agency" ON event_invites FOR ALL TO authenticated USING (agency_id = auth.uid()) WITH CHECK (agency_id = auth.uid());
CREATE POLICY "event_photos_agency" ON event_photos FOR ALL TO authenticated USING (agency_id = auth.uid()) WITH CHECK (agency_id = auth.uid());

-- Tables linked via event_id
CREATE POLICY "contracts_agency" ON contracts FOR ALL USING (event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())) WITH CHECK (event_id IN (SELECT id FROM events WHERE agency_id = auth.uid()));
CREATE POLICY "tokens_agency" ON client_tokens FOR ALL TO authenticated USING (event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())) WITH CHECK (event_id IN (SELECT id FROM events WHERE agency_id = auth.uid()));
CREATE POLICY "sub_events_agency" ON sub_events FOR ALL USING (event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())) WITH CHECK (event_id IN (SELECT id FROM events WHERE agency_id = auth.uid()));
CREATE POLICY "payment_schedules_agency" ON payment_schedules FOR ALL USING (event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())) WITH CHECK (event_id IN (SELECT id FROM events WHERE agency_id = auth.uid()));
CREATE POLICY "seating_tables_agency" ON seating_tables FOR ALL TO authenticated USING (event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())) WITH CHECK (event_id IN (SELECT id FROM events WHERE agency_id = auth.uid()));
CREATE POLICY "tasks_agency" ON tasks FOR ALL USING (event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())) WITH CHECK (event_id IN (SELECT id FROM events WHERE agency_id = auth.uid()));
CREATE POLICY "guests_agency" ON guests FOR ALL TO authenticated USING (event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())) WITH CHECK (event_id IN (SELECT id FROM events WHERE agency_id = auth.uid()));
CREATE POLICY "timeline_agency" ON timeline_items FOR ALL USING (event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())) WITH CHECK (event_id IN (SELECT id FROM events WHERE agency_id = auth.uid()));
CREATE POLICY "rsvp_agency_manage" ON rsvp_responses FOR ALL TO authenticated USING (event_id IN (SELECT id FROM events WHERE agency_id = auth.uid()));

-- Admin
CREATE POLICY "admin_own" ON admin_users FOR SELECT USING (user_id = auth.uid());

-- Public access (invite RSVP + client portal)
CREATE POLICY "rsvp_public_insert" ON rsvp_responses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "invites_public_read" ON event_invites FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "guests_public_insert" ON guests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "tokens_public_read" ON client_tokens FOR SELECT TO anon USING (expires_at IS NULL OR expires_at > now());
CREATE POLICY "events_public_client_portal" ON events FOR SELECT TO anon USING (id IN (SELECT event_id FROM client_tokens WHERE expires_at IS NULL OR expires_at > now()));
CREATE POLICY "ledger_public_client_portal" ON ledger FOR SELECT TO anon USING (event_id IN (SELECT event_id FROM client_tokens WHERE expires_at IS NULL OR expires_at > now()));
CREATE POLICY "vendors_public_client_portal" ON vendors FOR SELECT TO anon USING (id IN (SELECT vendor_id FROM contracts WHERE event_id IN (SELECT event_id FROM client_tokens WHERE expires_at IS NULL OR expires_at > now())));

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 'documents', true, 10485760,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','image/heic',
        'application/pdf','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "docs_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('documents', 'photos'));
CREATE POLICY "docs_read" ON storage.objects FOR SELECT USING (bucket_id IN ('documents', 'photos'));
CREATE POLICY "docs_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('documents', 'photos'));
CREATE POLICY "docs_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('documents', 'photos'));
CREATE POLICY "docs_public_read" ON storage.objects FOR SELECT TO anon USING (bucket_id IN ('documents', 'photos'));
