# Data Sources

## Canonical Myanmar mammal checklist

Thu, Aye Myat; Lwin, Ye Htet; Quan, Rui-Chang (2024), *Mammals of Myanmar: an annotated checklist*, Mammalia 88(3):147-197. DOI: 10.1515/mammalia-2023-0098.

The project baseline uses the species treatments extracted from the associated Plazi/GBIF dataset. The publication reports 365 mammal species, including 332 terrestrial and 33 marine species, across 13 orders and 49 families.

The canonical scientific-name fields are not overwritten by secondary sources.

## Phase 1.5 enrichment

ASM Mammal Diversity Database v2.5 is used as a secondary taxonomy enrichment source. The enrichment script downloads the MDD CSV at runtime, normalizes scientific names, performs exact matches first, and uses controlled fallbacks where needed.

Four documented accepted-name aliases are used only for MDD lookup while preserving the canonical 2024 names:

- `Maxomys surifer` -> `Crunomys surifer`
- `Maxomys whiteheadi` -> `Crunomys whiteheadi`
- `Aonyx cinereus` -> `Lutra cinerea`
- `Lutrogale perspicillata` -> `Lutra perspicillata`

`Biswamoyopterus undetermined` remains a manual-review record.

## Accuracy rule

No visual traits are inferred from taxonomy or species names. Missing trait information remains missing until sourced during the trait-enrichment phase.
