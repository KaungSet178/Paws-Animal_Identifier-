# Phase 2C — Verified Observable Trait Expansion

## Goal

Expand the source-backed pilot while keeping all user questions simple enough to answer from a normal sighting or ordinary photo.

## Result

Phase 2C contains:

- 365 total mammal records
- 75 species with at least one populated observable trait
- 550 populated trait cells
- 550 provenance records
- 29 observable trait definitions
- no direct measurement questions

Phase 2C added 26 species beyond the 49-species Phase 2B checkpoint.

## Selection strategy

The expansion prioritizes visually distinctive mammals with descriptions that support obvious external or behavioral traits:

- primates with conspicuous coat/face/tail characteristics
- carnivores with clear body form, coat pattern, tail or aquatic adaptations
- deer-like mammals with obvious external characteristics
- gliding squirrels, hares and the moonrat
- distinctive whales and dolphins with visible fin, beak or color-pattern differences

Most bats, rats and highly cryptic small mammals remain deferred.

## Conservative encoding rules

1. Do not convert exact measurements into user questions.
2. Only map qualitative traits directly supported by a cited source.
3. Do not encode a sex-specific horn/antler trait as universal when absence in females could mislead identification.
4. Leave uncertain or highly variable coloration blank instead of forcing an enum.
5. Every populated cell must have exactly matching provenance.
6. The user-facing system must always allow `unknown` / Not sure.

## Source families used

This phase primarily uses:

- Animal Diversity Web species accounts
- NOAA Fisheries marine mammal species profiles
- peer-reviewed primate descriptions
- university/primate conservation fact sheets
- national biodiversity and museum collection profiles

The exact source URL for every populated value is recorded in `data/trait_provenance.csv`.
