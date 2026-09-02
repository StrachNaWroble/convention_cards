# Sharing

Card sharing services live here.

The app should support both public read-only links and partner-only access. Shared cards should expose player names and WBF numbers. Sharing should be blocked until the relevant card is active and partner-approved.

Share links should be revocable.

## Current Implementation

The sharing service creates revocable public links for active, partner-approved cards.

Only a hash of the share token is stored in the database. The raw token is returned once when the link is created, then public reads use `GET /shared/cards/:token`.
