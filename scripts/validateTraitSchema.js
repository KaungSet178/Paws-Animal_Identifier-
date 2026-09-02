const fs = require('fs');
const path = require('path');
const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'data', 'trait_schema.json'), 'utf8'));
const errors = [];
const ids = new Set();
for (const trait of schema.traits || []) {
  if (!trait.id) errors.push('Trait missing id');
  if (ids.has(trait.id)) errors.push(`Duplicate trait id: ${trait.id}`);
  ids.add(trait.id);
  if (!trait.group) errors.push(`${trait.id}: missing group`);
  if (!trait.data_type) errors.push(`${trait.id}: missing data_type`);
  if (typeof trait.questionable !== 'boolean') errors.push(`${trait.id}: questionable must be boolean`);
  if (!trait.applicability) errors.push(`${trait.id}: missing applicability`);
  if (!Number.isFinite(trait.evidence_weight)) errors.push(`${trait.id}: evidence_weight must be numeric`);
  if (trait.questionable !== true) errors.push(`${trait.id}: Phase 2 simple schema should contain only user-observable traits`);
  if (!Array.isArray(trait.allowed_values) || trait.allowed_values.length === 0) errors.push(`${trait.id}: enum trait must define allowed_values`);
  else if (new Set(trait.allowed_values).size !== trait.allowed_values.length) errors.push(`${trait.id}: duplicate allowed_values`);
}
if (schema.principles?.no_measurement_questions !== true) errors.push('schema must explicitly forbid measurement questions');
console.log('Mammal Trait Schema Validation');
console.log('------------------------------');
console.log(`Trait definitions: ${ids.size}`);
console.log(`User-observable / askable traits: ${(schema.traits || []).filter(t => t.questionable).length}`);
console.log('Direct measurement traits in question schema: 0');
if (errors.length) {
  for (const e of errors) console.error(`ERROR: ${e}`);
  process.exit(1);
}
console.log('PASS: simplified observable trait schema is valid.');
