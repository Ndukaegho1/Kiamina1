import { useEffect, useMemo, useRef, useState } from 'react'
import { Building2, DollarSign, FileUp, TrendingUp, X } from 'lucide-react'
import DotLottiePreloader from '../../common/DotLottiePreloader'

const PAYMENT_METHOD_OPTIONS = ['Cash', 'Bank Transfer', 'Card', 'Cheque', 'Mobile Money', 'POS', 'Other']

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
  paymentMethod: '',
  invoice: '',
  invoiceNumber: '',
})

const normalizeClassName = (value = '') => String(value || '').replace(/\s+/g, ' ').trim()

const dedupeClassOptions = (values = []) => {
  const byKey = new Map()
  ;(Array.isArray(values) ? values : []).forEach((value) => {
    const normalized = normalizeClassName(value)
    if (!normalized) return
    const key = normalized.toLowerCase()
    if (byKey.has(key)) return
    byKey.set(key, normalized)
  })
  return Array.from(byKey.values())
}

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

function ClassCreatableField({
  value,
  options = [],
  onChange,
  onCreate,
  error = '',
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)

  const normalizedOptions = useMemo(() => dedupeClassOptions(options), [options])
  const selectedClass = normalizeClassName(value)
  const normalizedQuery = normalizeClassName(query)
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return normalizedOptions
    const lowered = normalizedQuery.toLowerCase()
    return normalizedOptions.filter((item) => item.toLowerCase().includes(lowered))
  }, [normalizedQuery, normalizedOptions])
  const exactMatch = normalizedQuery
    ? normalizedOptions.some((item) => item.toLowerCase() === normalizedQuery.toLowerCase())
    : false
  const canCreate = Boolean(normalizedQuery) && !exactMatch
  const dropdownItems = [
    ...filteredOptions.map((item) => ({ type: 'option', value: item })),
    ...(canCreate ? [{ type: 'create', value: normalizedQuery }] : []),
  ]

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }
    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    setHighlightedIndex(dropdownItems.length > 0 ? 0 : -1)
  }, [query, isOpen, dropdownItems.length])

  const resolveCanonicalValue = (nextValue = '') => {
    const normalized = normalizeClassName(nextValue)
    if (!normalized) return ''
    const existing = normalizedOptions.find((item) => item.toLowerCase() === normalized.toLowerCase())
    return existing || normalized
  }

  const selectClassValue = (nextValue, { shouldCreate = false } = {}) => {
    const canonical = resolveCanonicalValue(nextValue)
    if (!canonical) return
    onChange(canonical)
    if (shouldCreate) onCreate?.(canonical)
    setQuery('')
    setIsOpen(false)
  }

  const clearClassValue = () => {
    onChange('')
    setQuery('')
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-text-primary mb-1.5">
        Class <span className="text-error">*</span>
      </label>
      <div className={`min-h-10 w-full rounded-md border px-2 py-1.5 flex flex-wrap items-center gap-1.5 bg-white ${error ? 'border-error' : 'border-border'}`}>
        {selectedClass && (
          <span className="inline-flex items-center h-7 px-2.5 rounded-full bg-[#153585]/10 text-[#153585] text-xs font-medium">
            {selectedClass}
            <button
              type="button"
              onClick={clearClassValue}
              className="ml-1.5 text-[#153585] hover:text-[#0f275f]"
              aria-label="Remove class"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            const nextValue = event.target.value
            if (selectedClass) onChange('')
            setQuery(nextValue)
            setIsOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && !query && selectedClass) {
              event.preventDefault()
              clearClassValue()
              return
            }
            if (event.key === 'ArrowDown') {
              if (dropdownItems.length === 0) return
              event.preventDefault()
              setIsOpen(true)
              setHighlightedIndex((prev) => (
                prev < dropdownItems.length - 1 ? prev + 1 : 0
              ))
              return
            }
            if (event.key === 'ArrowUp') {
              if (dropdownItems.length === 0) return
              event.preventDefault()
              setIsOpen(true)
              setHighlightedIndex((prev) => (
                prev > 0 ? prev - 1 : dropdownItems.length - 1
              ))
              return
            }
            if (event.key === 'Escape') {
              setIsOpen(false)
              return
            }
            if (event.key !== 'Enter') return
            event.preventDefault()

            if (dropdownItems.length > 0 && highlightedIndex >= 0) {
              const highlighted = dropdownItems[highlightedIndex]
              if (highlighted?.type === 'create') {
                selectClassValue(highlighted.value, { shouldCreate: true })
              } else if (highlighted?.value) {
                selectClassValue(highlighted.value)
              }
              return
            }

            const candidate = normalizeClassName(query)
            if (!candidate) return
            if (exactMatch) {
              selectClassValue(candidate)
              return
            }
            selectClassValue(candidate, { shouldCreate: true })
          }}
          placeholder={selectedClass ? '' : 'e.g. HeadOffice'}
          className="flex-1 min-w-[170px] h-7 px-1 text-sm text-text-primary focus:outline-none"
        />
      </div>
      <p className="text-xs text-text-muted mt-1">Type to create or select an existing class.</p>
      {error && <p className="text-xs text-error mt-1">{error}</p>}
      {isOpen && dropdownItems.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-border rounded-md shadow-sm max-h-48 overflow-y-auto">
          {dropdownItems.map((item, index) => {
            const active = index === highlightedIndex
            if (item.type === 'create') {
              return (
                <button
                  key={`create-${item.value}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectClassValue(item.value, { shouldCreate: true })}
                  className={`w-full h-9 px-3 text-left text-sm ${active ? 'bg-[#153585]/10 text-[#153585]' : 'text-text-primary hover:bg-[#153585]/10'}`}
                >
                  Create "{item.value}"
                </button>
              )
            }
            return (
              <button
                key={`option-${item.value}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => selectClassValue(item.value)}
                className={`w-full h-9 px-3 text-left text-sm ${active ? 'bg-[#153585]/10 text-[#153585]' : 'text-text-primary hover:bg-[#153585]/10'}`}
              >
                {item.value}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DocumentDetailsForm({
  category,
  details,
  onChange,
  classError,
  options,
  onCreateClass,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <ClassCreatableField
          value={details.class}
          options={options}
          onChange={(value) => onChange('class', value)}
          onCreate={onCreateClass}
          error={classError}
        />
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

      {category === 'expenses' && (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Payment Method</label>
          <select
            value={details.paymentMethod || ''}
            onChange={(event) => onChange('paymentMethod', event.target.value)}
            className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
          >
            <option value="">Select payment method</option>
            {PAYMENT_METHOD_OPTIONS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      )}

      {category === 'sales' && (
        <>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Invoice</label>
            <input
              type="text"
              value={details.invoice || ''}
              onChange={(event) => onChange('invoice', event.target.value)}
              placeholder="Optional"
              className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Invoice Number</label>
            <input
              type="text"
              value={details.invoiceNumber || ''}
              onChange={(event) => onChange('invoiceNumber', event.target.value)}
              placeholder="Optional"
              className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </>
      )}

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
  onCreateClassOption,
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
  const [sessionClassOptions, setSessionClassOptions] = useState([])

  const fileInputRef = useRef(null)

  const classOptions = useMemo(() => {
    const persistedOptions = category === 'sales'
      ? salesClassOptions
      : category === 'expenses'
        ? expenseClassOptions
        : [...expenseClassOptions, ...salesClassOptions]
    return dedupeClassOptions([...persistedOptions, ...sessionClassOptions])
  }, [category, expenseClassOptions, salesClassOptions, sessionClassOptions])

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
    setSessionClassOptions([])
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
      ...(folderName.trim() ? { folderName: '' } : {}),
    }))
  }

  const handleFileSelect = (event) => {
    addFiles(Array.from(event.target.files || []), 'browse-file')
    event.target.value = ''
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
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
    const nextValue = field === 'class' ? normalizeClassName(value) : value
    setSharedDetails((prev) => ({ ...prev, [field]: nextValue }))
    if (field === 'class') {
      setErrors((prev) => ({ ...prev, sharedClass: '' }))
    }
  }

  const updateFileDetails = (key, field, value) => {
    setPerFileDetails((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || createEmptyDetails()),
        [field]: field === 'class' ? normalizeClassName(value) : value,
      },
    }))
    if (field === 'class') {
      setErrors((prev) => ({ ...prev, [`class-${key}`]: '' }))
    }
  }

  const handleCreateClassOption = (value = '') => {
    const normalized = normalizeClassName(value)
    if (!normalized) return
    setSessionClassOptions((prev) => dedupeClassOptions([...prev, normalized]))
    onCreateClassOption?.(category, normalized)
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
    && documentOwner.trim()
    && uploadedItems.length > 0
    && isClassSelectionComplete
    && !isSubmitting,
  )

  const buildErrors = () => {
    const next = {}
    if (!category) next.category = 'Select a category.'
    if (!folderName.trim()) next.folderName = 'Folder name is required.'
    if (!documentOwner.trim()) next.documentOwner = 'Document owner is required.'
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
      const hasClassError = Boolean(
        validationErrors.sharedClass
        || Object.keys(validationErrors).some((key) => key.startsWith('class-')),
      )
      showToast('error', hasClassError ? 'Class is required before uploading.' : 'Please complete the required fields.')
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
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Document Owner <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={documentOwner}
                onChange={(event) => {
                  setDocumentOwner(event.target.value)
                  setErrors((prev) => ({ ...prev, documentOwner: '' }))
                }}
                placeholder="Enter document owner"
                className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.documentOwner ? 'border-error' : 'border-border'}`}
              />
              {errors.documentOwner && <p className="text-xs text-error mt-1.5">{errors.documentOwner}</p>}
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
              <p className="text-sm text-text-muted mt-1">Drag files here or use file picker</p>
              <div className="mt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors"
                >
                  Select File(s)
                </button>
              </div>
              <p className="text-xs text-text-muted mt-3">Accepted: PDF, images, Office docs, CSV, TXT, ZIP.</p>
              <p className="text-xs text-error mt-1">Video files are not supported.</p>
            </div>

            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />

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
                  category={category}
                  details={sharedDetails}
                  onChange={updateSharedDetails}
                  classError={errors.sharedClass}
                  options={classOptions}
                  onCreateClass={handleCreateClassOption}
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
                      category={category}
                      details={sharedDetails}
                      onChange={updateSharedDetails}
                      classError={errors.sharedClass}
                      options={classOptions}
                      onCreateClass={handleCreateClassOption}
                    />
                  ) : (
                    <div className="space-y-4">
                      {uploadedItems.map((item, index) => (
                        <div key={item.key} className="border border-border-light rounded-md p-4">
                          <p className="text-sm font-semibold text-text-primary mb-3">
                            File {index + 1}: {item.relativePath || item.name}
                          </p>
                          <DocumentDetailsForm
                            category={category}
                            details={perFileDetails[item.key] || createEmptyDetails()}
                            onChange={(field, value) => updateFileDetails(item.key, field, value)}
                            classError={errors[`class-${item.key}`]}
                            options={classOptions}
                            onCreateClass={handleCreateClassOption}
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
              {isSubmitting ? (
                <>
                  <DotLottiePreloader size={18} />
                  <span>Processing...</span>
                </>
              ) : 'Upload & Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddDocumentModal
