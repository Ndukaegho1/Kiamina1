import {
  buildFileCacheKey,
  getCachedFileBlob,
  putCachedFileBlob,
} from './fileCache'
import JSZip from 'jszip'
import * as XLSX from 'xlsx'

const MAX_INLINE_DATA_URL_BYTES = 2 * 1024 * 1024

const toTrimmedValue = (value = '') => String(value || '').trim()
const toEmail = (value = '') => toTrimmedValue(value).toLowerCase()
const toLowerName = (value = '') => toTrimmedValue(value).toLowerCase()

const decodeHtmlEntities = (value = '') => (
  String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
)

const getExtension = (filename = '') => {
  const normalized = toLowerName(filename)
  const dotIndex = normalized.lastIndexOf('.')
  if (dotIndex < 0) return ''
  return normalized.slice(dotIndex + 1)
}

const readFileAsDataUrl = (file) => new Promise((resolve) => {
  if (!(file instanceof Blob)) {
    resolve('')
    return
  }
  try {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => resolve('')
    reader.readAsDataURL(file)
  } catch {
    resolve('')
  }
})

const dataUrlToBlob = async (dataUrl = '') => {
  const normalized = toTrimmedValue(dataUrl)
  if (!normalized.startsWith('data:')) return null
  try {
    const response = await fetch(normalized)
    const blob = await response.blob()
    return blob instanceof Blob ? blob : null
  } catch {
    return null
  }
}

