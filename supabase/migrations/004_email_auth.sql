-- ============================================
-- Switch from phone to email auth
-- ============================================

-- Make owner_phone optional (was required for SMS auth)
ALTER TABLE agencies ALTER COLUMN owner_phone DROP NOT NULL;

-- Drop unique constraint on owner_phone if it exists
ALTER TABLE agencies DROP CONSTRAINT IF EXISTS agencies_owner_phone_key;

-- Add email column to agencies
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS owner_email TEXT;
