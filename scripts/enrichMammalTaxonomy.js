const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'data', 'myanmar_mammals_master.csv');
const CACHE = path.join(ROOT, 'data', 'sources', 'MDD_v2.5_6904species.csv');
const MDD_URL = 'https://zenodo.org/records/21654811/files/MDD_v2.5_6904species.csv?download=1';

// Canonical 2024 Myanmar checklist names that have changed in current MDD taxonomy.
// The canonical names are preserved; these aliases are used only to locate the current MDD record.
const MDD_ACCEPTED_NAME_ALIASES = new Map([
  ['maxomys surifer', 'Crunomys surifer'],
  ['maxomys whiteheadi', 'Crunomys whiteheadi'],
  ['aonyx cinereus', 'Lutra cinerea'],
  ['lutrogale perspicillata', 'Lutra perspicillata'],
]);

function cleanText(s='') { return String(s ?? '').replace(/^\uFEFF/, '').trim(); }
function normalizeScientificName(s='') {
  let x = cleanText(s)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[×]/g, 'x')
    .trim();
  // MDD's accepted species field should be binomial/trinomial without authorship,
  // but keep only the first 2–3 taxonomic tokens if an authorship leaked into a source field.
  const parts = x.split(' ').filter(Boolean);
  if (parts.length >= 2 && /^[A-Z][A-Za-z.-]+$/.test(parts[0]) && /^[a-z][A-Za-z.-]+$/.test(parts[1])) {
    if (parts[2] && /^[a-z][A-Za-z.-]+$/.test(parts[2])) return [parts[0], parts[1], parts[2]].join(' ');
    return [parts[0], parts[1]].join(' ');
  }
  return x;
}
function keyName(s='') { return normalizeScientificName(s).toLocaleLowerCase('en-US'); }
function pick(row, candidates) {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const k = keys.find(x => x.toLowerCase().replace(/[^a-z0-9]/g,'') === c.toLowerCase().replace(/[^a-z0-9]/g,''));
    if (k && cleanText(row[k])) return cleanText(row[k]);
  }
  return '';
}
function inferMddName(row) {
  const direct = pick(row, ['sciName','scientificName','scientific_name','binomial','speciesName','species_name']);
  if (direct) return normalizeScientificName(direct);
  const genus = pick(row, ['genus']);
  const epithet = pick(row, ['specificEpithet','specific_epithet','speciesEpithet','species_epithet']);
  if (genus && epithet) return normalizeScientificName(`${genus} ${epithet}`);
  return '';
}
function boolString(v) { return String(v).toLowerCase() === 'false' ? 'false' : 'true'; }
async function loadMddCsv() {
  if (fs.existsSync(CACHE) && fs.statSync(CACHE).size > 100000) {
    console.log(`Using cached MDD source: ${path.relative(ROOT, CACHE)}`);
    return fs.readFileSync(CACHE, 'utf8');
  }
  console.log('Downloading ASM Mammal Diversity Database v2.5 taxonomy enrichment source...');
  const res = await fetch(MDD_URL, { headers: { 'user-agent': 'Mozilla/5.0 Myanmar-Wildlife-Expert-System/0.3' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`MDD download failed: HTTP ${res.status}`);
  const text = await res.text();
  if (text.length < 100000) throw new Error(`MDD download unexpectedly small (${text.length} bytes)`);
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, text, 'utf8');
  return text;
}

async function main() {
  if (!fs.existsSync(FILE)) throw new Error(`Missing ${FILE}`);
  const master = parse(fs.readFileSync(FILE, 'utf8'), { columns: true, skip_empty_lines: true, bom: true });
  console.log(`Canonical mammal rows: ${master.length}`);
  const sourceText = await loadMddCsv();
  const mddRows = parse(sourceText, { columns: true, skip_empty_lines: true, relax_column_count: true, bom: true });
  if (!mddRows.length) throw new Error('MDD CSV parsed as empty');
  console.log(`MDD rows parsed: ${mddRows.length}`);
  console.log(`MDD columns detected: ${Object.keys(mddRows[0]).slice(0, 20).join(', ')}${Object.keys(mddRows[0]).length > 20 ? ', ...' : ''}`);

  const byName = new Map();
  const genusFamilies = new Map();
  let usableNames = 0;
  for (const r of mddRows) {
    const sci = inferMddName(r);
    const genus = cleanText(pick(r, ['genus'])) || sci.split(' ')[0] || '';
    const family = cleanText(pick(r, ['family']));
    const common = cleanText(pick(r, ['mainCommonName','commonName','common_name','main_common_name']));
    if (sci) { byName.set(keyName(sci), { sci, genus, family, common }); usableNames++; }
    if (genus && family) {
      const g = genus.toLowerCase();
      if (!genusFamilies.has(g)) genusFamilies.set(g, new Set());
      genusFamilies.get(g).add(family);
    }
  }
  if (usableNames < 6000) throw new Error(`Only ${usableNames} usable MDD scientific names were parsed; source schema detection likely failed.`);

  const fields = Object.keys(master[0]);
  for (const f of ['current_mdd_scientific_name','mdd_match_status','taxonomy_enrichment_source']) if (!fields.includes(f)) fields.push(f);

  let exact=0, genusOnly=0, unmatched=0;
  const unmatchedNames = [];
  for (const r of master) {
    const canonical = normalizeScientificName(r.canonical_scientific_name || r.scientific_name);
    if (!r.genus && canonical.includes(' ')) r.genus = canonical.split(' ')[0];
    if (!r.species_epithet && canonical.split(' ')[1]) r.species_epithet = canonical.split(' ')[1];
    let hit = byName.get(keyName(canonical));
    let aliasUsed = '';
    if (!hit) {
      const accepted = MDD_ACCEPTED_NAME_ALIASES.get(keyName(canonical));
      if (accepted) {
        hit = byName.get(keyName(accepted));
        if (hit) aliasUsed = accepted;
      }
    }
    if (hit) {
      exact++;
      if (!r.family && hit.family) r.family = hit.family;
      if (!r.common_name && hit.common) r.common_name = hit.common;
      if (!r.genus && hit.genus) r.genus = hit.genus;
      r.current_mdd_scientific_name = hit.sci;
      r.mdd_match_status = aliasUsed ? 'accepted_name_alias' : 'exact';
      r.taxonomy_enrichment_source = 'ASM Mammal Diversity Database v2.5 (2026)';
      if (aliasUsed) {
        const note = `Current MDD accepted name: ${aliasUsed}; 2024 Myanmar checklist canonical name preserved.`;
        if (!String(r.taxonomy_notes || '').includes(note)) r.taxonomy_notes = r.taxonomy_notes ? `${r.taxonomy_notes} | ${note}` : note;
      }
    } else {
      const genus = cleanText(r.genus || canonical.split(' ')[0]);
      const fams = genusFamilies.get(genus.toLowerCase());
      if (fams && fams.size === 1) {
        genusOnly++;
        if (!r.family) r.family = [...fams][0];
        r.current_mdd_scientific_name = '';
        r.mdd_match_status = 'genus_family_only';
        r.taxonomy_enrichment_source = 'ASM Mammal Diversity Database v2.5 (2026)';
      } else {
        unmatched++;
        unmatchedNames.push(canonical);
        r.current_mdd_scientific_name = '';
        r.mdd_match_status = 'unmatched_review';
        r.taxonomy_enrichment_source = '';
        r.manual_review = 'true';
        const note = 'No unambiguous current MDD v2.5 exact/genus-family match; preserve 2024 canonical taxonomy and review.';
        if (!String(r.taxonomy_notes || '').includes(note)) r.taxonomy_notes = r.taxonomy_notes ? `${r.taxonomy_notes} | ${note}` : note;
      }
    }
    if (canonical.toLowerCase() === 'biswamoyopterus undetermined') {
      r.identification_active = 'false';
      r.manual_review = 'true';
      const note = 'Unresolved species treatment; excluded from active species-level identification pending manual review.';
      if (!String(r.taxonomy_notes || '').includes(note)) r.taxonomy_notes = r.taxonomy_notes ? `${r.taxonomy_notes} | ${note}` : note;
    } else r.identification_active = boolString(r.identification_active || 'true');
  }

  fs.writeFileSync(FILE, stringify(master, { header: true, columns: fields }));
  console.log(`Enrichment complete. Exact matches: ${exact}; genus-family only: ${genusOnly}; review/unmatched: ${unmatched}`);
  if (unmatchedNames.length) console.log(`Review names: ${unmatchedNames.join('; ')}`);
  console.log('Canonical scientific_name and canonical_scientific_name fields were not overwritten.');
  if (exact === 0) throw new Error('Exact matches are still zero; refusing to accept enrichment because MDD name parsing is not trustworthy.');
}
main().catch(e => { console.error(`ERROR: ${e.message}`); process.exit(1); });
