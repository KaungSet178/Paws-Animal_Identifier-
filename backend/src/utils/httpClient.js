const { ApiError } = require('./errors');
const env = require('../config/env');

async function fetchJson(url, options = {}) {
  const timeoutMs = options.timeoutMs || env.externalApiTimeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'myanmar-mammal-expert-system/1.0'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new ApiError('EXTERNAL_API_ERROR', `External API returned HTTP ${response.status}.`, 502);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError('EXTERNAL_API_TIMEOUT', 'External API request timed out.', 502);
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError('EXTERNAL_API_ERROR', 'External API request failed.', 502, error.message);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  fetchJson
};
