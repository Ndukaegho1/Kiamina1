import { useEffect, useMemo, useState } from 'react'
import { Archive, ArrowRightLeft, ClipboardList, Download, Eye, Folder, FolderOpen, History, Info, Lock, Pencil, RotateCcw, Search, Trash2, X } from 'lucide-react'
import { FileViewerModal, StatusBadge } from './ClientDashboardViews'

const toDateAndTime = (value) => {
  const parsed = Date.parse(value || '')
  const source = Number.isFinite(parsed) ? new Date(parsed) : new Date()
  return {
    date: source.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    time: source.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
  }
}

const updateNestedFile = (records = [], folderId, fileId, updater) => (
  records.map((record) => {
    if (!record?.isFolder || record.id !== folderId) return record
    return {
      ...record,
      files: (record.files || []).map((file) => (
        file.fileId === fileId ? updater(file) : file
      )),
    }
  })
)

const updateNestedFiles = (records = [], folderId, fileIds = [], updater) => {
  const targetIds = new Set(fileIds)
  return records.map((record) => {
    if (!record?.isFolder || record.id !== folderId) return record
    return {
      ...record,
      files: (record.files || []).map((file) => (
        targetIds.has(file.fileId) ? updater(file) : file
      )),
    }
  })
}

const createFolderId = () => `F-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`

const createFolderRecord = ({ folderName, categoryLabel, user = 'Client User' }) => {
  const createdAtIso = new Date().toISOString()
  return {
    id: createFolderId(),
    isFolder: true,
    archived: false,
    folderName,
    category: categoryLabel,
    user,
    createdAtIso,
    createdAtDisplay: new Date(createdAtIso).toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
    date: new Date(createdAtIso).toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
    files: [],
  }
}

const normalizeActivityValue = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  return String(value).trim()
}

const collectEditedFieldLabels = (previousFile = {}, updatedFile = {}) => {
  const changed = []
  const registerChange = (label, previousValue, nextValue) => {
    if (normalizeActivityValue(previousValue) !== normalizeActivityValue(nextValue)) {
      changed.push(label)
    }
  }

  registerChange('File Name', previousFile.filename, updatedFile.filename)
  registerChange('Uploaded By', previousFile.user, updatedFile.user)
  registerChange(
    'Class',
    previousFile.class || previousFile.expenseClass || previousFile.salesClass || '',
    updatedFile.class || updatedFile.expenseClass || updatedFile.salesClass || '',
  )
  registerChange('Vendor', previousFile.vendorName, updatedFile.vendorName)
  registerChange('Confidentiality', previousFile.confidentialityLevel, updatedFile.confidentialityLevel)
  registerChange('Priority', previousFile.processingPriority, updatedFile.processingPriority)
  registerChange('Notes', previousFile.internalNotes, updatedFile.internalNotes)
  registerChange('Expense Date', previousFile.expenseDate, updatedFile.expenseDate)
  registerChange('Payment Method', previousFile.paymentMethod, updatedFile.paymentMethod)
  registerChange('Customer', previousFile.customerName, updatedFile.customerName)
  registerChange('Invoice Number', previousFile.invoiceNumber, updatedFile.invoiceNumber)
  registerChange('Bank Name', previousFile.bankName, updatedFile.bankName)
  registerChange('Account Name', previousFile.accountName, updatedFile.accountName)
  registerChange('Account Last 4', previousFile.accountLast4, updatedFile.accountLast4)
  registerChange('Statement Start Date', previousFile.statementStartDate, updatedFile.statementStartDate)
  registerChange('Statement End Date', previousFile.statementEndDate, updatedFile.statementEndDate)
  registerChange('Description', previousFile.description, updatedFile.description)

  return changed
}

const buildFileSnapshot = (file = {}) => ({
  filename: file.filename || 'Document',
  extension: file.extension || (file.filename?.split('.').pop()?.toUpperCase() || 'FILE'),
  status: file.status || 'Pending Review',
  class: file.class || file.expenseClass || file.salesClass || '',
  folderId: file.folderId || '',
  folderName: file.folderName || '',
  previewUrl: file.previewUrl || null,
})

const appendFileVersionAndActivity = (file = {}, {
  action = 'Updated',
  actionType = 'info',
  description = '',
  performedBy = 'Client User',
  notes = '',
  timestampIso,
  filePatch = {},
} = {}) => {
  const nextTimestampIso = timestampIso || new Date().toISOString()
  const nextFile = {
    ...file,
    ...filePatch,
    updatedAtIso: nextTimestampIso,
  }
  const previousVersions = Array.isArray(nextFile.versions) ? nextFile.versions : []
  const previousLogs = Array.isArray(nextFile.activityLog) ? nextFile.activityLog : []
  const versionNumber = previousVersions.length + 1
  const versionEntry = {
    versionNumber,
    action,
    performedBy,
    timestamp: nextTimestampIso,
    notes,
    fileSnapshot: buildFileSnapshot(nextFile),
  }
  const activityEntry = {
    id: `FACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    actionType,
    description: description || action,
    performedBy,
    timestamp: nextTimestampIso,
  }
  const uploadInfo = {
    ...(nextFile.uploadInfo || {}),
    lastModifiedAtIso: nextTimestampIso,
  }
  return {
    ...nextFile,
    versions: [...previousVersions, versionEntry],
    activityLog: [...previousLogs, activityEntry],
    uploadInfo: {
      ...uploadInfo,
      totalVersions: versionNumber,
    },
  }
}

const appendFileActivityOnly = (file = {}, {
  actionType = 'info',
  description = 'File activity',
  performedBy = 'Client User',
  timestampIso,
} = {}) => {
  const nextTimestampIso = timestampIso || new Date().toISOString()
  const previousLogs = Array.isArray(file.activityLog) ? file.activityLog : []
  return {
    ...file,
    activityLog: [...previousLogs, {
      id: `FACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actionType,
      description,
      performedBy,
      timestamp: nextTimestampIso,
    }],
  }
}

const formatLogDateTime = (value) => {
  const parsed = Date.parse(value || '')
  const source = Number.isFinite(parsed) ? new Date(parsed) : new Date()
  return {
    date: source.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    time: source.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
  }
}

const getActivityColorClass = (actionType = '') => {
  const normalized = String(actionType).toLowerCase()
  if (normalized.includes('delete')) return 'text-red-600 bg-red-50 border-red-200'
  if (normalized.includes('restore')) return 'text-green-600 bg-green-50 border-green-200'
  if (normalized.includes('status')) return 'text-orange-600 bg-orange-50 border-orange-200'
  return 'text-[#153585] bg-[#153585]/10 border-[#153585]/20'
}

const toTimestampMs = (value = '') => {
  const parsed = Date.parse(value || '')
  return Number.isFinite(parsed) ? parsed : NaN
}

const toIsoDate = (date = new Date()) => {
  const source = date instanceof Date ? date : new Date(date)
  const year = source.getFullYear()
  const month = String(source.getMonth() + 1).padStart(2, '0')
  const day = String(source.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const clampFilterDateToToday = (value = '') => {
  const normalized = String(value || '').trim()
  if (!normalized) return ''
  const todayIso = toIsoDate(new Date())
  return normalized > todayIso ? todayIso : normalized
}

const endOfDayTimestampMs = (value = '') => {
  if (!value) return NaN
  const parsed = Date.parse(`${value}T23:59:59.999`)
  return Number.isFinite(parsed) ? parsed : NaN
}

const matchesDateRange = (value, fromValue = '', toValue = '') => {
  const normalizedFrom = clampFilterDateToToday(fromValue)
  const normalizedTo = clampFilterDateToToday(toValue)
  if (!normalizedFrom && !normalizedTo) return true
  const point = toTimestampMs(value)
  if (Number.isNaN(point)) return false
  const fromPoint = toTimestampMs(normalizedFrom)
  const toPoint = endOfDayTimestampMs(normalizedTo)
  if (normalizedFrom && point < fromPoint) return false
  if (normalizedTo && point > toPoint) return false
  return true
}

const isApprovedFileLocked = (file = {}) => {
  if (!file) return false
  return !file.isDeleted && (Boolean(file.isLocked) || String(file.status || '').trim().toLowerCase() === 'approved')
}

const PREVIEWABLE_EXTENSIONS = new Set([
  'PDF', 'PNG', 'JPG', 'JPEG', 'GIF', 'WEBP', 'BMP',
  'TXT', 'CSV', 'XLS', 'XLSX', 'XLSM', 'XLSB', 'DOC', 'DOCX', 'PPT', 'PPTX',
])
const PERSISTED_PREVIEW_MAX_BYTES = 3 * 1024 * 1024

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result || ''))
  reader.onerror = () => reject(new Error('Unable to read file'))
  reader.readAsDataURL(file)
})

