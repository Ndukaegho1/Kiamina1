const CLIENT_RESOLVED_DOCUMENTS_STORAGE_KEY = 'kiaminaClientResolvedDocuments'
const RESOLVED_DOCUMENTS_SYNC_EVENT = 'kiamina:resolved-documents-sync'

const safeParseJson = (rawValue, fallback) => {
  try {
    const parsed = rawValue ? JSON.parse(rawValue) : fallback
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

const toTrimmedString = (value = '') => String(value || '').trim()

const toNormalizedEmail = (value = '') => toTrimmedString(value).toLowerCase()

const toIsoTimestamp = (value = '') => {
  const parsed = Date.parse(value || '')
  if (!Number.isFinite(parsed)) return ''
  return new Date(parsed).toISOString()
}

const toUpperExtension = (value = '') => (
  toTrimmedString(value)
    .replace(/^\./, '')
    .toUpperCase()
)

const resolveExtensionFromFilename = (filename = '') => {
  const normalized = toTrimmedString(filename)
  if (!normalized) return ''
  const lastDotIndex = normalized.lastIndexOf('.')
  if (lastDotIndex === -1 || lastDotIndex === normalized.length - 1) return ''
  return toUpperExtension(normalized.slice(lastDotIndex + 1))
}

const resolveScopedStorageKey = (email = '') => {
  const normalizedEmail = toNormalizedEmail(email)
  if (!normalizedEmail) return CLIENT_RESOLVED_DOCUMENTS_STORAGE_KEY
  return `${CLIENT_RESOLVED_DOCUMENTS_STORAGE_KEY}:${normalizedEmail}`
}

const sortResolvedDocuments = (rows = []) => (
  (Array.isArray(rows) ? rows : [])
    .slice()
    .sort((left, right) => {
      const rightTime = Date.parse(right?.sentAtIso || right?.createdAtIso || '') || 0
      const leftTime = Date.parse(left?.sentAtIso || left?.createdAtIso || '') || 0
      return rightTime - leftTime
    })
)

const normalizeResolvedDocumentRow = (row = {}, index = 0, email = '') => {
  const normalizedClientEmail = toNormalizedEmail(row.clientEmail || email)
  const fileId = toTrimmedString(row.fileId) || `RSDOC-${Date.now()}-${index + 1}`
  const sentAtIso = toIsoTimestamp(row.sentAtIso || row.createdAtIso) || new Date().toISOString()
  const signatureAtIso = toIsoTimestamp(row.signatureAtIso || row.signedAtIso || sentAtIso)
  const filename = toTrimmedString(row.filename || row.fileName || row.title || 'Resolved Document')
  const extension = toUpperExtension(row.extension) || resolveExtensionFromFilename(filename)
  const recordId = toTrimmedString(row.id) || `RSD-${fileId}`

  return {
    id: recordId,
    fileId,
    clientEmail: normalizedClientEmail,
    title: toTrimmedString(row.title || filename || 'Resolved Document'),
    notes: toTrimmedString(row.notes || row.description || ''),
    ticketReference: toTrimmedString(row.ticketReference || row.issueReference || ''),
    filename,
    extension,
    mimeType: toTrimmedString(row.mimeType || row.type || 'application/octet-stream'),
    size: Number(row.size || 0),
    fileCacheKey: toTrimmedString(row.fileCacheKey),
    status: toTrimmedString(row.status || 'sent') || 'sent',
    sentAtIso,
    sentByName: toTrimmedString(row.sentByName || row.adminName || row.uploadedBy || 'Admin User'),
    sentByEmail: toNormalizedEmail(row.sentByEmail || row.adminEmail || ''),
    signatureName: toTrimmedString(row.signatureName || row.signedBy || row.sentByName || 'Admin User'),
    signatureAtIso,
    signatureMode: toTrimmedString(row.signatureMode || 'typed') || 'typed',
    downloadCount: Math.max(0, Number(row.downloadCount || 0)),
    lastDownloadedAtIso: toIsoTimestamp(row.lastDownloadedAtIso || ''),
  }
}

const emitResolvedDocumentsSync = (email = '') => {
  if (typeof window === 'undefined') return
  const detail = { email: toNormalizedEmail(email) }
  window.dispatchEvent(new CustomEvent(RESOLVED_DOCUMENTS_SYNC_EVENT, { detail }))
}

export const readResolvedDocumentsForClient = (email = '') => {
  if (typeof localStorage === 'undefined') return []
  const normalizedEmail = toNormalizedEmail(email)
  if (!normalizedEmail) return []

  const scopedKey = resolveScopedStorageKey(normalizedEmail)
  const scopedValue = safeParseJson(localStorage.getItem(scopedKey), null)
  const fallbackValue = safeParseJson(localStorage.getItem(CLIENT_RESOLVED_DOCUMENTS_STORAGE_KEY), null)
  const source = Array.isArray(scopedValue)
    ? scopedValue
    : (Array.isArray(fallbackValue) ? fallbackValue : [])

  const normalizedRows = source
    .map((row, index) => normalizeResolvedDocumentRow(row, index, normalizedEmail))
    .filter((row) => row.clientEmail === normalizedEmail || !row.clientEmail)
    .map((row) => ({ ...row, clientEmail: normalizedEmail }))

  return sortResolvedDocuments(normalizedRows)
}

export const writeResolvedDocumentsForClient = (email = '', rows = []) => {
  if (typeof localStorage === 'undefined') return []
  const normalizedEmail = toNormalizedEmail(email)
  if (!normalizedEmail) return []

  const normalizedRows = sortResolvedDocuments(
    (Array.isArray(rows) ? rows : []).map((row, index) => (
      normalizeResolvedDocumentRow(row, index, normalizedEmail)
    )),
  )
  localStorage.setItem(resolveScopedStorageKey(normalizedEmail), JSON.stringify(normalizedRows))
  emitResolvedDocumentsSync(normalizedEmail)
  return normalizedRows
}

export const appendResolvedDocumentForClient = (email = '', row = {}) => {
  const normalizedEmail = toNormalizedEmail(email)
  if (!normalizedEmail) return []
  const existingRows = readResolvedDocumentsForClient(normalizedEmail)
  const incomingRow = normalizeResolvedDocumentRow(row, existingRows.length, normalizedEmail)
  const dedupedRows = [incomingRow, ...existingRows.filter((item) => item.id !== incomingRow.id)]
  return writeResolvedDocumentsForClient(normalizedEmail, dedupedRows)
}

export const markResolvedDocumentDownloaded = (email = '', identifier = '') => {
  const normalizedEmail = toNormalizedEmail(email)
  const normalizedIdentifier = toTrimmedString(identifier)
  if (!normalizedEmail || !normalizedIdentifier) return []
  const existingRows = readResolvedDocumentsForClient(normalizedEmail)
  const nextTimestampIso = new Date().toISOString()
  const updatedRows = existingRows.map((row) => {
    const matches = row.id === normalizedIdentifier || row.fileId === normalizedIdentifier
    if (!matches) return row
    return {
      ...row,
      downloadCount: Math.max(0, Number(row.downloadCount || 0)) + 1,
      lastDownloadedAtIso: nextTimestampIso,
    }
  })
  return writeResolvedDocumentsForClient(normalizedEmail, updatedRows)
}

export {
  CLIENT_RESOLVED_DOCUMENTS_STORAGE_KEY,
  RESOLVED_DOCUMENTS_SYNC_EVENT,
}
