# Setup after extracting

From the project directory:

```powershell
npm install
npm run prepare:data
npm run validate:data
npm run report:coverage
```

Expected Phase 2C coverage after preparation:

- 365 mammal rows
- 29 observable trait columns
- 75 species with at least one populated observable trait
- 550 populated trait cells
- 550 provenance records

`prepare:data` must preserve existing nonblank trait values.

Do not edit a populated trait without also reviewing its matching row in `data/trait_provenance.csv`.

## Phase 3 readiness analysis

After validation, run:

```bash
npm run analyze:discrimination
```

Review `docs/phase3-readiness-analysis.md` and the CSV files in `analysis/` before adding more biological traits or writing Prolog rules.
