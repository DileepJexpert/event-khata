-- ============================================
-- Event Khata - Vendor Reviews & Notes
-- ============================================

-- Vendor reviews (per-event rating after completion)
CREATE TABLE IF NOT EXISTS vendor_reviews (
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

CREATE INDEX idx_vendor_reviews_vendor ON vendor_reviews(vendor_id);
CREATE INDEX idx_vendor_reviews_agency ON vendor_reviews(agency_id);
ALTER TABLE vendor_reviews DISABLE ROW LEVEL SECURITY;

-- Activity log for tracking all agency actions
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('event', 'vendor', 'payment', 'invoice', 'proposal', 'lead', 'task', 'guest')),
  entity_id UUID,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'status_changed', 'payment_made', 'shared')),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_log_agency ON activity_log(agency_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;

-- Add city and state to agencies if not exists
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS state TEXT;
