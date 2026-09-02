# Validation

Convention card validation rules live here.

Validation should distinguish between saving progress and completing a card:

- draft autosave should allow incomplete cards;
- activation should require all WBF-required fields;
- sharing should require an active, partner-approved card;
- official export should require the same completeness rules as activation.

Keep validation rules close to a shared card schema so frontend and backend behavior can stay aligned.

## Current Implementation

The first backend validation service enforces structural activation requirements:

- the card has a title;
- the card is linked to a partnership;
- the card contains some structured card data.

Detailed WBF-required field validation should replace or extend this once the shared card schema is implemented.
