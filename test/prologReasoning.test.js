const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { parse } = require('csv-parse/sync');
const { auditSpecies } = require('../scripts/auditPrologIdentification');

const traits = parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'mammal_traits.csv'), 'utf8'), {
  columns: true,
  skip_empty_lines: true
});
const traitsByKey = new Map(traits.map(row => [row.species_key, row]));

function reason(observations) {
  const prologObservations = `[${observations.map(([trait, value]) => `${trait}-${value}`).join(',')}]`;
  const goal = `use_module(prolog/rules/json_api), reason_json(${prologObservations}), halt.`;
  const result = spawnSync('swipl', ['-q', '-g', goal], {
    encoding: 'utf8',
    windowsHide: true
  });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  assert.strictEqual(result.stderr.trim(), '', result.stderr);
  return JSON.parse(result.stdout);
}

function hasCandidate(response, key) {
  return response.candidates.some(candidate => candidate.key === key);
}

function topKey(response) {
  return response.candidates[0] && response.candidates[0].key;
}

function assertAmongTop(key, observations, limit = 3) {
  const response = reason(observations);
  assert(
    response.candidates.slice(0, limit).some(candidate => candidate.key === key),
    JSON.stringify(response, null, 2)
  );
  const candidate = response.candidates.find(c => c.key === key);
  assert(candidate.score > 0, JSON.stringify(response, null, 2));
  assert.strictEqual(candidate.conflicts, 0, JSON.stringify(response, null, 2));
  return response;
}

function assertNoRepeatedQuestion(response, trait) {
  if (response.nextQuestion) assert.notStrictEqual(response.nextQuestion.id, trait);
}

function candidate(response, key) {
  return response.candidates.find(item => item.key === key);
}

function assertStrongNonConflictingPair(response, leftKey, rightKey) {
  const left = candidate(response, leftKey);
  const right = candidate(response, rightKey);
  assert(left, JSON.stringify(response, null, 2));
  assert(right, JSON.stringify(response, null, 2));
  assert.strictEqual(left.conflicts, 0, JSON.stringify(response, null, 2));
  assert.strictEqual(right.conflicts, 0, JSON.stringify(response, null, 2));
  assert(left.matches >= 2, JSON.stringify(response, null, 2));
  assert(right.matches >= 2, JSON.stringify(response, null, 2));
  assert.strictEqual(left.evidence, 'strong', JSON.stringify(response, null, 2));
  assert.strictEqual(right.evidence, 'strong', JSON.stringify(response, null, 2));
}

function assertOracleCompletes(key) {
  const result = auditSpecies(key);
  assert.strictEqual(result.analysis_readiness, 'species_ready', JSON.stringify(result, null, 2));
  assert.strictEqual(result.final_status, 'complete', JSON.stringify(result, null, 2));
  assert.strictEqual(result.target_rank, 1, JSON.stringify(result, null, 2));
  assert(Number(result.matches) >= 2, JSON.stringify(result, null, 2));
  assert.strictEqual(Number(result.conflicts), 0, JSON.stringify(result, null, 2));
  assert(result.known_answers >= 2, JSON.stringify(result, null, 2));
}

function assertNextQuestion(observations, predicate) {
  const response = reason(observations);
  assert.strictEqual(response.status, 'continue', JSON.stringify(response, null, 2));
  assert(response.nextQuestion, JSON.stringify(response, null, 2));
  assert(predicate(response.nextQuestion.id), JSON.stringify(response, null, 2));
  return response.nextQuestion.id;
}

function questionScore(observations, trait) {
  const prologObservations = `[${observations.map(([attribute, value]) => `${attribute}-${value}`).join(',')}]`;
  const goal = [
    'use_module(prolog/rules/question_selection)',
    `question_selection:candidate_focus(${prologObservations}, Candidates)`,
    `question_score(${prologObservations}, Candidates, ${trait}, Score)`,
    'write(Score)',
    'halt'
  ].join(', ');
  const result = spawnSync('swipl', ['-q', '-g', goal], {
    encoding: 'utf8',
    windowsHide: true
  });
  if (result.status !== 0) return null;
  return Number(result.stdout.trim());
}

