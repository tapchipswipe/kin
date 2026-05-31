# Kith & Kin

A cloud-backed family lineage archive. Record ancestors, build interactive family trees, and preserve stories with photos and documents.

## Stack

- **Frontend:** React 19 + Vite + Tailwind CSS
- **Backend:** Supabase (Auth, Postgres, Storage)
- **Deployment:** Vercel (static SPA + serverless API)
- **AI:** Gemini portrait sketch generation

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

4. Apply the database migration to your Supabase project:

   ```bash
   npx supabase db push
   ```

   Or run the SQL in [`supabase/migrations/20260531120000_initial_schema.sql`](supabase/migrations/20260531120000_initial_schema.sql) via the Supabase SQL editor.

5. Start the dev server:

   ```bash
   npm run dev
   ```

   Opens at [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Connect the GitHub repo to Vercel.
2. Link your Supabase project via the [Vercel Marketplace integration](https://vercel.com/integrations/supabase) — this auto-provisions `SUPABASE_URL` and keys.
3. Map env vars in Vercel (Supabase integration may use `NEXT_PUBLIC_` prefix; map to `VITE_` for this Vite app):
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Add remaining secrets:
   - `GEMINI_API_KEY`
   - `GOOGLE_MAPS_PLATFORM_KEY` (optional)
5. Deploy — Vercel uses [`vercel.json`](vercel.json) for SPA routing and the `/api/generate-sketch` serverless function.

## Database Schema

- `profiles` — user profile (auto-created on signup)
- `trees` — one family tree per user
- `members` — family member records (JSONB)
- `user_preferences` — recently visited, layout, geocode cache
- `media` storage bucket — uploaded photos and documents

Row Level Security is enabled on all tables. Users can only access their own data.

## Features

- Email + password authentication
- Interactive family tree (hierarchical, radial, grid layouts)
- Member index, timeline, analytics, and geographic atlas
- JSON import/export for portability
- AI-generated ancestor portrait sketches
- Cloud persistence via Supabase

Collaboration (multi-user invites and suggestions) is planned for a future release.
