# Phase 3A — Targeted Discriminator Enrichment

This phase improves the ambiguous clusters found in Phase 3 without broadly adding species. Biological data from Phase 2C is preserved; only source-backed, easy-to-observe discriminator traits are added.

## Usability rule

No exact measurement is asked. Size remains a rough familiar-animal comparison. Specialized questions are gated and always offer **Not sure**.

## Hoolock safeguard

A new `primate_brow_pattern` trait is included because adult male hoolock eyebrow spacing is genuinely diagnostic. It is **conditional**, not universal: ask it only when the animal appears to be a black adult hoolock and the white brows are clearly visible. Female/juvenile/unclear sightings must use `unknown`; the system should then fall back to a broader hoolock/gibbon result rather than force a species.

## Main targeted clusters

- Hoolock gibbons and lar gibbon
- Bengal slow loris vs gibbon-like profiles
- Sambar / hog deer / tufted deer / Eld’s deer / Fea’s muntjac
- Red fox / dhole / gray wolf
- Asian small-clawed vs Eurasian otter
- Malayan vs brush-tailed porcupine
- Tiger vs red panda color collision
- Killer whale vs humpback whale

All added nonblank cells have one matching provenance row in `data/trait_provenance.csv`.
