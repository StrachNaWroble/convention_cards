# WBF Verification

WBF player lookup and verification integration lives here.

Use this module as a stable adapter around external WBF lookup behavior. The current direction is to verify player numbers against WBF People Finder or the WBF player database where possible, but the rest of the application should not depend on scraping details or page structure.

The service should return normalized verification results such as:

- WBF number found or not found;
- player name;
- country or NBO when available;
- source timestamp;
- verification confidence/status.

## Current Implementation

The adapter exposes a stable `verifyWbfNumber(wbfNumber)` service. It can call the public WBF People Finder/person page and parse the returned HTML into one of three states:

- `found`
- `not_found`
- `unavailable`

The lookup URL is configurable with `WBF_PEOPLE_FINDER_URL_TEMPLATE`, using `{wbfNumber}` as the placeholder. This keeps the rest of the app isolated if the WBF page structure or endpoint changes.
