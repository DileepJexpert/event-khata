-- ============================================
-- Event Khata - Storage Bucket & RLS Policies
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================

-- ============================================
-- 1. CREATE STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true,
  10485760, -- 10MB
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

-- ============================================
-- 2. STORAGE RLS POLICIES (for documents bucket)
-- ============================================

-- Allow authenticated users to upload files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated uploads' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow authenticated uploads" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'documents');
  END IF;
END $$;

-- Allow authenticated users to read/download files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated reads' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow authenticated reads" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'documents');
  END IF;
END $$;

-- Allow authenticated users to delete their files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated deletes' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow authenticated deletes" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'documents');
  END IF;
END $$;

-- Allow authenticated users to update files (overwrite)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated updates' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow authenticated updates" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'documents');
  END IF;
END $$;

-- Allow public read access (since bucket is public)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow public reads' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Allow public reads" ON storage.objects
      FOR SELECT TO anon
      USING (bucket_id = 'documents');
  END IF;
END $$;
