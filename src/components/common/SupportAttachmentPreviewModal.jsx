import { Download, ExternalLink, X } from 'lucide-react'

function SupportAttachmentPreviewModal({
  preview = null,
  onClose,
}) {
  if (!preview) return null

  const {
    kind = 'file',
    name = 'Attachment',
    text = '',
    rows = [],
    sheetName = '',
    truncated = false,
    objectUrl = '',
    message = '',
  } = preview

  const showObjectPreview = Boolean(objectUrl)
  const showTextPreview = (kind === 'text' || kind === 'word' || kind === 'presentation') && typeof text === 'string'
  const showSpreadsheetPreview = kind === 'spreadsheet' && Array.isArray(rows)
  const showImagePreview = showObjectPreview && kind === 'image'
  const showPdfPreview = showObjectPreview && kind === 'pdf'
  const showVideoPreview = showObjectPreview && kind === 'video'
  const showAudioPreview = showObjectPreview && kind === 'audio'
  const showGenericObjectPreview = showObjectPreview
    && !showImagePreview
    && !showPdfPreview
    && !showVideoPreview
    && !showAudioPreview
  const shouldShowFallback = !showObjectPreview && !showTextPreview && !showSpreadsheetPreview

  return (
    <div className="fixed inset-0 z-[250] bg-black/45 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-4xl max-h-[92vh] bg-white border border-border-light rounded-xl shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-light bg-background/70 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{name}</p>
          </div>
          <div className="flex items-center gap-2">
            {showObjectPreview && (
              <a
                href={objectUrl}
                target="_blank"
                rel="noreferrer"
                download={name}
                className="h-8 px-2.5 rounded border border-border text-xs font-medium text-text-primary hover:bg-background inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded border border-border-light text-text-secondary hover:text-text-primary hover:bg-white"
            >
              <X className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4 max-h-[calc(92vh-64px)] overflow-auto bg-white">
          {showImagePreview && (
            <img src={objectUrl} alt={name} className="max-w-full max-h-[78vh] mx-auto rounded-md border border-border-light" />
          )}
          {showPdfPreview && (
            <iframe title={name} src={objectUrl} className="w-full h-[72vh] rounded-md border border-border-light" />
          )}
          {showVideoPreview && (
            <video controls src={objectUrl} className="w-full max-h-[78vh] rounded-md border border-border-light bg-black" />
          )}
          {showAudioPreview && (
            <div className="rounded-md border border-border-light p-4">
              <audio controls src={objectUrl} className="w-full" />
            </div>
          )}
          {showTextPreview && (
            <pre className="w-full whitespace-pre-wrap break-words text-xs sm:text-sm text-text-primary bg-background rounded-md border border-border-light p-3">
              {text || '(No text content found)'}
            </pre>
          )}
          {showSpreadsheetPreview && (
            <div className="rounded-md border border-border-light overflow-auto">
              <div className="px-3 py-2 border-b border-border-light bg-background text-xs text-text-secondary">
                Sheet: {sheetName || 'Sheet1'}
              </div>
              {rows.length === 0 ? (
                <div className="px-3 py-4 text-sm text-text-muted">No spreadsheet rows available.</div>
              ) : (
                <table className="min-w-full text-xs sm:text-sm">
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={`row-${rowIndex}`} className="border-b border-border-light">
                        {row.map((cell, cellIndex) => (
                          <td key={`cell-${rowIndex}-${cellIndex}`} className="px-2 py-1.5 text-text-primary align-top whitespace-pre-wrap break-words max-w-[240px]">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {truncated && (
                <div className="px-3 py-2 text-xs text-text-muted border-t border-border-light bg-background">
                  Preview truncated to the first rows.
                </div>
              )}
            </div>
          )}
          {showGenericObjectPreview && (
            <div className="rounded-md border border-border-light p-4 text-sm text-text-secondary">
              <p>{message || 'Preview is limited for this file type.'}</p>
              <a
                href={objectUrl}
                target="_blank"
                rel="noreferrer"
                download={name}
                className="mt-2 inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Open or Download
              </a>
            </div>
          )}
          {shouldShowFallback && (
            <div className="rounded-md border border-border-light p-4 text-sm text-text-secondary">
              {message || 'Preview is unavailable for this attachment.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SupportAttachmentPreviewModal
