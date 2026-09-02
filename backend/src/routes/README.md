# API Routing

HTTP route definitions live here. Keep route handlers thin: parse requests, call the relevant domain service, and return a clear response.

Expected route groups:

- `auth`: login, logout, password setup/change, session refresh.
- `players`: current player profile and WBF verification status.
- `partnerships`: create partnerships, invite/approve partners, list partnerships.
- `cards`: create from blank/template/existing card, autosave drafts, submit for approval, activate, archive.
- `templates`: list available starting templates.
- `sharing`: create/revoke public links and partner-only links.
- `exports`: PDF export and print-ready card rendering support.

Prefer resource-oriented endpoints over action-heavy names where it stays readable. For example, `POST /cards/:id/submit-for-approval` is acceptable when the operation changes lifecycle state.
