# Project Notes

## V0 Direction
- Build as a standalone local-first app so it can grow without inheriting portfolio or art-canvas assumptions.
- Use a repository abstraction from the start; JSON files are the V0 adapter, not the UI contract.
- Keep the interface editorial and readable: generous spacing, thin rules, source metadata, and concise insight cards.
- Search and tags are the first scalability priority, so every insight should include normalized tags and entities.

## Visual Corrections
- Use human-readable issue dates in large headings with the issue type, such as "May 28, 2026 Digest"; raw ISO dates become awkward at magazine scale and wrap badly on mobile.
- Keep the main issue heading on one line; adjust measure and type scale instead of allowing "Digest" to wrap.
- Mobile top controls need `min-width: 0` on long select labels so secondary actions like Starred remain visible.
- Mobile segmented filters should become a two-column grid instead of a single crowded row when labels cannot all fit comfortably.
- For mobile archive controls, prefer stacked rows over squeezing date selection and Starred into one line; native select sizing is inconsistent across browsers.
- Keep the desktop issue header and controls sticky above the card stack so date, search, and filters stay available while reading long archive issues.
- Avoid redundant top masthead labels above the issue header; the sticky date/search/filter panel should carry page context by itself.
- The reading pane should not add top padding above the sticky issue header; the sticky header owns its own top spacing so it remains visually on top.
- When the reading pane uses CSS grid, set `align-content: start`; otherwise auto rows can stretch and push the sticky header content down.
- Put global archive search in the navigation surface, not the issue header. A non-empty search query should search across `search-index.json`, not just the selected day.
- Do not show the ISO date as an eyebrow above the large human-readable date heading; it repeats the same information and clutters the header.
- Keep source filters directly above the insight/empty-state area, not inside the sticky issue header.
- In insight cards, show source identity in the metadata row only; only show a body kicker when the author or builder name adds distinct context.
- Hide body kickers on X cards; the `X post` pill and headline should carry that context without repeating the builder name.
- Do not repeat platform names in card metadata when the source-type pill already names the platform, such as `X post`.
- Show card publish date/time as subtle source metadata in the top row, not as body content.
- Source links should navigate in the current browser surface; avoid `target="_blank"` because embedded preview browsers may suppress the new tab.
- Put each card's source link as a compact icon button in the top action row, immediately left of the star button; keep the footer focused on tags.
- Insight cards should use an editorial measure and left-align inside the wider reading stack; do not stretch cards to fill the full pane when the content is narrower.
- Insight cards should become a responsive multi-column grid on wide desktop panes while preserving each card's editorial measure.
- In a card grid, pin each card's internal layout to the top so titles start at a consistent vertical position across a row.
- Cards in the same grid row should share container height; stretch the card shell, not the internal content alignment.
- Desktop card titles should be a stable 40px; keep a smaller responsive override for mobile to avoid overflow.
- Keep the source filter visually secondary: compact, low-contrast, and aligned to the card column rather than stretched across the whole reading pane.
- Source filter options should include compact count chips based on the current day/view/search result set before source filtering is applied.
- Use "insight" for user-facing card/count copy. Keep `DigestSnippet` only as the internal normalized data model name.
- Desktop archive navigation should be collapsible when the reading column needs more room; collapse the rail itself rather than hiding archive controls inside the issue header.
