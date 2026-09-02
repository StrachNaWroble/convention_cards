# Store

Application state that must be shared across views lives here.

Use the store for currently loaded player/session data, open card editor state, autosave status, validation state, and pending partner approval indicators.

Long-term card persistence belongs in the backend. The store should help prevent lost work in the browser, then coordinate with card services for autosave.
