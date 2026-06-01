# AI Builder Archive

Local-first archive UI for daily Follow Builders digests.

## Run

```bash
npm install
npm run dev
```

## Capture A Digest

```bash
npm run capture
```

By default, capture archives yesterday's digest in America/Los_Angeles time. To capture a specific day:

```bash
npm run capture -- --date=2026-05-30
```

Archive data is stored under `public/archive`, with source reads kept behind the repository layer in `src/data/archiveRepository.ts`.
