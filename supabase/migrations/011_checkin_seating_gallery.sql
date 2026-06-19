-- ============================================================
-- MIGRATION 011: NEW FEATURES
-- QR Check-in, Seating Chart, Photo Gallery
-- ============================================================

-- 1. QR CHECK-IN: add check-in tracking to guests
ALTER TABLE guests ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT false;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- 2. SEATING CHART: tables and guest assignment
CREATE TABLE IF NOT EXISTS seating_tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 10,
  table_type TEXT DEFAULT 'round' CHECK (table_type IN ('round', 'rectangle', 'long')),
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seating_tables_event ON seating_tables(event_id);

ALTER TABLE guests ADD COLUMN IF NOT EXISTS seating_table_id UUID REFERENCES seating_tables(id) ON DELETE SET NULL;

-- 3. PHOTO GALLERY
CREATE TABLE IF NOT EXISTS event_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_photos_event ON event_photos(event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_agency ON event_photos(agency_id);

-- 4. RLS POLICIES
ALTER TABLE seating_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seating_tables_agency" ON seating_tables
  FOR ALL TO authenticated USING (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  )
  WITH CHECK (
    event_id IN (SELECT id FROM events WHERE agency_id = auth.uid())
  );

CREATE POLICY "event_photos_agency" ON event_photos
  FOR ALL TO authenticated USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());

-- 5. STORAGE BUCKET for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "photos_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos');

CREATE POLICY "photos_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');

CREATE POLICY "photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'photos');
