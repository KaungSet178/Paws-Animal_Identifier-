# Dataset Design

## Canonical baseline

The project uses the 2024 *Mammals of Myanmar: an annotated checklist* as the canonical species baseline. Its 365-record scope is preserved even when newer taxonomic databases differ.

## Secondary taxonomy enrichment

ASM Mammal Diversity Database v2.5 is used only as a secondary enrichment source. It may provide current family, genus, common-name, or accepted-name metadata. It does not replace the canonical scientific names stored from the Myanmar checklist.

## Why taxonomy and identification traits are separate

Taxonomy answers which mammal records belong in the knowledge base. Identification traits answer how a user could distinguish candidates from observations. These are different evidence layers and must not be conflated.

## Missing values

Missing values are left blank rather than guessed. This is especially important before the trait-enrichment phase.

## Planned next layers

1. canonical taxonomy dataset;
2. observable mammal trait schema;
3. trait values with per-source provenance;
4. identifiability assessment (species/genus/family);
5. generated Prolog knowledge facts;
6. adaptive reasoning and explanation;
7. backend/frontend integration.