const buildPreviewUrl = async (file, extension = '') => {
  const safeExt = String(extension || '').toUpperCase()
  if (!(file instanceof File)) return ''
  if (PREVIEWABLE_EXTENSIONS.has(safeExt) && file.size <= PERSISTED_PREVIEW_MAX_BYTES) {
    try {
      return await readFileAsDataUrl(file)
    } catch {
      return URL.createObjectURL(file)
    }
  }
  return URL.createObjectURL(file)
}

function BreadcrumbNav({ items = [] }) {
  const safeItems = Array.isArray(items) ? items : []
  const shouldCollapse = safeItems.length > 5
  const hiddenItems = shouldCollapse ? safeItems.slice(2, safeItems.length - 2) : []
  const visibleItems = shouldCollapse
    ? [safeItems[0], safeItems[1], { id: 'ellipsis', label: '...', isEllipsis: true }, ...safeItems.slice(-2)]
    : safeItems

  return (
    <div className="mb-4">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-text-secondary">
        {visibleItems.map((item, index) => {
          const isLast = index === visibleItems.length - 1
          return (
            <div key={item.id || `${item.label}-${index}`} className="inline-flex items-center gap-1">
              {item.isEllipsis ? (
                <span
                  title={hiddenItems.map((entry) => entry.label).join(' > ')}
                  className="px-1 text-text-muted cursor-help"
                >
                  ...
                </span>
              ) : item.onClick && !item.current ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="text-text-secondary hover:text-[#153585] hover:underline"
                >
                  {item.label}
                </button>
              ) : (
                <span className={item.current ? 'text-text-primary font-medium' : ''}>{item.label}</span>
              )}
              {!isLast && <span className="text-text-muted px-0.5">{'>'}</span>}
            </div>
          )
        })}
      </nav>
    </div>
  )
}

function FolderDetailsModal({ folder, onClose }) {
  const { date, time } = toDateAndTime(folder?.createdAtIso || folder?.date || folder?.createdAtDisplay || '')
  return (
    <div className="fixed inset-0 z-[220] bg-black/35 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white border border-border rounded-xl shadow-card p-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">Folder Details</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 border border-border rounded-md text-text-muted hover:text-text-primary">
            <X className="w-4 h-4 mx-auto" />
          </button>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Folder Name</p>
            <p className="text-text-primary font-medium mt-1">{folder?.folderName || 'Untitled Folder'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Folder ID</p>
            <p className="mt-1 inline-flex h-8 items-center px-2.5 rounded border border-border-light bg-background text-[12px] font-mono tracking-wide text-text-secondary">
              {folder?.id}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">Date Created</p>
              <p className="text-text-primary mt-1">{date}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">Time Created</p>
              <p className="text-text-primary mt-1">{time}</p>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Total Files</p>
            <p className="text-text-primary mt-1">{folder?.files?.length || 0}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FolderRenameModal({ folder, onCancel, onSave }) {
  const [nextName, setNextName] = useState(folder?.folderName || '')

  return (
    <div className="fixed inset-0 z-[220] bg-black/35 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="w-full max-w-md bg-white border border-border rounded-xl shadow-card p-6" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-semibold text-text-primary">Rename Folder</h3>
        <p className="text-sm text-text-secondary mt-1">Enter a new name for this folder.</p>
        <div className="mt-4">
          <input
            type="text"
            value={nextName}
            onChange={(event) => setNextName(event.target.value)}
            className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            placeholder="Folder name"
          />
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="h-9 px-4 border border-border rounded-md text-sm text-text-primary hover:bg-background">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(nextName.trim())}
            disabled={!nextName.trim()}
            className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function FolderActionConfirmModal({
  title,
  message,
  confirmLabel,
  confirmClassName,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[220] bg-black/35 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="w-full max-w-md bg-white border border-border rounded-xl shadow-card p-6" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="text-sm text-text-secondary mt-2">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="h-9 px-4 border border-border rounded-md text-sm text-text-primary hover:bg-background">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className={`h-9 px-4 text-white rounded-md text-sm font-medium ${confirmClassName}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function BulkDeleteModal({ selectedCount = 0, onCancel, onConfirm }) {
  return (
    <FolderActionConfirmModal
      title="Delete Selected Files"
      message="This action cannot be undone."
      confirmLabel={`Delete (${selectedCount})`}
      confirmClassName="bg-red-600 hover:bg-red-700"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}

function BulkSelectModal({
  title,
  description,
  label,
  options = [],
  value,
  onChange,
  onCancel,
  onApply,
  applyLabel = 'Apply',
}) {
  return (
    <div className="fixed inset-0 z-[220] bg-black/35 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="w-full max-w-md bg-white border border-border rounded-xl shadow-card p-6" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="text-sm text-text-secondary mt-1">{description}</p>
        <div className="mt-4">
          <label className="block text-xs uppercase tracking-wide text-text-muted mb-1">{label}</label>
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
          >
            <option value="">Select</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="h-9 px-4 border border-border rounded-md text-sm text-text-primary hover:bg-background">
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={!value}
            className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {applyLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function MoveFilesModal({
  folder,
  records = [],
  categoryTitle,
  selectedCount,
  onCancel,
  onConfirm,
}) {
  const [destinationFolderId, setDestinationFolderId] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const destinationFolders = useMemo(
    () => (records || []).filter((record) => record?.isFolder && !record.archived && record.id !== folder?.id),
    [records, folder?.id],
  )
  const createNew = destinationFolderId === '__create_new__'
  const canSubmit = createNew ? Boolean(newFolderName.trim()) : Boolean(destinationFolderId)

  return (
    <div className="fixed inset-0 z-[220] bg-black/35 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="w-full max-w-lg bg-white border border-border rounded-xl shadow-card p-6" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-semibold text-text-primary">Move Files</h3>
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Current Location</p>
            <p className="text-sm text-text-primary mt-1">{categoryTitle} {'>'} {folder?.folderName}</p>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-text-muted mb-1">Select Destination Folder</label>
            <select
              value={destinationFolderId}
              onChange={(event) => setDestinationFolderId(event.target.value)}
              className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            >
              <option value="">Choose destination</option>
              {destinationFolders.map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {destination.folderName}
                </option>
              ))}
              <option value="__create_new__">Create New Folder</option>
            </select>
          </div>
          {createNew && (
            <div>
              <label className="block text-xs uppercase tracking-wide text-text-muted mb-1">New Folder Name</label>
              <input
                type="text"
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                placeholder="Enter folder name"
              />
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="h-9 px-4 border border-border rounded-md text-sm text-text-primary hover:bg-background">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm({
              destinationFolderId,
              createNewFolderName: createNew ? newFolderName.trim() : '',
            })}
            disabled={!canSubmit}
            className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Move {selectedCount} File{selectedCount === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DesktopContextMenu({
  contextMenu,
  isArchived = false,
  onClose,
  onViewDetails,
  onRename,
  onArchive,
  onRestore,
  onDelete,
  onPermanentDelete,
}) {
  if (!contextMenu) return null
  return (
    <div
      className="fixed z-[230] w-44 bg-white border border-border rounded-md shadow-card py-1"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onMouseLeave={onClose}
    >
      <button type="button" onClick={onViewDetails} className="w-full h-9 px-3 text-left text-sm text-text-primary hover:bg-background inline-flex items-center gap-2">
        <Info className="w-4 h-4 text-text-muted" />
        View Details
      </button>
      {!isArchived && (
        <button type="button" onClick={onRename} className="w-full h-9 px-3 text-left text-sm text-text-primary hover:bg-background inline-flex items-center gap-2">
          <Pencil className="w-4 h-4 text-text-muted" />
          Rename
        </button>
      )}
      {isArchived ? (
        <>
          <button type="button" onClick={onRestore} className="w-full h-9 px-3 text-left text-sm text-text-primary hover:bg-background inline-flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-text-muted" />
            Restore
          </button>
          <button type="button" onClick={onPermanentDelete} className="w-full h-9 px-3 text-left text-sm text-error hover:bg-error-bg inline-flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Delete Permanently
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={onArchive} className="w-full h-9 px-3 text-left text-sm text-text-primary hover:bg-background inline-flex items-center gap-2">
            <Archive className="w-4 h-4 text-text-muted" />
            Archive Folder
          </button>
          <button type="button" onClick={onDelete} className="w-full h-9 px-3 text-left text-sm text-error hover:bg-error-bg inline-flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </>
      )}
    </div>
  )
}

function FileContextMenu({
  contextMenu,
  targetFile,
  isReadOnly = false,
  onClose,
  onOpenFile,
  onOpenFolder,
  onDownload,
  onViewDetails,
  onVersionHistory,
  onActivityLog,
  onDelete,
}) {
  if (!contextMenu || !targetFile) return null
  const isDeleted = Boolean(targetFile.isDeleted)
  return (
    <div
      className="fixed z-[240] w-52 bg-white border border-border rounded-md shadow-card py-1"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onMouseLeave={onClose}
    >
      {!isDeleted && (
        <>
          <button type="button" onClick={onOpenFile} className="w-full h-9 px-3 text-left text-sm text-text-primary hover:bg-background inline-flex items-center gap-2">
            <Eye className="w-4 h-4 text-text-muted" />
            Open File
          </button>
          <button type="button" onClick={onOpenFolder} className="w-full h-9 px-3 text-left text-sm text-text-primary hover:bg-background inline-flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-text-muted" />
            Open Containing Folder
          </button>
          <button type="button" onClick={onDownload} className="w-full h-9 px-3 text-left text-sm text-text-primary hover:bg-background inline-flex items-center gap-2">
            <Download className="w-4 h-4 text-text-muted" />
            Download
          </button>
        </>
      )}
      <button type="button" onClick={onViewDetails} className="w-full h-9 px-3 text-left text-sm text-text-primary hover:bg-background inline-flex items-center gap-2">
        <Info className="w-4 h-4 text-text-muted" />
        View Details
      </button>
      <button type="button" onClick={onVersionHistory} className="w-full h-9 px-3 text-left text-sm text-text-primary hover:bg-background inline-flex items-center gap-2">
        <History className="w-4 h-4 text-text-muted" />
        Version History
      </button>
      <button type="button" onClick={onActivityLog} className="w-full h-9 px-3 text-left text-sm text-text-primary hover:bg-background inline-flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-text-muted" />
        Activity Log
      </button>
      {!isDeleted && !isReadOnly && (
        <button type="button" onClick={onDelete} className="w-full h-9 px-3 text-left text-sm text-error hover:bg-error-bg inline-flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      )}
    </div>
  )
}

function SideDrawer({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[250] bg-black/35" onClick={onClose}>
      <aside
        className="absolute right-0 top-0 h-full w-[560px] max-w-[96vw] bg-white border-l border-border shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-full flex flex-col">
          <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
              {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} className="w-8 h-8 border border-border rounded-md text-text-secondary hover:text-text-primary">
              <X className="w-4 h-4 mx-auto" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </div>
      </aside>
    </div>
  )
}

function VersionHistoryDrawer({ file, onClose }) {
  const versions = Array.isArray(file?.versions) ? file.versions : []
  return (
    <SideDrawer
      title="Version History"
      subtitle={`${file?.filename || 'File'} (${versions.length} version${versions.length === 1 ? '' : 's'})`}
      onClose={onClose}
    >
      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F9FAFB]">
              <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Version</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Action</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">User</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Date</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Time</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Download</th>
            </tr>
          </thead>
          <tbody>
            {versions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-sm text-text-muted text-center">No version history available.</td>
              </tr>
            ) : (
              versions.slice().reverse().map((version) => {
                const { date, time } = formatLogDateTime(version.timestamp)
                const snapshot = version.fileSnapshot || {}
                const canDownload = Boolean(snapshot.previewUrl) && !file?.isDeleted
                return (
                  <tr key={`version-${version.versionNumber}-${version.timestamp}`} className="border-b border-border-light last:border-b-0">
                    <td className="px-3 py-2 text-sm text-text-primary">v{version.versionNumber}</td>
                    <td className="px-3 py-2 text-sm text-text-secondary">{version.action}</td>
                    <td className="px-3 py-2 text-sm text-text-secondary">{version.performedBy || '--'}</td>
                    <td className="px-3 py-2 text-sm text-text-secondary">{date}</td>
                    <td className="px-3 py-2 text-sm text-text-secondary">{time}</td>
                    <td className="px-3 py-2 text-sm">
                      {canDownload ? (
                        <a
                          href={snapshot.previewUrl}
                          download={snapshot.filename || file?.filename || 'document'}
                          className="inline-flex h-7 px-2.5 items-center rounded border border-border text-xs text-text-primary hover:bg-background"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-xs text-text-muted">Unavailable</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </SideDrawer>
  )
}

function FileActivityDrawer({ file, onClose }) {
  const entries = Array.isArray(file?.activityLog) ? [...file.activityLog].sort((a, b) => (Date.parse(b.timestamp || '') || 0) - (Date.parse(a.timestamp || '') || 0)) : []
  return (
    <SideDrawer
      title="File Activity Log"
      subtitle={file?.filename || 'File'}
      onClose={onClose}
    >
      <div className="space-y-3">
        {entries.length === 0 ? (
          <div className="text-sm text-text-muted">No activity records available.</div>
        ) : entries.map((entry) => {
          const { date, time } = formatLogDateTime(entry.timestamp)
          return (
            <div key={entry.id || `${entry.actionType}-${entry.timestamp}`} className="border border-border rounded-md p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-text-primary">{entry.description}</p>
                  <p className="text-xs text-text-muted mt-1">{entry.performedBy || '--'}</p>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded border text-[11px] uppercase tracking-wide ${getActivityColorClass(entry.actionType)}`}>
                  {entry.actionType || 'info'}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-2">{time} - {date}</p>
            </div>
          )
        })}
      </div>
    </SideDrawer>
  )
}

