/**
 * Generates frontend/src/data/species.json from the project data files.
 *
 * Sources (all read-only, repo-root /data):
 *   - myanmar_mammals_master.csv  -> identity + taxonomy
 *   - mammal_traits.csv           -> observable characteristics
 *   - question_schema.json        -> human-readable trait / value labels
 *
 * The Explore page bundles the output so it needs no backend list endpoint.
 * Re-run after the data files change:  node frontend/scripts/generate-species-data.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../..')
const dataDir = resolve(repoRoot, 'data')
const outFile = resolve(here, '../src/data/species.json')

/** Minimal CSV parser — the source files contain no quoted fields or embedded commas. */
function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').trim().split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map((line) => {
    const cells = line.split(',')
    const row = {}
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? '').trim()
    })
    return row
  })
}

const master = parseCsv(readFileSync(resolve(dataDir, 'myanmar_mammals_master.csv'), 'utf8'))
const traitRows = parseCsv(readFileSync(resolve(dataDir, 'mammal_traits.csv'), 'utf8'))
const questionSchema = JSON.parse(readFileSync(resolve(dataDir, 'question_schema.json'), 'utf8')).questions

const traitByKey = new Map(traitRows.map((row) => [row.species_key, row]))

// Short, display-friendly names for each trait column.
const TRAIT_LABELS = {
  body_size_impression: 'Size',
  body_form: 'Body shape',
  body_covering: 'Body covering',
  movement_seen: 'Movement',
  observation_place: 'Seen at',
  time_seen: 'Active',
  primary_color: 'Main colour',
  body_pattern: 'Pattern',
  tail_impression: 'Tail length',
  tail_shape: 'Tail shape',
  ear_size_impression: 'Ear size',
  ear_shape_simple: 'Ear shape',
  snout_shape_simple: 'Snout',
  leg_foot_appearance: 'Feet',
  horns_or_antlers: 'Horns / antlers',
  horn_shape_simple: 'Horn shape',
  tusks_visible: 'Tusks',
  quills_or_spines_visible: 'Quills / spines',
  gliding_membrane_visible: 'Gliding membrane',
  bat_nose_shape: 'Bat nose',
  bat_tail_visibility: 'Bat tail',
  rodent_tail_type: 'Rodent tail',
  primate_face_marking: 'Face marking',
  carnivore_face_marking: 'Face marking',
  carnivore_tail_marking: 'Tail marking',
  cetacean_dorsal_fin: 'Dorsal fin',
  cetacean_color_pattern: 'Colour pattern',
  cetacean_beak: 'Beak',
  mole_front_feet: 'Front feet',
  primate_brow_pattern: 'Eyebrow pattern',
}

// Raw values that carry no useful information for a profile.
const SKIP_VALUES = new Set([
  '', 'not_clear', 'not_sure', 'not_seen', 'not_obvious', 'none_visible',
  'no', 'no_tail_visible', 'no_distinct_beak', 'normal_small_feet',
])

function valueLabel(traitId, rawValue) {
  const labels = questionSchema[traitId]?.option_labels
  return labels?.[rawValue] || rawValue.replace(/_/g, ' ')
}

function traitsFor(speciesKey) {
  const row = traitByKey.get(speciesKey)
  if (!row) return []
  const out = []
  for (const traitId of Object.keys(TRAIT_LABELS)) {
    const raw = (row[traitId] || '').trim()
    if (SKIP_VALUES.has(raw)) continue
    out.push({ label: TRAIT_LABELS[traitId], value: valueLabel(traitId, raw) })
  }
  return out
}

// Taxonomic order -> Explore tab grouping.
const ORDER_GROUPS = {
  Chiroptera: 'bats',
  Rodentia: 'rodents',
  Artiodactyla: 'hoofed',
  Perissodactyla: 'hoofed',
  Carnivora: 'carnivores',
  Eulipotyphla: 'shrews',
  Primates: 'primates',
}
const groupFor = (order) => ORDER_GROUPS[order] || 'other'

const species = master
  .filter((row) => row.species_key)
  .map((row) => {
    const traits = traitsFor(row.species_key)
    return {
      key: row.species_key,
      commonName: row.common_name || row.scientific_name,
      scientificName: row.scientific_name,
      order: row.order || '',
      family: row.family || '',
      genus: row.genus || '',
      group: groupFor(row.order),
      conservationStatus: row.conservation_status || '',
      traits,
    }
  })
  // Explore shows the implemented identifier catalogue, not the full checklist.
  .filter((species) => species.traits.length > 0)
  .sort((a, b) => a.commonName.localeCompare(b.commonName))

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, JSON.stringify(species, null, 2) + '\n')

const withTraits = species.filter((s) => s.traits.length > 0).length
console.log(`Wrote ${species.length} species to ${outFile} (${withTraits} have trait profiles).`)
