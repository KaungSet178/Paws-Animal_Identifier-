const { fetchJson } = require('../utils/httpClient');

function imageFromMedia(media) {
  const item = Array.isArray(media)
    ? media.find(entry => entry.identifier || entry.references)
    : null;
  if (!item) return null;
  return {
    url: item.identifier || item.references,
    source: 'GBIF',
    license: item.license || null,
    attribution: item.creator || item.publisher || null
  };
}

function distributionFromMatch(match) {
  if (!match) return null;
  const parts = [];
  if (match.kingdom) parts.push(`Kingdom: ${match.kingdom}`);
  if (match.order) parts.push(`Order: ${match.order}`);
  if (match.family) parts.push(`Family: ${match.family}`);
  if (!parts.length) return null;
  return {
    summary: parts.join('; '),
    source: 'GBIF'
  };
}

async function lookup(scientificName, options = {}) {
  const fetcher = options.fetchJson || fetchJson;
  const matchUrl = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}&rank=SPECIES`;
  const match = await fetcher(matchUrl, options);
  if (!match || !match.usageKey) return null;

  let species = null;
  try {
    species = await fetcher(`https://api.gbif.org/v1/species/${match.usageKey}`, options);
  } catch (_error) {
    species = null;
  }

  const media = species && species.media ? species.media : match.media;
  const gbifUrl = `https://www.gbif.org/species/${match.usageKey}`;

  return {
    taxonKey: match.usageKey,
    externalTaxonomy: {
      gbifAcceptedScientificName: match.scientificName || null,
      rank: match.rank || null,
      kingdom: match.kingdom || null,
      phylum: match.phylum || null,
      class: match.class || null,
      order: match.order || null,
      family: match.family || null,
      genus: match.genus || null
    },
    distribution: distributionFromMatch(match),
    image: imageFromMedia(media),
    url: gbifUrl,
    source: { name: 'GBIF', url: gbifUrl }
  };
}

module.exports = {
  lookup
};