function DeletedFileActionModal({ mode = 'open', onClose }) {
  const isOpenAction = mode === 'open'
  return (
    <div className="fixed inset-0 z-[260] bg-black/35 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white border border-border rounded-xl shadow-card p-6" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-semibold text-text-primary">
          {isOpenAction ? 'File no longer available.' : 'Download unavailable'}
        </h3>
        <p className="text-sm text-text-secondary mt-2">
          {isOpenAction
            ? 'This file was deleted and cannot be opened.'
            : 'This file has been deleted and cannot be downloaded.'}
        </p>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function ApprovedLockNoticeModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[260] bg-black/35 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white border border-border rounded-xl shadow-card p-6" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-semibold text-text-primary">File Locked</h3>
        <p className="text-sm text-text-secondary mt-2">This file has been approved and is locked.</p>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function DocumentFoldersPage({
  categoryId,
  title,
  records = [],
  setRecords,
  onAddDocument,
  onOpenFolder,
  onLogActivity,
  onNavigateDashboard,
  isImpersonatingClient = false,
  impersonationBusinessName = '',
  showToast,
  onRecordUploadHistory,
}) {
  const folders = useMemo(
    () => records.filter((row) => row?.isFolder).map((row) => ({ ...row, archived: Boolean(row.archived) })),
    [records],
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const maxFilterDate = toIsoDate(new Date())
  const [activeTab, setActiveTab] = useState('active')
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [contextMenu, setContextMenu] = useState(null)
  const [detailsFolderId, setDetailsFolderId] = useState('')
  const [renameFolderId, setRenameFolderId] = useState('')
  const [pendingFolderAction, setPendingFolderAction] = useState({ type: '', folderId: '' })

  const breadcrumbs = useMemo(() => {
    if (isImpersonatingClient) {
      return [
        { id: 'admin', label: 'Admin', onClick: onNavigateDashboard },
        { id: 'business', label: impersonationBusinessName || 'Business', onClick: onNavigateDashboard },
        { id: `category-${categoryId}`, label: title, current: true },
      ]
    }
    return [
      { id: 'dashboard', label: 'Dashboard', onClick: onNavigateDashboard },
      { id: `category-${categoryId}`, label: title, current: true },
    ]
  }, [isImpersonatingClient, onNavigateDashboard, impersonationBusinessName, categoryId, title])

  const filteredFolders = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    const scopedFolders = folders.filter((folder) => (activeTab === 'archived' ? folder.archived : !folder.archived))
    return scopedFolders.filter((folder) => {
      const matchesSearch = !normalized || (
        String(folder.folderName || '').toLowerCase().includes(normalized)
        || String(folder.id || '').toLowerCase().includes(normalized)
      )
      const folderDate = folder.createdAtIso || folder.date || folder.createdAtDisplay || ''
      const matchesDate = matchesDateRange(folderDate, dateFrom, dateTo)
      return matchesSearch && matchesDate
    })
  }, [folders, activeTab, searchTerm, dateFrom, dateTo])

  const activeFoldersCount = folders.filter((folder) => !folder.archived).length
  const archivedFoldersCount = folders.filter((folder) => folder.archived).length

  const activeFolder = useMemo(() => folders.find((folder) => folder.id === contextMenu?.folderId) || null, [folders, contextMenu?.folderId])
  const detailsFolder = useMemo(() => folders.find((folder) => folder.id === detailsFolderId) || null, [folders, detailsFolderId])
  const renameFolder = useMemo(() => folders.find((folder) => folder.id === renameFolderId) || null, [folders, renameFolderId])
  const actionFolder = useMemo(
    () => folders.find((folder) => folder.id === pendingFolderAction.folderId) || null,
    [folders, pendingFolderAction.folderId],
  )

  useEffect(() => {
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    window.addEventListener('scroll', close)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close)
    }
  }, [])

  useEffect(() => {
    setSelectedFolderId('')
    setContextMenu(null)
  }, [activeTab])

  const handleRenameFolder = (nextName) => {
    if (!nextName || !renameFolder) return
    const previousName = renameFolder.folderName || 'Untitled Folder'
    setRecords((prev) => prev.map((record) => (
      record.id === renameFolder.id
        ? {
            ...record,
            folderName: nextName,
            files: (record.files || []).map((file) => ({ ...file, folderName: nextName })),
          }
        : record
    )))
    onLogActivity?.(
      'Edited folder',
      `Renamed folder "${previousName}" to "${nextName}" (${renameFolder.id}).`,
    )
    setRenameFolderId('')
  }

  const archiveFolderById = (folderId, archived) => {
    const actionLabel = archived ? 'Archived' : 'Restored'
    const actionType = archived ? 'archive' : 'restore'
    setRecords((prev) => prev.map((record) => {
      if (record.id !== folderId) return record
      const actorName = record.user || 'Client User'
      return {
        ...record,
        archived,
        files: (record.files || []).map((file) => appendFileVersionAndActivity(file, {
          action: actionLabel,
          actionType,
          description: archived
            ? `File archived because folder "${record.folderName}" was archived.`
            : `File restored because folder "${record.folderName}" was restored.`,
          performedBy: actorName,
          notes: archived ? 'Folder archived.' : 'Folder restored.',
          filePatch: {
            folderName: record.folderName,
            folderId: record.id,
          },
        })),
      }
    }))
  }

  const handleConfirmFolderAction = () => {
    if (!actionFolder) return
    const folderName = actionFolder.folderName || 'Untitled Folder'
    const fileCount = actionFolder.files?.length || 0

    if (pendingFolderAction.type === 'delete') {
      setRecords((prev) => prev.filter((record) => record.id !== actionFolder.id))
      onLogActivity?.(
        'Deleted folder',
        `Deleted folder "${folderName}" (${actionFolder.id}) with ${fileCount} file(s).`,
      )
      showToast?.('success', 'Folder deleted successfully.')
    }

    if (pendingFolderAction.type === 'archive') {
      archiveFolderById(actionFolder.id, true)
      onLogActivity?.(
        'Archived folder',
        `Archived folder "${folderName}" (${actionFolder.id}) with ${fileCount} file(s).`,
      )
      showToast?.('success', 'Folder archived successfully.')
      if (selectedFolderId === actionFolder.id) setSelectedFolderId('')
    }

    if (pendingFolderAction.type === 'restore') {
      archiveFolderById(actionFolder.id, false)
      onLogActivity?.(
        'Restored folder',
        `Restored folder "${folderName}" (${actionFolder.id}) to active view.`,
      )
      showToast?.('success', 'Folder restored successfully.')
    }

    if (pendingFolderAction.type === 'permanent-delete') {
      setRecords((prev) => prev.filter((record) => record.id !== actionFolder.id))
      onLogActivity?.(
        'Deleted folder',
        `Permanently deleted archived folder "${folderName}" (${actionFolder.id}) with ${fileCount} file(s).`,
      )
      showToast?.('success', 'Archived folder deleted permanently.')
    }

    setPendingFolderAction({ type: '', folderId: '' })
  }

  const isArchivedContext = Boolean(activeFolder?.archived)
  const uploadDisabled = activeTab === 'archived'

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        <button
          onClick={() => onAddDocument(categoryId)}
          disabled={uploadDisabled}
          className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Upload Documents
        </button>
      </div>

      <BreadcrumbNav items={breadcrumbs} />

      <div className="bg-white rounded-lg border border-border shadow-card p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center rounded-md border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`h-9 px-4 text-sm font-medium ${activeTab === 'active' ? 'bg-[#153585] text-white' : 'bg-white text-text-secondary hover:bg-background'}`}
            >
              Active ({activeFoldersCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('archived')}
              className={`h-9 px-4 text-sm font-medium border-l border-border ${activeTab === 'archived' ? 'bg-[#153585] text-white' : 'bg-white text-text-secondary hover:bg-background'}`}
            >
              Archived ({archivedFoldersCount})
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={activeTab === 'archived' ? 'Search archived folders...' : 'Search folders...'}
              className="w-full h-10 pl-10 pr-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            max={maxFilterDate}
            onChange={(event) => setDateFrom(clampFilterDateToToday(event.target.value))}
            className="h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            max={maxFilterDate}
            onChange={(event) => setDateTo(clampFilterDateToToday(event.target.value))}
            className="h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            title="To date"
          />
          {(searchTerm || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setDateFrom('')
                setDateTo('')
              }}
              className="h-10 px-3 text-sm text-error hover:bg-error-bg rounded-md"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {filteredFolders.length === 0 ? (
        <div className="bg-white rounded-lg border border-border shadow-card p-10 text-center">
          <Folder className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-base font-semibold text-text-primary">
            {activeTab === 'archived' ? 'No archived folders' : 'No folders yet'}
          </h3>
          <p className="text-sm text-text-muted mt-1">
            {activeTab === 'archived'
              ? 'Archived folders will appear here.'
              : 'Create your first folder by uploading documents.'}
          </p>
          {activeTab === 'active' && (
            <button onClick={() => onAddDocument(categoryId)} className="mt-4 h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light">
              Upload
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border shadow-card p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setSelectedFolderId(folder.id)}
                onDoubleClick={() => onOpenFolder(folder.id)}
                onContextMenu={(event) => {
                  event.preventDefault()
                  setSelectedFolderId(folder.id)
                  setContextMenu({
                    folderId: folder.id,
                    x: event.clientX,
                    y: event.clientY,
                  })
                }}
                className={`rounded-lg border p-4 h-44 text-left transition-colors ${
                  selectedFolderId === folder.id ? 'border-primary bg-primary-tint/40' : 'border-border hover:border-primary-light'
                }`}
              >
                <Folder className="w-16 h-16 text-[#153585]" />
                <p className="mt-4 text-sm font-semibold text-text-primary truncate">{folder.folderName || 'Untitled Folder'}</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-xs text-text-muted">{folder.files?.length || 0} file(s)</p>
                  {folder.archived && (
                    <span className="inline-flex h-5 items-center px-2 rounded bg-background text-text-secondary text-[11px] uppercase tracking-wide">
                      Archived
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <DesktopContextMenu
        contextMenu={contextMenu}
        isArchived={isArchivedContext}
        onClose={() => setContextMenu(null)}
        onViewDetails={() => {
          if (activeFolder) setDetailsFolderId(activeFolder.id)
          setContextMenu(null)
        }}
        onRename={() => {
          if (activeFolder && !activeFolder.archived) setRenameFolderId(activeFolder.id)
          setContextMenu(null)
        }}
        onArchive={() => {
          if (activeFolder) setPendingFolderAction({ type: 'archive', folderId: activeFolder.id })
          setContextMenu(null)
        }}
        onRestore={() => {
          if (activeFolder) setPendingFolderAction({ type: 'restore', folderId: activeFolder.id })
          setContextMenu(null)
        }}
        onDelete={() => {
          if (activeFolder) setPendingFolderAction({ type: 'delete', folderId: activeFolder.id })
          setContextMenu(null)
        }}
        onPermanentDelete={() => {
          if (activeFolder) setPendingFolderAction({ type: 'permanent-delete', folderId: activeFolder.id })
          setContextMenu(null)
        }}
      />

      {detailsFolder && <FolderDetailsModal folder={detailsFolder} onClose={() => setDetailsFolderId('')} />}
      {renameFolder && (
        <FolderRenameModal
          folder={renameFolder}
          onCancel={() => setRenameFolderId('')}
          onSave={handleRenameFolder}
        />
      )}
      {actionFolder && pendingFolderAction.type === 'delete' && (
        <FolderActionConfirmModal
          title="Delete Folder"
          message="All files inside this folder will also be deleted."
          confirmLabel="Delete"
          confirmClassName="bg-red-600 hover:bg-red-700"
          onCancel={() => setPendingFolderAction({ type: '', folderId: '' })}
          onConfirm={handleConfirmFolderAction}
        />
      )}
      {actionFolder && pendingFolderAction.type === 'archive' && (
        <FolderActionConfirmModal
          title="Archive Folder"
          message="This folder will be removed from active view but can be restored."
          confirmLabel="Archive"
          confirmClassName="bg-[#153585] hover:bg-primary-light"
          onCancel={() => setPendingFolderAction({ type: '', folderId: '' })}
          onConfirm={handleConfirmFolderAction}
        />
      )}
      {actionFolder && pendingFolderAction.type === 'restore' && (
        <FolderActionConfirmModal
          title="Restore Folder"
          message="Restore this folder to active view?"
          confirmLabel="Restore"
          confirmClassName="bg-[#153585] hover:bg-primary-light"
          onCancel={() => setPendingFolderAction({ type: '', folderId: '' })}
          onConfirm={handleConfirmFolderAction}
        />
      )}
      {actionFolder && pendingFolderAction.type === 'permanent-delete' && (
        <FolderActionConfirmModal
          title="Delete Folder Permanently"
          message="This will permanently delete this folder and all files inside."
          confirmLabel="Delete"
          confirmClassName="bg-red-600 hover:bg-red-700"
          onCancel={() => setPendingFolderAction({ type: '', folderId: '' })}
          onConfirm={handleConfirmFolderAction}
        />
      )}
    </div>
  )
}

function FolderFilesPage({
  categoryId,
  categoryTitle,
  records = [],
  folder,
  onBack,
  setRecords,
  onLogActivity,
  onOpenFolder,
  onNavigateDashboard,
  isImpersonatingClient = false,
  impersonationBusinessName = '',
  showToast,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const maxFilterDate = toIsoDate(new Date())
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [viewingFile, setViewingFile] = useState(null)
  const [highlightedFileId, setHighlightedFileId] = useState('')
  const [selectedFileIds, setSelectedFileIds] = useState([])
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [bulkClassValue, setBulkClassValue] = useState('')
  const [bulkPriorityValue, setBulkPriorityValue] = useState('')
  const [showBulkClassModal, setShowBulkClassModal] = useState(false)
  const [showBulkPriorityModal, setShowBulkPriorityModal] = useState(false)
  const [moveRequest, setMoveRequest] = useState({ open: false, fileIds: [] })
  const [fileContextMenu, setFileContextMenu] = useState(null)
  const [versionHistoryFile, setVersionHistoryFile] = useState(null)
  const [activityLogFile, setActivityLogFile] = useState(null)
  const [deletedFileAction, setDeletedFileAction] = useState('')
  const [showApprovedLockNotice, setShowApprovedLockNotice] = useState(false)

  const files = folder?.files || []
  const isArchivedFolder = Boolean(folder?.archived)
  const filteredFiles = files.filter((file) => {
    const normalized = searchTerm.trim().toLowerCase()
    const matchesSearch = !normalized || (
      String(file.filename || '').toLowerCase().includes(normalized)
      || String(file.fileId || '').toLowerCase().includes(normalized)
      || (file.class || '').toLowerCase().includes(normalized)
    )
    const matchesStatus = !statusFilter || String(file.status || '').toLowerCase() === String(statusFilter).toLowerCase()
    const matchesType = !typeFilter || String(file.extension || '').toUpperCase() === String(typeFilter).toUpperCase()
    const fileDate = file.createdAtIso || file.updatedAtIso || file.date || ''
    const matchesDate = matchesDateRange(fileDate, dateFrom, dateTo)
    return matchesSearch && matchesStatus && matchesType && matchesDate
  })
  const selectableFilteredFiles = filteredFiles.filter((file) => !file?.isDeleted && !isApprovedFileLocked(file))

  const folderMeta = toDateAndTime(folder?.createdAtIso || folder?.date || folder?.createdAtDisplay || '')
  const selectedSet = useMemo(() => new Set(selectedFileIds), [selectedFileIds])
  const allVisibleSelected = selectableFilteredFiles.length > 0 && selectableFilteredFiles.every((file) => selectedSet.has(file.fileId))
  const selectedCount = selectedFileIds.length
  const classOptions = useMemo(() => {
    const defaults = categoryId === 'sales'
      ? ['Invoice', 'Sales Receipt', 'Credit Note', 'Statement']
      : categoryId === 'bank-statements'
        ? ['Bank Statement', 'Reconciliation', 'Deposit Record']
        : ['Fuel', 'Utilities', 'Office Supplies', 'Travel', 'Rent']
    const fromFiles = files.map((file) => (file.class || file.expenseClass || file.salesClass || '').trim()).filter(Boolean)
    return Array.from(new Set([...defaults, ...fromFiles])).map((label) => ({ label, value: label }))
  }, [categoryId, files])
  const statusOptions = useMemo(
    () => Array.from(new Set(files.map((file) => String(file.status || '').trim()).filter(Boolean))),
    [files],
  )
  const typeOptions = useMemo(
    () => Array.from(new Set(files.map((file) => String(file.extension || '').toUpperCase()).filter(Boolean))),
    [files],
  )
  const priorityOptions = [
    { label: 'Normal', value: 'Normal' },
    { label: 'High', value: 'High' },
    { label: 'Urgent', value: 'Urgent' },
  ]
  const activeContextFile = useMemo(
    () => files.find((file) => file.fileId === fileContextMenu?.fileId) || null,
    [files, fileContextMenu?.fileId],
  )

  const folderSegments = useMemo(
    () => String(folder?.folderName || 'Folder').split('/').map((segment) => segment.trim()).filter(Boolean),
    [folder?.folderName],
  )
  const breadcrumbs = useMemo(() => {
    const prefix = isImpersonatingClient
      ? [
          { id: 'admin', label: 'Admin', onClick: onNavigateDashboard },
          { id: 'business', label: impersonationBusinessName || 'Business', onClick: onNavigateDashboard },
          { id: `category-${categoryId}`, label: categoryTitle, onClick: onBack },
        ]
      : [
          { id: 'dashboard', label: 'Dashboard', onClick: onNavigateDashboard },
          { id: `category-${categoryId}`, label: categoryTitle, onClick: onBack },
        ]

    if (folderSegments.length <= 1) {
      return [...prefix, { id: 'folder-current', label: folderSegments[0] || folder?.folderName || 'Folder', current: true }]
    }

    return [
      ...prefix,
      ...folderSegments.map((segment, index) => ({
        id: `segment-${index}`,
        label: segment,
        current: index === folderSegments.length - 1,
        onClick: index === folderSegments.length - 1 ? undefined : onBack,
      })),
    ]
  }, [
    isImpersonatingClient,
    onNavigateDashboard,
    impersonationBusinessName,
    categoryId,
    categoryTitle,
    onBack,
    folderSegments,
    folder?.folderName,
  ])

  useEffect(() => {
    setSelectedFileIds([])
    setShowBulkDelete(false)
    setShowBulkClassModal(false)
    setShowBulkPriorityModal(false)
    setBulkClassValue('')
    setBulkPriorityValue('')
    setMoveRequest({ open: false, fileIds: [] })
    setFileContextMenu(null)
    setVersionHistoryFile(null)
    setActivityLogFile(null)
    setDeletedFileAction('')
    setShowApprovedLockNotice(false)
    setHighlightedFileId('')
    setDateFrom('')
    setDateTo('')
    setStatusFilter('')
    setTypeFilter('')
  }, [folder?.id])

  useEffect(() => {
    setSelectedFileIds((prev) => prev.filter((id) => files.some((file) => (
      file.fileId === id
      && !file?.isDeleted
      && !isApprovedFileLocked(file)
    ))))
  }, [files])

  useEffect(() => {
    const closeContext = () => setFileContextMenu(null)
    window.addEventListener('click', closeContext)
    window.addEventListener('scroll', closeContext)
    return () => {
      window.removeEventListener('click', closeContext)
      window.removeEventListener('scroll', closeContext)
    }
  }, [])

  const getActorName = (file) => file?.user || folder?.user || 'Client User'

  const withContextFile = (callback) => {
    if (!activeContextFile) return
    callback(activeContextFile)
    setFileContextMenu(null)
  }

  const trackViewedFile = (targetFile) => {
    const actorName = getActorName(targetFile)
    const trackedFile = appendFileActivityOnly(targetFile, {
      actionType: 'view',
      description: `File viewed: ${targetFile.filename}.`,
      performedBy: actorName,
    })
    setRecords((prev) => updateNestedFile(prev, folder.id, targetFile.fileId, () => trackedFile))
    return trackedFile
  }

  const openFile = (targetFile) => {
    if (!targetFile) return
    if (targetFile.isDeleted) {
      setDeletedFileAction('open')
      return
    }
    const trackedFile = trackViewedFile(targetFile)
    setViewingFile({ ...trackedFile, folderId: folder.id, folderName: folder.folderName })
  }

  const openContainingFolder = (targetFile) => {
    if (!targetFile) return
    setHighlightedFileId(targetFile.fileId)
    setTimeout(() => setHighlightedFileId(''), 2200)
    onOpenFolder?.(folder.id)
  }

  const downloadFile = (targetFile) => {
    if (!targetFile) return
    if (targetFile.isDeleted) {
      showToast?.('error', 'This file has been deleted and cannot be downloaded.')
      return
    }
    const directUrl = String(targetFile.previewUrl || '').trim()
    const expiredBlobUrl = /^blob:/i.test(directUrl) && !(targetFile.rawFile instanceof File)
    const url = expiredBlobUrl
      ? ''
      : (directUrl || (targetFile.rawFile ? URL.createObjectURL(targetFile.rawFile) : ''))
    if (!url) {
      showToast?.('error', 'Download URL is not available for this file.')
      return
    }
    const link = document.createElement('a')
    link.href = url
    link.download = targetFile.filename || 'document'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    const actorName = getActorName(targetFile)
    const trackedFile = appendFileActivityOnly(targetFile, {
      actionType: 'download',
      description: `Downloaded file "${targetFile.filename}".`,
      performedBy: actorName,
    })
    setRecords((prev) => updateNestedFile(prev, folder.id, targetFile.fileId, () => trackedFile))
  }

  const softDeleteFile = (targetFile) => {
    if (!targetFile || targetFile.isDeleted || isApprovedFileLocked(targetFile)) return
    const actorName = getActorName(targetFile)
    const nextTimestampIso = new Date().toISOString()
    const updatedFile = appendFileVersionAndActivity(targetFile, {
      action: 'Deleted',
      actionType: 'delete',
      description: `File "${targetFile.filename}" marked as deleted.`,
      performedBy: actorName,
      notes: 'Soft delete applied.',
      timestampIso: nextTimestampIso,
      filePatch: {
        isDeleted: true,
        deletedAtIso: nextTimestampIso,
        status: 'Deleted',
      },
    })
    setRecords((prev) => updateNestedFile(prev, folder.id, targetFile.fileId, () => updatedFile))
  }

  const toggleSelectOne = (fileId) => {
    const targetFile = files.find((file) => file.fileId === fileId)
    if (!targetFile || targetFile.isDeleted || isApprovedFileLocked(targetFile)) return
    setSelectedFileIds((prev) => (
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    ))
  }

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(selectableFilteredFiles.map((file) => file.fileId))
      setSelectedFileIds((prev) => prev.filter((id) => !visibleIds.has(id)))
      return
    }
    setSelectedFileIds((prev) => Array.from(new Set([...prev, ...selectableFilteredFiles.map((file) => file.fileId)])))
  }

  const clearSelections = () => setSelectedFileIds([])

  const applyBulkClass = () => {
    if (!bulkClassValue || selectedCount === 0) return
    setRecords((prev) => updateNestedFiles(prev, folder.id, selectedFileIds, (file) => {
      if (isApprovedFileLocked(file)) return file
      const actorName = getActorName(file)
      return appendFileVersionAndActivity(file, {
        action: 'Class Updated',
        actionType: 'edit',
        description: `Class updated to "${bulkClassValue}".`,
        performedBy: actorName,
        notes: `Bulk update for ${selectedCount} file(s).`,
        filePatch: {
          class: bulkClassValue,
          expenseClass: bulkClassValue,
          salesClass: bulkClassValue,
        },
      })
    }))
    onLogActivity?.(
      'Edited file',
      `Bulk updated class to "${bulkClassValue}" for ${selectedCount} file(s) in folder "${folder.folderName}".`,
    )
    showToast?.('success', 'Class updated successfully.')
    setShowBulkClassModal(false)
    setBulkClassValue('')
    clearSelections()
  }

  const applyBulkPriority = () => {
    if (!bulkPriorityValue || selectedCount === 0) return
    setRecords((prev) => updateNestedFiles(prev, folder.id, selectedFileIds, (file) => {
      const actorName = getActorName(file)
      return appendFileVersionAndActivity(file, {
        action: 'Priority Updated',
        actionType: 'edit',
        description: `Priority changed to "${bulkPriorityValue}".`,
        performedBy: actorName,
        notes: `Bulk priority change for ${selectedCount} file(s).`,
        filePatch: { processingPriority: bulkPriorityValue },
      })
    }))
    onLogActivity?.(
      'Edited file',
      `Bulk updated priority to "${bulkPriorityValue}" for ${selectedCount} file(s) in folder "${folder.folderName}".`,
    )
    showToast?.('success', 'Priority updated successfully.')
    setShowBulkPriorityModal(false)
    setBulkPriorityValue('')
    clearSelections()
  }

  const confirmBulkDelete = () => {
    if (selectedCount === 0) return
    setRecords((prev) => updateNestedFiles(prev, folder.id, selectedFileIds, (file) => {
      if (isApprovedFileLocked(file)) return file
      const actorName = getActorName(file)
      const timestampIso = new Date().toISOString()
      return appendFileVersionAndActivity(file, {
        action: 'Deleted',
        actionType: 'delete',
        description: `File "${file.filename}" marked as deleted.`,
        performedBy: actorName,
        notes: `Bulk delete action (${selectedCount} file(s)).`,
        timestampIso,
        filePatch: {
          isDeleted: true,
          deletedAtIso: timestampIso,
          status: 'Deleted',
        },
      })
    }))
    onLogActivity?.(
      'Deleted file',
      `Deleted ${selectedCount} selected file(s) from folder "${folder.folderName}".`,
    )
    showToast?.('success', 'Selected files deleted successfully.')
    setShowBulkDelete(false)
    clearSelections()
  }

  const startMoveFiles = (fileIds) => {
    if (!Array.isArray(fileIds) || fileIds.length === 0) return
    const movableIds = fileIds.filter((id) => {
      const current = files.find((file) => file.fileId === id)
      return current && !current.isDeleted && !isApprovedFileLocked(current)
    })
    if (movableIds.length === 0) {
      showToast?.('error', 'Approved files are locked and cannot be moved.')
      return
    }
    setMoveRequest({ open: true, fileIds: movableIds })
  }

  const confirmMoveFiles = ({ destinationFolderId, createNewFolderName }) => {
    const fileIdsToMove = moveRequest.fileIds || []
    if (fileIdsToMove.length === 0) return

    if (!destinationFolderId) return
    if (destinationFolderId === folder.id) {
      showToast?.('error', 'Cannot move files to the same folder.')
      return
    }

    let movedCount = 0
    let destinationName = ''
    let resolvedDestinationId = ''
    const idsToMoveSet = new Set(fileIdsToMove)

    setRecords((prev) => {
      const next = prev.map((record) => (
        record?.isFolder ? { ...record, files: [...(record.files || [])] } : record
      ))
      const sourceFolder = next.find((record) => record?.isFolder && record.id === folder.id)
      if (!sourceFolder) return prev

      const movingFiles = (sourceFolder.files || [])
        .filter((file) => idsToMoveSet.has(file.fileId) && !file.isDeleted && !isApprovedFileLocked(file))
      if (movingFiles.length === 0) return prev

      let destinationFolder = null
      if (destinationFolderId === '__create_new__') {
        if (!createNewFolderName) return prev
        destinationFolder = createFolderRecord({
          folderName: createNewFolderName,
          categoryLabel: categoryTitle,
          user: sourceFolder.user || 'Client User',
        })
        next.unshift(destinationFolder)
      } else {
        destinationFolder = next.find((record) => record?.isFolder && record.id === destinationFolderId)
      }

      if (!destinationFolder || destinationFolder.archived || destinationFolder.id === sourceFolder.id) return prev

      sourceFolder.files = (sourceFolder.files || []).filter((file) => !idsToMoveSet.has(file.fileId))
      const remapped = movingFiles.map((file) => {
        const actorName = getActorName(file)
        return appendFileVersionAndActivity(file, {
          action: 'Moved',
          actionType: 'move',
          description: `Moved from "${sourceFolder.folderName}" to "${destinationFolder.folderName}".`,
          performedBy: actorName,
          notes: 'File moved to another folder.',
          filePatch: {
            folderId: destinationFolder.id,
            folderName: destinationFolder.folderName,
          },
        })
      })
      destinationFolder.files = [...(destinationFolder.files || []), ...remapped]

      movedCount = remapped.length
      destinationName = destinationFolder.folderName
      resolvedDestinationId = destinationFolder.id
      return next
    })

    if (movedCount > 0) {
      onLogActivity?.(
        'Moved file',
        `Moved ${movedCount} file(s) from folder "${folder.folderName}" to "${destinationName}".`,
      )
      showToast?.('success', 'Files moved successfully.')
      setMoveRequest({ open: false, fileIds: [] })
      clearSelections()
      if (resolvedDestinationId) onOpenFolder?.(resolvedDestinationId)
      return
    }

    showToast?.('error', 'Unable to move files to the selected folder.')
  }

  const restoreArchivedFolder = () => {
    if (!folder?.id) return
    setRecords((prev) => prev.map((record) => {
      if (record.id !== folder.id) return record
      const actorName = record.user || 'Client User'
      return {
        ...record,
        archived: false,
        files: (record.files || []).map((file) => appendFileVersionAndActivity(file, {
          action: 'Restored',
          actionType: 'restore',
          description: `File restored because folder "${record.folderName}" was restored.`,
          performedBy: actorName,
          notes: 'Folder restored to active view.',
        })),
      }
    }))
    onLogActivity?.(
      'Restored folder',
      `Restored folder "${folder.folderName}" (${folder.id}) to active view.`,
    )
    showToast?.('success', 'Folder restored successfully.')
  }

  if (!folder) {
    return (
      <div className="animate-fade-in">
        <button type="button" onClick={onBack} className="h-9 px-4 border border-border rounded-md text-sm text-text-primary hover:bg-background">
          Back
        </button>
        <div className="bg-white rounded-lg border border-border shadow-card p-10 text-center mt-4">
          <h3 className="text-base font-semibold text-text-primary">Folder not found</h3>
          <p className="text-sm text-text-muted mt-1">The selected folder may have been deleted.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary mt-1">{folder.folderName}</h1>
          <p className="text-xs text-text-muted mt-1 font-mono">
            {folder.id} | {folderMeta.date} {folderMeta.time}
          </p>
        </div>
        <button type="button" onClick={onBack} className="h-9 px-4 border border-border rounded-md text-sm text-text-primary hover:bg-background">
          Back to Folders
        </button>
      </div>

      <BreadcrumbNav items={breadcrumbs} />

      {isArchivedFolder && (
        <div className="bg-warning-bg border border-warning rounded-md px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-warning">
            This folder is archived. Files are read-only until the folder is restored.
          </p>
          <button
            type="button"
            onClick={restoreArchivedFolder}
            className="h-8 px-3 rounded-md bg-[#153585] text-white text-xs font-medium hover:bg-primary-light"
          >
            Restore Folder
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-border shadow-card p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search files..."
              className="w-full h-10 pl-10 pr-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
          >
            <option value="">All Types</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            max={maxFilterDate}
            onChange={(event) => setDateFrom(clampFilterDateToToday(event.target.value))}
            className="h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            title="From date"
          />
          <input
            type="date"
            value={dateTo}
            max={maxFilterDate}
            onChange={(event) => setDateTo(clampFilterDateToToday(event.target.value))}
            className="h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            title="To date"
          />
          {(searchTerm || statusFilter || typeFilter || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('')
                setTypeFilter('')
                setDateFrom('')
                setDateTo('')
              }}
              className="h-10 px-3 text-sm text-error hover:bg-error-bg rounded-md"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {!isArchivedFolder && selectedCount > 0 && (
        <div className="bg-white rounded-lg border border-[#153585]/25 shadow-card p-3 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-text-primary font-medium">{selectedCount} file(s) selected</div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => startMoveFiles(selectedFileIds)} className="h-8 px-3 rounded-md bg-[#153585] text-white text-xs font-medium hover:bg-primary-light">
              Move
            </button>
            <button type="button" onClick={() => setShowBulkDelete(true)} className="h-8 px-3 rounded-md border border-red-300 text-red-600 text-xs font-medium hover:bg-red-50">
              Delete
            </button>
            <button type="button" onClick={() => setShowBulkClassModal(true)} className="h-8 px-3 rounded-md border border-border text-text-primary text-xs font-medium hover:bg-background">
              Change Class
            </button>
            <button type="button" onClick={() => setShowBulkPriorityModal(true)} className="h-8 px-3 rounded-md border border-border text-text-primary text-xs font-medium hover:bg-background">
              Set Priority
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB]">
                {!isArchivedFolder && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      disabled={selectableFilteredFiles.length === 0}
                      className="w-4 h-4 border-border rounded accent-[#153585]"
                      aria-label="Select all files"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">File Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Class</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Upload Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={isArchivedFolder ? 6 : 7} className="px-4 py-10 text-center text-sm text-text-muted">No files found in this folder.</td>
                </tr>
              ) : (
                filteredFiles.map((file) => {
                  const isLockedFile = isApprovedFileLocked(file)
                  return (
                  <tr
                    key={file.fileId}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      setFileContextMenu({
                        fileId: file.fileId,
                        x: event.clientX,
                        y: event.clientY,
                      })
                    }}
                    className={`border-b border-border-light ${
                      highlightedFileId === file.fileId
                        ? 'bg-[#153585]/10'
                        : file.isDeleted
                          ? 'bg-gray-50'
                          : 'hover:bg-[#F9FAFB]'
                    }`}
                  >
                    {!isArchivedFolder && (
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedSet.has(file.fileId)}
                          onChange={() => toggleSelectOne(file.fileId)}
                          disabled={file.isDeleted || isLockedFile}
                          className="w-4 h-4 border-border rounded accent-[#153585]"
                          aria-label={`Select ${file.filename}`}
                        />
                      </td>
                    )}
                    <td className={`px-4 py-3.5 text-sm font-medium ${file.isDeleted ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                      <span className="inline-flex items-center gap-1.5">
                        <span>{file.filename}</span>
                        {isLockedFile && (
                          <Lock className="w-3.5 h-3.5 text-[#153585]" title="This file is locked after approval." />
                        )}
                      </span>
                    </td>
                    <td className={`px-4 py-3.5 text-sm ${file.isDeleted ? 'text-text-muted' : 'text-text-secondary'}`}>{file.class || '-'}</td>
                    <td className={`px-4 py-3.5 text-sm ${file.isDeleted ? 'text-text-muted' : 'text-text-secondary'}`}>{file.date || '--'}</td>
                    <td className="px-4 py-3.5">
                      {file.isDeleted ? (
                        <span className="inline-flex items-center h-6 px-2.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          Deleted
                        </span>
                      ) : (
                        <StatusBadge status={file.status || 'Pending Review'} />
                      )}
                    </td>
                    <td className={`px-4 py-3.5 text-sm ${file.isDeleted ? 'text-text-muted' : 'text-text-secondary'}`}>{file.processingPriority || 'Normal'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => openFile(file)} className="w-8 h-8 border border-border rounded-md text-text-secondary hover:border-primary hover:text-primary inline-flex items-center justify-center" title="Open">
                          <Eye className="w-4 h-4" />
                        </button>
                        {!isArchivedFolder && !file.isDeleted && !isLockedFile && (
                          <>
                            <button
                              type="button"
                              onClick={() => startMoveFiles([file.fileId])}
                              className="w-8 h-8 border border-border rounded-md text-text-secondary hover:border-primary hover:text-primary inline-flex items-center justify-center"
                              title="Move"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!confirm('Are you sure you want to delete this file?')) return
                                softDeleteFile(file)
                                onLogActivity?.('Deleted file', `Deleted file "${file.filename}" (${file.fileId}) from folder "${folder.folderName}".`)
                                showToast?.('success', 'File deleted successfully.')
                                clearSelections()
                              }}
                              className="w-8 h-8 border border-border rounded-md text-text-secondary hover:border-error hover:text-error inline-flex items-center justify-center"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FileContextMenu
        contextMenu={fileContextMenu}
        targetFile={activeContextFile}
        isReadOnly={isArchivedFolder || isApprovedFileLocked(activeContextFile)}
        onClose={() => setFileContextMenu(null)}
        onOpenFile={() => withContextFile((file) => openFile(file))}
        onOpenFolder={() => withContextFile(openContainingFolder)}
        onDownload={() => withContextFile((file) => downloadFile(file))}
        onViewDetails={() => withContextFile((file) => setViewingFile({ ...file, folderId: folder.id, folderName: folder.folderName }))}
        onVersionHistory={() => withContextFile((file) => setVersionHistoryFile(file))}
        onActivityLog={() => withContextFile((file) => setActivityLogFile(file))}
        onDelete={() => withContextFile((file) => {
          if (isApprovedFileLocked(file)) {
            setShowApprovedLockNotice(true)
            return
          }
          if (!confirm('Are you sure you want to delete this file?')) return
          softDeleteFile(file)
          onLogActivity?.('Deleted file', `Deleted file "${file.filename}" (${file.fileId}) from folder "${folder.folderName}".`)
          showToast?.('success', 'File deleted successfully.')
          clearSelections()
        })}
      />

      {viewingFile && (
        <FileViewerModal
          file={viewingFile}
          readOnly={isArchivedFolder || isApprovedFileLocked(viewingFile)}
          onClose={() => setViewingFile(null)}
          onSave={isArchivedFolder ? undefined : (updated) => {
            const previousFile = (folder.files || []).find((item) => item.fileId === updated.fileId) || {}
            if (isApprovedFileLocked(previousFile)) {
              setShowApprovedLockNotice(true)
              return
            }
            const changedFields = collectEditedFieldLabels(previousFile, updated)
            const changedSummary = changedFields.length > 0
              ? `Fields edited: ${changedFields.join(', ')}.`
              : 'No field-level changes detected.'
            const actorName = getActorName(previousFile)
            const nextFile = appendFileVersionAndActivity(
              { ...previousFile, ...updated },
              {
                action: 'Metadata Updated',
                actionType: 'edit',
                description: changedFields.length > 0
                  ? `Metadata updated: ${changedFields.join(', ')}.`
                  : 'Metadata updated.',
                performedBy: actorName,
                notes: changedSummary,
              },
            )
            setRecords((prev) => updateNestedFile(prev, folder.id, updated.fileId, () => nextFile))
            onLogActivity?.(
              'Edited file',
              `Updated file "${updated.filename}" (${updated.fileId}) in folder "${folder.folderName}". ${changedSummary}`,
            )
            showToast?.('success', 'File updated successfully.')
            setViewingFile(null)
          }}
          onDelete={isArchivedFolder ? undefined : (target) => {
            const targetFileId = target?.fileId || viewingFile?.fileId
            if (!targetFileId) return
            const previousFile = (folder.files || []).find((item) => item.fileId === targetFileId)
            if (previousFile && isApprovedFileLocked(previousFile)) {
              setShowApprovedLockNotice(true)
              return
            }
            if (!confirm('Are you sure you want to delete this file?')) return
            const targetFileName = target?.filename || viewingFile?.filename || 'file'
            if (previousFile) softDeleteFile(previousFile)
            onLogActivity?.(
              'Deleted file',
              `Deleted file "${targetFileName}" (${targetFileId}) from folder "${folder.folderName}".`,
            )
            showToast?.('success', 'File deleted successfully.')
            setViewingFile(null)
          }}
          onResubmit={isArchivedFolder ? undefined : async (target, replacementFile) => {
            if (!target?.fileId || !(replacementFile instanceof File)) return
            if (isApprovedFileLocked(target)) {
              setShowApprovedLockNotice(true)
              return
            }
            const submittedAt = new Date().toLocaleString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
            const extension = replacementFile.name.includes('.')
              ? replacementFile.name.split('.').pop().toUpperCase()
              : 'FILE'
            const submittedAtIso = new Date().toISOString()
            const previewUrl = await buildPreviewUrl(replacementFile, extension)

            setRecords((prev) => updateNestedFile(prev, folder.id, target.fileId, (current) => {
              const actorName = getActorName(current)
              const replacements = Array.isArray(current.uploadInfo?.replacements) ? [...current.uploadInfo.replacements] : []
              replacements.push({
                timestamp: submittedAtIso,
                filename: replacementFile.name,
                source: 'resubmission',
                uploadedBy: actorName,
              })
              const replacedFile = appendFileVersionAndActivity(current, {
                action: 'File Replaced',
                actionType: 'replacement',
                description: `File replaced with "${replacementFile.name}".`,
                performedBy: actorName,
                notes: 'Replacement upload submitted.',
                timestampIso: submittedAtIso,
                filePatch: {
                  filename: replacementFile.name,
                  extension,
                  previewUrl,
                  rawFile: replacementFile,
                  date: submittedAt,
                  status: 'Pending Review',
                  isLocked: false,
                  lockedAtIso: null,
                  approvedBy: '',
                  approvedAtIso: null,
                  rejectedBy: '',
                  rejectedAtIso: null,
                  rejectionReason: '',
                  unlockedBy: '',
                  unlockedAtIso: null,
                  unlockReason: '',
                  isDeleted: false,
                  deletedAtIso: null,
                  adminComment: '',
                  requiredAction: '',
                  infoRequestDetails: '',
                  adminNotes: '',
                  uploadInfo: {
                    ...(current.uploadInfo || {}),
                    lastModifiedAtIso: submittedAtIso,
                    replacements,
                  },
                },
              })
              return replacedFile
            }))
            onRecordUploadHistory?.({
              filename: replacementFile.name,
              extension,
              fileId: target.fileId,
              folderId: folder.id,
              uploadedBy: getActorName(target),
              uploadSource: 'resubmission',
              timestampIso: submittedAtIso,
              status: 'Pending Review',
            })
            onLogActivity?.(
              'Edited file',
              `Resubmitted file "${target.filename}" (${target.fileId}) in folder "${folder.folderName}" as "${replacementFile.name}".`,
            )
            showToast?.('success', 'File resubmitted successfully.')
            setViewingFile(null)
          }}
        />
      )}

      {versionHistoryFile && (
        <VersionHistoryDrawer
          file={versionHistoryFile}
          onClose={() => setVersionHistoryFile(null)}
        />
      )}
      {activityLogFile && (
        <FileActivityDrawer
          file={activityLogFile}
          onClose={() => setActivityLogFile(null)}
        />
      )}
      {deletedFileAction && (
        <DeletedFileActionModal
          mode={deletedFileAction}
          onClose={() => setDeletedFileAction('')}
        />
      )}
      {showApprovedLockNotice && (
        <ApprovedLockNoticeModal onClose={() => setShowApprovedLockNotice(false)} />
      )}

      {showBulkDelete && (
        <BulkDeleteModal
          selectedCount={selectedCount}
          onCancel={() => setShowBulkDelete(false)}
          onConfirm={confirmBulkDelete}
        />
      )}
      {showBulkClassModal && (
        <BulkSelectModal
          title="Change Class"
          description="Apply a class to all selected files."
          label="Class *"
          options={classOptions}
          value={bulkClassValue}
          onChange={setBulkClassValue}
          onCancel={() => setShowBulkClassModal(false)}
          onApply={applyBulkClass}
          applyLabel="Apply"
        />
      )}
      {showBulkPriorityModal && (
        <BulkSelectModal
          title="Set Priority"
          description="Apply a priority to all selected files."
          label="Priority"
          options={priorityOptions}
          value={bulkPriorityValue}
          onChange={setBulkPriorityValue}
          onCancel={() => setShowBulkPriorityModal(false)}
          onApply={applyBulkPriority}
          applyLabel="Apply"
        />
      )}
      {moveRequest.open && !isArchivedFolder && (
        <MoveFilesModal
          folder={folder}
          records={records}
          categoryTitle={categoryTitle}
          selectedCount={moveRequest.fileIds.length}
          onCancel={() => setMoveRequest({ open: false, fileIds: [] })}
          onConfirm={confirmMoveFiles}
        />
      )}
    </div>
  )
}

export {
  DocumentFoldersPage,
  FolderFilesPage,
}
