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
const schema = JSON.parse(fs.readFileSync(path.join(root, 'data', 'trait_schema.json'), 'utf8'));

const traitIds = schema.traits.map(t => t.id);
const traitWeights = new Map(schema.traits.map(t => [t.id, Number(t.evidence_weight || 1)]));
const traitsByKey = new Map(traits.map(row => [row.species_key, row]));
const readinessByKey = new Map(readiness.map(row => [row.species_key, row]));
const exactCollisionKeys = new Set();
for (const row of collisions) {
  for (const key of row.species_keys.split('|').filter(Boolean)) exactCollisionKeys.add(key);
}

function known(value) {
  return String(value || '').trim() !== '';
}

function compatibleRows(row) {
  return row.remaining_candidates
    .split('|')
    .filter(Boolean)
    .map(key => traitsByKey.get(key))
    .filter(Boolean);
}

function topSimilarPartners(key) {
  return pairs
    .filter(row => row.species_a === key || row.species_b === key)
    .slice(0, 5)
    .map(row => row.species_a === key ? row.species_b : row.species_a);
}

function bestBlankDiscriminator(subject, candidates) {
  const options = [];
  for (const trait of traitIds) {
    if (known(subject[trait])) continue;
    const candidateValues = new Map();
    for (const candidate of candidates) {
      if (!known(candidate[trait])) continue;
      const value = candidate[trait].trim();
      candidateValues.set(value, (candidateValues.get(value) || 0) + 1);
    }
    if (candidateValues.size < 2) continue;
    const largestBucket = Math.max(...candidateValues.values());
    options.push({
      trait,
      valueCount: candidateValues.size,
      knownCandidateCount: [...candidateValues.values()].reduce((a, b) => a + b, 0),
      estimatedEliminations: candidates.length - largestBucket,
      values: [...candidateValues.keys()].join('|'),
      weight: traitWeights.get(trait) || 1
    });
  }
  options.sort((a, b) =>
    b.estimatedEliminations - a.estimatedEliminations ||
    b.weight - a.weight ||
    b.knownCandidateCount - a.knownCandidateCount ||
    a.trait.localeCompare(b.trait)
  );
  return options[0] || null;
}

function missingCandidateTraits(subject, candidates) {
  return traitIds
    .filter(trait => !known(subject[trait]) && candidates.some(candidate => known(candidate[trait])))
    .join('|');
}

function classify(row, candidateCount, best) {
  if (exactCollisionKeys.has(row.species_key)) return 'preserve_ambiguity';
  if (candidateCount <= 3 && best) return 'enrich_existing_trait';
  if (candidateCount <= 3) return 'needs_new_trait_type';
  if (candidateCount <= 5 && best) return 'research_trait';
  if (best) return 'research_trait';
  return 'manual_review';
}

function confidenceFor(action, row, best) {
  if (action === 'preserve_ambiguity') return 'medium';
  if (action === 'needs_new_trait_type') return 'medium';
  if (!best) return 'low';
  if (row.readiness === 'needs_one_or_two_discriminators' && best.estimatedEliminations >= 1) return 'medium';
  return 'low';
}

const nonReady = readiness.filter(row => row.readiness !== 'species_ready');
const report = nonReady.map(row => {
  const subject = traitsByKey.get(row.species_key);
  const candidates = compatibleRows(row);
  const best = subject ? bestBlankDiscriminator(subject, candidates) : null;
  const action = classify(row, candidates.length, best);
  const similarPartners = topSimilarPartners(row.species_key);
  const compatible = row.remaining_candidates || similarPartners.join('|');
  return {
    species_key: row.species_key,
    scientific_name: row.scientific_name,
    current_readiness: row.readiness,
    remaining_candidate_count: candidates.length,
    conflicting_or_compatible_species: compatible,
    missing_candidate_traits: subject ? missingCandidateTraits(subject, candidates) : '',
    proposed_discriminator_trait: best ? best.trait : '',
    proposed_value: best ? 'research_required' : '',
    why_it_discriminates: best
      ? `Existing candidate data show ${best.valueCount} values (${best.values}) among compatible candidates; if sourced for this species it could eliminate up to ${best.estimatedEliminations}.`
      : 'No blank existing trait currently has enough represented candidate variation; likely needs a new observable trait type or preserved ambiguity.',
    source_needed: best ? `Reliable species account for ${row.scientific_name} ${best.trait}` : 'Field-identification or taxonomic reference review',
    confidence: confidenceFor(action, row, best),
    action,
    notes: exactCollisionKeys.has(row.species_key)
      ? 'Exact current profile collision; do not force species-level certainty without a reliable observable discriminator.'
      : ''
  };
});

fs.writeFileSync(
  path.join(analysisDir, 'readiness_improvement_targets.csv'),
  stringify(report, { header: true })
);

const easyWins = report.filter(row => row.action === 'enrich_existing_trait').length;
const medium = report.filter(row => row.action === 'research_trait').length;
const ambiguities = report.filter(row => row.action === 'preserve_ambiguity').length;
const schemaLimits = report.filter(row => row.action === 'needs_new_trait_type').length;

console.log('Readiness improvement target report');
console.log('-----------------------------------');
console.log(`Total non-ready species: ${report.length}`);
console.log(`Easy wins: ${easyWins}`);
console.log(`Medium difficulty: ${medium}`);
console.log(`Likely genuine ambiguities: ${ambiguities}`);
console.log(`Likely schema limitations: ${schemaLimits}`);
console.log('Wrote analysis/readiness_improvement_targets.csv');
