# WBF Card Components

Components strictly related to the WBF card canvas live here.

This folder should recreate the physical two-page card layout from structured data. It should include the opening bid table, defensive and competitive bidding sections, leads and signals, system summary, special bids, forcing pass sequences, important notes, psychics, and optional custom conventions.

Suggested subfolders:

- `layout`: fixed grid and page layout primitives.
- `fields`: transparent editable fields and validation presentation.
- `pages`: page-one and page-two card renderers.
- `print`: print-specific styling and helpers.

The same renderer should support editing, read-only sharing, browser print, and PDF export.
