const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const root = path.resolve(__dirname, '..');
const analysisDir = path.join(root, 'analysis');
fs.mkdirSync(analysisDir, { recursive: true });

const traits = parse(fs.readFileSync(path.join(root, 'data', 'mammal_traits.csv'), 'utf8'), { columns: true, skip_empty_lines: true });
const schema = JSON.parse(fs.readFileSync(path.join(root, 'data', 'trait_schema.json'), 'utf8'));
const defs = schema.traits;
const traitIds = defs.map(t => t.id);
const weights = new Map(defs.map(t => [t.id, Number(t.evidence_weight || 1)]));

const covered = traits.filter(row => traitIds.some(t => (row[t] || '').trim()));
const isKnown = v => String(v || '').trim() !== '';

function compatible(subject, candidate) {
  for (const t of traitIds) {
    const sv = (subject[t] || '').trim();
    if (!sv) continue;
    const cv = (candidate[t] || '').trim();
    if (!cv) continue; // conservative: missing candidate data never eliminates it
    if (cv !== sv) return false;
  }
  return true;
}

function simulate(subject) {
  let candidates = [...covered];
  const available = traitIds.filter(t => isKnown(subject[t]));
  const asked = [];
  while (candidates.length > 1 && available.length) {
    let best = null;
    for (const t of available) {
      const answer = subject[t].trim();
      const remaining = candidates.filter(c => !isKnown(c[t]) || c[t].trim() === answer);
      const reduction = candidates.length - remaining.length;
      const score = [reduction, weights.get(t) || 1];
      if (!best || score[0] > best.score[0] || (score[0] === best.score[0] && score[1] > best.score[1])) {
        best = { t, remaining, score };
      }
    }
    if (!best || best.score[0] <= 0) break;
    candidates = best.remaining;
    asked.push(best.t);
    available.splice(available.indexOf(best.t), 1);
  }
  return { asked, candidates };
}

function entropy(counts) {
  const total = [...counts.values()].reduce((a,b) => a+b, 0);
  if (!total) return 0;
  let h = 0;
  for (const n of counts.values()) {
    const p = n / total;
    h -= p * Math.log2(p);
  }
  return h;
}

const traitMetrics = traitIds.map(t => {
  const known = covered.filter(r => isKnown(r[t]));
  const counts = new Map();
  for (const r of known) counts.set(r[t].trim(), (counts.get(r[t].trim()) || 0) + 1);
  const eliminations = known.map(r => {
    const value = r[t].trim();
    const remain = covered.filter(c => !isKnown(c[t]) || c[t].trim() === value).length;
    return covered.length - remain;
  });
  const avg = eliminations.length ? eliminations.reduce((a,b)=>a+b,0) / eliminations.length : 0;
  return {
    trait: t,
    known_species: known.length,
    coverage_pct: Number((known.length * 100 / covered.length).toFixed(1)),
    distinct_values: counts.size,
    entropy_bits: Number(entropy(counts).toFixed(3)),
    avg_candidates_eliminated: Number(avg.toFixed(2)),
    evidence_weight: weights.get(t) || 1
  };
}).sort((a,b) => b.avg_candidates_eliminated - a.avg_candidates_eliminated || b.known_species - a.known_species);

const readiness = [];
for (const r of covered) {
  const sim = simulate(r);
  const remaining = sim.candidates.length;
  readiness.push({
    species_key: r.species_key,
    scientific_name: r.scientific_name,
    populated_traits: traitIds.filter(t => isKnown(r[t])).length,
    remaining_compatible_candidates: remaining,
    simulated_questions_used: sim.asked.length,
    readiness: remaining === 1 ? 'species_ready' : remaining <= 3 ? 'needs_one_or_two_discriminators' : 'insufficient_current_traits',
    questions_used: sim.asked.join('|'),
    remaining_candidates: sim.candidates.map(c => c.species_key).join('|')
  });
}
readiness.sort((a,b) => b.remaining_compatible_candidates - a.remaining_compatible_candidates || a.populated_traits - b.populated_traits);

const pairs = [];
for (let i=0;i<covered.length;i++) for (let j=i+1;j<covered.length;j++) {
  const a = covered[i], b = covered[j];
  const shared = [], matching = [], conflicts = [];
  for (const t of traitIds) {
    if (!isKnown(a[t]) || !isKnown(b[t])) continue;
    shared.push(t);
    if (a[t].trim() === b[t].trim()) matching.push(t); else conflicts.push(t);
  }
  if (shared.length < 3) continue;
  const similarity = matching.length / shared.length;
  if (similarity < 0.8) continue;
  pairs.push({
    species_a: a.species_key,
    scientific_name_a: a.scientific_name,
    species_b: b.species_key,
    scientific_name_b: b.scientific_name,
    shared_known_traits: shared.length,
    matches: matching.length,
    conflicts: conflicts.length,
    similarity: Number(similarity.toFixed(3)),
    matching_traits: matching.join('|'),
    conflicting_traits: conflicts.join('|')
  });
}
pairs.sort((a,b) => b.similarity - a.similarity || b.shared_known_traits - a.shared_known_traits);

// Exact full-profile collisions (including blanks)
const sigMap = new Map();
for (const r of covered) {
  const sig = JSON.stringify(traitIds.map(t => (r[t] || '').trim()));
  if (!sigMap.has(sig)) sigMap.set(sig, []);
  sigMap.get(sig).push(r);
}
const collisions = [...sigMap.values()].filter(g => g.length > 1).map(g => ({
  collision_size: g.length,
  species_keys: g.map(r => r.species_key).join('|'),
  scientific_names: g.map(r => r.scientific_name).join('|')
}));

fs.writeFileSync(path.join(analysisDir,'trait_discrimination_metrics.csv'), stringify(traitMetrics, { header:true }));
fs.writeFileSync(path.join(analysisDir,'species_readiness.csv'), stringify(readiness, { header:true }));
fs.writeFileSync(path.join(analysisDir,'high_similarity_pairs.csv'), stringify(pairs, { header:true }));
fs.writeFileSync(path.join(analysisDir,'exact_profile_collisions.csv'), stringify(collisions, { header:true }));

const ready = readiness.filter(r => r.readiness === 'species_ready');
const qs = ready.map(r => r.simulated_questions_used).sort((a,b)=>a-b);
const median = qs.length ? qs[Math.floor(qs.length/2)] : 0;
console.log('Phase 3A Trait Discrimination Analysis');
console.log('-------------------------------------');
console.log(`Covered species analysed: ${covered.length}`);
console.log(`Species-ready under conservative missing-data rule: ${ready.length}`);
console.log(`Need one/two extra discriminators: ${readiness.filter(r=>r.readiness==='needs_one_or_two_discriminators').length}`);
console.log(`Insufficient current traits: ${readiness.filter(r=>r.readiness==='insufficient_current_traits').length}`);
console.log(`Exact profile collision groups: ${collisions.length}`);
console.log(`Median simulated questions for species-ready cases: ${median}`);
console.log(`Question range for species-ready cases: ${qs.length ? qs[0] : 0}-${qs.length ? qs[qs.length-1] : 0}`);
console.log('\nTop discrimination traits:');
traitMetrics.slice(0,10).forEach(t => console.log(`  ${t.trait}: coverage ${t.coverage_pct}%, avg eliminates ${t.avg_candidates_eliminated}`));
console.log('\nWrote analysis/*.csv');
