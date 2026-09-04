# Myanmar Mammal ID — Frontend

React + Vite frontend for the Myanmar Mammal Expert System. It renders whatever
questions the backend returns and never hardcodes species, traits, or question
order — see [`../docs`](../docs) and the backend's `data/trait_schema.json` for
the source of truth.

## Setup

```sh
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` by default, matching the
backend's default `CORS_ORIGIN`. It talks to the backend via
`VITE_API_BASE_URL` (see `.env`, defaults to `http://localhost:3000`) and also
proxies `/api` in `vite.config.js` as a fallback.

Start the backend first:

```sh
cd ../backend
npm install
npm start
```

## Architecture

```
Frontend (this app)
  -> POST /api/identify   (adaptive questioning)
  -> GET  /api/species/:key  (photo/description/distribution enrichment)
  -> GET  /api/health
```

All identification logic (trait matching, scoring, stopping decisions) lives
in the Prolog engine behind the backend. The frontend only displays questions,
collects answers, and renders terminal results (`complete` / `ambiguous` /
`insufficient_evidence`).

## Key files

- `src/api.js` — thin fetch wrapper around the three backend endpoints.
- `src/pages/Identify.jsx` — the adaptive question/answer state machine.
- `src/components/SpeciesPanel.jsx` — fetches and renders `/api/species/:key`
  enrichment (image, description, distribution, attribution, sources), with a
  "Why this match?" panel showing the raw score/matches/conflicts instead of a
  fabricated confidence percentage.
