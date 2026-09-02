const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { parse } = require('csv-parse/sync');

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');

function readCsv(name) {
  return parse(fs.readFileSync(path.join(dataDir, name), 'utf8'), {
    columns: true,
    skip_empty_lines: true
  });
}

function expectedCounts() {
  const master = readCsv('myanmar_mammals_master.csv');
  const traits = readCsv('mammal_traits.csv');
  const schema = JSON.parse(fs.readFileSync(path.join(dataDir, 'trait_schema.json'), 'utf8'));
  const traitIds = schema.traits
    .filter(trait => trait.questionable && trait.data_type === 'enum')
    .map(trait => trait.id);
  const masterByKey = new Map(master.map(row => [row.species_key, row]));

  let candidates = 0;
  let traitFacts = 0;
  for (const row of traits) {
    const masterRow = masterByKey.get(row.species_key);
    if (!masterRow) throw new Error(`Trait row missing from master dataset: ${row.species_key}`);
    const inactive = String(masterRow.identification_active || '').trim().toLowerCase() === 'false';
    const populated = traitIds.filter(id => String(row[id] || '').trim());
    if (!inactive && populated.length) candidates++;
    traitFacts += inactive ? 0 : populated.length;
  }

  return { candidates, traitFacts };
}

function actualCounts() {
  const goal = [
    'use_module(prolog/generated/mammal_traits)',
    'generated_candidate_count(C)',
    'generated_trait_fact_count(T)',
    'format("~w ~w~n", [C,T])',
    'halt'
  ].join(', ');
  const result = spawnSync('swipl', ['-q', '-g', goal], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true
  });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  const [candidates, traitFacts] = result.stdout.trim().split(/\s+/).map(Number);
  return { candidates, traitFacts };
}

const expected = expectedCounts();
const actual = actualCounts();

assert.deepStrictEqual(actual, expected, [
  'Generated Prolog counts do not match source CSV/schema counts.',
  `Expected candidates=${expected.candidates}, traitFacts=${expected.traitFacts}.`,
  `Actual candidates=${actual.candidates}, traitFacts=${actual.traitFacts}.`
].join('\n'));

console.log(`PASS: generated Prolog counts match source data (${actual.candidates} candidates, ${actual.traitFacts} trait facts).`);
