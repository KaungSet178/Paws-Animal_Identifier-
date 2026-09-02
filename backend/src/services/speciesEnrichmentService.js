const env = require('../config/env');
const { TtlCache } = require('./ttlCache');
const speciesLookupService = require('./speciesLookupService');
const inaturalistService = require('./inaturalistService');
const wikipediaService = require('./wikipediaService');
const gbifService = require('./gbifService');

function compactSources(items) {
  const seen = new Set();
  const sources = [];
  for (const item of items) {
    if (!item || !item.name || !item.url) continue;
    const key = `${item.name}:${item.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push(item);
  }
  return sources;
}

function settledValue(result, provider) {
  if (result.status === 'fulfilled') return result.value;
  console.warn(`${provider} enrichment failed: ${result.reason && result.reason.message ? result.reason.message : result.reason}`);
  return null;
}

function buildEnrichment(species, providerResults) {
  const inaturalist = providerResults.inaturalist;
  const wikipedia = providerResults.wikipedia;
  const gbif = providerResults.gbif;
  const image = (inaturalist && inaturalist.image)
    || (wikipedia && wikipedia.image)
    || (gbif && gbif.image)
    || null;

  return {
    key: species.key,
    commonName: species.commonName,
    scientificName: species.scientificName,
    image,
    description: wikipedia && wikipedia.description ? wikipedia.description : null,
    distribution: gbif && gbif.distribution ? gbif.distribution : null,
    external: {
      ...(inaturalist && inaturalist.taxonId ? { iNaturalistTaxonId: inaturalist.taxonId } : {}),
      ...(gbif && gbif.taxonKey ? { gbifTaxonKey: gbif.taxonKey } : {}),
      ...(gbif && gbif.externalTaxonomy ? { externalTaxonomy: gbif.externalTaxonomy } : {})
    },
    sources: compactSources([
      inaturalist && inaturalist.source,
      wikipedia && wikipedia.source,
      gbif && gbif.source
    ])
  };
}

function createSpeciesEnrichmentService(options = {}) {
  const cache = options.cache || new TtlCache(options.cacheTtlMs || env.speciesCacheTtlMs);
  const lookupService = options.speciesLookupService || speciesLookupService;
  const providers = {
    inaturalist: options.inaturalistService || inaturalistService,
    wikipedia: options.wikipediaService || wikipediaService,
    gbif: options.gbifService || gbifService
  };

  async function getSpecies(key) {
    const cached = cache.get(key);
    if (cached) return cached;

    const species = lookupService.getSpeciesByKey(key);
    const [inaturalistResult, wikipediaResult, gbifResult] = await Promise.allSettled([
      providers.inaturalist.lookup(species.scientificName),
      providers.wikipedia.lookup(species.scientificName),
      providers.gbif.lookup(species.scientificName)
    ]);

    const enrichment = buildEnrichment(species, {
      inaturalist: settledValue(inaturalistResult, 'iNaturalist'),
      wikipedia: settledValue(wikipediaResult, 'Wikipedia'),
      gbif: settledValue(gbifResult, 'GBIF')
    });
    cache.set(key, enrichment);
    return enrichment;
  }

  return {
    getSpecies,
    clearCache: () => cache.clear()
  };
}

module.exports = {
  createSpeciesEnrichmentService,
  buildEnrichment
};