function assertTopComplete(key, observations) {
  const response = reason(observations);
  assert.strictEqual(response.status, 'complete', JSON.stringify(response, null, 2));
  assert.strictEqual(topKey(response), key, JSON.stringify(response, null, 2));
  const top = response.candidates[0];
  assert.strictEqual(top.conflicts, 0, JSON.stringify(response, null, 2));
}

function assertRealisticAdaptivePath(key, initialObservations, options = {}) {
  const row = traitsByKey.get(key);
  assert(row, key);
  const observations = [...initialObservations];
  const seen = new Set(observations.map(([trait]) => trait));
  const unknownTraits = new Set(options.unknownTraits || []);
  let response = null;
  for (let step = 0; step < 8; step += 1) {
    response = reason(observations);
    if (response.status !== 'continue') break;
    const trait = response.nextQuestion.id;
    assert(!seen.has(trait), JSON.stringify({ observations, response }, null, 2));
    seen.add(trait);
    observations.push([trait, unknownTraits.has(trait) ? 'unknown' : row[trait] || 'unknown']);
  }

  const acceptableStatuses = options.acceptableStatuses || ['complete'];
  assert(acceptableStatuses.includes(response.status), JSON.stringify({ observations, response }, null, 2));
  assert(hasCandidate(response, key), JSON.stringify({ observations, response }, null, 2));
  assert.strictEqual(candidate(response, key).conflicts, 0, JSON.stringify({ observations, response }, null, 2));
  if (response.status === 'complete') assert.strictEqual(topKey(response), key, JSON.stringify({ observations, response }, null, 2));
  assert(observations.some(([, value]) => value === 'unknown'), JSON.stringify(observations, null, 2));
  return { observations, response };
}

const empty = reason([]);
assert.strictEqual(empty.status, 'continue');
assert(empty.nextQuestion);
assert(empty.nextQuestion.options.some(option => option.value === 'unknown'));

assertAmongTop('elephas_maximus', [
  ['body_form', 'elephant_like'],
  ['body_size_impression', 'cow_or_larger'],
  ['snout_shape_simple', 'trunk_like']
]);

assertAmongTop('panthera_tigris', [
  ['body_form', 'cat_like'],
  ['body_pattern', 'striped'],
  ['primary_color', 'reddish_or_orange']
]);

assertAmongTop('manis_javanica', [
  ['body_form', 'pangolin_like'],
  ['body_covering', 'scales'],
  ['tail_impression', 'long']
]);

assertAmongTop('megaptera_novaeangliae', [
  ['body_form', 'whale_dolphin_like'],
  ['body_size_impression', 'cow_or_larger'],
  ['cetacean_dorsal_fin', 'small'],
  ['primary_color', 'black'],
  ['body_pattern', 'patched'],
  ['cetacean_color_pattern', 'mixed']
]);

assertAmongTop('orcaella_brevirostris', [
  ['body_form', 'whale_dolphin_like'],
  ['cetacean_dorsal_fin', 'small'],
  ['cetacean_beak', 'no_distinct_beak'],
  ['observation_place', 'freshwater_or_wetland']
]);

assertAmongTop('macaca_assamensis', [
  ['body_form', 'monkey_like'],
  ['primary_color', 'brown'],
  ['primate_face_marking', 'cheek_whiskers']
]);

assertAmongTop('rucervus_eldii', [
  ['body_form', 'hoofed_like'],
  ['horns_or_antlers', 'branched_antlers'],
  ['horn_shape_simple', 'curved'],
  ['body_size_impression', 'deer_sized']
]);

assertAmongTop('ailurus_fulgens', [
  ['body_size_impression', 'rabbit_or_cat_sized'],
  ['observation_place', 'tree_or_bush'],
  ['primary_color', 'reddish_or_orange'],
  ['carnivore_face_marking', 'mixed'],
  ['carnivore_tail_marking', 'rings']
]);

const unknown = reason([['body_form', 'unknown']]);
assert.strictEqual(unknown.status, 'continue');
assertNoRepeatedQuestion(unknown, 'body_form');
assert(unknown.candidates.every(candidate => candidate.score === 0));

