# Validation

Convention card validation rules live here.

Validation should distinguish between saving progress and completing a card:

- draft autosave should allow incomplete cards;
- activation should require all WBF-required fields;
- sharing should require an active, partner-approved card;
- official export should require the same completeness rules as activation.

Keep validation rules close to a shared card schema so frontend and backend behavior can stay aligned.
