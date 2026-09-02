# Myanmar Mammal Expert System

An explainable Prolog-based mammal identification project focused on the 365 mammal records in the 2024 Myanmar checklist.

## Current phase

**Phase 2C — Verified Observable Trait Expansion (v1.0)**

The project currently contains:

- 365-species canonical mammal master dataset
- Phase 1.5 Mammal Diversity Database taxonomy enrichment workflow
- 29 simple user-observable trait definitions
- 365-row trait matrix
- 75 species with at least one source-backed observable trait
- 550 populated trait cells
- 550 matching provenance records
- plain-English adaptive question definitions
- validation and coverage-report scripts

No frontend, backend, database or Prolog inference engine is implemented yet.

## Usability rule

The user is not asked for exact length, height, weight or other measurements. Questions are intended for a quick sighting or ordinary photo: body form, movement, body covering, main color, tail, ears, obvious markings, horns, quills, and similarly noticeable characteristics.

Every question supports **Not sure**. Specialized questions appear only when relevant.

## Accuracy policy

A biological trait value is allowed only when a corresponding provenance record exists. If a source does not clearly support an observable trait, the cell stays blank.

Sex- or age-variable features are deliberately omitted when encoding them as a fixed species trait could cause misleading negative evidence.

## Commands

```bash
npm install
npm run prepare:data
npm run validate:data
npm run report:coverage
```

`prepare:data` refreshes secondary mammal taxonomy enrichment while preserving existing nonblank trait values.

## Phase history

- **v0.8 / Phase 2A pilot:** 26 species, 169 source-backed trait cells.
- **v0.9 / Phase 2B:** 49 species, 346 source-backed trait cells.
- **v1.0 / Phase 2C:** 75 species, 550 source-backed trait cells.

Phase 2C adds 26 mammals with emphasis on visually distinctive primates, carnivores, deer-like mammals, small mammals, and marine mammals. Bats and visually difficult rats/shrews remain intentionally underrepresented until a defensible identification strategy is defined.

## Phase 3A — reasoning readiness

This version adds discrimination analysis without changing biological trait values.

Run:

```bash
npm run prepare:data
npm run validate:data
npm run report:coverage
npm run analyze:discrimination
```

See `docs/phase3-readiness-analysis.md` and the generated CSVs under `analysis/`.


## Phase 3A

Run `npm run analyze:discrimination` after validation. See `docs/phase3a-targeted-discriminators.md`.
