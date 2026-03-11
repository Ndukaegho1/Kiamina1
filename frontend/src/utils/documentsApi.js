import { apiFetch } from './apiClient'

const parseJsonPayload = async (response) => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

const parseErrorMessage = async (response, fallback = 'Request failed.') => {
  const payload = await parseJsonPayload(response)
  return String(payload?.message || payload?.error || '').trim() || fallback
}

const parseFilenameFromDisposition = (value = '') => {
  const normalized = String(value || '').trim()
  if (!normalized) return ''

  const utf8Match = normalized.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]).trim()
    } catch {
      return utf8Match[1].trim()
    }
  }

  const quotedMatch = normalized.match(/filename="([^"]+)"/i)
  if (quotedMatch?.[1]) {
    return quotedMatch[1].trim()
  }

  const plainMatch = normalized.match(/filename=([^;]+)/i)
  return String(plainMatch?.[1] || '').trim()
}

export const uploadDocumentToBackend = async ({
  file,
  ownerUserId = '',
  category = 'other',
  className = '',
  metadata = {},
  tags = [],
} = {}) => {
  if (!(file instanceof Blob)) {
    throw new Error('A file is required before uploading.')
  }

  const formData = new FormData()
  formData.set('file', file)
  if (ownerUserId) formData.set('ownerUserId', String(ownerUserId || '').trim())
  formData.set('category', String(category || 'other').trim() || 'other')
  formData.set('className', String(className || '').trim())
  formData.set('metadata', JSON.stringify(metadata && typeof metadata === 'object' ? metadata : {}))
  if (Array.isArray(tags) && tags.length > 0) {
    formData.set('tags', JSON.stringify(tags.filter(Boolean)))
  }

  const response = await apiFetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, `Document upload failed (${response.status}).`))
  }

  return parseJsonPayload(response)
}

export const downloadDocumentBlobFromBackend = async (documentId = '') => {
  const normalizedDocumentId = String(documentId || '').trim()
  if (!normalizedDocumentId) {
    return { ok: false, status: 0, blob: null, fileName: '', contentType: '', message: 'Document ID is required.' }
  }

  const response = await apiFetch(`/api/documents/${encodeURIComponent(normalizedDocumentId)}/download`, {
    method: 'GET',
  })

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      blob: null,
      fileName: '',
      contentType: '',
      message: await parseErrorMessage(response, `Document download failed (${response.status}).`),
    }
  }

  const blob = await response.blob().catch(() => null)
  return {
    ok: blob instanceof Blob,
    status: response.status,
    blob: blob instanceof Blob ? blob : null,
    fileName: parseFilenameFromDisposition(response.headers.get('content-disposition') || ''),
    contentType: String(response.headers.get('content-type') || '').trim(),
    message: blob instanceof Blob ? '' : 'Unable to read downloaded file.',
  }
}

export const deleteDocumentFromBackend = async (documentId = '') => {
  const normalizedDocumentId = String(documentId || '').trim()
  if (!normalizedDocumentId) {
    return { ok: false, status: 0, message: 'Document ID is required.', data: null }
  }

  const response = await apiFetch(`/api/documents/${encodeURIComponent(normalizedDocumentId)}`, {
    method: 'DELETE',
  })
  const data = await parseJsonPayload(response)

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: String(data?.message || data?.error || '').trim() || `Document delete failed (${response.status}).`,
      data,
    }
  }

  return {
    ok: true,
    status: response.status,
    message: String(data?.message || '').trim(),
    data,
  }
}
