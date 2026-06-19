-- ============================================================
-- ACCOUNT STATUS — enable/disable agency access from admin
-- ============================================================
-- Adds an is_active flag to agencies. When false, the user is
-- blocked at login by the AuthGuard and signed out.
-- Run once in the Supabase SQL Editor.
-- ============================================================

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Backfill any existing rows that may have NULL
UPDATE agencies SET is_active = true WHERE is_active IS NULL;
