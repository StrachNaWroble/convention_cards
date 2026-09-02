# Convention Cards

Web app foundation for WBF-style bridge convention cards.

## Current Backend Direction

Authentication is designed around player-facing WBF-number login while still using Supabase Auth internally:

1. During registration, a player provides their WBF number, email, and password.
2. Supabase Auth stores the email/password identity.
3. The `players` table links the Supabase auth user id to the player's WBF number.
4. During login, the app accepts WBF number and password, finds the stored email for that WBF number, and signs in through Supabase.

Convention-card content is stored as structured JSON in PostgreSQL so drafts can autosave before every WBF-required field is complete.

## Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` is used only on the server side and must never be exposed to browser code.

## Useful Commands

- `npm run typecheck`
- `npm test`
- `npm run db:generate`
- `npm run db:migrate`
