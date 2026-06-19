# EventKhata — Claude Code Instructions

## Workflow

After every set of changes, always:
1. Commit with a clear message describing what changed and why
2. Push to the feature branch
3. Create a PR from the feature branch to `main` using `gh pr create`
4. Merge the PR into `main` using `gh pr merge --merge`

Never leave changes only on the feature branch — they must reach `main`.

## Branch

- Feature branch: `claude/eventkhata-mvp-build-cuYwG`
- Always push to this branch, then PR into `main`

## Tech Stack

- **Framework:** Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **UI:** shadcn/ui components in `components/ui/`
- **Charts:** Recharts
- **Payments:** Razorpay
- **Messaging:** WhatsApp Business API
- **AI:** Claude API (Anthropic)
- **Mobile:** Capacitor (hosted-wrapper mode, loads from remote URL)
- **Deployment:** Vercel (https://event-khata.vercel.app)

## Project Structure

- `app/` — Next.js App Router pages and API routes
- `app/(dashboard)/` — Authenticated dashboard pages (events, vendors, pay, etc.)
- `app/(auth)/` — Login/onboard pages
- `app/api/` — Server-side API routes (Razorpay, WhatsApp, AI)
- `components/` — Shared React components
- `lib/supabase/` — Supabase client helpers (client.ts, server.ts, middleware.ts, api-auth.ts)
- `supabase/` — Schema, migrations, seed data
- `public/` — Static assets, manifest, service worker

## Key Patterns

- All API routes (except webhooks) must use `requireAuth()` from `lib/supabase/api-auth.ts`
- Webhooks use service-role Supabase client (bypass RLS) and must fail closed if secrets are missing
- Multi-tenancy via RLS: `agency_id = auth.uid()` on all tenant tables
- Client components use `"use client"` directive
- Supabase client-side queries use `createClient()` from `lib/supabase/client.ts`

## Build & Lint

- `npm run build` — must pass before pushing
- `npm run lint` — must have zero errors (warnings are acceptable)
- `npm ci` — must succeed (lockfile must stay in sync)
- ESLint config: `.eslintrc.json` (extends `next/core-web-vitals`)

## Don'ts

- Don't leave `console.log` with data payloads in production code (`console.error` for failures is fine)
- Don't use `webDir: "out"` in Capacitor — this is a hosted-wrapper app, not a static export
- Don't skip webhook signature verification when secrets are missing — fail closed
