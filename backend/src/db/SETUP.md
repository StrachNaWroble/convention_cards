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
