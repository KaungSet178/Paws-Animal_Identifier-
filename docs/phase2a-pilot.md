# Phase 2A Pilot — Source-backed observable traits

This pilot populates a deliberately small set of visually distinctive Myanmar mammals before attempting broad 365-species coverage.

## Rules
- Only traits that a normal user can notice from a sighting or ordinary photograph are populated.
- No exact length, height, weight, tooth, skull, or specimen-handling questions are used.
- Each populated cell has a matching provenance record.
- Traits that vary strongly by sex or age (for example deer antlers or Asian-elephant tusks) are generally left blank rather than encoded as universal species traits.
- Ambiguous colors or forms are left blank or mapped only to coarse values explicitly supported by the source.

## Pilot species
26 species were selected across Proboscidea, Sirenia, Dermoptera, Primates, Rodentia, Pholidota, Carnivora, Perissodactyla and Artiodactyla. They were chosen because their observable features are relatively distinctive and well documented.

## Schema refinements
To keep questions simple, `body_form` gained four obvious options: `bear_like`, `pig_like`, `rhino_like`, and `tapir_like`. `horns_or_antlers` gained `single_horn`. These are user-facing visual descriptions, not taxonomic category selection.

## Next step
Review the pilot values and question behavior before scaling enrichment to additional species. Bats, cryptic rodents, shrews, and visually similar taxa should be handled later and may require genus/family-level results rather than forced species identification.
