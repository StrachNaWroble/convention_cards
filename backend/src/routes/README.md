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

## Implemented Endpoints

### Health

- `GET /health`

### Auth

- `POST /auth/register`: create a player account with WBF number, email, and password.
- `POST /auth/login`: sign in with WBF number and password.
- `POST /auth/logout`: revoke the current bearer token.
- `GET /auth/me`: return the current player profile for the bearer token.

### Cards

All card routes require:

```text
Authorization: Bearer <access-token>
```

- `GET /cards`: list cards owned by the signed-in player.
- `POST /cards`: create a blank draft.
- `GET /cards/:cardId`: load one owned card.
- `PATCH /cards/:cardId`: autosave draft title and/or card data.
- `POST /cards/:cardId/submit-for-approval`: move a draft into partner approval.
- `POST /cards/:cardId/activate`: activate a submitted card after validation and partner approval.
- `POST /cards/:cardId/archive`: archive a card.

### Partnerships

All partnership routes require:

```text
Authorization: Bearer <access-token>
```

- `GET /partnerships`: list partnerships where the signed-in player is the owner or invited partner.
- `POST /partnerships`: create a pending partnership by partner WBF number.
- `POST /partnerships/:partnershipId/approve`: approve an invitation as the partner.
- `POST /partnerships/:partnershipId/decline`: decline an invitation as the partner.
- `POST /partnerships/:partnershipId/archive`: archive a partnership visible to the signed-in player.
