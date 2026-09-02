# Cards

Convention-card persistence services live here.

The first service supports blank draft creation, listing a player's cards, loading a single owned card, autosaving draft content, submitting a draft for partner approval, and archiving.

Card content is stored as `jsonb` so the WBF card schema can evolve while the editor and validation rules are still being built.
