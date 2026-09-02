const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const root = path.resolve(__dirname, '..');
const masterPath = path.join(root, 'data', 'myanmar_mammals_master.csv');
const schemaPath = path.join(root, 'data', 'trait_schema.json');
const traitsPath = path.join(root, 'data', 'mammal_traits.csv');

const master = parse(fs.readFileSync(masterPath, 'utf8'), { columns: true, skip_empty_lines: true });
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const traitIds = schema.traits.map((t) => t.id);
const columns = ['species_key', 'scientific_name', ...traitIds];

let existing = [];
if (fs.existsSync(traitsPath)) {
  existing = parse(fs.readFileSync(traitsPath, 'utf8'), { columns: true, skip_empty_lines: true });
}
const byKey = new Map(existing.map((r) => [r.species_key, r]));

const output = master.map((m) => {
  const old = byKey.get(m.species_key) || {};
  const row = { species_key: m.species_key, scientific_name: m.scientific_name };
  for (const id of traitIds) row[id] = old[id] ?? '';
  return row;
});

const removed = existing.filter((r) => !master.some((m) => m.species_key === r.species_key));
if (removed.length) {
  console.error(`ERROR: ${removed.length} existing trait rows no longer match the master dataset. Refusing to overwrite.`);
  process.exit(1);
}

fs.writeFileSync(traitsPath, stringify(output, { header: true, columns }));
console.log(`Trait matrix ready: ${output.length} species x ${traitIds.length} trait columns.`);
console.log('Existing nonblank trait values were preserved.');
