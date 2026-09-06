/**
 * Populates frontend/src/data/species-images.json — a { speciesKey: photoUrl } map
 * so the Explore grid can show photos instantly instead of firing hundreds of
 * live enrichment requests (which trip Wikipedia / iNaturalist rate limits).
 *
 * Requires the backend running (default http://localhost:3000). Polite: one
 * request at a time with a short delay. Re-run to refresh; keeps existing URLs
 * for species that fail this pass.
 *
 *   node frontend/scripts/enrich-images.mjs
 *   BACKEND_URL=http://localhost:4000 node frontend/scripts/enrich-images.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const speciesFile = resolve(here, '../src/data/species.json')
const outFile = resolve(here, '../src/data/species-images.json')
const backend = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '')
const DELAY_MS = Number(process.env.DELAY_MS || 250)

const species = JSON.parse(readFileSync(speciesFile, 'utf8'))
const images = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const save = () => {
  const ordered = Object.fromEntries(Object.keys(images).sort().map((k) => [k, images[k]]))
  writeFileSync(outFile, JSON.stringify(ordered, null, 2) + '\n')
  return ordered
}

let added = 0
let kept = 0
let missed = 0

for (let i = 0; i < species.length; i += 1) {
  const { key } = species[i]
  process.stdout.write(`\r[${i + 1}/${species.length}] ${key.padEnd(34)}`)
  try {
    const res = await fetch(`${backend}/api/species/${encodeURIComponent(key)}`)
    const data = await res.json()
    const url = data?.image?.url || null
    if (url) {
      if (images[key] !== url) added += 1
      images[key] = url
    } else if (images[key]) {
      kept += 1
    } else {
      missed += 1
    }
  } catch (error) {
    if (images[key]) kept += 1
    else missed += 1
  }
  if ((i + 1) % 10 === 0) save()
  await sleep(DELAY_MS)
}

const ordered = save()

process.stdout.write('\r'.padEnd(60) + '\r')
console.log(`Wrote ${Object.keys(ordered).length} image URLs to ${outFile}`)
console.log(`  new/updated: ${added}   kept (this pass failed): ${kept}   still missing: ${missed}`)