const buildSupportAttachmentId = (prefix = 'ATT') => (
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`
)

export const getSupportAttachmentKind = (mimeType = '', fileName = '') => {
  const normalizedMime = toTrimmedValue(mimeType).toLowerCase()
  const extension = getExtension(fileName)
  if (['docx', 'doc'].includes(extension)) return 'word'
  if (['xlsx', 'xls'].includes(extension)) return 'spreadsheet'
  if (['pptx', 'ppt'].includes(extension)) return 'presentation'
  if (['csv'].includes(extension)) return 'text'
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) return 'image'
  if (['pdf'].includes(extension)) return 'pdf'
  if (['mp4', 'webm', 'mov', 'mkv'].includes(extension)) return 'video'
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) return 'audio'
  if (['txt', 'md', 'json', 'xml', 'log'].includes(extension)) return 'text'

  if (normalizedMime.startsWith('image/')) return 'image'
  if (normalizedMime === 'application/pdf') return 'pdf'
  if (normalizedMime.startsWith('video/')) return 'video'
  if (normalizedMime.startsWith('audio/')) return 'audio'
  if (normalizedMime.includes('wordprocessingml') || normalizedMime.includes('msword')) return 'word'
  if (normalizedMime.includes('spreadsheetml') || normalizedMime.includes('excel')) return 'spreadsheet'
  if (normalizedMime.includes('presentationml') || normalizedMime.includes('powerpoint')) return 'presentation'
  if (
    normalizedMime.startsWith('text/')
    || normalizedMime.includes('json')
    || normalizedMime.includes('xml')
    || normalizedMime.includes('csv')
  ) return 'text'
  return 'file'
}

export const createSupportAttachmentsFromFiles = async (
  fileList,
  {
    ownerEmail = '',
    maxCount = 5,
  } = {},
) => {
  const isFileLikeBlob = (file) => (
    Boolean(file)
    && typeof file === 'object'
    && typeof file.arrayBuffer === 'function'
    && Number.isFinite(Number(file.size))
  )

  const files = Array.from(fileList || [])
    .filter((file) => isFileLikeBlob(file))
    .slice(0, Math.max(1, Number(maxCount) || 5))

  const normalizedOwnerEmail = toEmail(ownerEmail) || 'support-chat'

  return Promise.all(files.map(async (file, index) => {
    const fileId = buildSupportAttachmentId(`SUPFILE${index}`)
    const cacheKey = buildFileCacheKey({
      ownerEmail: normalizedOwnerEmail,
      fileId,
    })

    let storedToCache = false
    try {
      storedToCache = await putCachedFileBlob(cacheKey, file, {
        filename: file.name || `attachment-${index + 1}`,
        mimeType: file.type || 'application/octet-stream',
        size: Number(file.size || 0),
      })
    } catch {
      storedToCache = false
    }

    let previewDataUrl = ''
    if (!storedToCache && Number(file.size || 0) <= MAX_INLINE_DATA_URL_BYTES) {
      previewDataUrl = await readFileAsDataUrl(file)
    }

    return {
      id: buildSupportAttachmentId('ATT'),
      name: file.name || `attachment-${index + 1}`,
      type: file.type || 'application/octet-stream',
      size: Number(file.size || 0),
      cacheKey: storedToCache ? cacheKey : '',
      previewDataUrl,
    }
  }))
}

export const getSupportAttachmentBlob = async (attachment = {}) => {
  const cacheKey = toTrimmedValue(attachment.cacheKey)
  if (cacheKey) {
    const cachedBlob = await getCachedFileBlob(cacheKey)
    if (cachedBlob instanceof Blob) return cachedBlob
  }

  const previewDataUrl = toTrimmedValue(attachment.previewDataUrl)
  if (previewDataUrl) {
    return dataUrlToBlob(previewDataUrl)
  }
  return null
}

const parseSpreadsheetPreview = async (blob) => {
  const arrayBuffer = await blob.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames?.[0] || ''
  if (!firstSheetName || !workbook.Sheets?.[firstSheetName]) {
    return {
      sheetName: '',
      rows: [],
      truncated: false,
    }
  }
  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    header: 1,
    defval: '',
    blankrows: false,
  })
  const normalizedRows = (Array.isArray(rawRows) ? rawRows : [])
    .slice(0, 60)
    .map((row) => (
      Array.isArray(row)
        ? row.slice(0, 20).map((cell) => String(cell ?? ''))
        : [String(row ?? '')]
    ))
  return {
    sheetName: firstSheetName,
    rows: normalizedRows,
    truncated: (Array.isArray(rawRows) ? rawRows.length : 0) > 60,
  }
}

const extractOpenXmlText = (xml = '') => {
  const normalizedXml = String(xml || '')
  if (!normalizedXml) return ''

  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(normalizedXml, 'application/xml')
      const paragraphNodes = Array.from(doc.getElementsByTagNameNS('*', 'p'))
      const paragraphText = paragraphNodes
        .map((paragraphNode) => (
          Array.from(paragraphNode.getElementsByTagNameNS('*', 't'))
            .map((textNode) => toTrimmedValue(textNode?.textContent || ''))
            .filter(Boolean)
            .join(' ')
            .trim()
        ))
        .filter(Boolean)
      if (paragraphText.length > 0) return paragraphText.join('\n')

      const textNodes = Array.from(doc.getElementsByTagNameNS('*', 't'))
        .map((textNode) => toTrimmedValue(textNode?.textContent || ''))
        .filter(Boolean)
      if (textNodes.length > 0) return textNodes.join('\n')
    } catch {
      // Fallback to regex-based extraction below.
    }
  }

  return decodeHtmlEntities(
    normalizedXml
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

const parseDocxPreviewText = async (blob) => {
  const arrayBuffer = await blob.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)
  const mainFile = zip.file('word/document.xml')
  if (!mainFile) return ''
  const xml = await mainFile.async('string')
  return extractOpenXmlText(xml)
}

const parsePptxPreviewText = async (blob) => {
  const arrayBuffer = await blob.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)
  const slideFiles = Object.keys(zip.files)
    .filter((fileName) => /^ppt\/slides\/slide\d+\.xml$/i.test(fileName))
    .sort((left, right) => {
      const leftIndex = Number(left.match(/slide(\d+)\.xml/i)?.[1] || 0)
      const rightIndex = Number(right.match(/slide(\d+)\.xml/i)?.[1] || 0)
      return leftIndex - rightIndex
    })
    .slice(0, 30)
  if (slideFiles.length === 0) return ''

  const slideTexts = await Promise.all(slideFiles.map(async (fileName, index) => {
    const xml = await zip.file(fileName)?.async('string')
    const text = extractOpenXmlText(xml || '')
    if (!text) return ''
    return `Slide ${index + 1}\n${text}`
  }))

  return slideTexts.filter(Boolean).join('\n\n')
}

const buildBlobObjectPreview = ({
  kind = 'file',
  name = 'Attachment',
  type = 'application/octet-stream',
  size = 0,
  blob = null,
  message = '',
} = {}) => {
  if (!(blob instanceof Blob)) {
    return {
      ok: false,
      message: message || 'Unable to load this attachment preview.',
    }
  }
  return {
    ok: true,
    kind,
    name,
    type,
    size,
    message,
    objectUrl: URL.createObjectURL(blob),
  }
}

export const buildSupportAttachmentPreview = async (attachment = {}) => {
  const name = toTrimmedValue(attachment.name) || 'Attachment'
  const type = toTrimmedValue(attachment.type) || 'application/octet-stream'
  const size = Number(attachment.size || 0)
  const kind = getSupportAttachmentKind(type, name)
  const blob = await getSupportAttachmentBlob(attachment)

  if (!(blob instanceof Blob)) {
    return {
      ok: false,
      message: 'Unable to load this attachment preview.',
    }
  }

  if (kind === 'text') {
    try {
      const text = await blob.text()
      return {
        ok: true,
        kind,
        name,
        type,
        size,
        text: String(text || '').slice(0, 250000),
      }
    } catch {
      return {
        ok: false,
        message: 'Unable to preview this text file.',
      }
    }
  }

  if (kind === 'spreadsheet') {
    try {
      const spreadsheetPreview = await parseSpreadsheetPreview(blob)
      return {
        ok: true,
        kind,
        name,
        type,
        size,
        sheetName: spreadsheetPreview.sheetName,
        rows: spreadsheetPreview.rows,
        truncated: Boolean(spreadsheetPreview.truncated),
      }
    } catch {
      return buildBlobObjectPreview({
        kind,
        name,
        type,
        size,
        blob,
        message: 'Preview is limited for this spreadsheet. Open or download to view fully.',
      })
    }
  }

  if (kind === 'word') {
    const extension = getExtension(name)
    if (extension === 'doc') {
      return buildBlobObjectPreview({
        kind,
        name,
        type,
        size,
        blob,
        message: 'Preview for .doc files is limited. Open or download to view fully.',
      })
    }
    try {
      const text = await parseDocxPreviewText(blob)
      return {
        ok: true,
        kind,
        name,
        type,
        size,
        text: String(text || '').slice(0, 250000),
      }
    } catch {
      return buildBlobObjectPreview({
        kind,
        name,
        type,
        size,
        blob,
        message: 'Unable to extract text preview. Open or download this Word document.',
      })
    }
  }

  if (kind === 'presentation') {
    const extension = getExtension(name)
    if (extension === 'ppt') {
      return buildBlobObjectPreview({
        kind,
        name,
        type,
        size,
        blob,
        message: 'Preview for .ppt files is limited. Open or download to view fully.',
      })
    }
    try {
      const text = await parsePptxPreviewText(blob)
      return {
        ok: true,
        kind,
        name,
        type,
        size,
        text: String(text || '').slice(0, 250000),
      }
    } catch {
      return buildBlobObjectPreview({
        kind,
        name,
        type,
        size,
        blob,
        message: 'Unable to extract text preview. Open or download this PowerPoint file.',
      })
    }
  }

  return buildBlobObjectPreview({
    kind,
    name,
    type,
    size,
    blob,
  })
}
