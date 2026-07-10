# EventKhata — Deployment & Go-Live Tracker

This is the checklist of **manual steps you (the owner) must do** outside of code.
Code changes are already merged to `main` and auto-deploy to Vercel.

Legend: `[ ]` = to do · `[x]` = done

---

## 1. Database (Supabase) — DO THIS FIRST

The live site will error on new pages until the DB has the new columns.

- [ ] **Run the latest migration.** Supabase Dashboard → SQL Editor → paste and run:
  - `supabase/migrations/012_pnl_gst_reminders.sql`
  - Adds: vendor commission fields, GST invoice fields, WhatsApp `reminder_sent_at` columns.
- [ ] (Fresh project only — skip if your DB already exists) Run `supabase/SETUP.sql` once for a brand-new project (all tables + RLS + storage buckets).
- [ ] **Verify RLS is ON** for all tables (migration `010` handles this; confirm in Table Editor → each table shows "RLS enabled").

## 2. Supabase Auth settings

- [ ] **Site URL** → set to `https://event-khata.vercel.app`
  (Dashboard → Authentication → URL Configuration). Fixes password-reset links pointing to localhost.
- [ ] **Redirect URLs** → add `https://event-khata.vercel.app/**`.
- [ ] After you sign up with `todileepmaurya@gmail.com`, run the **super-admin INSERT**
  (bottom of `seed.sql`, commented) so your account gets admin panel access.

## 3. Vercel

- [ ] Confirm env vars are set in **Production** (and Preview):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - Optional (features degrade gracefully if missing): `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `ANTHROPIC_API_KEY`
  - `CRON_SECRET` — **required for automated daily WhatsApp reminders** (any long random string). Vercel injects it as the cron's `Authorization: Bearer` header; the reminder job fails closed without it.
- [ ] After `main` deploys, smoke-test: login → dashboard → open an event → **P&L**, **GST invoice**, **Muhurat**, **WhatsApp remind**.

## 4. Optional integrations (enable when ready)

- [ ] **Razorpay**: set `RAZORPAY_WEBHOOK_SECRET` and register webhook URL
  `https://event-khata.vercel.app/api/razorpay/webhook` for `payment_link.paid`.
- [ ] **WhatsApp Business API**: set `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID`; get the
  reminder templates approved in Meta Business Manager.
- [ ] **Automated reminders**: set `CRON_SECRET` in Vercel. The daily cron
  (`/api/cron/reminders`, 09:30 IST) nudges clients on overdue invoices and
  vendors on due/overdue payments, at most once every 3 days per item.
- [ ] **GST**: add your agency GSTIN in Settings → GST Details (needed for tax invoices).

## 5. Android / Play Store (only when publishing the app)

- [ ] Create the upload keystore:
  ```bash
  keytool -genkey -v -keystore eventkhata-release.keystore \
    -alias eventkhata -keyalg RSA -keysize 2048 -validity 10000
  ```
- [ ] Add `android/keystore.properties` (NOT committed) — see `android/keystore.properties.example`.
- [ ] **Replace the placeholder fingerprint** in `public/.well-known/assetlinks.json`
  (currently all-zeros) with the real SHA-256:
  ```bash
  keytool -list -v -keystore eventkhata-release.keystore | grep SHA256
  ```
- [ ] Build the signed bundle: `cd android && ./gradlew :app:bundleRelease`
- [ ] Google Play Developer account (one-time $25) → upload the `.aab`.

---

## Status of code (already done — no action needed)

- [x] Multi-tenancy RLS on all tables
- [x] API routes require auth; ownership checks on Razorpay/WhatsApp
- [x] Razorpay webhook fails closed + service-role client
- [x] Capacitor hosted-wrapper config → `event-khata.vercel.app`
- [x] Android release signing wired to keystore.properties
- [x] ESLint config; `npm ci` / build / lint all pass (Next.js 15)
- [x] Features shipped: QR check-in, gallery, seating, dashboard analytics,
      Event P&L + commissions, GST invoicing, Muhurat calendar, WhatsApp reminders
