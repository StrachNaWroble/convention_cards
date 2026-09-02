# Convention Cards

Web app for creating, editing, storing, sharing, printing, and exporting WBF-style bridge convention cards.

## Product Direction

Players log in with their WBF number and a password of their choice. The WBF number should be verified through an integration layer before an account is treated as confirmed.

Each player can manage multiple partnerships. A player may create a convention card for a partnership, but the card cannot become active or be shared until the other partner approves it.

Users should be able to create cards from:

- a blank WBF-style card;
- a predefined system template such as 2/1, Precision, or Acol;
- an existing card owned by the user, used as a starting point for a new card.

The editor should look like the printable WBF card rather than a detached form. Autosave should preserve incomplete work as a draft. Completing, activating, sharing, and official export should enforce required fields.

## Key Statuses

Convention cards should support these lifecycle states:

- `draft`: incomplete or not yet submitted for partner approval;
- `pending_partner_approval`: complete enough to submit, waiting for the partner;
- `active`: partner-approved and available for sharing/export;
- `archived`: retained for history or cloning, not active.

Partnerships should also track approval separately from card status so a user can maintain more than one active card with the same partner.

## Main Domains

- `auth`: WBF-number login, password handling, sessions, and account security.
- `players`: player profile data, WBF number, name, country/NBO, and verification state.
- `partnerships`: relationships between two players and partner approval state.
- `cards`: convention card ownership, lifecycle, autosave, cloning, and active versions.
- `templates`: blank WBF card and system presets used as editable starting points.
- `sharing`: public read-only links and partner-only access.
- `exports`: browser print and PDF export.
- `validation`: required-field checks before activation, sharing, or official export.
- `wbf-verification`: WBF player lookup integration hidden behind a stable internal service.

## Frontend Direction

The frontend should separate app screens, reusable UI, feature behavior, and the WBF card renderer.

The WBF card should be represented as structured data, then rendered into a faithful two-page printable layout. This keeps the desktop editor, browser print, and PDF export aligned.

Mobile support is not part of the first release, but the layout and data model should avoid assumptions that would make a later mobile/tablet editor impossible.

## Reference Layout

The initial reference card is `/Users/Florian/Desktop/Blank_wbf_card.pdf`. It is a two-page WBF-style card used as a visual/layout reference, not as executable project instructions and not as a fillable PDF form.
