import { useEffect, useMemo, useRef, useState } from 'react'
import { Building2, DollarSign, FileUp, FolderUp, Loader2, TrendingUp, X } from 'lucide-react'

const DEFAULT_CLASS_OPTIONS = [
  'Office Expense',
  'Fuel',
  'Utilities',
  'Inventory',
  'Marketing',
  'Payroll',
  'Tax',
  'Bank Charges',
]

const ALLOWED_EXTENSIONS = [
  'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp',
  'xls', 'xlsx', 'xlsm', 'xlsb', 'csv', 'doc', 'docx',
  'ppt', 'pptx', 'txt', 'zip', 'rar', '7z',
]

const createEmptyDetails = () => ({
  class: '',
  vendorName: '',
  confidentialityLevel: 'Standard',
  processingPriority: 'Normal',
  internalNotes: '',
})

const formatFileSize = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const isVideoFile = (file) => {
  const type = file?.type || ''
  const lowerName = (file?.name || '').toLowerCase()
  const videoExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.m4v', '.3gp']
  if (type.startsWith('video/')) return true
  return videoExtensions.some((ext) => lowerName.endsWith(ext))
}

const getRootFolderName = (fileList = []) => {
  for (const item of fileList) {
    const relativePath = item?.webkitRelativePath || ''
    if (!relativePath.includes('/')) continue
    return relativePath.split('/')[0]
  }
  return ''
}

const PREVIEWABLE_EXTENSIONS = new Set([
  'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp',
  'txt', 'csv', 'xls', 'xlsx', 'xlsm', 'xlsb', 'doc', 'docx', 'ppt', 'pptx',
])
const PERSISTED_PREVIEW_MAX_BYTES = 3 * 1024 * 1024

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result || ''))
  reader.onerror = () => reject(new Error('Unable to read file'))
  reader.readAsDataURL(file)
})

