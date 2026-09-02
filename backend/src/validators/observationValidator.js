const fs = require('fs');
const path = require('path');
const { validationError } = require('../utils/errors');
const env = require('../config/env');

const schemaPath = path.join(env.projectRoot, 'data', 'trait_schema.json');
const traitSchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

function traitDefsFromSchema(schema) {
  return new Map(
    schema.traits
    .filter(trait => trait.questionable && trait.data_type === 'enum')
    .map(trait => [trait.id, trait])
  );
}

const traitDefs = traitDefsFromSchema(traitSchema);

function normalizeIdentifyBody(body = {}) {
  if (body == null || Object.keys(body).length === 0) {
    return { observations: [] };
  }
  if (!Object.prototype.hasOwnProperty.call(body, 'observations')) {
    return { observations: [] };
  }
  return body;
}

function validateIdentifyRequest(body, options = {}) {
  const definitions = options.traitDefs || traitDefs;
  const normalized = normalizeIdentifyBody(body);
  const observations = normalized.observations;

  if (!Array.isArray(observations)) {
    throw validationError('INVALID_OBSERVATION', 'observations must be an array.');
  }

  const seen = new Set();
  return observations.map((observation, index) => {
    if (!observation || typeof observation !== 'object' || Array.isArray(observation)) {
      throw validationError('INVALID_OBSERVATION', `Observation at index ${index} must be an object.`);
    }

    const attribute = observation.attribute;
    const value = observation.value;

    if (typeof attribute !== 'string' || attribute.trim() === '') {
      throw validationError('INVALID_OBSERVATION', `Observation at index ${index} is missing attribute.`);
    }
    if (typeof value !== 'string' || value.trim() === '') {
      throw validationError('INVALID_OBSERVATION', `Observation at index ${index} is missing value.`);
    }

    const cleanAttribute = attribute.trim();
    const cleanValue = value.trim();
    const def = definitions.get(cleanAttribute);

    if (!def) {
      throw validationError('INVALID_ATTRIBUTE', `Attribute '${cleanAttribute}' is not supported.`);
    }
    if (seen.has(cleanAttribute)) {
      throw validationError('DUPLICATE_ATTRIBUTE', `Duplicate observation for '${cleanAttribute}'.`);
    }
    seen.add(cleanAttribute);

    if (cleanValue !== 'unknown' && !def.allowed_values.includes(cleanValue)) {
      throw validationError('INVALID_VALUE', `Value '${cleanValue}' is not valid for ${cleanAttribute}.`);
    }

    return {
      attribute: cleanAttribute,
      value: cleanValue
    };
  });
}

module.exports = {
  validateIdentifyRequest,
  traitDefs,
  traitDefsFromSchema
};
