const API_ACCESS_TOKEN_STORAGE_KEY = 'kiaminaFirebaseIdToken'
const API_AUTH_USER_STORAGE_KEY = 'kiaminaAuthUser'
const API_SESSION_ID_STORAGE_KEY = 'kiaminaAuthSessionId'
let refreshAccessTokenPromise = null

const safeParseJson = (rawValue, fallback = null) => {
  try {
    const parsed = rawValue ? JSON.parse(rawValue) : fallback
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

const normalizeApiBaseUrl = (value = '') => {
  const raw = String(value || '').trim()
  if (!raw) return '/api/v1'
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

const normalizeApiPath = (path = '') => {
  const raw = String(path || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/api/v1/')) return raw.slice('/api/v1'.length)
  if (raw.startsWith('/api/')) return raw.slice('/api'.length)
  if (raw.startsWith('/')) return raw
  return `/${raw}`
}

const buildApiUrl = (path = '') => {
  const normalizedPath = normalizeApiPath(path)
  if (!normalizedPath) return ''
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath
  const baseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || '/api/v1')
  return `${baseUrl}${normalizedPath}`
}

const getTokenFromStorageBucket = (storageLike = null) => {
  if (!storageLike) return ''
  const token = String(storageLike.getItem(API_ACCESS_TOKEN_STORAGE_KEY) || '').trim()
  if (token) return token
  const authUser = safeParseJson(storageLike.getItem(API_AUTH_USER_STORAGE_KEY), null)
  return String(authUser?.firebaseIdToken || authUser?.idToken || '').trim()
}

const getSessionIdFromStorageBucket = (storageLike = null) => {
  if (!storageLike) return ''
  const sessionId = String(storageLike.getItem(API_SESSION_ID_STORAGE_KEY) || '').trim()
  if (sessionId) return sessionId
  const authUser = safeParseJson(storageLike.getItem(API_AUTH_USER_STORAGE_KEY), null)
  return String(authUser?.sessionId || '').trim()
}

export const getApiAccessToken = () => {
  if (typeof window === 'undefined') return ''
  const sessionToken = getTokenFromStorageBucket(window.sessionStorage)
  if (sessionToken) return sessionToken
  return getTokenFromStorageBucket(window.localStorage)
}

export const setApiAccessToken = (token = '', { remember = true } = {}) => {
  if (typeof window === 'undefined') return
  const normalizedToken = String(token || '').trim()
  if (!normalizedToken) {
    window.localStorage.removeItem(API_ACCESS_TOKEN_STORAGE_KEY)
    window.sessionStorage.removeItem(API_ACCESS_TOKEN_STORAGE_KEY)
    return
  }

  if (remember) {
    window.localStorage.setItem(API_ACCESS_TOKEN_STORAGE_KEY, normalizedToken)
    window.sessionStorage.removeItem(API_ACCESS_TOKEN_STORAGE_KEY)
  } else {
    window.sessionStorage.setItem(API_ACCESS_TOKEN_STORAGE_KEY, normalizedToken)
    window.localStorage.removeItem(API_ACCESS_TOKEN_STORAGE_KEY)
  }
}

export const clearApiAccessToken = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(API_ACCESS_TOKEN_STORAGE_KEY)
  window.sessionStorage.removeItem(API_ACCESS_TOKEN_STORAGE_KEY)
}

export const getApiSessionId = () => {
  if (typeof window === 'undefined') return ''
  const sessionId = getSessionIdFromStorageBucket(window.sessionStorage)
  if (sessionId) return sessionId
  return getSessionIdFromStorageBucket(window.localStorage)
}

export const setApiSessionId = (sessionId = '', { remember = true } = {}) => {
  if (typeof window === 'undefined') return
  const normalizedSessionId = String(sessionId || '').trim()
  if (!normalizedSessionId) {
    window.localStorage.removeItem(API_SESSION_ID_STORAGE_KEY)
    window.sessionStorage.removeItem(API_SESSION_ID_STORAGE_KEY)
    return
  }

  if (remember) {
    window.localStorage.setItem(API_SESSION_ID_STORAGE_KEY, normalizedSessionId)
    window.sessionStorage.removeItem(API_SESSION_ID_STORAGE_KEY)
  } else {
    window.sessionStorage.setItem(API_SESSION_ID_STORAGE_KEY, normalizedSessionId)
    window.localStorage.removeItem(API_SESSION_ID_STORAGE_KEY)
  }
}

export const clearApiSessionId = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(API_SESSION_ID_STORAGE_KEY)
  window.sessionStorage.removeItem(API_SESSION_ID_STORAGE_KEY)
}

const isAuthRoutePath = (path = '') => {
  const normalized = String(normalizeApiPath(path) || '').toLowerCase()
  return normalized.endsWith('/auth/refresh-token')
}

const resolveSessionRememberPreference = () => {
  if (typeof window === 'undefined') return true
  if (window.localStorage.getItem(API_SESSION_ID_STORAGE_KEY)) return true
  if (window.sessionStorage.getItem(API_SESSION_ID_STORAGE_KEY)) return false
  if (window.localStorage.getItem(API_AUTH_USER_STORAGE_KEY)) return true
  if (window.sessionStorage.getItem(API_AUTH_USER_STORAGE_KEY)) return false
  if (window.localStorage.getItem(API_ACCESS_TOKEN_STORAGE_KEY)) return true
  if (window.sessionStorage.getItem(API_ACCESS_TOKEN_STORAGE_KEY)) return false
  return true
}

const refreshAccessTokenSession = async () => {
  if (typeof window === 'undefined') {
    return { ok: false, status: 0, data: null }
  }

  const sessionId = getApiSessionId()
  const payload = sessionId ? { sessionId } : {}

  try {
    const response = await fetch(buildApiUrl('/auth/refresh-token'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { ok: false, status: response.status, data }
    }

    const nextSessionId = String(data?.session?.sessionId || sessionId).trim()
    if (nextSessionId) {
      setApiSessionId(nextSessionId, { remember: resolveSessionRememberPreference() })
    }

    return { ok: true, status: response.status, data }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: { message: String(error?.message || 'Network request failed.') },
    }
  }
}

const ensureAccessTokenRefreshed = async () => {
  if (refreshAccessTokenPromise) return refreshAccessTokenPromise

  refreshAccessTokenPromise = refreshAccessTokenSession()
    .finally(() => {
      refreshAccessTokenPromise = null
    })

  return refreshAccessTokenPromise
}

export const apiFetch = async (path, options = {}) => {
  const requestOptions = { ...options }
  delete requestOptions.skipAuthRefreshRetry

  const executeRequest = async () => {
    const url = buildApiUrl(path)
    const headers = new Headers(requestOptions.headers || {})
    const token = getApiAccessToken()
    const sessionId = getApiSessionId()
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    if (sessionId && !headers.has('x-session-id')) {
      headers.set('x-session-id', sessionId)
    }
    return fetch(url, {
      ...requestOptions,
      credentials: requestOptions.credentials || 'include',
      headers,
    })
  }

  const shouldSkipRefreshRetry = Boolean(options.skipAuthRefreshRetry) || isAuthRoutePath(path)
  const initialResponse = await executeRequest()
  if (initialResponse.status !== 401 || shouldSkipRefreshRetry) {
    return initialResponse
  }

  const refreshResult = await ensureAccessTokenRefreshed()
  if (!refreshResult.ok) {
    return initialResponse
  }

  return executeRequest()
}

export const API_ACCESS_TOKEN_KEY = API_ACCESS_TOKEN_STORAGE_KEY
export const API_SESSION_ID_KEY = API_SESSION_ID_STORAGE_KEY
