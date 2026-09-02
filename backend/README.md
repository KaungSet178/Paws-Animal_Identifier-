# Myanmar Mammal Expert System Backend

Express REST API for the existing SWI-Prolog mammal identification engine.

Prolog identifies the mammal. External APIs only enrich the final display with presentation data.

## Setup

```sh
npm install
npm start
```

Configuration lives in `.env`; see `.env.example`.

## Endpoints

`GET /api/health`

```json
{
  "status": "ok",
  "service": "myanmar-mammal-expert-system"
}
```

`POST /api/identify`

```json
{
  "observations": [
    { "attribute": "body_form", "value": "cat_like" },
    { "attribute": "body_pattern", "value": "striped" }
  ]
}
```

Use `{ "observations": [] }` or an empty JSON body for the initial question.

`GET /api/species/:key`

```json
{
  "key": "panthera_tigris",
  "commonName": "Tiger",
  "scientificName": "Panthera tigris",
  "image": {
    "url": "https://example.test/tiger.jpg",
    "source": "iNaturalist",
    "license": "cc-by",
    "attribution": "Photographer name"
  },
  "description": {
    "text": "Short encyclopedia summary.",
    "source": "Wikipedia"
  },
  "distribution": {
    "summary": "Structured GBIF taxonomy or occurrence context when available.",
    "source": "GBIF"
  },
  "external": {
    "iNaturalistTaxonId": 41967,
    "gbifTaxonKey": 5219416
  },
  "sources": [
    { "name": "iNaturalist", "url": "https://www.inaturalist.org/taxa/41967" },
    { "name": "Wikipedia", "url": "https://en.wikipedia.org/wiki/Tiger" },
    { "name": "GBIF", "url": "https://www.gbif.org/species/5219416" }
  ]
}
```

Fields such as `image`, `description`, and `distribution` may be `null` when providers do not return usable data.

## Species Enrichment

Local identity comes from `data/myanmar_mammals_master.csv`. The canonical checklist scientific name is authoritative and is not overwritten by external taxonomy.

Provider roles:
- iNaturalist: primary image, taxon id, photo license, attribution, and taxon URL.
- Wikipedia/Wikimedia: readable summary and backup image.
- GBIF: taxon key, structured taxonomy context, distribution/taxonomy summary when available, and media fallback.

Providers run in parallel. If one or all external providers fail, the endpoint still returns the local canonical species identity with unavailable fields set to `null` or `{}`.

Images must keep source, license, and attribution metadata when available. The API does not scrape raw HTML and does not accept arbitrary external URLs from users.

## Caching

Species enrichment uses an in-memory TTL cache keyed by species key. Configure it with `SPECIES_CACHE_TTL_MS`; the default is 6 hours. No database is used.

## Future Dataset Expansion

The canonical checklist contains 365 mammals. Only part of the checklist currently has enough observable trait data for active Prolog identification, and more species and traits will be added over time.

Backend validation derives trait definitions from `data/trait_schema.json`. Species lookup derives identity from `data/myanmar_mammals_master.csv`. Adding species or observable traits should normally require data/schema updates and regeneration, not backend source-code changes.

Recommended workflow after data updates:

```sh
npm run validate:data
npm run analyze:discrimination
npm run generate:prolog
npm run validate:prolog
npm run test:prolog
npm run backend:test
```
