export const getAdminSecurityStorageKey = (email = '') => (
  `kiaminaAdminSecurity:${String(email || '').trim().toLowerCase()}`
)

export const DEFAULT_ADMIN_SECURITY_PREFERENCES = Object.freeze({
  sessionTimeout: '30',
  emailNotificationPreference: true,
  activityAlertPreference: true,
  twoFactorEnabled: true,
  notificationSoundEnabled: true,
})

export const normalizeAdminSecurityPreferences = (payload = {}) => {
  const safePayload = payload && typeof payload === 'object' ? payload : {}
  return {
    sessionTimeout: `${safePayload.sessionTimeout || DEFAULT_ADMIN_SECURITY_PREFERENCES.sessionTimeout}`,
    emailNotificationPreference: safePayload.emailNotificationPreference !== false,
    activityAlertPreference: safePayload.activityAlertPreference !== false,
    twoFactorEnabled: safePayload.twoFactorEnabled !== false,
    notificationSoundEnabled: safePayload.notificationSoundEnabled !== false,
  }
}

const readPersistedAuthUser = () => {
  if (typeof window === 'undefined') return null
  try {
    const sessionUser = sessionStorage.getItem('kiaminaAuthUser')
    if (sessionUser) return JSON.parse(sessionUser)
  } catch {
    // Ignore malformed session auth payloads.
  }
  try {
    const persistentUser = localStorage.getItem('kiaminaAuthUser')
    return persistentUser ? JSON.parse(persistentUser) : null
  } catch {
    return null
  }
}

export const readAdminSecurityPreferences = (email = '') => {
  const authUser = readPersistedAuthUser()
  const authEmail = String(authUser?.email || '').trim().toLowerCase()
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (authUser && (!normalizedEmail || authEmail === normalizedEmail)) {
    const authSecurityPreferences = authUser.adminSecurityPreferences
    if (authSecurityPreferences && typeof authSecurityPreferences === 'object') {
      return normalizeAdminSecurityPreferences(authSecurityPreferences)
    }
  }
  if (typeof localStorage === 'undefined') {
    return normalizeAdminSecurityPreferences()
  }
  const storageKey = getAdminSecurityStorageKey(email)
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || 'null')
    return normalizeAdminSecurityPreferences(parsed)
  } catch {
    return normalizeAdminSecurityPreferences()
  }
}

export const isAdminNotificationSoundEnabled = (email = '') => (
  readAdminSecurityPreferences(email).notificationSoundEnabled !== false
)
