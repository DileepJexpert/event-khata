-- Enable RLS on all tables
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tokens ENABLE ROW LEVEL SECURITY;

-- Agency: owner can only see their own agency
CREATE POLICY "agency_own" ON agencies
  FOR ALL USING (id = auth.uid());

-- Events: agency members can CRUD their own events
CREATE POLICY "events_agency" ON events
  FOR ALL USING (agency_id = auth.uid());

-- Vendors: agency members can CRUD their own vendors
CREATE POLICY "vendors_agency" ON vendors
  FOR ALL USING (agency_id = auth.uid());

-- Contracts: accessible if the event belongs to the agency
CREATE POLICY "contracts_agency" ON contracts
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  );

-- Ledger: INSERT only (immutable) + read own data
CREATE POLICY "ledger_read" ON ledger
  FOR SELECT USING (agency_id = auth.uid());

CREATE POLICY "ledger_insert" ON ledger
  FOR INSERT WITH CHECK (agency_id = auth.uid());

-- Client tokens: agency can manage their tokens
CREATE POLICY "tokens_agency" ON client_tokens
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  );
