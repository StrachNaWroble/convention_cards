# Players

Player profile services live here.

Expected profile data includes WBF number, display name, country or NBO when available, and verification status. The WBF number is the primary login identifier, but WBF lookup details should stay inside the verification module.

## Current Implementation

Players can update editable profile fields through authenticated backend routes. WBF number, email, and verification status are not changed through the profile API.
