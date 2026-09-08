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
const questionSchema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'question_schema.json'), 'utf8'));

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

function tieBreakQuestionScore(observations, trait) {
  const prologObservations = `[${observations.map(([attribute, value]) => `${attribute}-${value}`).join(',')}]`;
  const goal = [
    'use_module(prolog/rules/question_selection)',
    `question_selection:tie_break_focus(${prologObservations}, Candidates)`,
    `question_selection:tie_break_question_score(${prologObservations}, Candidates, ${trait}, Score)`,
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

function recoveryQuestionScore(observations, trait) {
  const prologObservations = `[${observations.map(([attribute, value]) => `${attribute}-${value}`).join(',')}]`;
  const goal = [
    'use_module(prolog/rules/question_selection)',
    `question_selection:recovery_candidate_focus(${prologObservations}, Candidates)`,
    `question_selection:recovery_question_score(${prologObservations}, Candidates, ${trait}, Score)`,
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

function simulateCleanPath(key, limit = 12) {
  const row = traitsByKey.get(key);
  assert(row, key);
  const observations = [];
  const path = [];
  let response = reason(observations);
  for (let step = 0; response.status === 'continue' && step < limit; step += 1) {
    const trait = response.nextQuestion.id;
    const value = row[trait] || 'unknown';
    path.push([trait, value]);
    observations.push([trait, value]);
    response = reason(observations);
  }
  return { observations, path, response };
}

function candidateScoreStats(key, observations) {
  const prologObservations = `[${observations.map(([attribute, value]) => `${attribute}-${value}`).join(',')}]`;
  const goal = [
    'use_module(prolog/rules/candidate_scoring)',
    `candidate_score(${key}, ${prologObservations}, Score, Matches, Conflicts, Known, evidence_label(Label))`,
    'format("~w|~w|~w|~w|~w", [Score, Matches, Conflicts, Known, Label])',
    'halt'
  ].join(', ');
  const result = spawnSync('swipl', ['-q', '-g', goal], {
    encoding: 'utf8',
    windowsHide: true
  });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  const [score, matches, conflicts, known, label] = result.stdout.trim().split('|');
  return {
    score: Number(score),
    matches: Number(matches),
    conflicts: Number(conflicts),
    known: Number(known),
    label
  };
}

function isUncertaintyAnswer(value) {
  const goal = [
    'use_module(prolog/rules/evidence)',
    `evidence:uncertainty_answer(${value})`,
    'halt'
  ].join(', ');
  const result = spawnSync('swipl', ['-q', '-g', goal], {
    encoding: 'utf8',
    windowsHide: true
  });
  return result.status === 0 && result.stderr.trim() === '';
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
  if (response && response.status === 'continue') response = reason(observations);

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

for (const value of ['unknown', 'not_clear', 'not_sure', 'tail_not_clear']) {
  assert.strictEqual(isUncertaintyAnswer(value), true, value);
}
assert.strictEqual(questionSchema.policy.unknown_answer, 'unknown');
assert(
  Object.values(questionSchema.questions).some(question => question.option_labels && question.option_labels.not_clear)
);
assert(questionSchema.questions.time_seen.option_labels.not_sure);
assert(questionSchema.questions.rodent_tail_relative_length.option_labels.tail_not_clear);

assert.strictEqual(questionScore([
  ['body_form', 'bat_like'],
  ['bat_nose_shape', 'not_clear'],
  ['bat_tail_visibility', 'unknown']
], 'snout_shape_simple'), null);
assert.strictEqual(questionScore([
  ['snout_shape_simple', 'not_clear']
], 'bat_nose_shape'), null);
assert.notStrictEqual(questionScore([
  ['body_form', 'bat_like'],
  ['bat_nose_shape', 'leaf_like']
], 'snout_shape_simple'), null);

const hipposiderosBase = candidateScoreStats('hipposideros_diadema', [
  ['body_form', 'bat_like']
]);
const hipposiderosUnclear = candidateScoreStats('hipposideros_diadema', [
  ['body_form', 'bat_like'],
  ['bat_nose_shape', 'not_clear']
]);
assert.deepStrictEqual(hipposiderosUnclear, hipposiderosBase);

const tigerOneWrongSecondary = reason([
  ['body_form', 'cat_like'],
  ['body_size_impression', 'deer_sized'],
  ['body_pattern', 'striped'],
  ['primary_color', 'reddish_or_orange'],
  ['body_covering', 'scales']
]);
assert(hasCandidate(tigerOneWrongSecondary, 'panthera_tigris'), JSON.stringify(tigerOneWrongSecondary, null, 2));
assert.strictEqual(topKey(tigerOneWrongSecondary), 'panthera_tigris', JSON.stringify(tigerOneWrongSecondary, null, 2));
assert(['strong', 'moderate', 'mixed'].includes(candidate(tigerOneWrongSecondary, 'panthera_tigris').evidence));

const elephantContradictsEarlyTiger = reason([
  ['body_pattern', 'striped'],
  ['primary_color', 'reddish_or_orange'],
  ['body_form', 'elephant_like'],
  ['snout_shape_simple', 'trunk_like'],
  ['body_size_impression', 'cow_or_larger'],
  ['body_covering', 'mostly_smooth_skin']
]);
assert.strictEqual(elephantContradictsEarlyTiger.status, 'complete', JSON.stringify(elephantContradictsEarlyTiger, null, 2));
assert.strictEqual(topKey(elephantContradictsEarlyTiger), 'elephas_maximus', JSON.stringify(elephantContradictsEarlyTiger, null, 2));

const pseudorcaTieBeforeColor = [
  ['body_form', 'whale_dolphin_like'],
  ['cetacean_dorsal_fin', 'curved_back'],
  ['cetacean_head_or_body_marking', 'unknown'],
  ['cetacean_beak', 'no_distinct_beak'],
  ['cetacean_color_pattern', 'light_belly']
];
assert.strictEqual(questionScore(pseudorcaTieBeforeColor, 'primary_color'), null);
assert.notStrictEqual(tieBreakQuestionScore(pseudorcaTieBeforeColor, 'primary_color'), null);
const pseudorcaTieBreakQuestion = reason(pseudorcaTieBeforeColor);
assert.strictEqual(pseudorcaTieBreakQuestion.status, 'continue', JSON.stringify(pseudorcaTieBreakQuestion, null, 2));
assert.strictEqual(pseudorcaTieBreakQuestion.nextQuestion.id, 'primary_color', JSON.stringify(pseudorcaTieBreakQuestion, null, 2));
const pseudorcaAfterTieBreak = reason([...pseudorcaTieBeforeColor, ['primary_color', 'black']]);
assert.strictEqual(topKey(pseudorcaAfterTieBreak), 'pseudorca_crassidens', JSON.stringify(pseudorcaAfterTieBreak, null, 2));
assert.strictEqual(pseudorcaAfterTieBreak.status, 'complete', JSON.stringify(pseudorcaAfterTieBreak, null, 2));
assert.strictEqual(pseudorcaAfterTieBreak.candidates.length, 3, JSON.stringify(pseudorcaAfterTieBreak, null, 2));

const pseudorcaCleanPath = simulateCleanPath('pseudorca_crassidens');
assert(
  pseudorcaCleanPath.path.some(([trait]) => trait === 'primary_color'),
  JSON.stringify(pseudorcaCleanPath, null, 2)
);
assert.strictEqual(topKey(pseudorcaCleanPath.response), 'pseudorca_crassidens', JSON.stringify(pseudorcaCleanPath, null, 2));
assert.strictEqual(pseudorcaCleanPath.response.status, 'complete', JSON.stringify(pseudorcaCleanPath, null, 2));

const baleenAfterGenericTieBreak = reason([...pseudorcaTieBeforeColor, ['primary_color', 'grey']]);
assert.notStrictEqual(topKey(baleenAfterGenericTieBreak), 'pseudorca_crassidens', JSON.stringify(baleenAfterGenericTieBreak, null, 2));
assert(hasCandidate(baleenAfterGenericTieBreak, 'balaenoptera_acutorostrata'), JSON.stringify(baleenAfterGenericTieBreak, null, 2));

assert.strictEqual(tieBreakQuestionScore([
  ['body_form', 'bat_like'],
  ['bat_nose_shape', 'not_clear']
], 'snout_shape_simple'), null);
assert.strictEqual(tieBreakQuestionScore([
  ['body_form', 'cat_like'],
  ['body_pattern', 'striped'],
  ['primary_color', 'reddish_or_orange']
], 'cetacean_dorsal_fin'), null);

const batWrongSecondaryFlow = reason([
  ['body_form', 'bat_like'],
  ['body_covering', 'fur_or_hair'],
  ['movement_seen', 'flying'],
  ['observation_place', 'cave'],
  ['bat_nose_shape', 'horseshoe_like']
]);
assert.strictEqual(batWrongSecondaryFlow.status, 'continue', JSON.stringify(batWrongSecondaryFlow, null, 2));
assert([
  'bat_tail_visibility',
  'bat_face_or_shoulder_layout',
  'ear_size_impression',
  'ear_shape_simple',
  'primary_color',
  'body_pattern'
].includes(batWrongSecondaryFlow.nextQuestion.id), JSON.stringify(batWrongSecondaryFlow, null, 2));
assert(![
  'horns_or_antlers',
  'horn_shape_simple',
  'ungulate_marking_layout',
  'ungulate_horn_or_antler_layout',
  'primate_face_marking',
  'primate_brow_pattern',
  'cetacean_dorsal_fin',
  'cetacean_beak',
  'cetacean_color_pattern',
  'cetacean_head_or_body_marking'
].includes(batWrongSecondaryFlow.nextQuestion.id), JSON.stringify(batWrongSecondaryFlow, null, 2));

const budgetFallback = reason([
  ['body_form', 'bat_like'],
  ['body_covering', 'fur_or_hair'],
  ['movement_seen', 'flying'],
  ['observation_place', 'cave'],
  ['bat_nose_shape', 'not_clear'],
  ['bat_tail_visibility', 'unknown'],
  ['bat_face_or_shoulder_layout', 'unknown'],
  ['primary_color', 'unknown'],
  ['body_pattern', 'unknown']
]);
assert.strictEqual(budgetFallback.status, 'ambiguous', JSON.stringify(budgetFallback, null, 2));
assert.strictEqual(budgetFallback.nextQuestion, null, JSON.stringify(budgetFallback, null, 2));
assert(budgetFallback.candidates.length > 0 && budgetFallback.candidates.length <= 3, JSON.stringify(budgetFallback, null, 2));

const lateNoisyLangur = reason([
  ['body_form', 'monkey_like'],
  ['primate_face_marking', 'eye_rings'],
  ['primate_brow_pattern', 'unknown'],
  ['tail_impression', 'very_long'],
  ['primary_color', 'black']
]);
assert.strictEqual(lateNoisyLangur.status, 'continue', JSON.stringify(lateNoisyLangur, null, 2));
assert.strictEqual(lateNoisyLangur.nextQuestion.id, 'movement_seen', JSON.stringify(lateNoisyLangur, null, 2));

const lateNoisyBatFinalSlot = reason([
  ['body_form', 'bat_like'],
  ['bat_nose_shape', 'unknown'],
  ['bat_tail_visibility', 'no_tail_visible'],
  ['bat_face_or_shoulder_layout', 'unknown'],
  ['body_pattern', 'plain'],
  ['primary_color', 'black'],
  ['ear_size_impression', 'unknown']
]);
assert.strictEqual(lateNoisyBatFinalSlot.status, 'continue', JSON.stringify(lateNoisyBatFinalSlot, null, 2));
assert.strictEqual(lateNoisyBatFinalSlot.nextQuestion.id, 'ear_shape_simple', JSON.stringify(lateNoisyBatFinalSlot, null, 2));
assert.notStrictEqual(recoveryQuestionScore([
  ['body_form', 'bat_like'],
  ['bat_nose_shape', 'unknown'],
  ['bat_tail_visibility', 'no_tail_visible'],
  ['bat_face_or_shoulder_layout', 'unknown'],
  ['body_pattern', 'plain'],
  ['primary_color', 'black'],
  ['ear_size_impression', 'unknown']
], 'ear_shape_simple'), null);
assert.strictEqual(recoveryQuestionScore([
  ['body_form', 'bat_like'],
  ['bat_nose_shape', 'unknown'],
  ['bat_tail_visibility', 'no_tail_visible'],
  ['bat_face_or_shoulder_layout', 'unknown'],
  ['body_pattern', 'plain'],
  ['primary_color', 'black'],
  ['ear_size_impression', 'unknown']
], 'snout_shape_simple'), null);
assert.strictEqual(recoveryQuestionScore([
  ['body_form', 'monkey_like'],
  ['primate_face_marking', 'eye_rings'],
  ['primate_brow_pattern', 'unknown'],
  ['tail_impression', 'very_long'],
  ['primary_color', 'black']
], 'cetacean_dorsal_fin'), null);

const missingVsKnownBefore = candidateScoreStats('lyroderma_lyra', [
  ['body_form', 'bat_like'],
  ['bat_nose_shape', 'unknown'],
  ['bat_tail_visibility', 'no_tail_visible'],
  ['bat_face_or_shoulder_layout', 'unknown'],
  ['body_pattern', 'plain'],
  ['primary_color', 'black'],
  ['ear_size_impression', 'unknown']
]);
const missingVsKnownAfter = candidateScoreStats('lyroderma_lyra', [
  ['body_form', 'bat_like'],
  ['bat_nose_shape', 'unknown'],
  ['bat_tail_visibility', 'no_tail_visible'],
  ['bat_face_or_shoulder_layout', 'unknown'],
  ['body_pattern', 'plain'],
  ['primary_color', 'black'],
  ['ear_size_impression', 'unknown'],
  ['ear_shape_simple', 'rounded']
]);
assert.deepStrictEqual(missingVsKnownAfter, missingVsKnownBefore);

const noBeyondBudget = reason([
  ['body_form', 'bat_like'],
  ['bat_nose_shape', 'unknown'],
  ['bat_tail_visibility', 'no_tail_visible'],
  ['bat_face_or_shoulder_layout', 'unknown'],
  ['body_pattern', 'plain'],
  ['primary_color', 'black'],
  ['ear_size_impression', 'unknown'],
  ['ear_shape_simple', 'unknown']
]);
assert.notStrictEqual(noBeyondBudget.status, 'continue', JSON.stringify(noBeyondBudget, null, 2));
assert.strictEqual(noBeyondBudget.nextQuestion, null, JSON.stringify(noBeyondBudget, null, 2));

const maxomysContradictoryPattern = reason([
  ['body_form', 'mouse_rat_like'],
  ['rodent_tail_type', 'mostly_bare_or_scaly'],
  ['movement_seen', 'walking_or_running'],
  ['ear_size_impression', 'unknown'],
  ['body_pattern', 'plain'],
  ['rodent_tail_relative_length', 'unknown']
]);
assert.strictEqual(maxomysContradictoryPattern.status, 'ambiguous', JSON.stringify(maxomysContradictoryPattern, null, 2));
assert.strictEqual(hasCandidate(maxomysContradictoryPattern, 'maxomys_surifer'), false, JSON.stringify(maxomysContradictoryPattern, null, 2));

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
  assert.strictEqual(gaurBuffaloFinal.status, 'complete', JSON.stringify(gaurBuffaloFinal, null, 2));
  assert.strictEqual(topKey(gaurBuffaloFinal), 'bos_gaurus', JSON.stringify(gaurBuffaloFinal, null, 2));
} else {
  assert.strictEqual(gaurBuffaloInitial.status, 'complete', JSON.stringify(gaurBuffaloInitial, null, 2));
  assert.strictEqual(topKey(gaurBuffaloInitial), 'bos_gaurus', JSON.stringify(gaurBuffaloInitial, null, 2));
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
  'cetacean_color_pattern',
  'cetacean_head_or_body_marking'
].includes(trait));
assert.strictEqual(questionScore([['body_form', 'whale_dolphin_like']], 'body_size_impression'), null);
assert.notStrictEqual(questionScore([['body_form', 'whale_dolphin_like']], 'cetacean_dorsal_fin'), null);
assert.strictEqual(tieBreakQuestionScore([
  ['body_form', 'whale_dolphin_like'],
  ['cetacean_dorsal_fin', 'curved_back'],
  ['cetacean_color_pattern', 'light_belly'],
  ['cetacean_beak', 'no_distinct_beak'],
  ['observation_place', 'sea_or_coast']
], 'body_size_impression'), null);
assert.strictEqual(recoveryQuestionScore([
  ['body_form', 'whale_dolphin_like'],
  ['cetacean_dorsal_fin', 'small'],
  ['cetacean_color_pattern', 'light_belly'],
  ['cetacean_beak', 'obvious_long_beak'],
  ['observation_place', 'sea_or_coast'],
  ['primary_color', 'brown']
], 'body_size_impression'), null);
assert.notStrictEqual(questionScore([['body_form', 'hoofed_like']], 'body_size_impression'), null);
assertNextQuestion([['body_form', 'cat_like']], trait => ![
  'bat_nose_shape',
  'bat_tail_visibility',
  'bat_face_or_shoulder_layout',
  'primate_face_marking',
  'primate_brow_pattern',
  'cetacean_dorsal_fin',
  'cetacean_beak',
  'cetacean_color_pattern',
  'cetacean_head_or_body_marking',
  'squirrel_ventral_or_side_pattern',
  'gliding_mammal_marking_pattern',
  'ungulate_marking_layout',
  'ungulate_horn_or_antler_layout',
  'rodent_tail_relative_length'
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
assert.strictEqual(questionScore([
  ['body_form', 'hoofed_like'],
  ['horns_or_antlers', 'none_visible']
], 'ungulate_horn_or_antler_layout'), null);
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
const cleanHighConfidenceComplete = reason([
  ['body_form', 'pangolin_like'],
  ['body_covering', 'scales'],
  ['movement_seen', 'climbing']
]);
assert.strictEqual(cleanHighConfidenceComplete.status, 'complete', JSON.stringify(cleanHighConfidenceComplete, null, 2));
assert.strictEqual(topKey(cleanHighConfidenceComplete), 'manis_javanica', JSON.stringify(cleanHighConfidenceComplete, null, 2));
assert.strictEqual(cleanHighConfidenceComplete.candidates.length, 1, JSON.stringify(cleanHighConfidenceComplete, null, 2));
assert.deepStrictEqual(
  Object.keys(cleanHighConfidenceComplete).sort(),
  ['candidates', 'nextQuestion', 'status'].sort()
);

const wrongHoolockComplete = reason([
  ['body_form', 'monkey_like'],
  ['primate_face_marking', 'mixed'],
  ['tail_impression', 'no_obvious_tail'],
  ['primate_brow_pattern', 'connected_or_nearly_connected']
]);
assert.strictEqual(wrongHoolockComplete.status, 'complete', JSON.stringify(wrongHoolockComplete, null, 2));
assert.strictEqual(topKey(wrongHoolockComplete), 'hoolock_hoolock', JSON.stringify(wrongHoolockComplete, null, 2));
assert.strictEqual(wrongHoolockComplete.candidates.length, 3, JSON.stringify(wrongHoolockComplete, null, 2));
assert(hasCandidate(wrongHoolockComplete, 'hoolock_leuconedys'), JSON.stringify(wrongHoolockComplete, null, 2));

const nearTieNoMajorConflict = reason([
  ['body_form', 'mouse_rat_like'],
  ['rodent_tail_type', 'mostly_bare_or_scaly'],
  ['movement_seen', 'walking_or_running'],
  ['ear_size_impression', 'medium'],
  ['body_pattern', 'patched'],
  ['rodent_tail_relative_length', 'unknown']
]);
assert.strictEqual(nearTieNoMajorConflict.status, 'complete', JSON.stringify(nearTieNoMajorConflict, null, 2));
assert.strictEqual(topKey(nearTieNoMajorConflict), 'mus_caroli', JSON.stringify(nearTieNoMajorConflict, null, 2));
assert.strictEqual(nearTieNoMajorConflict.candidates.length, 3, JSON.stringify(nearTieNoMajorConflict, null, 2));
assert.strictEqual(nearTieNoMajorConflict.candidates[0].conflicts, 0, JSON.stringify(nearTieNoMajorConflict, null, 2));
assert.strictEqual(nearTieNoMajorConflict.candidates[1].conflicts, 0, JSON.stringify(nearTieNoMajorConflict, null, 2));

const clearWinnerMinorConflict = reason([
  ['body_form', 'elephant_like'],
  ['body_size_impression', 'cow_or_larger'],
  ['snout_shape_simple', 'trunk_like'],
  ['primary_color', 'brown']
]);
assert.strictEqual(clearWinnerMinorConflict.status, 'complete', JSON.stringify(clearWinnerMinorConflict, null, 2));
assert.strictEqual(topKey(clearWinnerMinorConflict), 'elephas_maximus', JSON.stringify(clearWinnerMinorConflict, null, 2));
assert.strictEqual(clearWinnerMinorConflict.candidates.length, 3, JSON.stringify(clearWinnerMinorConflict, null, 2));
assert(clearWinnerMinorConflict.candidates[0].conflicts > 0, JSON.stringify(clearWinnerMinorConflict, null, 2));

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
assertRealisticAdaptivePath('petaurista_elegans', [
  ['body_form', 'gliding_mammal_like'],
  ['gliding_mammal_marking_pattern', 'unknown']
], {
  acceptableStatuses: ['complete', 'ambiguous']
});
assertRealisticAdaptivePath('bos_gaurus', [
  ['body_form', 'hoofed_like'],
  ['ungulate_horn_or_antler_layout', 'unknown']
], {
  acceptableStatuses: ['complete', 'ambiguous']
});
assertRealisticAdaptivePath('balaenoptera_edeni', [
  ['body_form', 'whale_dolphin_like'],
  ['cetacean_head_or_body_marking', 'unknown']
], {
  acceptableStatuses: ['complete', 'ambiguous']
});
assertRealisticAdaptivePath('hipposideros_diadema', [
  ['body_form', 'bat_like'],
  ['bat_face_or_shoulder_layout', 'unknown']
], {
  acceptableStatuses: ['complete', 'ambiguous']
});
assertRealisticAdaptivePath('rattus_norvegicus', [
  ['body_form', 'mouse_rat_like'],
  ['rodent_tail_relative_length', 'unknown']
], {
  acceptableStatuses: ['complete', 'ambiguous']
});
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
  'ursus_thibetanus',
  'balaenoptera_physalus',
  'balaenoptera_edeni',
  'balaenoptera_borealis',
  'balaenoptera_acutorostrata',
  'bos_gaurus',
  'bubalus_arnee',
  'hipposideros_diadema',
  'rattus_norvegicus'
].forEach(assertOracleCompletes);

console.log('PASS: Prolog reasoning integration tests');
