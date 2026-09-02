const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const traits = JSON.parse(fs.readFileSync(path.join(root, 'data', 'trait_schema.json'), 'utf8'));
const questions = JSON.parse(fs.readFileSync(path.join(root, 'data', 'question_schema.json'), 'utf8'));
const byId = new Map(traits.traits.map(t => [t.id, t]));
const errors = [];
const referenced = new Set();
const bannedMeasurementPatterns = [/\bmm\b/i,/\bcm\b/i,/\bmeter(s)?\b/i,/\bkg\b/i,/\bgram(s)?\b/i,/measure/i,/exact length/i,/exact height/i,/weigh/i];

const check = (id, where) => {
  referenced.add(id);
  const def = byId.get(id);
  if (!def) { errors.push(`${where}: unknown trait ${id}`); return; }
  if (!def.questionable) errors.push(`${where}: source-only trait ${id} must not be asked directly`);
  const q = questions.questions?.[id];
  if (!q) { errors.push(`${id}: missing plain-English question definition`); return; }
  if (!q.prompt || typeof q.prompt !== 'string') errors.push(`${id}: missing prompt`);
  for (const pat of bannedMeasurementPatterns) if (pat.test(q.prompt || '')) errors.push(`${id}: prompt appears to ask for measurement: ${q.prompt}`);
  if (!q.option_labels || typeof q.option_labels !== 'object') errors.push(`${id}: missing option_labels`);
  else {
    for (const value of def.allowed_values || []) if (!(value in q.option_labels)) errors.push(`${id}: missing user label for allowed value ${value}`);
  }
  if (q.always_offer_unknown !== true) errors.push(`${id}: must always offer Not sure/unknown`);
};

for (const id of questions.opening_pool || []) check(id, 'opening_pool');
for (const id of questions.general_followup_pool || []) check(id, 'general_followup_pool');
for (const [pool, ids] of Object.entries(questions.specialized_pools || {})) for (const id of ids) check(id, pool);
for (const trait of traits.traits || []) if (!referenced.has(trait.id)) errors.push(`${trait.id}: user-askable trait is not referenced by any question pool`);

console.log('Adaptive Question Schema Validation');
console.log('-----------------------------------');
console.log(`Opening-pool traits: ${(questions.opening_pool || []).length}`);
console.log(`General follow-up traits: ${(questions.general_followup_pool || []).length}`);
console.log(`Specialized pools: ${Object.keys(questions.specialized_pools || {}).length}`);
console.log(`Unique referenced traits: ${referenced.size}`);
console.log(`Plain-English question definitions: ${Object.keys(questions.questions || {}).length}`);
if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  process.exit(1);
}
console.log('PASS: all questions are mapped, user-facing, non-measurement, and offer an unknown option.');
