# Kith & Kin

A cloud-backed family lineage archive. Record ancestors, build interactive family trees, and preserve stories with photos and documents.

## Stack

- **Frontend:** React 19 + Vite + Tailwind CSS
- **Backend:** Supabase (Auth, Postgres, Storage)
- **Deployment:** Vercel (static SPA + serverless API)
- **AI:** Gemini portrait sketch generation

## Production Checklist

Complete these steps once when deploying to production:

- [ ] **Run database migrations** in Supabase SQL Editor (in order):
  1. [`supabase/migrations/20260531120000_initial_schema.sql`](supabase/migrations/20260531120000_initial_schema.sql)
  2. [`supabase/migrations/20260531120100_backfill_existing_users.sql`](supabase/migrations/20260531120100_backfill_existing_users.sql)
- [ ] **Set Vercel environment variables** (Production + Preview):
  - `VITE_SUPABASE_URL` — your Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` — your Supabase anon/public key
  - `GEMINI_API_KEY` — for AI portrait sketches (optional)
  - `GOOGLE_MAPS_PLATFORM_KEY` — for geographic atlas (optional)
- [ ] **Redeploy** after adding env vars (Vite inlines them at build time)
- [ ] **Verify** — sign up, sign in, add a member, confirm "Saved to cloud" appears

If using the [Vercel Supabase integration](https://vercel.com/integrations/supabase), it may provision `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The app reads those as fallbacks, but setting the `VITE_` names explicitly is recommended.

## Local Development

**Prerequisites:** Node.js 20+, a Supabase project

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in `.env.local`:

   | Variable | Description |
   |----------|-------------|
   | `VITE_SUPABASE_URL` | Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
   | `GEMINI_API_KEY` | Google Gemini API key (server-side) |
   | `GOOGLE_MAPS_PLATFORM_KEY` | Google Maps API key (optional) |

4. Apply the database migrations (see Production Checklist above).

5. Start the dev server:

   ```bash
   npm run dev
   ```

   Opens at [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Connect the GitHub repo to Vercel.
2. Link your Supabase project via the [Vercel Marketplace integration](https://vercel.com/integrations/supabase).
3. Set env vars (see Production Checklist).
4. Deploy — Vercel uses [`vercel.json`](vercel.json) for SPA routing and the `/api/generate-sketch` serverless function.

## Database Schema

- `profiles` — user profile (auto-created on signup)
- `trees` — one family tree per user
- `members` — family member records (JSONB)
- `user_preferences` — recently visited, layout, geocode cache
- `media` storage bucket — uploaded photos and documents

Row Level Security is enabled on all tables. Users can only access their own data.

## Features

- Email + password authentication
- First-run onboarding wizard
- Interactive family tree (hierarchical, radial, grid layouts)
- Member index, timeline, analytics, and geographic atlas
- JSON import/export for portability
- AI-generated ancestor portrait sketches
- Cloud persistence via Supabase

Collaboration (multi-user invites and suggestions) is planned for a future release.
