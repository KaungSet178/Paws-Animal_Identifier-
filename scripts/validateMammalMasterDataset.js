const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'myanmar_mammals_master.csv');
const required = [
  'species_key','scientific_name','canonical_scientific_name','common_name','order','family','genus',
  'species_epithet','taxonomic_rank','marine','terrestrial','myanmar_distribution','global_distribution',
  'conservation_status','myanmar_protection_status','identification_active','identification_level',
  'taxonomy_notes','manual_review','source_dataset','source_url','source_year'
];

function parseCSV(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i=0; i<text.length; i++) {
    const c=text[i];
    if (quoted) {
      if (c==='"' && text[i+1]==='"') { field+='"'; i++; }
      else if (c==='"') quoted=false;
      else field+=c;
    } else {
      if (c==='"') quoted=true;
      else if (c===',') { row.push(field); field=''; }
      else if (c==='\n') { row.push(field.replace(/\r$/,'')); rows.push(row); row=[]; field=''; }
      else field+=c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v !== ''));
}

function fail(msg) { console.error('ERROR:', msg); process.exitCode = 1; }
if (!fs.existsSync(file)) { fail('CSV does not exist: '+file); process.exit(); }
const parsed=parseCSV(fs.readFileSync(file,'utf8'));
const header=parsed[0]; const data=parsed.slice(1).map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]??''])));
const missing=required.filter(c=>!header.includes(c)); if (missing.length) fail('Missing columns: '+missing.join(', '));
const countBy=(k)=>data.reduce((m,r)=>{const v=r[k]||'(blank)';m[v]=(m[v]||0)+1;return m;},{});
const dup=(k)=>Object.entries(countBy(k)).filter(([v,n])=>v!=='(blank)'&&n>1);
const validBool=new Set(['true','false','']);
for (const r of data) {
  for (const k of ['marine','terrestrial','identification_active','manual_review']) if (!validBool.has(r[k])) fail(`Invalid boolean ${k}=${r[k]} for ${r.species_key}`);
  if (!r.source_dataset || !r.source_url || !r.source_year) fail('Missing source fields for '+r.species_key);
}
const keyDup=dup('species_key'), sciDup=dup('scientific_name');
if (keyDup.length) fail('Duplicate species_key: '+JSON.stringify(keyDup));
if (sciDup.length) fail('Duplicate scientific_name: '+JSON.stringify(sciDup));
const orders=countBy('order'); const families=countBy('family');
const marine=data.filter(r=>r.marine==='true').length;
const terrestrial=data.filter(r=>r.terrestrial==='true').length;
const unclassified=data.filter(r=>r.marine===''&&r.terrestrial==='').length;
const manual=data.filter(r=>r.manual_review==='true');
const missingHierarchy=data.filter(r=>!r.order||!r.family||!r.genus);
console.log('Myanmar Mammal Master Dataset Validation');
console.log('----------------------------------------');
console.log('Rows:', data.length, '(publication target: 365)');
console.log('Unique orders:', Object.keys(orders).filter(x=>x!=='(blank)').length, '(publication target: 13)');
console.log('Unique families:', Object.keys(families).filter(x=>x!=='(blank)').length, '(publication target: 49; secondary enrichment may differ under current taxonomy)');
console.log('Marine:', marine, '(publication target: 33)');
console.log('Terrestrial:', terrestrial, '(publication target: 332)');
console.log('Unclassified marine/terrestrial:', unclassified);
console.log('Manual review:', manual.length);
console.log('Rows missing order/family/genus:', missingHierarchy.length);
console.log('Duplicate scientific names:', sciDup.length);
console.log('Duplicate species keys:', keyDup.length);
console.log('\nCounts by order:');
Object.entries(orders).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([k,v])=>console.log(`  ${k}: ${v}`));
if (manual.length) {
  console.log('\nManual-review records:');
  manual.forEach(r=>console.log(`  ${r.scientific_name}: ${r.taxonomy_notes||'review required'}`));
}
if (data.length!==365) fail('Row count does not match 365 target');
if (marine!==33 || terrestrial!==332) fail('Marine/terrestrial counts do not match publication targets');
if (Object.keys(orders).filter(x=>x!=='(blank)').length!==13) fail('Order count does not match publication target of 13');
if (!process.exitCode) console.log('\nPASS: structural checks and available source-derived targets passed.');
