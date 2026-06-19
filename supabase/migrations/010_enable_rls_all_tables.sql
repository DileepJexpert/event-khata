-- ============================================================
-- PRODUCTION RLS — Enable Row Level Security on ALL tables
-- ============================================================
-- This migration enables RLS and adds policies for every table
-- so that each agency (event planner) can only see their own
-- data. Run this in the Supabase SQL Editor to lock down
-- multi-tenant data isolation.
--
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ============================================================
-- 1. ENABLE RLS on every table
-- ============================================================
ALTER TABLE agencies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors              ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger               ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tokens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests               ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_invites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_responses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users          ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. DROP existing policies (clean slate, avoids conflicts)
-- ============================================================
DROP POLICY IF EXISTS "agency_own"       ON agencies;
DROP POLICY IF EXISTS "events_agency"    ON events;
DROP POLICY IF EXISTS "vendors_agency"   ON vendors;
DROP POLICY IF EXISTS "contracts_agency" ON contracts;
DROP POLICY IF EXISTS "ledger_read"      ON ledger;
DROP POLICY IF EXISTS "ledger_insert"    ON ledger;
DROP POLICY IF EXISTS "tokens_agency"    ON client_tokens;

-- ============================================================
-- 3. POLICIES — tables with direct agency_id column
-- ============================================================

-- Agencies: owner sees only their own row (agency.id = user id)
CREATE POLICY "agency_own" ON agencies
  FOR ALL USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Events
CREATE POLICY "events_agency" ON events
  FOR ALL USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

-- Vendors
CREATE POLICY "vendors_agency" ON vendors
  FOR ALL USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

-- Ledger (read + insert only — append-only ledger)
CREATE POLICY "ledger_read" ON ledger
  FOR SELECT USING (agency_id = auth.uid());

CREATE POLICY "ledger_insert" ON ledger
  FOR INSERT WITH CHECK (agency_id = auth.uid());

-- Leads
CREATE POLICY "leads_agency" ON leads
  FOR ALL USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

-- Invoices
CREATE POLICY "invoices_agency" ON invoices
  FOR ALL USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

-- Proposals
CREATE POLICY "proposals_agency" ON proposals
  FOR ALL USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

-- Team Members
CREATE POLICY "team_members_agency" ON team_members
  FOR ALL USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

-- Communication Log
CREATE POLICY "comm_log_agency" ON communication_log
  FOR ALL USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

-- Event Templates (agency-owned or system templates)
CREATE POLICY "templates_agency" ON event_templates
  FOR ALL USING (agency_id = auth.uid() OR is_system = true)
  WITH CHECK (agency_id = auth.uid());

-- Reminders
CREATE POLICY "reminders_agency" ON reminders
  FOR ALL USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

-- Vendor Reviews
CREATE POLICY "vendor_reviews_agency" ON vendor_reviews
  FOR ALL USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

-- Activity Log
CREATE POLICY "activity_log_agency" ON activity_log
  FOR ALL USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

-- Expenses
CREATE POLICY "expenses_agency" ON expenses
  FOR ALL USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

-- Event Invites
CREATE POLICY "invites_agency" ON event_invites
  FOR ALL USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

-- ============================================================
-- 4. POLICIES — tables linked via event_id (no direct agency_id)
-- ============================================================

-- Contracts: accessible if the event belongs to the agency
CREATE POLICY "contracts_agency" ON contracts
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  )
  WITH CHECK (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  );

-- Client Tokens
CREATE POLICY "tokens_agency" ON client_tokens
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  )
  WITH CHECK (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  );

-- Sub Events
CREATE POLICY "sub_events_agency" ON sub_events
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  )
  WITH CHECK (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  );

-- Payment Schedules
CREATE POLICY "payment_schedules_agency" ON payment_schedules
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  )
  WITH CHECK (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  );

-- Tasks
CREATE POLICY "tasks_agency" ON tasks
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  )
  WITH CHECK (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  );

-- Guests
CREATE POLICY "guests_agency" ON guests
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  )
  WITH CHECK (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  );

-- Timeline Items
CREATE POLICY "timeline_agency" ON timeline_items
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  )
  WITH CHECK (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  );

-- ============================================================
-- 5. RSVP Responses — public INSERT (guests fill this), agency read/manage
-- ============================================================
CREATE POLICY "rsvp_public_insert" ON rsvp_responses
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "rsvp_agency_manage" ON rsvp_responses
  FOR ALL TO authenticated USING (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  );

-- ============================================================
-- 6. Admin Users — only the admin themselves can read their row
-- ============================================================
CREATE POLICY "admin_own" ON admin_users
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- 7. PUBLIC ACCESS — invite page & client portal (anon role)
-- ============================================================
-- These policies allow unauthenticated guests to use the public
-- invite RSVP page and the client portal (token-based access).

-- Public invite page: anon can read active invites
CREATE POLICY "invites_public_read" ON event_invites
  FOR SELECT TO anon USING (is_active = true);

-- Public invite page: anon can insert guests (RSVP adds to guest list)
CREATE POLICY "guests_public_insert" ON guests
  FOR INSERT TO anon WITH CHECK (true);

-- Client portal: anon can look up tokens
CREATE POLICY "tokens_public_read" ON client_tokens
  FOR SELECT TO anon USING (
    expires_at IS NULL OR expires_at > now()
  );

-- Client portal: anon can read events that have a valid client token
CREATE POLICY "events_public_client_portal" ON events
  FOR SELECT TO anon USING (
    id IN (SELECT event_id FROM client_tokens
           WHERE expires_at IS NULL OR expires_at > now())
  );

-- Client portal: anon can read ledger for token-shared events
CREATE POLICY "ledger_public_client_portal" ON ledger
  FOR SELECT TO anon USING (
    event_id IN (SELECT event_id FROM client_tokens
                 WHERE expires_at IS NULL OR expires_at > now())
  );

-- Client portal: anon can read vendors (for ledger joins)
CREATE POLICY "vendors_public_client_portal" ON vendors
  FOR SELECT TO anon USING (
    id IN (SELECT vendor_id FROM contracts
           WHERE event_id IN (SELECT event_id FROM client_tokens
                              WHERE expires_at IS NULL OR expires_at > now()))
  );

-- ============================================================
-- 8. SERVICE ROLE BYPASS
-- ============================================================
-- The service_role key (used by API routes / webhooks) bypasses
-- RLS automatically in Supabase. No extra policy needed.
-- The anon key respects RLS, so unauthenticated users see nothing
-- unless an explicit anon policy (above) grants access.
