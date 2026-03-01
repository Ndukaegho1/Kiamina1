const INVALID_DOWNLOAD_CHARS_PATTERN = /[<>:"/\\|?*\u0000-\u001F]/g
const MULTI_SPACE_PATTERN = /\s+/g

const sanitizeDownloadPart = (value = '', fallback = '') => {
  const normalized = String(value || '')
    .replace(INVALID_DOWNLOAD_CHARS_PATTERN, ' ')
    .replace(MULTI_SPACE_PATTERN, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
  return normalized || String(fallback || '').trim()
}

export const buildClientDownloadFilename = ({
  businessName = '',
  fileName = '',
  fallbackFileName = 'document',
} = {}) => {
  const safeFileName = sanitizeDownloadPart(fileName, sanitizeDownloadPart(fallbackFileName, 'document'))
  const safeBusinessName = sanitizeDownloadPart(businessName, '')
  return safeBusinessName ? `${safeBusinessName} - ${safeFileName}` : safeFileName
}
