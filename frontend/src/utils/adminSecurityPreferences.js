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

export const readAdminSecurityPreferences = (email = '') => {
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