const buildPreviewUrl = async (file, extensionLower = '') => {
  const safeExt = String(extensionLower || '').toLowerCase()
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

function DocumentDetailsForm({
  details,
  onChange,
  classError,
  options,
  classInputId,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Class <span className="text-error">*</span>
        </label>
        <input
          type="text"
          list={classInputId}
          value={details.class}
          onChange={(event) => onChange('class', event.target.value)}
          placeholder="Enter class"
          className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${classError ? 'border-error' : 'border-border'}`}
        />
        <datalist id={classInputId}>
          {options.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        {classError && <p className="text-xs text-error mt-1">{classError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Vendor Name</label>
        <input
          type="text"
          value={details.vendorName}
          onChange={(event) => onChange('vendorName', event.target.value)}
          placeholder="Optional"
          className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Confidentiality</label>
        <select
          value={details.confidentialityLevel}
          onChange={(event) => onChange('confidentialityLevel', event.target.value)}
          className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
        >
          <option value="Standard">Standard</option>
          <option value="Confidential">Confidential</option>
          <option value="Highly Confidential">Highly Confidential</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">Priority</label>
        <select
          value={details.processingPriority}
          onChange={(event) => onChange('processingPriority', event.target.value)}
          className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
        >
          <option value="Normal">Normal</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-text-primary mb-1.5">Notes</label>
        <textarea
          rows={3}
          value={details.internalNotes}
          onChange={(event) => onChange('internalNotes', event.target.value)}
          placeholder="Internal notes"
          className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-primary resize-none"
        />
      </div>
    </div>
  )
}

function AddDocumentModal({
  isOpen,
  onClose,
  initialCategory = '',
  onUpload,
  showToast,
  expenseClassOptions = [],
  salesClassOptions = [],
}) {
  const [category, setCategory] = useState(initialCategory || '')
  const [folderName, setFolderName] = useState('')
  const [documentOwner, setDocumentOwner] = useState('')
  const [uploadedItems, setUploadedItems] = useState([])
  const [multiMode, setMultiMode] = useState('same')
  const [sharedDetails, setSharedDetails] = useState(createEmptyDetails())
  const [perFileDetails, setPerFileDetails] = useState({})
  const [errors, setErrors] = useState({})
  const [isDragOver, setIsDragOver] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)

  const classOptions = useMemo(
    () => Array.from(new Set([...DEFAULT_CLASS_OPTIONS, ...expenseClassOptions, ...salesClassOptions].filter(Boolean))),
    [expenseClassOptions, salesClassOptions],
  )

  useEffect(() => {
    if (!isOpen) return
    setCategory(initialCategory || '')
    setFolderName('')
    setDocumentOwner('')
    setUploadedItems([])
    setMultiMode('same')
    setSharedDetails(createEmptyDetails())
    setPerFileDetails({})
    setErrors({})
    setIsDragOver(false)
    setIsSubmitting(false)
  }, [isOpen, initialCategory])

  if (!isOpen) return null

  const categories = [
    { id: 'expenses', label: 'Expenses', icon: DollarSign },
    { id: 'sales', label: 'Sales', icon: TrendingUp },
    { id: 'bank-statements', label: 'Bank Statements', icon: Building2 },
  ]

  const addFiles = async (files, source = 'browse-file') => {
    if (!Array.isArray(files) || files.length === 0) return

    const existingKeys = new Set(uploadedItems.map((item) => item.key))
    const nextItems = [...uploadedItems]
    const nextPerFileDetails = { ...perFileDetails }
    let duplicateFound = false
    const rejectedVideos = []
    const rejectedUnsupported = []

    const acceptedFiles = []
    files.forEach((file) => {
      if (!(file instanceof File)) return
      const name = file.name || 'Unknown'

      if (isVideoFile(file)) {
        rejectedVideos.push(name)
        return
      }

      const extensionLower = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
      if (extensionLower && !ALLOWED_EXTENSIONS.includes(extensionLower)) {
        rejectedUnsupported.push(name)
        return
      }

      const relativePath = file.webkitRelativePath || ''
      const dedupeSuffix = relativePath || ''
      const key = `${file.name}:${file.size}:${file.lastModified}:${dedupeSuffix}`
      if (existingKeys.has(key)) {
        duplicateFound = true
        return
      }

      existingKeys.add(key)
      acceptedFiles.push({
        key,
        file,
        extensionLower,
        relativePath,
        uploadSource: source,
      })

      if (!nextPerFileDetails[key]) {
        nextPerFileDetails[key] = { ...sharedDetails }
      }
    })

    const preparedItems = await Promise.all(acceptedFiles.map(async (entry) => ({
      key: entry.key,
      name: entry.file.name,
      size: entry.file.size,
      extension: entry.extensionLower ? entry.extensionLower.toUpperCase() : 'FILE',
      rawFile: entry.file,
      previewUrl: await buildPreviewUrl(entry.file, entry.extensionLower),
      relativePath: entry.relativePath,
      uploadSource: entry.uploadSource,
    })))
    nextItems.push(...preparedItems)

    let discoveredRoot = ''
    if (source === 'browse-folder' && !folderName.trim()) {
      discoveredRoot = getRootFolderName(files)
      if (discoveredRoot) setFolderName(discoveredRoot)
    }

    if (rejectedVideos.length > 0) {
      showToast('error', 'Video files are not supported.')
    }
    if (rejectedUnsupported.length > 0) {
      showToast('error', `Unsupported files: ${rejectedUnsupported.join(', ')}`)
    }
    if (duplicateFound) {
      showToast('error', 'Some files were skipped because they were already selected.')
    }

    setUploadedItems(nextItems)
    setPerFileDetails(nextPerFileDetails)
    setErrors((prev) => ({
      ...prev,
      files: '',
      ...(folderName.trim() || discoveredRoot ? { folderName: '' } : {}),
    }))
  }

  const handleFileSelect = (event) => {
    addFiles(Array.from(event.target.files || []), 'browse-file')
    event.target.value = ''
  }

  const handleFolderSelect = (event) => {
    addFiles(Array.from(event.target.files || []), 'browse-folder')
    event.target.value = ''
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const openFolderPicker = () => {
    const node = folderInputRef.current
    if (!node) return
    node.setAttribute('webkitdirectory', '')
    node.setAttribute('directory', '')
    node.click()
  }

  const removeFile = (targetKey) => {
    const nextItems = uploadedItems.filter((item) => item.key !== targetKey)
    setUploadedItems(nextItems)
    setPerFileDetails((prev) => {
      const next = { ...prev }
      delete next[targetKey]
      return next
    })
    if (nextItems.length === 0) {
      setErrors((prev) => ({ ...prev, files: 'Select at least one file.' }))
    }
  }

  const updateSharedDetails = (field, value) => {
    setSharedDetails((prev) => ({ ...prev, [field]: value }))
    if (field === 'class') {
      setErrors((prev) => ({ ...prev, sharedClass: '' }))
    }
  }

  const updateFileDetails = (key, field, value) => {
    setPerFileDetails((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || createEmptyDetails()),
        [field]: value,
      },
    }))
    if (field === 'class') {
      setErrors((prev) => ({ ...prev, [`class-${key}`]: '' }))
    }
  }

  const isClassSelectionComplete = (() => {
    if (uploadedItems.length === 0) return false
    if (uploadedItems.length === 1 || multiMode === 'same') {
      return Boolean(sharedDetails.class.trim())
    }
    return uploadedItems.every((item) => Boolean((perFileDetails[item.key]?.class || '').trim()))
  })()

  const canSubmit = Boolean(
    category
    && folderName.trim()
    && uploadedItems.length > 0
    && isClassSelectionComplete
    && !isSubmitting,
  )

  const buildErrors = () => {
    const next = {}
    if (!category) next.category = 'Select a category.'
    if (!folderName.trim()) next.folderName = 'Folder name is required.'
    if (uploadedItems.length === 0) next.files = 'Select at least one file.'

    if (uploadedItems.length === 1 || multiMode === 'same') {
      if (!sharedDetails.class.trim()) next.sharedClass = 'Class is required.'
      return next
    }

    uploadedItems.forEach((item) => {
      if (!(perFileDetails[item.key]?.class || '').trim()) {
        next[`class-${item.key}`] = 'Class is required.'
      }
    })
    return next
  }

  const submitUpload = async () => {
    const validationErrors = buildErrors()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      showToast('error', 'Please complete the required fields.')
      return
    }

    setIsSubmitting(true)
    const metadataMode = uploadedItems.length === 1
      ? 'single'
      : (multiMode === 'individual' ? 'individual' : 'shared')

    const result = await onUpload({
      category,
      folderName: folderName.trim(),
      documentOwner: documentOwner.trim(),
      uploadedItems,
      metadataMode,
      sharedDetails,
      individualDetails: perFileDetails,
    })

    if (!result?.ok) {
      showToast('error', result?.message || 'Unable to process upload.')
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[180] p-4 animate-fade-in">
      <div className="bg-white border border-border-light rounded-xl shadow-xl w-[1040px] max-w-[96vw] max-h-[92vh] overflow-hidden">
        <div className="flex items-start justify-between px-6 py-5 border-b border-border-light">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Add Document</h2>
            <p className="text-sm text-text-muted mt-1">Create a folder, upload files, then complete file metadata.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:bg-background hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(92vh-78px)]">
          <div className="border border-border-light rounded-lg p-4">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-4">Folder Setup</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Category <span className="text-error">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategory(cat.id)
                        setErrors((prev) => ({ ...prev, category: '' }))
                      }}
                      className={`h-11 rounded-md border text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                        category === cat.id ? 'bg-primary border-primary text-white' : 'bg-white border-border text-text-primary hover:border-primary-light'
                      }`}
                    >
                      <cat.icon className={`w-4 h-4 ${category === cat.id ? 'text-white' : 'text-text-muted'}`} />
                      {cat.label}
                    </button>
                  ))}
                </div>
                {errors.category && <p className="text-xs text-error mt-1.5">{errors.category}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Folder Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(event) => {
                    setFolderName(event.target.value)
                    setErrors((prev) => ({ ...prev, folderName: '' }))
                  }}
                  placeholder="e.g. March 2026"
                  className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.folderName ? 'border-error' : 'border-border'}`}
                />
                {errors.folderName && <p className="text-xs text-error mt-1.5">{errors.folderName}</p>}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-text-primary mb-1.5">Document Owner</label>
              <input
                type="text"
                value={documentOwner}
                onChange={(event) => setDocumentOwner(event.target.value)}
                placeholder="Optional"
                className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="border border-border-light rounded-lg p-4 mt-5">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-4">Upload Files</h3>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver ? 'border-primary bg-primary-tint/30' : 'border-border hover:border-primary/70'}`}
              onDragOver={(event) => {
                event.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(event) => {
                event.preventDefault()
                setIsDragOver(false)
                addFiles(Array.from(event.dataTransfer.files || []), 'drag-drop')
              }}
            >
              <div className="w-12 h-12 mx-auto mb-3 bg-background rounded-full flex items-center justify-center">
                <FileUp className="w-6 h-6 text-text-muted" />
              </div>
              <p className="text-sm font-medium text-text-primary">Upload area</p>
              <p className="text-sm text-text-muted mt-1">Drag files here or use file/folder picker</p>
              <div className="mt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors"
                >
                  Select Files
                </button>
                <button
                  type="button"
                  onClick={openFolderPicker}
                  className="h-9 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background transition-colors inline-flex items-center gap-2"
                >
                  <FolderUp className="w-4 h-4" />
                  Select Folder
                </button>
              </div>
              <p className="text-xs text-text-muted mt-3">Accepted: PDF, images, Office docs, CSV, TXT, ZIP.</p>
              <p className="text-xs text-error mt-1">Video files are not supported.</p>
            </div>

            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
            <input ref={folderInputRef} type="file" multiple className="hidden" onChange={handleFolderSelect} />

            {errors.files && <p className="text-xs text-error mt-2">{errors.files}</p>}

            {uploadedItems.length > 0 && (
              <div className="mt-4 border border-border-light rounded-md overflow-hidden">
                <div className="grid grid-cols-[1.8fr_0.6fr_0.7fr_48px] gap-3 px-3 py-2 bg-background text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                  <span>File Name</span>
                  <span>Type</span>
                  <span>Size</span>
                  <span></span>
                </div>
                <div className="max-h-44 overflow-y-auto divide-y divide-border-light">
                  {uploadedItems.map((item) => (
                    <div key={item.key} className="grid grid-cols-[1.8fr_0.6fr_0.7fr_48px] gap-3 px-3 py-2.5 text-sm items-center">
                      <div className="truncate text-text-primary">{item.relativePath || item.name}</div>
                      <div className="text-text-secondary">{item.extension}</div>
                      <div className="text-text-secondary">{formatFileSize(item.size)}</div>
                      <button
                        type="button"
                        onClick={() => removeFile(item.key)}
                        className="w-7 h-7 rounded-md border border-border text-text-muted hover:text-error hover:border-error transition-colors flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {uploadedItems.length > 0 && (
            <div className="border border-border-light rounded-lg p-4 mt-5">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-4">Document Details</h3>

              {uploadedItems.length === 1 ? (
                <DocumentDetailsForm
                  details={sharedDetails}
                  onChange={updateSharedDetails}
                  classError={errors.sharedClass}
                  options={classOptions}
                  classInputId="kiamina-shared-class"
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-5 mb-4">
                    <label className="inline-flex items-center gap-2 text-sm text-text-primary">
                      <input
                        type="radio"
                        name="multi-mode"
                        checked={multiMode === 'same'}
                        onChange={() => setMultiMode('same')}
                      />
                      Apply same details to all files
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-text-primary">
                      <input
                        type="radio"
                        name="multi-mode"
                        checked={multiMode === 'individual'}
                        onChange={() => setMultiMode('individual')}
                      />
                      Set details individually
                    </label>
                  </div>

                  {multiMode === 'same' ? (
                    <DocumentDetailsForm
                      details={sharedDetails}
                      onChange={updateSharedDetails}
                      classError={errors.sharedClass}
                      options={classOptions}
                      classInputId="kiamina-multi-shared-class"
                    />
                  ) : (
                    <div className="space-y-4">
                      {uploadedItems.map((item, index) => (
                        <div key={item.key} className="border border-border-light rounded-md p-4">
                          <p className="text-sm font-semibold text-text-primary mb-3">
                            File {index + 1}: {item.relativePath || item.name}
                          </p>
                          <DocumentDetailsForm
                            details={perFileDetails[item.key] || createEmptyDetails()}
                            onChange={(field, value) => updateFileDetails(item.key, field, value)}
                            classError={errors[`class-${item.key}`]}
                            options={classOptions}
                            classInputId={`kiamina-class-${index}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitUpload()}
              disabled={!canSubmit}
              className="h-10 px-5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Processing...' : 'Upload & Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddDocumentModal
