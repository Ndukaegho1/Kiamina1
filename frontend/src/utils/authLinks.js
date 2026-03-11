const normalizeResetUrlBase = (value = '') => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

const getFallbackResetUrlBase = () => {
  if (typeof window === 'undefined') return '/login'
  return `${window.location.origin}/login`
}

const buildClientAuthLink = ({ mode = 'login', email = '' } = {}) => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const configuredBase = normalizeResetUrlBase(import.meta.env.VITE_CLIENT_RESET_PASSWORD_URL || '')
  const base = configuredBase || getFallbackResetUrlBase()
  const encodedEmail = encodeURIComponent(normalizedEmail)

  if (base.includes('{email}')) {
    return base.replaceAll('{email}', encodedEmail)
  }

  try {
    const url = new URL(base, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    url.searchParams.set('mode', String(mode || 'login').trim() || 'login')
    if (normalizedEmail) {
      url.searchParams.set('email', normalizedEmail)
    }
    return url.toString()
  } catch {
    const query = normalizedEmail
      ? `?mode=${encodeURIComponent(String(mode || 'login').trim() || 'login')}&email=${encodedEmail}`
      : `?mode=${encodeURIComponent(String(mode || 'login').trim() || 'login')}`
    return `${base}${query}`
  }
}

export const buildClientResetPasswordLink = (email = '') => (
  buildClientAuthLink({
    mode: 'reset-password',
    email,
  })
)

export const buildClientEmailVerificationLink = (email = '') => (
  buildClientAuthLink({
    mode: 'email-verification',
    email,
  })
)
