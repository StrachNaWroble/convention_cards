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
- `activity`: authenticated player activity and card history.

Prefer resource-oriented endpoints over action-heavy names where it stays readable. For example, `POST /cards/:id/submit-for-approval` is acceptable when the operation changes lifecycle state.

## Implemented Endpoints

### Health

- `GET /health`

### Auth

- `POST /auth/register`: create a player account with WBF number, email, and password.
- `POST /auth/login`: sign in with WBF number and password.
- `POST /auth/refresh`: exchange a refresh token for a new Supabase session.
- `POST /auth/password-reset`: request a password reset email using WBF number.
- `PATCH /auth/password`: change password for the current bearer token after confirming the current password.
- `POST /auth/logout`: revoke the current bearer token.
- `GET /auth/me`: return the current player profile for the bearer token.

### WBF Verification

- `POST /wbf-verification/verify`: verify a WBF number through the backend adapter.

### Cards

All card routes require:

```text
Authorization: Bearer <access-token>
```

- `GET /cards`: list cards owned by the signed-in player.
- `GET /cards/reviews/pending`: list submitted cards waiting for the signed-in partner's review.
- `POST /cards`: create a blank draft.
- `POST /cards/from-template`: create a draft from a card template.
- `GET /cards/:cardId`: load one owned card.
- `PATCH /cards/:cardId`: autosave draft title and/or card data.
- `POST /cards/:cardId/revisions`: create an editable draft revision from a rejected card.
- `POST /cards/:cardId/submit-for-approval`: move a draft into partner approval.
- `POST /cards/:cardId/review/approve`: approve a submitted card as the invited partner.
- `POST /cards/:cardId/review/reject`: reject a submitted card as the invited partner.
- `POST /cards/:cardId/activate`: activate a partner-approved card after validation.
- `GET /cards/:cardId/export`: return a print/PDF-ready JSON export payload for an active owned card.
- `GET /cards/:cardId/history`: list recent activity events for an owned card.
- `POST /cards/:cardId/archive`: archive a card.
- `GET /cards/:cardId/share-links`: list share links for an owned card.
- `POST /cards/:cardId/share-links`: create a public read-only share link for an active card.

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

### Players

All player routes require:

```text
Authorization: Bearer <access-token>
```

- `GET /players/me`: load the signed-in player's profile.
- `PATCH /players/me`: update editable profile fields: display name and country/NBO.

### Templates

- `GET /templates`: list system card templates.
- `GET /templates/:slug`: load one template by slug.

### Sharing

- `POST /share-links/:shareLinkId/revoke`: revoke an owned share link.
- `GET /shared/cards/:token`: publicly load an active shared card by raw share token.

### Activity

All activity routes require:

```text
Authorization: Bearer <access-token>
```

- `GET /activity`: list recent activity events related to the signed-in player.
