const FILE_CACHE_DB_NAME = 'kiaminaFileCache'
const FILE_CACHE_DB_VERSION = 1
const FILE_CACHE_STORE_NAME = 'fileBlobs'

const supportsIndexedDb = () => (
  typeof window !== 'undefined'
  && typeof window.indexedDB !== 'undefined'
)

const openFileCacheDb = () => new Promise((resolve) => {
  if (!supportsIndexedDb()) {
    resolve(null)
    return
  }

  let request
  try {
    request = window.indexedDB.open(FILE_CACHE_DB_NAME, FILE_CACHE_DB_VERSION)
  } catch {
    resolve(null)
    return
  }

  request.onupgradeneeded = () => {
    const db = request.result
    if (!db.objectStoreNames.contains(FILE_CACHE_STORE_NAME)) {
      db.createObjectStore(FILE_CACHE_STORE_NAME, { keyPath: 'key' })
    }
  }

  request.onsuccess = () => resolve(request.result)
  request.onerror = () => resolve(null)
})

const withStore = async (mode, callback) => {
  const db = await openFileCacheDb()
  if (!db) return null

  return new Promise((resolve) => {
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    try {
      const transaction = db.transaction(FILE_CACHE_STORE_NAME, mode)
      const store = transaction.objectStore(FILE_CACHE_STORE_NAME)
      callback(store, finish)
      transaction.oncomplete = () => finish(null)
      transaction.onerror = () => finish(null)
      transaction.onabort = () => finish(null)
    } catch {
      finish(null)
    }
  }).finally(() => {
    try {
      db.close()
    } catch {
      // ignore db close failures
    }
  })
}

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase()

export const buildFileCacheKey = ({ ownerEmail = '', fileId = '' } = {}) => {
  const normalizedFileId = String(fileId || '').trim()
  if (!normalizedFileId) return ''
  const normalizedOwnerEmail = normalizeEmail(ownerEmail)
  return normalizedOwnerEmail
    ? `${normalizedOwnerEmail}::${normalizedFileId}`
    : `anon::${normalizedFileId}`
}

export const putCachedFileBlob = async (key, blob, metadata = {}) => {
  const normalizedKey = String(key || '').trim()
  if (!normalizedKey) return false
  if (!(blob instanceof Blob)) return false

  const payload = {
    key: normalizedKey,
    blob,
    filename: String(metadata.filename || '').trim(),
    mimeType: String(blob.type || metadata.mimeType || '').trim(),
    size: Number(blob.size || metadata.size || 0),
    updatedAtIso: new Date().toISOString(),
  }

  const result = await withStore('readwrite', (store, finish) => {
    const request = store.put(payload)
    request.onsuccess = () => finish(true)
    request.onerror = () => finish(false)
  })

  return result === true
}

export const getCachedFileBlob = async (key) => {
  const normalizedKey = String(key || '').trim()
  if (!normalizedKey) return null

  const result = await withStore('readonly', (store, finish) => {
    const request = store.get(normalizedKey)
    request.onsuccess = () => {
      const value = request.result?.blob
      finish(value instanceof Blob ? value : null)
    }
    request.onerror = () => finish(null)
  })

  return result instanceof Blob ? result : null
}

export const deleteCachedFileBlob = async (key) => {
  const normalizedKey = String(key || '').trim()
  if (!normalizedKey) return false

  const result = await withStore('readwrite', (store, finish) => {
    const request = store.delete(normalizedKey)
    request.onsuccess = () => finish(true)
    request.onerror = () => finish(false)
  })

  return result === true
}
