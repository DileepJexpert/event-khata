-- ============================================================
-- EventKhata — Seed Data
-- ============================================================
-- Run AFTER schema.sql. Creates:
--   1. Demo account (demo@eventkhata.com / demo1234)
--   2. Super admin entry for the app owner
--   3. Sample data for demo
-- ============================================================

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
  -- ============================================================
  -- 1. DEMO USER (demo@eventkhata.com / demo1234)
  -- ============================================================
  SELECT id INTO demo_uid FROM auth.users WHERE email = 'demo@eventkhata.com';
  IF demo_uid IS NOT NULL THEN
    DELETE FROM agencies WHERE id = demo_uid;
    DELETE FROM auth.identities WHERE user_id = demo_uid;
    DELETE FROM auth.users WHERE id = demo_uid;
  END IF;

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
    '{}', '', '', '', ''
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

  -- Agency
  INSERT INTO agencies (id, name, owner_name, owner_phone, owner_email, subscription_status, city, state, is_active)
  VALUES (demo_uid, 'Demo Wedding Planners', 'Demo Owner', '9876543210', 'demo@eventkhata.com', 'pro', 'Mumbai', 'Maharashtra', true);

  -- Events
  INSERT INTO events (id, agency_id, client_name, client_phone, event_type, total_budget, event_date, venue, status, notes)
  VALUES
    (ev_wedding, demo_uid, 'Sharma–Verma Wedding', '9811112222', 'wedding', 2500000,
       (CURRENT_DATE + INTERVAL '45 days')::date, 'The Grand Palace, Mumbai', 'active',
       'Big fat Indian wedding — 4 functions over 3 days.'),
    (ev_corp, demo_uid, 'TechCorp Annual Gala', '9822223333', 'corporate', 800000,
       (CURRENT_DATE + INTERVAL '20 days')::date, 'Hotel Taj, BKC', 'active',
       'Annual awards night + dinner for 300 employees.');

  -- Vendors
  INSERT INTO vendors (id, agency_id, name, category, phone, email, upi_id, rating, notes)
  VALUES
    (v_decor, demo_uid, 'Royal Decorators',     'decorator',    '9833334444', 'royal@decor.in',  'royal@upi',  5, 'Excellent floral work'),
    (v_cater, demo_uid, 'Spice Caterers',       'caterer',      '9844445555', 'spice@food.in',   'spice@upi',  4, 'Great Mughlai menu'),
    (v_photo, demo_uid, 'Candid Clicks Studio', 'photographer', '9855556666', 'candid@photo.in', 'candid@upi', 5, 'Cinematic team'),
    (v_dj,    demo_uid, 'BeatBox DJ',           'dj',           '9866667777', 'beat@music.in',   'beat@upi',   4, 'High energy sets');

  -- Contracts
  INSERT INTO contracts (id, event_id, vendor_id, agreed_amount, description, status)
  VALUES
    (c_decor, ev_wedding, v_decor, 600000, 'Full decor for all 4 functions', 'confirmed'),
    (c_cater, ev_wedding, v_cater, 900000, 'Catering for ~800 guests',       'confirmed'),
    (c_photo, ev_wedding, v_photo, 350000, 'Photo + video + drone',          'confirmed');

  -- Ledger (payments made)
  INSERT INTO ledger (agency_id, event_id, vendor_id, contract_id, amount, txn_type, payment_mode, notes, recorded_at)
  VALUES
    (demo_uid, ev_wedding, v_decor, c_decor, 200000, 'ADVANCE', 'UPI',  'Booking advance', now() - INTERVAL '10 days'),
    (demo_uid, ev_wedding, v_cater, c_cater, 300000, 'ADVANCE', 'NEFT', 'Booking advance', now() - INTERVAL '8 days'),
    (demo_uid, ev_wedding, v_photo, c_photo, 100000, 'ADVANCE', 'UPI',  'Token amount',    now() - INTERVAL '5 days');

  -- Payment schedules
  INSERT INTO payment_schedules (contract_id, event_id, vendor_id, amount, due_date, label, status)
  VALUES
    (c_decor, ev_wedding, v_decor, 400000, (CURRENT_DATE + INTERVAL '30 days')::date, 'Final Payment',   'upcoming'),
    (c_cater, ev_wedding, v_cater, 600000, (CURRENT_DATE + INTERVAL '40 days')::date, 'Final Payment',   'upcoming'),
    (c_photo, ev_wedding, v_photo, 250000, (CURRENT_DATE - INTERVAL '2 days')::date,  '2nd Installment', 'overdue');

  -- Sub-events
  INSERT INTO sub_events (event_id, name, type, date, venue, sort_order)
  VALUES
    (ev_wedding, 'Mehendi Ceremony',  'mehendi',   (CURRENT_DATE + INTERVAL '43 days')::date, 'Poolside, Grand Palace', 0),
    (ev_wedding, 'Sangeet Night',     'sangeet',   (CURRENT_DATE + INTERVAL '44 days')::date, 'Banquet Hall, Grand Palace', 1),
    (ev_wedding, 'Wedding Ceremony',  'wedding',   (CURRENT_DATE + INTERVAL '45 days')::date, 'Main Lawn, Grand Palace', 2),
    (ev_wedding, 'Reception',         'reception', (CURRENT_DATE + INTERVAL '45 days')::date, 'Grand Ballroom', 3);

  -- Tasks
  INSERT INTO tasks (event_id, title, priority, status, sort_order)
  VALUES
    (ev_wedding, 'Finalize stage backdrop design',  'high',   'completed',   0),
    (ev_wedding, 'Confirm guest count with caterer', 'high',   'in_progress', 1),
    (ev_wedding, 'Book makeup artist for bride',     'medium', 'pending',     2),
    (ev_wedding, 'Arrange transport for baraat',     'medium', 'pending',     3),
    (ev_corp,    'Send invites to all employees',    'high',   'in_progress', 0),
    (ev_corp,    'Finalize awards list',             'medium', 'pending',     1);

  -- Guests
  INSERT INTO guests (event_id, name, phone, side, rsvp_status, plus_count)
  VALUES
    (ev_wedding, 'Ramesh Sharma',  '9911110000', 'groom',  'confirmed', 3),
    (ev_wedding, 'Sunita Verma',   '9911110001', 'bride',  'confirmed', 2),
    (ev_wedding, 'Amit Kapoor',    '9911110002', 'mutual', 'maybe',     1),
    (ev_wedding, 'Priya Mehta',    '9911110003', 'bride',  'confirmed', 4),
    (ev_wedding, 'Rajesh Gupta',   '9911110004', 'groom',  'pending',   2),
    (ev_wedding, 'Neha Singh',     '9911110005', 'mutual', 'confirmed', 0);

  -- Expenses
  INSERT INTO expenses (agency_id, event_id, title, category, amount, payment_mode, spent_on)
  VALUES
    (demo_uid, ev_wedding, 'Venue site visit travel',  'travel',    2500, 'UPI',  CURRENT_DATE - INTERVAL '15 days'),
    (demo_uid, ev_wedding, 'Sample food tasting',      'food',      5000, 'CASH', CURRENT_DATE - INTERVAL '12 days'),
    (demo_uid, ev_corp,    'Printing award certificates', 'supplies', 8000, 'UPI',  CURRENT_DATE - INTERVAL '3 days');

  RAISE NOTICE 'Demo account created: demo@eventkhata.com / demo1234 (uid=%)', demo_uid;