const tigerConflict = reason([
  ['body_form', 'cat_like'],
  ['body_pattern', 'striped'],
  ['body_covering', 'scales']
]);
assert(hasCandidate(tigerConflict, 'panthera_tigris'));
const tiger = tigerConflict.candidates.find(candidate => candidate.key === 'panthera_tigris');
assert(tiger.conflicts > 0);

const gaurBuffaloBaseObservations = [
  ['body_form', 'hoofed_like'],
  ['body_size_impression', 'cow_or_larger'],
  ['primary_color', 'dark_brown'],
  ['horns_or_antlers', 'horns'],
  ['leg_foot_appearance', 'hooves']
];
const gaurBuffaloInitial = reason(gaurBuffaloBaseObservations);
assert.notStrictEqual(gaurBuffaloInitial.status, 'complete', JSON.stringify(gaurBuffaloInitial, null, 2));
assert(hasCandidate(gaurBuffaloInitial, 'bos_gaurus'));
assert(hasCandidate(gaurBuffaloInitial, 'bubalus_arnee'));
assertNoRepeatedQuestion(gaurBuffaloInitial, 'body_form');
if (gaurBuffaloInitial.status === 'continue') {
  assert(gaurBuffaloInitial.nextQuestion, JSON.stringify(gaurBuffaloInitial, null, 2));
  const gaurRow = traitsByKey.get('bos_gaurus');
  const adaptiveTrait = gaurBuffaloInitial.nextQuestion.id;
  const adaptiveValue = gaurRow[adaptiveTrait] || 'unknown';
  const gaurBuffaloFinal = reason([...gaurBuffaloBaseObservations, [adaptiveTrait, adaptiveValue]]);
  assert.strictEqual(gaurBuffaloFinal.status, 'ambiguous', JSON.stringify(gaurBuffaloFinal, null, 2));
  assert.strictEqual(gaurBuffaloFinal.nextQuestion, null);
  assertStrongNonConflictingPair(gaurBuffaloFinal, 'bos_gaurus', 'bubalus_arnee');
} else {
  assert.strictEqual(gaurBuffaloInitial.status, 'ambiguous', JSON.stringify(gaurBuffaloInitial, null, 2));
  assert.strictEqual(gaurBuffaloInitial.nextQuestion, null);
  assertStrongNonConflictingPair(gaurBuffaloInitial, 'bos_gaurus', 'bubalus_arnee');
}

const deterministicA = reason([
  ['body_form', 'monkey_like'],
  ['primary_color', 'brown']
]);
const deterministicB = reason([
  ['body_form', 'monkey_like'],
  ['primary_color', 'brown']
]);
assert.deepStrictEqual(deterministicA.candidates.map(c => c.key), deterministicB.candidates.map(c => c.key));

const progressive1 = reason([['body_form', 'cat_like']]);
assert.strictEqual(progressive1.status, 'continue');
assert(progressive1.nextQuestion);
const progressive2 = reason([
  ['body_form', 'cat_like'],
  [progressive1.nextQuestion.id, progressive1.nextQuestion.options[0].value]
]);
assert.doesNotThrow(() => JSON.stringify(progressive2));

const elephantComplete = reason([
  ['body_form', 'elephant_like'],
  ['body_size_impression', 'cow_or_larger'],
  ['snout_shape_simple', 'trunk_like'],
  ['primary_color', 'grey']
]);
assert.strictEqual(elephantComplete.status, 'complete', JSON.stringify(elephantComplete, null, 2));

const missingNeutral = reason([
  ['body_form', 'elephant_like'],
  ['primate_brow_pattern', 'connected_or_nearly_connected']
]);
const missingCandidate = missingNeutral.candidates.find(candidate => candidate.key === 'elephas_maximus');
assert(missingCandidate);
assert.strictEqual(missingCandidate.score, 4);
assert.strictEqual(missingCandidate.conflicts, 0);

