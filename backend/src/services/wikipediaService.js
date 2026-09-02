const { fetchJson } = require('../utils/httpClient');

function imageFromPage(page) {
  const url = page.originalimage && page.originalimage.source
    ? page.originalimage.source
    : page.thumbnail && page.thumbnail.source;
  if (!url) return null;
  return {
    url,
    source: 'Wikipedia',
    license: null,
    attribution: 'Wikimedia project contributors'
  };
}

async function lookup(scientificName, options = {}) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(scientificName)}`;
  const page = await (options.fetchJson || fetchJson)(url, options);
  if (!page || page.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') return null;
  if (!page.extract && !page.content_urls) return null;

  const pageUrl = page.content_urls && page.content_urls.desktop && page.content_urls.desktop.page
    ? page.content_urls.desktop.page
    : null;

  return {
    title: page.title || null,
    description: page.extract ? { text: page.extract, source: 'Wikipedia' } : null,
    image: imageFromPage(page),
    url: pageUrl,
    source: pageUrl ? { name: 'Wikipedia', url: pageUrl } : null
  };
}

module.exports = {
  lookup
};
