# AI Builder Archive Instructions

## Product Direction
- This project is a local-first archive for daily AI builder digest insights.
- Target users are non-technical AI product people: designers, PMs, content creators, and operators who want to stay current and build a long-term knowledge base.
- Keep the visual style minimal, editorial, and magazine-like. It should feel like a private research publication, not a technical dashboard.

## UI Workflow
- Always output a brief visual plan before UI edits.
- When changing visuals, touch only the necessary files and explain what changed and why.
- Keep layouts responsive: desktop uses the side archive rail; mobile uses a compact top selector.
- Before done, verify build, desktop/mobile layout, stars persistence, search/filter behavior, and source links.
- After visual or structural corrections, update `project-notes/notes.md` so the same class of mistake does not repeat.

## Architecture Rules
- Keep V0 local-first, but preserve the repository abstraction for future hosted storage.
- Do not couple UI components directly to JSON file paths.
- Use `ArchiveRepository` for archive reads.
- Use the normalized `DigestSnippet` model for all source types.
- Preserve deterministic snippet IDs: `date + sourceType + url hash`.
- Use `follow-builders` as the source of truth for AI digest content.
- Starred insights are browser-local in V0 and live under `ai-builder-archive.starred.v1`.

## Data Rules
- Archive files live under `public/archive`.
- `manifest.json` is the source for available days.
- `search-index.json` is the source for archive-wide search.
- Day files live under `public/archive/days/YYYY-MM-DD.json`.
- Do not include insights without original source URLs.