assertNextQuestion([['movement_seen', 'swimming']], trait => trait !== 'observation_place');
assertNextQuestion([['body_form', 'whale_dolphin_like']], trait => [
  'cetacean_dorsal_fin',
  'cetacean_beak',
  'cetacean_color_pattern'
].includes(trait));
assertNextQuestion([['body_form', 'cat_like']], trait => ![
  'bat_nose_shape',
  'bat_tail_visibility',
  'primate_face_marking',
  'primate_brow_pattern',
  'cetacean_dorsal_fin',
  'cetacean_beak',
  'cetacean_color_pattern'
].includes(trait));
assertNextQuestion([['gliding_membrane_visible', 'yes']], trait => ![
  'cetacean_dorsal_fin',
  'cetacean_beak',
  'cetacean_color_pattern'
].includes(trait));
assertNextQuestion([
  ['body_form', 'hoofed_like'],
  ['horns_or_antlers', 'none_visible']
], trait => trait !== 'horn_shape_simple');
assert.strictEqual(questionScore([
  ['body_form', 'hoofed_like'],
  ['horns_or_antlers', 'none_visible']
], 'horn_shape_simple'), null);
assert.notStrictEqual(questionScore([
  ['body_form', 'unknown'],
  ['body_covering', 'mostly_smooth_skin'],
  ['movement_seen', 'swimming']
], 'cetacean_dorsal_fin'), null);

assertTopComplete('manis_javanica', [
  ['body_form', 'pangolin_like'],
  ['body_covering', 'scales'],
  ['movement_seen', 'climbing']
]);

const kogiaOrcaellaSharedEvidence = reason([
  ['body_form', 'whale_dolphin_like'],
  ['body_covering', 'mostly_smooth_skin'],
  ['cetacean_dorsal_fin', 'small'],
  ['cetacean_color_pattern', 'light_belly'],
  ['observation_place', 'unknown'],
  ['cetacean_beak', 'unknown']
]);
assert.strictEqual(kogiaOrcaellaSharedEvidence.status, 'ambiguous', JSON.stringify(kogiaOrcaellaSharedEvidence, null, 2));
assert.strictEqual(kogiaOrcaellaSharedEvidence.nextQuestion, null);
assertStrongNonConflictingPair(kogiaOrcaellaSharedEvidence, 'kogia_sima', 'orcaella_brevirostris');

assertTopComplete('orcaella_brevirostris', [
  ['body_form', 'whale_dolphin_like'],
  ['cetacean_dorsal_fin', 'small'],
  ['cetacean_color_pattern', 'light_belly'],
  ['cetacean_beak', 'no_distinct_beak'],
  ['body_covering', 'mostly_smooth_skin'],
  ['observation_place', 'freshwater_or_wetland']
]);
assertTopComplete('ursus_thibetanus', [
  ['body_form', 'bear_like'],
  ['snout_shape_simple', 'long_narrow'],
  ['body_pattern', 'unknown'],
  ['primary_color', 'black']
]);

assertRealisticAdaptivePath('moschus_fuscus', [['body_size_impression', 'unknown']]);
assertRealisticAdaptivePath('urva_javanica', [['movement_seen', 'unknown']]);
const mustelaUnknownPlace = assertRealisticAdaptivePath('mustela_strigidorsa', [], {
  acceptableStatuses: ['ambiguous'],
  unknownTraits: ['observation_place']
});
assert.strictEqual(mustelaUnknownPlace.observations.some(([trait, value]) =>
  trait === 'observation_place' && value === 'unknown'
), true, JSON.stringify(mustelaUnknownPlace, null, 2));
assert(hasCandidate(mustelaUnknownPlace.response, 'lutra_lutra'), JSON.stringify(mustelaUnknownPlace, null, 2));
assert.strictEqual(candidate(mustelaUnknownPlace.response, 'lutra_lutra').conflicts, 0, JSON.stringify(mustelaUnknownPlace, null, 2));
assert.strictEqual(topKey(mustelaUnknownPlace.response), 'mustela_strigidorsa', JSON.stringify(mustelaUnknownPlace, null, 2));

[
  'panthera_tigris',
  'elephas_maximus',
  'manis_javanica',
  'moschus_fuscus',
  'urva_javanica',
  'mustela_strigidorsa',
  'orcaella_brevirostris',
  'ursus_thibetanus'
].forEach(assertOracleCompletes);

console.log('PASS: Prolog reasoning integration tests');
