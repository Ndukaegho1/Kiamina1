export const normalizeEmailForStorage = (email = '') => email.trim().toLowerCase()

export const getScopedStorageKey = (baseKey, email) => {
  const normalizedEmail = normalizeEmailForStorage(email || '')
  return normalizedEmail ? `${baseKey}:${normalizedEmail}` : baseKey
}
