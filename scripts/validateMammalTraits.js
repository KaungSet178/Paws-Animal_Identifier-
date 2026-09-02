const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const root = path.resolve(__dirname, '..');
const master = parse(fs.readFileSync(path.join(root, 'data', 'myanmar_mammals_master.csv'), 'utf8'), { columns: true, skip_empty_lines: true });
const traits = parse(fs.readFileSync(path.join(root, 'data', 'mammal_traits.csv'), 'utf8'), { columns: true, skip_empty_lines: true });
const provenance = parse(fs.readFileSync(path.join(root, 'data', 'trait_provenance.csv'), 'utf8'), { columns: true, skip_empty_lines: true });
const schema = JSON.parse(fs.readFileSync(path.join(root, 'data', 'trait_schema.json'), 'utf8'));

const errors = [];
const schemaById = new Map(schema.traits.map(t => [t.id, t]));
const masterByKey = new Map(master.map(r => [r.species_key, r]));
const traitKeys = new Set();

if (traits.length !== master.length) errors.push(`trait row count ${traits.length} != master ${master.length}`);
for (const row of traits) {
  if (traitKeys.has(row.species_key)) errors.push(`duplicate trait species_key: ${row.species_key}`);
  traitKeys.add(row.species_key);
  const m = masterByKey.get(row.species_key);
  if (!m) { errors.push(`trait species_key not in master: ${row.species_key}`); continue; }
  if (row.scientific_name !== m.scientific_name) errors.push(`${row.species_key}: scientific_name mismatch`);
  for (const [id, def] of schemaById) {
    const raw = (row[id] ?? '').trim();
    if (!raw) continue;
    if (def.data_type === 'number') {
      if (!Number.isFinite(Number(raw))) errors.push(`${row.species_key}/${id}: non-numeric value '${raw}'`);
    } else if (def.data_type === 'enum') {
      if (!def.allowed_values.includes(raw)) errors.push(`${row.species_key}/${id}: invalid value '${raw}'`);
    } else if (def.data_type === 'multi_enum') {
      for (const v of raw.split('|').map(s => s.trim()).filter(Boolean)) {
        if (!def.allowed_values.includes(v)) errors.push(`${row.species_key}/${id}: invalid multi value '${v}'`);
      }
    }
  }
}
for (const m of master) if (!traitKeys.has(m.species_key)) errors.push(`master species missing from trait matrix: ${m.species_key}`);

const provenanceKeys = new Set(provenance.map(p => `${p.species_key}::${p.trait_id}::${p.trait_value}`));
let populated = 0;
let sourced = 0;
for (const row of traits) {
  for (const [id, def] of schemaById) {
    const raw = (row[id] ?? '').trim();
    if (!raw) continue;
    populated++;
    const vals = def.data_type === 'multi_enum' ? raw.split('|').map(s => s.trim()).filter(Boolean) : [raw];
    const ok = vals.every(v => provenanceKeys.has(`${row.species_key}::${id}::${v}`));
    if (ok) sourced++;
    else errors.push(`${row.species_key}/${id}: nonblank value lacks matching provenance row`);
  }
}

for (const p of provenance) {
  if (!masterByKey.has(p.species_key)) errors.push(`provenance species not in master: ${p.species_key}`);
  const def = schemaById.get(p.trait_id);
  if (!def) errors.push(`provenance references unknown trait: ${p.trait_id}`);
  if (!p.source_name || !p.source_type) errors.push(`${p.species_key}/${p.trait_id}: provenance missing source_name/source_type`);
  if (!['high','medium','low'].includes(p.confidence)) errors.push(`${p.species_key}/${p.trait_id}: provenance confidence must be high/medium/low`);
}

console.log('Mammal Trait Matrix Validation');
console.log('------------------------------');
console.log(`Master species: ${master.length}`);
console.log(`Trait rows: ${traits.length}`);
console.log(`Trait columns: ${schema.traits.length}`);
console.log(`Populated trait cells: ${populated}`);
console.log(`Fully provenance-backed populated cells: ${sourced}`);
console.log(`Provenance records: ${provenance.length}`);
if (errors.length) {
  for (const e of errors.slice(0, 100)) console.error(`ERROR: ${e}`);
  if (errors.length > 100) console.error(`...and ${errors.length - 100} more errors`);
  process.exit(1);
}
console.log('PASS: trait matrix aligns with master dataset and every nonblank trait is provenance-backed.');
