# Auth

Authentication services live here.

Players register with WBF number, email, and password. The email/password identity is handled by Supabase Auth, while the application login screen can still ask for WBF number and password.

The login flow is:

1. Normalize the submitted WBF number.
2. Find the player profile for that WBF number.
3. Use the profile email to sign in through Supabase Auth.
4. Return the Supabase session and linked player record.

Session refresh uses the Supabase refresh token through `POST /auth/refresh`.

Players can request a password reset with their WBF number through `POST /auth/password-reset`. The backend looks up the stored email and asks Supabase to send the reset email. Unknown WBF numbers still receive a successful response so the API does not reveal whether a player account exists.

Signed-in players can change their password through `PATCH /auth/password`. The backend first confirms the current password against Supabase, then updates the Supabase auth user.

Registration can be made strict with `REQUIRE_WBF_VERIFICATION=true`. In that mode, registration is blocked unless the WBF verification adapter confirms the submitted WBF number.
