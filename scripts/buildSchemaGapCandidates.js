const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const root = path.resolve(__dirname, '..');
const analysisDir = path.join(root, 'analysis');

const readiness = parse(fs.readFileSync(path.join(analysisDir, 'species_readiness.csv'), 'utf8'), {
  columns: true,
  skip_empty_lines: true
});
const pairs = parse(fs.readFileSync(path.join(analysisDir, 'high_similarity_pairs.csv'), 'utf8'), {
  columns: true,
  skip_empty_lines: true
});
const collisions = parse(fs.readFileSync(path.join(analysisDir, 'exact_profile_collisions.csv'), 'utf8'), {
  columns: true,
  skip_empty_lines: true
});
const traits = parse(fs.readFileSync(path.join(root, 'data', 'mammal_traits.csv'), 'utf8'), {
  columns: true,
  skip_empty_lines: true
});

const traitsByKey = new Map(traits.map(row => [row.species_key, row]));
const nonReady = new Set(readiness.filter(row => row.readiness !== 'species_ready').map(row => row.species_key));
const exactPairs = new Set();

function pairId(a, b) {
  return [a, b].sort().join('|');
}

for (const row of collisions) {
  const keys = row.species_keys.split('|').filter(Boolean);
  for (let i = 0; i < keys.length; i += 1) {
    for (let j = i + 1; j < keys.length; j += 1) exactPairs.add(pairId(keys[i], keys[j]));
  }
}

function proposedGap(aKey, bKey) {
  const a = traitsByKey.get(aKey) || {};
  const b = traitsByKey.get(bKey) || {};
  const forms = new Set([a.body_form, b.body_form].filter(Boolean));
  if (forms.has('squirrel_like')) {
    return {
      missing_discriminator: 'coarse rodent traits do not capture belly, side, cheek, or stripe-layout field marks',
      proposed_trait_name: 'squirrel_ventral_or_side_pattern',
      observable_by_normal_user: 'yes',
      useful_for_how_many_species: 8,
      recommended: true
    };
  }
  if (forms.has('gliding_mammal_like')) {
    return {
      missing_discriminator: 'coarse gliding-mammal traits do not capture mantle, membrane, face, or tail-color layout',
      proposed_trait_name: 'gliding_mammal_marking_pattern',
      observable_by_normal_user: 'yes',
      useful_for_how_many_species: 6,
      recommended: true
    };
  }
  if (forms.has('hoofed_like')) {
    return {
      missing_discriminator: 'coarse ungulate traits do not capture obvious face, throat, mane, or lower-leg marking layout',
      proposed_trait_name: 'ungulate_face_or_throat_marking',
      observable_by_normal_user: 'yes',
      useful_for_how_many_species: 6,
      recommended: true
    };
  }
  if (forms.has('whale_dolphin_like')) {
    return {
      missing_discriminator: 'coarse cetacean traits do not capture simple head profile, scarring, or rorqual body-profile distinctions',
      proposed_trait_name: 'cetacean_head_profile',
      observable_by_normal_user: 'limited',
      useful_for_how_many_species: 4,
      recommended: true
    };
  }
  if (forms.has('bat_like')) {
    return {
      missing_discriminator: 'current bat traits are too coarse for close false-vampire or leaf-nosed bat separation',
      proposed_trait_name: 'bat_ear_or_noseleaf_layout',
      observable_by_normal_user: 'limited',
      useful_for_how_many_species: 3,
      recommended: false
    };
  }
  return {
    missing_discriminator: 'remaining separation is not represented by current coarse observable traits',
    proposed_trait_name: 'group_specific_visible_marking',
    observable_by_normal_user: 'limited',
    useful_for_how_many_species: 2,
    recommended: false
  };
}

const candidatePairs = new Map();
for (const row of pairs) {
  if (Number(row.similarity) < 0.9) continue;
  if (!nonReady.has(row.species_a) && !nonReady.has(row.species_b)) continue;
  candidatePairs.set(pairId(row.species_a, row.species_b), row);
}
for (const id of exactPairs) {
  const [a, b] = id.split('|');
  if (!candidatePairs.has(id)) {
    candidatePairs.set(id, {
      species_a: a,
      species_b: b,
      similarity: 1,
      matching_traits: '',
      conflicting_traits: ''
    });
  }
}

const rows = [...candidatePairs.values()].map(row => {
  const gap = proposedGap(row.species_a, row.species_b);
  const exact = exactPairs.has(pairId(row.species_a, row.species_b));
  return {
    species_a: row.species_a,
    species_b: row.species_b,
    missing_discriminator: gap.missing_discriminator,
    proposed_trait_name: gap.proposed_trait_name,
    observable_by_normal_user: gap.observable_by_normal_user,
    useful_for_how_many_species: gap.useful_for_how_many_species,
    recommended: gap.recommended ? 'true' : 'false',
    notes: `${exact ? 'Exact current profile collision. ' : ''}Similarity ${row.similarity}; matching traits: ${row.matching_traits || 'see readiness candidates'}. Needs source-backed schema design before any trait values are added.`
  };
}).sort((a, b) =>
  String(b.recommended).localeCompare(String(a.recommended)) ||
  Number(b.useful_for_how_many_species) - Number(a.useful_for_how_many_species) ||
  a.species_a.localeCompare(b.species_a) ||
  a.species_b.localeCompare(b.species_b)
);

fs.writeFileSync(path.join(analysisDir, 'schema_gap_candidates.csv'), stringify(rows, { header: true }));

console.log('Schema gap candidate report');
console.log('---------------------------');
console.log(`Candidate pairs: ${rows.length}`);
console.log(`Recommended new trait families: ${new Set(rows.filter(row => row.recommended === 'true').map(row => row.proposed_trait_name)).size}`);
console.log('Wrote analysis/schema_gap_candidates.csv');
