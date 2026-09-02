# Mammal Diversity Database taxonomy enrichment

Secondary enrichment source only:

- ASM Mammal Diversity Database (MDD) v2.5
- Release date: 2026-07-28
- Zenodo record: https://zenodo.org/records/21654811
- File: `MDD_v2.5_6904species.csv`

The project's canonical mammal list remains the 2024 *Mammals of Myanmar: an annotated checklist* dataset. MDD does not replace canonical scientific names.

## v0.3 matching fix

The enrichment script now:

- normalizes underscores in MDD names (`Genus_species` → `Genus species`);
- accepts common MDD column-name variants;
- reconstructs a binomial from `genus` + `specificEpithet` when no direct scientific-name column is found;
- fills genus/species epithet from the canonical name when safe;
- uses exact scientific-name matches first;
- uses unique genus→family mapping only as a fallback;
- marks unresolved records for manual review;
- refuses to declare success if exact matches remain zero.

Mismatches caused by taxonomy changes are preserved and reported rather than overwritten.
