const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const isWindows = process.platform === 'win32';

module.exports = {
  port: Number(process.env.PORT || 3000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  swiplPath: process.env.SWIPL_PATH || (isWindows ? 'swipl.exe' : 'swipl'),
  prologTimeoutMs: Number(process.env.PROLOG_TIMEOUT_MS || 8000),
  externalApiTimeoutMs: Number(process.env.EXTERNAL_API_TIMEOUT_MS || 5000),
  speciesCacheTtlMs: Number(process.env.SPECIES_CACHE_TTL_MS || 21600000),
  projectRoot: path.resolve(__dirname, '..', '..', '..')
};
