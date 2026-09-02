# WBF Verification

WBF player lookup and verification integration lives here.

Use this module as a stable adapter around external WBF lookup behavior. The current direction is to verify player numbers against WBF People Finder or the WBF player database where possible, but the rest of the application should not depend on scraping details or page structure.

The service should return normalized verification results such as:

- WBF number found or not found;
- player name;
- country or NBO when available;
- source timestamp;
- verification confidence/status.
