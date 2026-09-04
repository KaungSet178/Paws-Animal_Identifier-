const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const GET_CACHE_TTL_MS = 5 * 60 * 1000
const getCache = new Map()

export class ApiError extends Error {
  constructor(message, { status = null, code = null, details = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options)
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }

    throw new ApiError('Unable to reach the identification service. Please try again in a moment.', {
      details: error,
    })
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new ApiError(data?.message || 'Something went wrong talking to the server.', {
      status: response.status,
      code: data?.error || null,
      details: data,
    })
  }

  return data
}

function cachedRequest(path) {
  const cached = getCache.get(path)
  const now = Date.now()

  if (cached && cached.expiresAt > now) {
    return cached.promise
  }

  const promise = request(path).catch((error) => {
    getCache.delete(path)
    throw error
  })

  getCache.set(path, {
    expiresAt: now + GET_CACHE_TTL_MS,
    promise,
  })

  return promise
}

export function getHealth() {
  return request('/api/health')
}

// observations: [{ attribute, value }]
export function identify(observations, options = {}) {
  return request('/api/identify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ observations }),
    signal: options.signal,
  })
}

export function getSpeciesDetail(key, options = {}) {
  const path = `/api/species/${encodeURIComponent(key)}`
  return options.signal ? request(path, { signal: options.signal }) : cachedRequest(path)
}