END $$;

-- ============================================================
-- 2. SUPER ADMIN (app owner)
-- ============================================================
-- NOTE: Replace the user_id after the owner signs up.
-- Run this AFTER todileepmaurya@gmail.com creates an account:
--
-- INSERT INTO admin_users (user_id, email, name, role, is_active)
-- SELECT id, 'todileepmaurya@gmail.com', 'Dileep Maurya', 'super_admin', true
-- FROM auth.users WHERE email = 'todileepmaurya@gmail.com';

-- ============================================================
-- 3. SYSTEM EVENT TEMPLATES (master data)
-- ============================================================
INSERT INTO event_templates (name, event_type, is_system, description, sub_events, tasks, vendor_categories, budget_split)
VALUES
  (
    'Classic Indian Wedding',
    'wedding',
    true,
    'Traditional 3-day Indian wedding with all ceremonies',
    '[{"name":"Mehendi","type":"mehendi"},{"name":"Sangeet","type":"sangeet"},{"name":"Haldi","type":"haldi"},{"name":"Wedding Ceremony","type":"wedding"},{"name":"Reception","type":"reception"}]',
    '[{"title":"Book venue","priority":"high","days_before":120},{"title":"Hire photographer","priority":"high","days_before":90},{"title":"Finalize caterer menu","priority":"high","days_before":60},{"title":"Send invitations","priority":"high","days_before":45},{"title":"Confirm guest count","priority":"high","days_before":14},{"title":"Final vendor payments","priority":"high","days_before":7},{"title":"Venue decoration rehearsal","priority":"medium","days_before":3},{"title":"Bride makeup trial","priority":"medium","days_before":30}]',
    '["decorator","caterer","photographer","videographer","dj","makeup","florist","lighting","tent_house","mehndi_artist","pandit","transport"]',
    '{"decorator":15,"caterer":30,"photographer":10,"videographer":8,"dj":5,"makeup":5,"florist":5,"lighting":5,"tent_house":7,"venue":10}'
  ),
  (
    'Intimate Wedding',
    'wedding',
    true,
    'Small wedding with 50-100 guests, 1-2 functions',
    '[{"name":"Wedding Ceremony","type":"wedding"},{"name":"Reception Dinner","type":"reception"}]',
    '[{"title":"Book venue","priority":"high","days_before":60},{"title":"Hire photographer","priority":"high","days_before":45},{"title":"Finalize caterer menu","priority":"medium","days_before":30},{"title":"Send invitations","priority":"high","days_before":21},{"title":"Final vendor payments","priority":"high","days_before":5}]',
    '["decorator","caterer","photographer","makeup","florist"]',
    '{"decorator":15,"caterer":35,"photographer":15,"makeup":5,"florist":10,"venue":20}'
  ),
  (
    'Corporate Event',
    'corporate',
    true,
    'Corporate awards night, conference, or team outing',
    '[{"name":"Main Event","type":"other"}]',
    '[{"title":"Confirm venue and AV setup","priority":"high","days_before":30},{"title":"Send employee invitations","priority":"high","days_before":21},{"title":"Finalize catering menu","priority":"medium","days_before":14},{"title":"Prepare awards/trophies","priority":"medium","days_before":7},{"title":"Venue walkthrough","priority":"high","days_before":2}]',
    '["caterer","dj","lighting","photographer","anchor"]',
    '{"caterer":35,"dj":10,"lighting":10,"photographer":10,"anchor":5,"venue":30}'
  ),
  (
    'Birthday Party',
    'birthday',
    true,
    'Birthday celebration for any age group',
    '[{"name":"Party","type":"other"}]',
    '[{"title":"Book venue","priority":"high","days_before":21},{"title":"Order cake","priority":"high","days_before":7},{"title":"Arrange decorations","priority":"medium","days_before":3},{"title":"Send invites","priority":"high","days_before":14}]',
    '["decorator","caterer","dj","photographer","entertainment"]',
    '{"decorator":20,"caterer":30,"dj":10,"photographer":10,"entertainment":10,"venue":20}'
  ),
  (
    'Engagement Ceremony',
    'engagement',
    true,
    'Ring ceremony with close family and friends',
    '[{"name":"Ring Ceremony","type":"engagement"},{"name":"Dinner","type":"other"}]',
    '[{"title":"Book venue","priority":"high","days_before":45},{"title":"Order rings","priority":"high","days_before":30},{"title":"Hire photographer","priority":"high","days_before":30},{"title":"Finalize menu","priority":"medium","days_before":14},{"title":"Send invitations","priority":"high","days_before":21}]',
    '["decorator","caterer","photographer","florist"]',
    '{"decorator":20,"caterer":30,"photographer":15,"florist":10,"venue":25}'
  );
