# Activity

Activity services store important backend actions as structured database events.

Events are stored in `activity_events` and can be read through:

- `GET /activity`: recent events related to the signed-in player.
- `GET /cards/:cardId/history`: recent events for an owned card.

Autosave is intentionally not recorded so card history remains readable. The first event set tracks registration, login, password actions, partnership lifecycle, card lifecycle, sharing, and export.
