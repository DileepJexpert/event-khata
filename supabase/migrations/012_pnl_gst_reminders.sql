-- ============================================================
-- MIGRATION 012: P&L + COMMISSIONS, GST INVOICING, WHATSAPP REMINDERS
-- ============================================================

-- 1. VENDOR COMMISSIONS: planners earn commission from vendors they bring in
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS commission_received NUMERIC(12,2) DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS commission_status TEXT DEFAULT 'none'
  CHECK (commission_status IN ('none', 'pending', 'partial', 'received'));

-- 2. GST INVOICING
-- Agency's own GST registration
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS gst_state_code TEXT;

-- Invoice-level GST fields
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_gstin TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS place_of_supply TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_type TEXT DEFAULT 'none'
  CHECK (gst_type IN ('none', 'cgst_sgst', 'igst'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hsn_sac TEXT DEFAULT '998596';

-- 3. WHATSAPP PAYMENT REMINDERS: track when a reminder was last sent
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE payment_schedules ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
