# Phase 3 — Reasoning Readiness Analysis
This report evaluates the current 75-species observable-trait dataset before any Prolog reasoning engine is written. It does **not** add or modify biological trait values.
## Method
- Only the 75 species with at least one populated observable trait are analysed.
- Missing candidate data is treated conservatively: a blank trait never eliminates a candidate.
- A species is `species_ready` only when its currently known observations can reduce the 75-species pilot set to that species alone.
- The simulated question selector greedily chooses the known trait that removes the most current candidates, using evidence weight only as a tie-breaker.
- Results are readiness diagnostics, not biological confidence scores.
## Main results
- 75 enriched species analysed.
- **49 species-ready** under the conservative missing-data rule.
- **17 species need one or two additional discriminating traits.**
- **9 species remain in broad ambiguous groups** with the current data.
- **1 exact full-profile collision group** exists: the three Hoolock gibbon records currently have identical populated profiles.
- For species-ready cases, the greedy simulation needs a **median of 3 questions**, with a range of **2–4 questions**.
## Most useful current traits

| Trait | Known species | Coverage | Avg candidates eliminated |
|---|---:|---:|---:|
| `body_form` | 71 | 94.7% | 63.0 |
| `primary_color` | 75 | 100.0% | 61.4 |
| `observation_place` | 45 | 60.0% | 31.6 |
| `body_pattern` | 38 | 50.7% | 30.1 |
| `movement_seen` | 42 | 56.0% | 29.8 |
| `tail_impression` | 39 | 52.0% | 29.0 |
| `body_covering` | 73 | 97.3% | 22.5 |
| `tail_shape` | 24 | 32.0% | 16.8 |
| `leg_foot_appearance` | 20 | 26.7% | 15.1 |
| `snout_shape_simple` | 16 | 21.3% | 11.0 |

`body_form` and `primary_color` currently produce the largest broad splits. `observation_place`, `body_pattern`, `movement_seen`, and `tail_impression` are valuable follow-ups, but their coverage is still incomplete.
## Priority ambiguity groups

- **Nycticebus bengalensis** — 7 compatible candidates remain: nycticebus_bengalensis, hoolock_leuconedys, hoolock_hoolock, hoolock_tianxing, hylobates_lar, canis_lupus, melogale_personata.
- **Axis porcinus** — 5 compatible candidates remain: axis_porcinus, rusa_unicolor, elaphodus_cephalophus, bos_gaurus, bubalus_arnee.
- **Hoolock hoolock** — 5 compatible candidates remain: nycticebus_bengalensis, hoolock_leuconedys, hoolock_hoolock, hoolock_tianxing, hylobates_lar.
- **Hoolock leuconedys** — 5 compatible candidates remain: nycticebus_bengalensis, hoolock_leuconedys, hoolock_hoolock, hoolock_tianxing, hylobates_lar.
- **Hoolock tianxing** — 5 compatible candidates remain: nycticebus_bengalensis, hoolock_leuconedys, hoolock_hoolock, hoolock_tianxing, hylobates_lar.
- **Hylobates lar** — 5 compatible candidates remain: nycticebus_bengalensis, hoolock_leuconedys, hoolock_hoolock, hoolock_tianxing, hylobates_lar.
- **Rusa unicolor** — 5 compatible candidates remain: axis_porcinus, rusa_unicolor, elaphodus_cephalophus, bos_gaurus, bubalus_arnee.
- **Bos gaurus** — 4 compatible candidates remain: axis_porcinus, rusa_unicolor, bos_gaurus, bubalus_arnee.
- **Bubalus arnee** — 4 compatible candidates remain: axis_porcinus, rusa_unicolor, bos_gaurus, bubalus_arnee.
- **Ailurus fulgens** — 3 compatible candidates remain: panthera_tigris, vulpes_vulpes, ailurus_fulgens.
- **Elaphodus cephalophus** — 3 compatible candidates remain: axis_porcinus, rusa_unicolor, elaphodus_cephalophus.
- **Vulpes vulpes** — 3 compatible candidates remain: cuon_alpinus, vulpes_vulpes, ailurus_fulgens.
- **Aonyx cinereus** — 2 compatible candidates remain: aonyx_cinereus, lutra_lutra.
- **Atherurus macrourus** — 2 compatible candidates remain: atherurus_macrourus, hystrix_brachyura.
- **Canis lupus** — 2 compatible candidates remain: nycticebus_bengalensis, canis_lupus.
- **Cuon alpinus** — 2 compatible candidates remain: cuon_alpinus, vulpes_vulpes.
- **Hystrix brachyura** — 2 compatible candidates remain: atherurus_macrourus, hystrix_brachyura.
- **Lutra lutra** — 2 compatible candidates remain: aonyx_cinereus, lutra_lutra.
- **Macaca assamensis** — 2 compatible candidates remain: macaca_assamensis, macaca_mulatta.
- **Macaca mulatta** — 2 compatible candidates remain: macaca_assamensis, macaca_mulatta.
- **Megaptera novaeangliae** — 2 compatible candidates remain: megaptera_novaeangliae, orcinus_orca.
- **Melogale personata** — 2 compatible candidates remain: nycticebus_bengalensis, melogale_personata.
- **Muntiacus feae** — 2 compatible candidates remain: rucervus_eldii, muntiacus_feae.
- **Orcinus orca** — 2 compatible candidates remain: megaptera_novaeangliae, orcinus_orca.
- **Panthera tigris** — 2 compatible candidates remain: panthera_tigris, ailurus_fulgens.
- **Rucervus eldii** — 2 compatible candidates remain: rucervus_eldii, muntiacus_feae.

These groups should guide the next curation pass. We should add only simple, source-backed visible traits that genuinely distinguish members of these groups; if casual observation cannot reliably separate them, the eventual system should stop at genus/family or return multiple candidates.
## Recommended next work

1. **Do not write Prolog rules yet.** First close the highest-value ambiguity gaps.
2. Prioritize discriminator research for Hoolock/gibbon profiles, similar ungulates, macaques, otters, porcupines, and a few carnivore/cetacean pairs.
3. Prefer already-defined simple traits (`tail_impression`, `body_pattern`, `ear_shape_simple`, `snout_shape_simple`, group-specific markings) before adding new questions.
4. Add a new trait only if the existing 29 cannot express a clearly visible, source-backed distinction.
5. For visually cryptic groups, explicitly allow multi-candidate or genus/family-level results instead of fabricating species-level certainty.
6. Re-run `npm run analyze:discrimination` after every curation batch and compare readiness counts.
## Analysis artifacts

- `analysis/species_readiness.csv`
- `analysis/trait_discrimination_metrics.csv`
- `analysis/high_similarity_pairs.csv`
- `analysis/exact_profile_collisions.csv`
