-- ============================================================
-- DEMO USER + SAMPLE DATA
-- ============================================================
-- Creates a ready-to-show demo account with realistic sample
-- data (events, vendors, contracts, payments, tasks, guests).
--
-- LOGIN CREDENTIALS (share these for demos):
--   Email:    demo@eventkhata.com
--   Password: demo1234
--
-- Run ONCE in the Supabase SQL Editor. Safe to re-run — it
-- deletes and recreates the demo account each time.
-- ============================================================

-- Needed for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  demo_uid   UUID;
  ev_wedding UUID := gen_random_uuid();
  ev_corp    UUID := gen_random_uuid();
  v_decor    UUID := gen_random_uuid();
  v_cater    UUID := gen_random_uuid();
  v_photo    UUID := gen_random_uuid();
  v_dj       UUID := gen_random_uuid();
  c_decor    UUID := gen_random_uuid();
  c_cater    UUID := gen_random_uuid();
  c_photo    UUID := gen_random_uuid();
BEGIN
  -- ---- Clean up any previous demo account -------------------
  SELECT id INTO demo_uid FROM auth.users WHERE email = 'demo@eventkhata.com';
  IF demo_uid IS NOT NULL THEN
    DELETE FROM agencies WHERE id = demo_uid;          -- cascades to events/vendors/etc.
    DELETE FROM auth.identities WHERE user_id = demo_uid;
    DELETE FROM auth.users WHERE id = demo_uid;
  END IF;

  -- ---- Create the auth login --------------------------------
  demo_uid := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    demo_uid, 'authenticated', 'authenticated',
    'demo@eventkhata.com',
    crypt('demo1234', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), demo_uid,
    json_build_object('sub', demo_uid::text, 'email', 'demo@eventkhata.com'),
    'email', demo_uid::text,
    now(), now(), now()
  );

  -- ---- Agency (id = user id) --------------------------------
  INSERT INTO agencies (id, name, owner_name, owner_phone, owner_email, subscription_status, city, state, is_active)
  VALUES (demo_uid, 'Demo Wedding Planners', 'Demo Owner', '9876543210', 'demo@eventkhata.com', 'pro', 'Mumbai', 'Maharashtra', true);

  -- ---- Events -----------------------------------------------
  INSERT INTO events (id, agency_id, client_name, client_phone, event_type, total_budget, event_date, venue, status, notes)
  VALUES
    (ev_wedding, demo_uid, 'Sharma–Verma Wedding', '9811112222', 'wedding', 2500000,
       (CURRENT_DATE + INTERVAL '45 days')::date, 'The Grand Palace, Mumbai', 'active',
       'Big fat Indian wedding — 4 functions over 3 days.'),
    (ev_corp, demo_uid, 'TechCorp Annual Gala', '9822223333', 'corporate', 800000,
       (CURRENT_DATE + INTERVAL '20 days')::date, 'Hotel Taj, BKC', 'active',
       'Annual awards night + dinner for 300 employees.');

  -- ---- Vendors ----------------------------------------------
  INSERT INTO vendors (id, agency_id, name, category, phone, email, upi_id, rating, notes)
  VALUES
    (v_decor, demo_uid, 'Royal Decorators',    'decorator',    '9833334444', 'royal@decor.in',  'royal@upi',  5, 'Excellent floral work'),
    (v_cater, demo_uid, 'Spice Caterers',      'caterer',      '9844445555', 'spice@food.in',   'spice@upi',  4, 'Great Mughlai menu'),
    (v_photo, demo_uid, 'Candid Clicks Studio','photographer', '9855556666', 'candid@photo.in', 'candid@upi', 5, 'Cinematic team'),
    (v_dj,    demo_uid, 'BeatBox DJ',          'dj',           '9866667777', 'beat@music.in',   'beat@upi',   4, 'High energy sets');

  -- ---- Contracts --------------------------------------------
  INSERT INTO contracts (id, event_id, vendor_id, agreed_amount, description, status)
  VALUES
    (c_decor, ev_wedding, v_decor, 600000, 'Full decor for all 4 functions', 'confirmed'),
    (c_cater, ev_wedding, v_cater, 900000, 'Catering for ~800 guests',        'confirmed'),
    (c_photo, ev_wedding, v_photo, 350000, 'Photo + video + drone',           'confirmed');

  -- ---- Ledger (payments made) -------------------------------
  INSERT INTO ledger (agency_id, event_id, vendor_id, contract_id, amount, txn_type, payment_mode, notes, recorded_at)
  VALUES
    (demo_uid, ev_wedding, v_decor, c_decor, 200000, 'ADVANCE', 'UPI',  'Booking advance', now() - INTERVAL '10 days'),
    (demo_uid, ev_wedding, v_cater, c_cater, 300000, 'ADVANCE', 'NEFT', 'Booking advance', now() - INTERVAL '8 days'),
    (demo_uid, ev_wedding, v_photo, c_photo, 100000, 'ADVANCE', 'UPI',  'Token amount',    now() - INTERVAL '5 days');

  -- ---- Payment schedule -------------------------------------
  INSERT INTO payment_schedules (contract_id, event_id, vendor_id, amount, due_date, label, status)
  VALUES
    (c_decor, ev_wedding, v_decor, 400000, (CURRENT_DATE + INTERVAL '30 days')::date, 'Final Payment', 'upcoming'),
    (c_cater, ev_wedding, v_cater, 600000, (CURRENT_DATE + INTERVAL '40 days')::date, 'Final Payment', 'upcoming'),
    (c_photo, ev_wedding, v_photo, 250000, (CURRENT_DATE - INTERVAL '2 days')::date,  '2nd Installment', 'overdue');

  -- ---- Tasks ------------------------------------------------
  INSERT INTO tasks (event_id, title, priority, status, sort_order)
  VALUES
    (ev_wedding, 'Finalize stage backdrop design', 'high',   'completed',   0),
    (ev_wedding, 'Confirm guest count with caterer','high',   'in_progress', 1),
    (ev_wedding, 'Book makeup artist for bride',     'medium', 'pending',     2),
    (ev_wedding, 'Arrange transport for baraat',     'medium', 'pending',     3),
    (ev_corp,    'Send invites to all employees',    'high',   'in_progress', 0),
    (ev_corp,    'Finalize awards list',             'medium', 'pending',     1);

  -- ---- Guests -----------------------------------------------
  INSERT INTO guests (event_id, name, phone, side, rsvp_status, plus_count)
  VALUES
    (ev_wedding, 'Ramesh Sharma', '9911110000', 'groom', 'confirmed', 3),
    (ev_wedding, 'Sunita Verma',  '9911110001', 'bride', 'confirmed', 2),
    (ev_wedding, 'Amit Kapoor',   '9911110002', 'mutual','maybe',     1);

  RAISE NOTICE 'Demo account created: demo@eventkhata.com / demo1234 (uid=%)', demo_uid;
END $$;
