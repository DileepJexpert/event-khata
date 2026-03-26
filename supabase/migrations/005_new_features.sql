-- ============================================
-- Event Khata - New Features Migration
-- Proposals, Team Members, Communication Log,
-- Event Templates, Reminders
-- ============================================

-- ============================================
-- 15. PROPOSALS / QUOTATIONS
-- ============================================
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

CREATE INDEX idx_proposals_agency ON proposals(agency_id);
CREATE INDEX idx_proposals_lead ON proposals(lead_id);
CREATE INDEX idx_proposals_event ON proposals(event_id);

CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 16. TEAM MEMBERS (Multi-user collaboration)
-- ============================================
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

CREATE INDEX idx_team_members_agency ON team_members(agency_id);
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 17. COMMUNICATION LOG
-- ============================================
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

CREATE INDEX idx_comm_log_agency ON communication_log(agency_id);
CREATE INDEX idx_comm_log_event ON communication_log(event_id);
CREATE INDEX idx_comm_log_vendor ON communication_log(vendor_id);
ALTER TABLE communication_log DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 18. EVENT TEMPLATES
-- ============================================
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

CREATE INDEX idx_event_templates_agency ON event_templates(agency_id);
ALTER TABLE event_templates DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 19. REMINDERS
-- ============================================
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

CREATE INDEX idx_reminders_agency ON reminders(agency_id);
CREATE INDEX idx_reminders_event ON reminders(event_id);
CREATE INDEX idx_reminders_remind_at ON reminders(remind_at);
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;
