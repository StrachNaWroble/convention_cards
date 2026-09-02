# Validation

Convention card validation rules live here.

Validation should distinguish between saving progress and completing a card:

- draft autosave should allow incomplete cards;
- activation should require all WBF-required fields;
- sharing should require an active, partner-approved card;
- official export should require the same completeness rules as activation.

Keep validation rules close to a shared card schema so frontend and backend behavior can stay aligned.

## Current Implementation

The backend validation service enforces activation requirements:

- the card has a title;
- the card is linked to a partnership;
- the card data is an object;
- only recognized WBF top-level sections are used;
- each WBF section is a structured object;
- at least one WBF card field has meaningful content;
- nested card values remain JSON-compatible and reasonably bounded.

Draft autosave remains intentionally permissive so players can save incomplete work.
