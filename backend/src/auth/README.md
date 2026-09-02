# Auth

Authentication services live here.

Players register with WBF number, email, and password. The email/password identity is handled by Supabase Auth, while the application login screen can still ask for WBF number and password.

The login flow is:

1. Normalize the submitted WBF number.
2. Find the player profile for that WBF number.
3. Use the profile email to sign in through Supabase Auth.
4. Return the Supabase session and linked player record.

Session refresh uses the Supabase refresh token through `POST /auth/refresh`.

Registration can be made strict with `REQUIRE_WBF_VERIFICATION=true`. In that mode, registration is blocked unless the WBF verification adapter confirms the submitted WBF number.
