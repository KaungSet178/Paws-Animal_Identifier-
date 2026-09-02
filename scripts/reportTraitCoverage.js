const fs=require('fs'); const path=require('path'); const {parse}=require('csv-parse/sync');
const root=path.resolve(__dirname,'..');
const rows=parse(fs.readFileSync(path.join(root,'data','mammal_traits.csv'),'utf8'),{columns:true,skip_empty_lines:true});
const master=parse(fs.readFileSync(path.join(root,'data','myanmar_mammals_master.csv'),'utf8'),{columns:true,skip_empty_lines:true});
const by=new Map(master.map(r=>[r.species_key,r]));
const traitCols=Object.keys(rows[0]).filter(k=>!['species_key','scientific_name'].includes(k));
let populated=0, speciesWith=0; const byOrder={}; const byTrait={};
for(const r of rows){let n=0; for(const t of traitCols){if((r[t]||'').trim()){n++; populated++; byTrait[t]=(byTrait[t]||0)+1;}} if(n){speciesWith++; const o=by.get(r.species_key)?.order||'Unknown'; byOrder[o]=(byOrder[o]||0)+1;}}
console.log('Phase 2C Trait Coverage'); console.log('-----------------------');
console.log(`Species with >=1 populated observable trait: ${speciesWith}/${rows.length}`);
console.log(`Populated trait cells: ${populated}`);
console.log('\nPopulated species by order:'); Object.entries(byOrder).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${k}: ${v}`));
console.log('\nMost populated traits:'); Object.entries(byTrait).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${k}: ${v}`));
