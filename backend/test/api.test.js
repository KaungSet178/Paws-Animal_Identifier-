const assert = require('assert');
const path = require('path');
const test = require('node:test');
const { spawnSync } = require('child_process');
const { createApp } = require('../src/app');
const prologService = require('../src/services/prologService');
const { createSpeciesEnrichmentService } = require('../src/services/speciesEnrichmentService');
const { TtlCache } = require('../src/services/ttlCache');
const { getSpeciesByKey, loadSpeciesMap } = require('../src/services/speciesLookupService');
const { traitDefsFromSchema, validateIdentifyRequest } = require('../src/validators/observationValidator');
const { ApiError } = require('../src/utils/errors');

const projectRoot = path.resolve(__dirname, '..', '..');

function swiplAvailable() {
  const result = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['swipl'], {
    encoding: 'utf8',
    windowsHide: true
  });
  return result.status === 0;
}

async function withServer(app, fn) {
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function request(app, method, url, body) {
  return withServer(app, async baseUrl => {
    const response = await fetch(`${baseUrl}${url}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const json = await response.json();
    return { status: response.status, body: json };
  });
}

function mockApp(reason) {
  return createApp({ identificationService: { reason } });
}

test('GET /api/health', async () => {
  const response = await request(mockApp(async () => ({})), 'GET', '/api/health');
  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(response.body, {
    status: 'ok',
    service: 'myanmar-mammal-expert-system'
  });
});

test('POST /api/identify accepts observations=[] and preserves Prolog shape', async () => {
  const prologResponse = {
    status: 'continue',
    candidates: [],
    nextQuestion: {
      id: 'body_form',
      text: 'Which overall body shape looked closest?',
      options: [{ value: 'cat_like', label: 'Cat-like' }]
    }
  };
  const response = await request(mockApp(async observations => {
    assert.deepStrictEqual(observations, []);
    return prologResponse;
  }), 'POST', '/api/identify', { observations: [] });
  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(response.body, prologResponse);
});

test('POST /api/identify treats an empty JSON body as initial observations', async () => {
  const response = await request(mockApp(async observations => {
    assert.deepStrictEqual(observations, []);
    return { status: 'continue', candidates: [], nextQuestion: null };
  }), 'POST', '/api/identify', {});
  assert.strictEqual(response.status, 200);
});

test('valid Tiger-like request reaches service with sanitized observations', async () => {
  const response = await request(mockApp(async observations => {
    assert.deepStrictEqual(observations, [
      { attribute: 'body_form', value: 'cat_like' },
      { attribute: 'body_pattern', value: 'striped' }
    ]);
    return {
      status: 'continue',
      candidates: [{ key: 'panthera_tigris', conflicts: 0 }],
      nextQuestion: null
    };
  }), 'POST', '/api/identify', {
    observations: [
      { attribute: 'body_form', value: 'cat_like' },
      { attribute: 'body_pattern', value: 'striped' }
    ]
  });
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.candidates[0].key, 'panthera_tigris');
});

test('valid Asian Elephant request reaches service', async () => {
  const response = await request(mockApp(async observations => {
    assert.deepStrictEqual(observations, [
      { attribute: 'body_form', value: 'elephant_like' },
      { attribute: 'snout_shape_simple', value: 'trunk_like' }
    ]);
    return {
      status: 'complete',
      candidates: [{ key: 'elephas_maximus', commonName: 'Asian Elephant' }],
      nextQuestion: null
    };
  }), 'POST', '/api/identify', {
    observations: [
      { attribute: 'body_form', value: 'elephant_like' },
      { attribute: 'snout_shape_simple', value: 'trunk_like' }
    ]
  });
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.status, 'complete');
});

test('unknown answer is valid', async () => {
  const response = await request(mockApp(async observations => {
    assert.deepStrictEqual(observations, [{ attribute: 'body_form', value: 'unknown' }]);
    return { status: 'continue', candidates: [], nextQuestion: null };
  }), 'POST', '/api/identify', {
    observations: [{ attribute: 'body_form', value: 'unknown' }]
  });
  assert.strictEqual(response.status, 200);
});

test('malformed observations are rejected', async () => {
  const response = await request(mockApp(async () => ({})), 'POST', '/api/identify', {
    observations: 'bad'
  });
  assert.strictEqual(response.status, 400);
  assert.strictEqual(response.body.error, 'INVALID_OBSERVATION');
});

test('invalid attribute is rejected', async () => {
  const response = await request(mockApp(async () => ({})), 'POST', '/api/identify', {
    observations: [{ attribute: 'not_a_trait', value: 'cat_like' }]
  });
  assert.strictEqual(response.status, 400);
  assert.strictEqual(response.body.error, 'INVALID_ATTRIBUTE');
});

test('invalid value is rejected', async () => {
  const response = await request(mockApp(async () => ({})), 'POST', '/api/identify', {
    observations: [{ attribute: 'body_form', value: 'blue' }]
  });
  assert.strictEqual(response.status, 400);
  assert.strictEqual(response.body.error, 'INVALID_VALUE');
});

test('duplicate attribute is rejected', async () => {
  const response = await request(mockApp(async () => ({})), 'POST', '/api/identify', {
    observations: [
      { attribute: 'body_form', value: 'cat_like' },
      { attribute: 'body_form', value: 'dog_like' }
    ]
  });
  assert.strictEqual(response.status, 400);
  assert.strictEqual(response.body.error, 'DUPLICATE_ATTRIBUTE');
});

test('ambiguous response and status/nextQuestion are preserved exactly', async () => {
  const prologResponse = {
    status: 'ambiguous',
    candidates: [
      { key: 'bubalus_arnee', evidence: 'strong' },
      { key: 'bos_gaurus', evidence: 'strong' }
    ],
    nextQuestion: null
  };
  const response = await request(mockApp(async () => prologResponse), 'POST', '/api/identify', {
    observations: [{ attribute: 'body_form', value: 'hoofed_like' }]
  });
  assert.strictEqual(response.status, 200);
  assert.deepStrictEqual(response.body, prologResponse);
});

test('Prolog executable missing maps to PROLOG_EXECUTION_FAILED', async () => {
  await assert.rejects(
    () => prologService.reason([], { swiplPath: 'definitely-not-swipl-for-test' }),
    error => error.code === 'PROLOG_EXECUTION_FAILED'
  );
});

test('Prolog timeout maps to PROLOG_TIMEOUT', { skip: !swiplAvailable() }, async () => {
  await assert.rejects(
    () => prologService.reason([], {
      timeoutMs: 50,
      projectRoot,
      prologFile: path.join(__dirname, 'fixtures', 'timeout.pl')
    }),
    error => error.code === 'PROLOG_TIMEOUT'
  );
});

test('invalid Prolog JSON maps to PROLOG_INVALID_RESPONSE', { skip: !swiplAvailable() }, async () => {
  await assert.rejects(
    () => prologService.reason([], {
      projectRoot,
      prologFile: path.join(__dirname, 'fixtures', 'invalid_json.pl')
    }),
    error => error.code === 'PROLOG_INVALID_RESPONSE'
  );
});

test('valid Prolog JSON is accepted when stderr has warning output', { skip: !swiplAvailable() }, async () => {
  const response = await prologService.reason([], {
    projectRoot,
    prologFile: path.join(__dirname, 'fixtures', 'stderr_warning.pl')
  });
  assert.strictEqual(response.status, 'continue');
  assert.deepStrictEqual(response.candidates, []);
});

test('real SWI-Prolog integration through /api/identify', { skip: !swiplAvailable() }, async () => {
  const app = createApp();
  const response = await request(app, 'POST', '/api/identify', {
    observations: [
      { attribute: 'body_form', value: 'cat_like' },
      { attribute: 'body_pattern', value: 'striped' },
      { attribute: 'primary_color', value: 'reddish_or_orange' }
    ]
  });
  assert.strictEqual(response.status, 200);
  assert(['continue', 'complete', 'ambiguous', 'insufficient_evidence'].includes(response.body.status));
  assert(response.body.candidates.some(candidate => candidate.key === 'panthera_tigris'));
});

function provider(value, calls) {
  return {
    lookup: async scientificName => {
      calls.push(scientificName);
      if (value instanceof Error) throw value;
      return typeof value === 'function' ? value(scientificName) : value;
    }
  };
}

function enrichmentService(overrides = {}) {
  const calls = [];
  let now = 1000;
  const cache = new TtlCache(overrides.cacheTtlMs || 1000, () => now);
  const service = createSpeciesEnrichmentService({
    cache,
    speciesLookupService: overrides.speciesLookupService,
    inaturalistService: overrides.inaturalistService || provider(null, calls),
    wikipediaService: overrides.wikipediaService || provider(null, calls),
    gbifService: overrides.gbifService || provider(null, calls)
  });
  return {
    service,
    calls,
    tick: ms => {
      now += ms;
    }
  };
}

test('GET /api/species/:key returns local canonical species identity', async () => {
  const response = await request(createApp({
    speciesEnrichmentService: {
      getSpecies: async key => ({
        key,
        commonName: 'Tiger',
        scientificName: 'Panthera tigris',
        image: null,
        description: null,
        distribution: null,
        external: {},
        sources: []
      })
    }
  }), 'GET', '/api/species/panthera_tigris');
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.key, 'panthera_tigris');
  assert.strictEqual(response.body.commonName, 'Tiger');
  assert.strictEqual(response.body.scientificName, 'Panthera tigris');
});

test('GET /api/species/:key returns 404 for unknown species key', async () => {
  const response = await request(createApp(), 'GET', '/api/species/abc_xyz');
  assert.strictEqual(response.status, 404);
  assert.strictEqual(response.body.error, 'SPECIES_NOT_FOUND');
});

test('iNaturalist success contributes image, taxon id, and source metadata', async () => {
  const { service } = enrichmentService({
    inaturalistService: provider({
      taxonId: 41967,
      image: {
        url: 'https://inat.example/tiger.jpg',
        source: 'iNaturalist',
        license: 'cc-by',
        attribution: 'Example Photographer'
      },
      source: { name: 'iNaturalist', url: 'https://www.inaturalist.org/taxa/41967' }
    }, [])
  });
  const response = await request(createApp({ speciesEnrichmentService: service }), 'GET', '/api/species/panthera_tigris');
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.image.source, 'iNaturalist');
  assert.strictEqual(response.body.image.license, 'cc-by');
  assert.strictEqual(response.body.image.attribution, 'Example Photographer');
  assert.strictEqual(response.body.external.iNaturalistTaxonId, 41967);
});

test('Wikipedia success contributes description and backup image', async () => {
  const { service } = enrichmentService({
    wikipediaService: provider({
      description: { text: 'Tiger summary', source: 'Wikipedia' },
      image: {
        url: 'https://wiki.example/tiger.jpg',
        source: 'Wikipedia',
        license: null,
        attribution: 'Wikimedia project contributors'
      },
      source: { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Tiger' }
    }, [])
  });
  const response = await request(createApp({ speciesEnrichmentService: service }), 'GET', '/api/species/panthera_tigris');
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.description.text, 'Tiger summary');
  assert.strictEqual(response.body.image.source, 'Wikipedia');
});

test('GBIF success contributes taxonomy and distribution context', async () => {
  const { service } = enrichmentService({
    gbifService: provider({
      taxonKey: 5219416,
      externalTaxonomy: {
        gbifAcceptedScientificName: 'Panthera tigris (Linnaeus, 1758)',
        rank: 'SPECIES',
        family: 'Felidae'
      },
      distribution: { summary: 'Kingdom: Animalia; Order: Carnivora; Family: Felidae', source: 'GBIF' },
      source: { name: 'GBIF', url: 'https://www.gbif.org/species/5219416' }
    }, [])
  });
  const response = await request(createApp({ speciesEnrichmentService: service }), 'GET', '/api/species/panthera_tigris');
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.distribution.source, 'GBIF');
  assert.strictEqual(response.body.external.gbifTaxonKey, 5219416);
  assert.strictEqual(response.body.scientificName, 'Panthera tigris');
  assert.strictEqual(response.body.external.externalTaxonomy.gbifAcceptedScientificName, 'Panthera tigris (Linnaeus, 1758)');
});

test('one provider failure still returns partial enrichment', async () => {
  const { service } = enrichmentService({
    inaturalistService: provider(new ApiError('EXTERNAL_API_ERROR', 'fail', 502), []),
    wikipediaService: provider({
      description: { text: 'Tiger summary', source: 'Wikipedia' },
      source: { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Tiger' }
    }, [])
  });
  const response = await request(createApp({ speciesEnrichmentService: service }), 'GET', '/api/species/panthera_tigris');
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.description.text, 'Tiger summary');
  assert.strictEqual(response.body.scientificName, 'Panthera tigris');
});

test('all external providers fail and local canonical identity is still returned', async () => {
  const failing = provider(new ApiError('EXTERNAL_API_ERROR', 'fail', 502), []);
  const { service } = enrichmentService({
    inaturalistService: failing,
    wikipediaService: failing,
    gbifService: failing
  });
  const response = await request(createApp({ speciesEnrichmentService: service }), 'GET', '/api/species/panthera_tigris');
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.key, 'panthera_tigris');
  assert.strictEqual(response.body.image, null);
  assert.strictEqual(response.body.description, null);
  assert.deepStrictEqual(response.body.external, {});
});

test('image fallback prefers iNaturalist, then Wikipedia, then GBIF', async () => {
  const wikiImage = {
    url: 'https://wiki.example/tiger.jpg',
    source: 'Wikipedia',
    license: null,
    attribution: 'Wikimedia project contributors'
  };
  const gbifImage = {
    url: 'https://gbif.example/tiger.jpg',
    source: 'GBIF',
    license: 'CC_BY_4_0',
    attribution: 'GBIF Publisher'
  };
  const inatImage = {
    url: 'https://inat.example/tiger.jpg',
    source: 'iNaturalist',
    license: 'cc-by',
    attribution: 'Example Photographer'
  };

  let context = enrichmentService({
    inaturalistService: provider({ image: inatImage }, []),
    wikipediaService: provider({ image: wikiImage }, []),
    gbifService: provider({ image: gbifImage }, [])
  });
  let response = await request(createApp({ speciesEnrichmentService: context.service }), 'GET', '/api/species/panthera_tigris');
  assert.strictEqual(response.body.image.source, 'iNaturalist');

  context = enrichmentService({
    wikipediaService: provider({ image: wikiImage }, []),
    gbifService: provider({ image: gbifImage }, [])
  });
  response = await request(createApp({ speciesEnrichmentService: context.service }), 'GET', '/api/species/panthera_tigris');
  assert.strictEqual(response.body.image.source, 'Wikipedia');

  context = enrichmentService({
    gbifService: provider({ image: gbifImage }, [])
  });
  response = await request(createApp({ speciesEnrichmentService: context.service }), 'GET', '/api/species/panthera_tigris');
  assert.strictEqual(response.body.image.source, 'GBIF');
});

test('canonical scientific name is never overwritten by external taxonomy', async () => {
  const { service } = enrichmentService({
    gbifService: provider({
      taxonKey: 1,
      externalTaxonomy: { gbifAcceptedScientificName: 'Different external name' }
    }, [])
  });
  const response = await request(createApp({ speciesEnrichmentService: service }), 'GET', '/api/species/panthera_tigris');
  assert.strictEqual(response.body.scientificName, 'Panthera tigris');
  assert.strictEqual(response.body.external.externalTaxonomy.gbifAcceptedScientificName, 'Different external name');
});

test('cache hit avoids duplicate external calls and cache expiry refreshes', async () => {
  const calls = [];
  const context = enrichmentService({
    cacheTtlMs: 100,
    inaturalistService: provider({ taxonId: 41967 }, calls)
  });
  await context.service.getSpecies('panthera_tigris');
  await context.service.getSpecies('panthera_tigris');
  assert.strictEqual(calls.length, 1);
  context.tick(101);
  await context.service.getSpecies('panthera_tigris');
  assert.strictEqual(calls.length, 2);
});

test('external API timeout is treated as provider failure by enrichment endpoint', async () => {
  const { service } = enrichmentService({
    inaturalistService: provider(new ApiError('EXTERNAL_API_TIMEOUT', 'timeout', 502), [])
  });
  const response = await request(createApp({ speciesEnrichmentService: service }), 'GET', '/api/species/panthera_tigris');
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.key, 'panthera_tigris');
});

test('malformed provider response is tolerated', async () => {
  const { service } = enrichmentService({
    inaturalistService: provider({ image: undefined, source: null }, []),
    wikipediaService: provider(undefined, []),
    gbifService: provider(null, [])
  });
  const response = await request(createApp({ speciesEnrichmentService: service }), 'GET', '/api/species/panthera_tigris');
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.image, null);
  assert.deepStrictEqual(response.body.sources, []);
});

test('species lookup is data-driven from canonical CSV', () => {
  const speciesMap = loadSpeciesMap();
  const keys = [...speciesMap.keys()];
  assert(keys.length >= 365);
  const species = getSpeciesByKey(keys[keys.length - 1], speciesMap);
  assert.strictEqual(species.key, keys[keys.length - 1]);
  assert(species.scientificName);
});

test('observation validator accepts a newly added schema trait without source changes', () => {
  const dynamicTraitDefs = traitDefsFromSchema({
    traits: [{
      id: 'future_visible_trait',
      questionable: true,
      data_type: 'enum',
      allowed_values: ['yes', 'no']
    }]
  });
  const observations = validateIdentifyRequest({
    observations: [{ attribute: 'future_visible_trait', value: 'yes' }]
  }, { traitDefs: dynamicTraitDefs });
  assert.deepStrictEqual(observations, [{ attribute: 'future_visible_trait', value: 'yes' }]);
});
