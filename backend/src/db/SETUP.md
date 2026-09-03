# Database Setup

This project uses Supabase Auth, hosted PostgreSQL, and Drizzle migrations.

## 1. Create the Hosted Database

Create a Supabase project and copy these values into `.env`:

- `DATABASE_URL`: Supabase PostgreSQL connection string.
- `SUPABASE_URL`: project API URL.
- `SUPABASE_ANON_KEY`: public browser/server auth key.
- `SUPABASE_SERVICE_ROLE_KEY`: private server-only key.
- `REQUIRE_WBF_VERIFICATION`: optional. Set to `true` in stricter environments to block registration when WBF verification is unavailable.
- `PASSWORD_RESET_REDIRECT_TO`: optional. Supabase password reset emails can redirect users to this URL.
- `RATE_LIMIT_ENABLED`: optional. Set to `false` to disable backend rate limiting.
- `RATE_LIMIT_WINDOW_MS`: optional. Defaults to `60000`.
- `AUTH_RATE_LIMIT_MAX`: optional. Defaults to `20` requests per window for register/login.
- `PASSWORD_RESET_RATE_LIMIT_MAX`: optional. Defaults to `5` requests per window.
- `WBF_VERIFICATION_RATE_LIMIT_MAX`: optional. Defaults to `30` requests per window.
- `MAX_REQUEST_BODY_BYTES`: optional. Defaults to `1000000` bytes.
- `LOG_LEVEL`: optional. Defaults to `info`. Supported values are `debug`, `info`, `warn`, and `error`.
- `REQUEST_LOGGING_ENABLED`: optional. Defaults to enabled. Set to `false` to disable structured request logs.

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
- `activity_events`

It also enables row-level security and adds ownership policies.

The archived-card cleanup migration also enables Supabase Cron (`pg_cron`). If your
project does not permit enabling it through SQL, enable the Cron module under
`Integrations -> Cron` in the Supabase dashboard, then run the migration again.

## 3. Auth Model

Users register with WBF number, email, and password.

Supabase Auth stores the email/password account. The app stores the WBF number in `players`, linked to the Supabase auth user id.

When a player logs in, they enter WBF number and password. The server looks up the stored email for that WBF number and signs in through Supabase Auth.

## 4. Direct Database Access

Backend services can use the Drizzle client with `DATABASE_URL`.

Frontend code should not use the direct database URL. Browser code should call backend API routes or use Supabase client APIs that are protected by row-level security.

## 5. CORS

CORS controls which browser origins can read backend responses from frontend JavaScript. It does not replace authentication.

For local development, leaving `CORS_ALLOWED_ORIGINS` unset allows any origin. For production, set it to the deployed frontend origin, for example:

```text
CORS_ALLOWED_ORIGINS=https://your-frontend.example.com
```

If you need both local and deployed frontends:

```text
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.example.com
```

## 6. Logging

The backend writes structured JSON logs to the server console. Request logs include the request id, method, path, status, duration, client IP when available, and authenticated player id when the route has one.

Clients may send `X-Request-Id`; otherwise the backend creates one and returns it in the same response header. This makes frontend error reports easier to match with backend logs.

## 7. Archived Card Cleanup

Archiving is a soft delete. `POST /cards/:cardId/archive` changes the card status to
`archived` and sets `archived_at`; no API route permanently deletes a card. The
cleanup migration also removes the old owner DELETE policy and revokes direct
DELETE permission from Supabase's `anon` and `authenticated` roles.

Use the backend diagnostics script to check database connectivity, the scheduled
cleanup job, recent cleanup runs, and the durable deletion log:

```sh
npm run backend:diagnostics
npm run backend:diagnostics -- --json
```

Supabase Cron runs `purge-archived-convention-cards-daily` every day at 03:15 UTC.
Each run permanently deletes at most 500 cards that have remained archived for
more than 60 days. The database re-checks the archived status while holding a row
lock immediately before deletion.

Preview eligible cards in the Supabase SQL editor:

```sql
SELECT id, owner_player_id, archived_at
FROM convention_cards
WHERE status = 'archived'
  AND archived_at < now() - interval '60 days'
ORDER BY archived_at;
```

Manually run one cleanup batch from the SQL editor:

```sql
SELECT * FROM app_private.purge_archived_convention_cards(500);
```

Monitor scheduled runs in `Integrations -> Cron -> Jobs -> History`, or query:

```sql
SELECT status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = (
  SELECT jobid
  FROM cron.job
  WHERE jobname = 'purge-archived-convention-cards-daily'
)
ORDER BY start_time DESC
LIMIT 20;
```

Permanent deletion records remain available to database administrators:

```sql
SELECT *
FROM app_private.convention_card_deletion_log
ORDER BY deleted_at DESC
LIMIT 100;
```

Deleting a card cascades to its `share_links` and card-linked `activity_events`.
Revisions derived from that card remain, but their `source_card_id` is set to null.
All effects and the durable deletion log insert occur in the same transaction.
