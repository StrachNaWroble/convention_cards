# Exports

Print and PDF export services live here.

The export path should use the same structured card data and layout rules as the editor so the on-screen card, browser print output, and PDF output stay consistent.

Direct browser printing should be supported. PDF export can be implemented server-side or client-side, but should preserve the WBF-style two-page layout.

`GET /cards/:cardId/export` returns the first export contract: a backend-generated JSON payload for an owned active card. It includes owner WBF display data, structured card data, two-page WBF layout metadata, and a generation timestamp. PDF generation can build on this payload without changing card ownership or validation rules.
