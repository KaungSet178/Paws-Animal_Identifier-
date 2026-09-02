const { fetchJson } = require('../utils/httpClient');

function taxonUrl(id) {
  return id ? `https://www.inaturalist.org/taxa/${id}` : null;
}

function normalizePhoto(photo) {
  if (!photo || !photo.medium_url) return null;
  return {
    url: photo.medium_url,
    source: 'iNaturalist',
    license: photo.license_code || null,
    attribution: photo.attribution || null
  };
}

async function lookup(scientificName, options = {}) {
  const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&rank=species&per_page=5`;
  const data = await (options.fetchJson || fetchJson)(url, options);
  const results = Array.isArray(data.results) ? data.results : [];
  const taxon = results.find(item => item.name === scientificName) || results[0];
  if (!taxon) return null;

  return {
    taxonId: taxon.id || null,
    preferredCommonName: taxon.preferred_common_name || null,
    image: normalizePhoto(taxon.default_photo),
    url: taxon.uri || taxonUrl(taxon.id),
    source: taxon.uri || taxonUrl(taxon.id) ? { name: 'iNaturalist', url: taxon.uri || taxonUrl(taxon.id) } : null
  };
}

module.exports = {
  lookup
};
