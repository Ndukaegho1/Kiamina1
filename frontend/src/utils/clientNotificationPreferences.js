import { getScopedStorageKey } from './storage'

export const CLIENT_NOTIFICATION_SETTINGS_STORAGE_KEY = 'notificationSettings'

export const DEFAULT_CLIENT_NOTIFICATION_SETTINGS = Object.freeze({
  inAppEnabled: true,
  soundEnabled: true,
  documentApproved: true,
  documentRejected: true,
  documentInfoRequested: true,
  verificationUpdates: true,
  accountSuspended: true,
  adminMessages: true,
  securityAlerts: true,
  emailNewUploads: true,
  emailApprovals: true,
  emailWeeklySummary: false,
  emailComplianceReminders: true,
  emailSecurityAlerts: true,
})

const DOCUMENT_NOTIFICATION_PAGE_IDS = new Set(['expenses', 'sales', 'bank-statements'])

const toBoolean = (value, fallback) => (
  value === undefined ? Boolean(fallback) : Boolean(value)
)

const withLegacyMirrorFields = (settings = {}) => ({
  ...settings,
  newUploads: Boolean(settings.emailNewUploads),
  approvals: Boolean(settings.emailApprovals),
  weeklySummary: Boolean(settings.emailWeeklySummary),
  compliance: Boolean(settings.emailComplianceReminders),
  security: Boolean(settings.emailSecurityAlerts),
})

export const normalizeClientNotificationSettings = (payload = {}) => {
  const safePayload = payload && typeof payload === 'object' ? payload : {}
  const emailApprovals = toBoolean(safePayload.emailApprovals, safePayload.approvals ?? DEFAULT_CLIENT_NOTIFICATION_SETTINGS.emailApprovals)
  const emailWeeklySummary = toBoolean(
    safePayload.emailWeeklySummary,
    safePayload.weeklySummary ?? DEFAULT_CLIENT_NOTIFICATION_SETTINGS.emailWeeklySummary,
  )
  const emailComplianceReminders = toBoolean(
    safePayload.emailComplianceReminders,
    safePayload.compliance ?? DEFAULT_CLIENT_NOTIFICATION_SETTINGS.emailComplianceReminders,
  )
  const emailSecurityAlerts = toBoolean(
    safePayload.emailSecurityAlerts,
    safePayload.security ?? DEFAULT_CLIENT_NOTIFICATION_SETTINGS.emailSecurityAlerts,
  )

  return withLegacyMirrorFields({
    inAppEnabled: toBoolean(safePayload.inAppEnabled, DEFAULT_CLIENT_NOTIFICATION_SETTINGS.inAppEnabled),
    soundEnabled: toBoolean(safePayload.soundEnabled, DEFAULT_CLIENT_NOTIFICATION_SETTINGS.soundEnabled),
    documentApproved: toBoolean(safePayload.documentApproved, emailApprovals),
    documentRejected: toBoolean(safePayload.documentRejected, emailApprovals),
    documentInfoRequested: toBoolean(safePayload.documentInfoRequested, emailApprovals),
    verificationUpdates: toBoolean(safePayload.verificationUpdates, emailComplianceReminders),
    accountSuspended: toBoolean(safePayload.accountSuspended, emailComplianceReminders),
    adminMessages: toBoolean(safePayload.adminMessages, DEFAULT_CLIENT_NOTIFICATION_SETTINGS.adminMessages),
    securityAlerts: toBoolean(safePayload.securityAlerts, emailSecurityAlerts),
    emailNewUploads: toBoolean(
      safePayload.emailNewUploads,
      safePayload.newUploads ?? DEFAULT_CLIENT_NOTIFICATION_SETTINGS.emailNewUploads,
    ),
    emailApprovals,
    emailWeeklySummary,
    emailComplianceReminders,
    emailSecurityAlerts,
  })
}

const tryParseSettings = (rawValue = '') => {
  try {
    const parsed = JSON.parse(rawValue)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export const readClientNotificationSettings = (email = '') => {
  if (typeof localStorage === 'undefined') {
    return normalizeClientNotificationSettings()
  }
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const scopedKey = getScopedStorageKey(CLIENT_NOTIFICATION_SETTINGS_STORAGE_KEY, normalizedEmail)
  const keysToCheck = scopedKey === CLIENT_NOTIFICATION_SETTINGS_STORAGE_KEY
    ? [CLIENT_NOTIFICATION_SETTINGS_STORAGE_KEY]
    : [scopedKey, CLIENT_NOTIFICATION_SETTINGS_STORAGE_KEY]
  for (const key of keysToCheck) {
    const parsed = tryParseSettings(localStorage.getItem(key) || '')
    if (!parsed) continue
    return normalizeClientNotificationSettings(parsed)
  }
  return normalizeClientNotificationSettings()
}

export const persistClientNotificationSettings = (email = '', payload = {}) => {
  const normalizedSettings = normalizeClientNotificationSettings(payload)
  if (typeof localStorage === 'undefined') return normalizedSettings
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const scopedKey = getScopedStorageKey(CLIENT_NOTIFICATION_SETTINGS_STORAGE_KEY, normalizedEmail)
  localStorage.setItem(scopedKey, JSON.stringify(normalizedSettings))
  return normalizedSettings
}

const isDocumentNotificationContext = (entry = {}) => {
  const linkPage = String(entry?.linkPage || '').trim().toLowerCase()
  const categoryId = String(entry?.categoryId || '').trim().toLowerCase()
  const title = String(entry?.title || '').trim().toLowerCase()
  return DOCUMENT_NOTIFICATION_PAGE_IDS.has(linkPage)
    || DOCUMENT_NOTIFICATION_PAGE_IDS.has(categoryId)
    || title.includes('document')
}

export const isClientNotificationEnabled = (entry = {}, settingsInput = {}) => {
  const type = String(entry?.type || '').trim().toLowerCase()
  const isForcedAdminMessage = (
    type === 'admin-notification'
    && (
      entry?.forceDelivery === true
      || String(entry?.forceDelivery || '').trim().toLowerCase() === 'true'
    )
  )
  if (isForcedAdminMessage) return true

  const settings = normalizeClientNotificationSettings(settingsInput)
  if (!settings.inAppEnabled) return false

  const isDocumentUpdate = isDocumentNotificationContext(entry)

  if (type === 'admin-notification') return Boolean(settings.adminMessages)
  if (type === 'suspended') return Boolean(settings.accountSuspended)
  if (type === 'security') return Boolean(settings.securityAlerts)
  if (type === 'approved') return isDocumentUpdate ? Boolean(settings.documentApproved) : Boolean(settings.verificationUpdates)
  if (type === 'rejected') return isDocumentUpdate ? Boolean(settings.documentRejected) : Boolean(settings.verificationUpdates)
  if (type === 'info' || type === 'status') {
    return isDocumentUpdate ? Boolean(settings.documentInfoRequested) : Boolean(settings.verificationUpdates)
  }

  return true
}

export const isClientNotificationSoundEnabled = (settingsInput = {}) => {
  const settings = normalizeClientNotificationSettings(settingsInput)
  return Boolean(settings.inAppEnabled && settings.soundEnabled)
}
