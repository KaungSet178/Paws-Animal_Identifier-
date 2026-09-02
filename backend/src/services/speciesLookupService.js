const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const env = require('../config/env');
const { ApiError } = require('../utils/errors');

const speciesKeyPattern = /^[a-z][a-z0-9_]*$/;

function loadSpeciesMap(csvPath = path.join(env.projectRoot, 'data', 'myanmar_mammals_master.csv')) {
  const rows = parse(fs.readFileSync(csvPath, 'utf8'), {
    columns: true,
    skip_empty_lines: true
  });
  return new Map(rows.map(row => [row.species_key, {
    key: row.species_key,
    commonName: row.common_name || row.scientific_name,
    scientificName: row.scientific_name,
    canonicalScientificName: row.canonical_scientific_name || row.scientific_name,
    order: row.order,
    family: row.family,
    genus: row.genus,
    marine: row.marine === 'true',
    terrestrial: row.terrestrial === 'true'
  }]));
}

let cachedMap = null;

function getSpeciesMap() {
  if (!cachedMap) cachedMap = loadSpeciesMap();
  return cachedMap;
}

function sanitizeSpeciesKey(key) {
  const value = String(key || '').trim();
  if (!speciesKeyPattern.test(value)) {
    throw new ApiError('SPECIES_NOT_FOUND', `Species '${value}' was not found in the Myanmar mammal checklist.`, 404);
  }
  return value;
}

function getSpeciesByKey(key, speciesMap = getSpeciesMap()) {
  const cleanKey = sanitizeSpeciesKey(key);
  const species = speciesMap.get(cleanKey);
  if (!species) {
    throw new ApiError('SPECIES_NOT_FOUND', `Species '${cleanKey}' was not found in the Myanmar mammal checklist.`, 404);
  }
  return species;
}

function resetSpeciesCacheForTests() {
  cachedMap = null;
}

module.exports = {
  getSpeciesByKey,
  getSpeciesMap,
  loadSpeciesMap,
  resetSpeciesCacheForTests
};
