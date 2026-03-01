const API_ACCESS_TOKEN_STORAGE_KEY = 'kiaminaFirebaseIdToken'
const API_AUTH_USER_STORAGE_KEY = 'kiaminaAuthUser'

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

export const apiFetch = async (path, options = {}) => {
  const url = buildApiUrl(path)
  const headers = new Headers(options.headers || {})
  const token = getApiAccessToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return fetch(url, {
    ...options,
    headers,
  })
}

export const API_ACCESS_TOKEN_KEY = API_ACCESS_TOKEN_STORAGE_KEY
