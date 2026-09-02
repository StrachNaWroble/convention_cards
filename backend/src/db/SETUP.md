# Database Setup

This project uses Supabase Auth, hosted PostgreSQL, and Drizzle migrations.

## 1. Create the Hosted Database

Create a Supabase project and copy these values into `.env`:

- `DATABASE_URL`: Supabase PostgreSQL connection string.
- `SUPABASE_URL`: project API URL.
- `SUPABASE_ANON_KEY`: public browser/server auth key.
- `SUPABASE_SERVICE_ROLE_KEY`: private server-only key.

Keep `SUPABASE_SERVICE_ROLE_KEY` out of frontend code.

For local setup, try the Direct connection string first. If your network cannot reach Supabase's IPv6 direct database endpoint, use the Session pooler connection string instead. In Supabase, this is under:

```text
Connect -> Connection string -> Session pooler
```

The Session pooler string usually has this shape:

```text
postgresql://postgres.PROJECT_REF:[YOUR-PASSWORD]@aws-0-REGION.pooler.supabase.com:5432/postgres
```

## 2. Run the First Migration

After `.env` is filled in:

```sh
npm run db:migrate
```

This creates the first app tables:

- `players`
- `partnerships`
- `convention_cards`
- `card_templates`
- `share_links`

It also enables row-level security and adds ownership policies.

## 3. Auth Model

Users register with WBF number, email, and password.

Supabase Auth stores the email/password account. The app stores the WBF number in `players`, linked to the Supabase auth user id.

When a player logs in, they enter WBF number and password. The server looks up the stored email for that WBF number and signs in through Supabase Auth.

## 4. Direct Database Access

Backend services can use the Drizzle client with `DATABASE_URL`.

Frontend code should not use the direct database URL. Browser code should call backend API routes or use Supabase client APIs that are protected by row-level security.
