import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard,
  DollarSign,
  TrendingUp,
  Building2,
  Upload,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  Plus,
  Eye,
  X,
  FileUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  FileText,
  FileSpreadsheet,
  File,
  ChevronRight,
  User,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  UploadCloud,
  MapPin,
  Building,
  Lock
} from 'lucide-react'
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
  const [isDragOver, setIsDragOver] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [tagInput, setTagInput] = useState('')
  const [isAddingNewExpenseClass, setIsAddingNewExpenseClass] = useState(false)
  const [isAddingNewSalesClass, setIsAddingNewSalesClass] = useState(false)
  const [uploadedItems, setUploadedItems] = useState([])
  const [formData, setFormData] = useState({
    documentOwner: '',
    uploadType: '',
    vendorName: '',
    expenseClass: '',
    expenseDate: '',
    paymentMethod: '',
    description: '',
    customerName: '',
    invoiceNumber: '',
    salesClass: '',
    invoiceDate: '',
    paymentStatus: '',
    bankName: '',
    accountName: '',
    accountLast4: '',
    statementStartDate: '',
    statementEndDate: '',
    confidentialityLevel: 'Standard',
    internalNotes: '',
    processingPriority: 'Normal',
    tags: [],
  })
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)
  
  // Sync category with initialCategory prop when it changes
  useEffect(() => {
    console.log('[DEBUG] initialCategory changed to:', initialCategory);
    if (initialCategory) {
      setCategory(initialCategory);
    }
  }, [initialCategory]);
  
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('[DEBUG] Modal opened, resetting form');
      setUploadedItems([]);
      setFormData({
        documentOwner: '',
        uploadType: '',
        vendorName: '',
        expenseClass: '',
        expenseDate: '',
        paymentMethod: '',
        description: '',
        customerName: '',
        invoiceNumber: '',
        salesClass: '',
        invoiceDate: '',
        paymentStatus: '',
        bankName: '',
        accountName: '',
        accountLast4: '',
        statementStartDate: '',
        statementEndDate: '',
        confidentialityLevel: 'Standard',
        internalNotes: '',
        processingPriority: 'Normal',
        tags: [],
      });
      setErrors({});
    }
  }, [isOpen]);
  
  const allowedExtensions = ['pdf','png','jpg','jpeg','gif','webp','bmp','xls','xlsx','xlsm','xlsb','csv','doc','docx','ppt','pptx']

  if (!isOpen) return null

  const categories = [
    { id: 'expenses', label: 'Expenses', icon: DollarSign },
    { id: 'sales', label: 'Sales', icon: TrendingUp },
    { id: 'bank-statements', label: 'Bank Statements', icon: Building2 },
  ]

  const requiredMessage = 'This field is required.'
  const isBankCategory = category === 'bank-statements'
  const isSalesCategory = category === 'sales'
  const isExpenseCategory = category === 'expenses'
  const showExpenseClassDropdown = isExpenseCategory && expenseClassOptions.length > 1 && !isAddingNewExpenseClass
  const showSalesClassDropdown = isSalesCategory && salesClassOptions.length > 1 && !isAddingNewSalesClass

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const buildFileKey = (file) => `${file.name}:${file.size}:${file.lastModified}:${file.webkitRelativePath || ''}`

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const addTag = () => {
    const nextTag = tagInput.trim()
    if (!nextTag) return
    if (formData.tags.includes(nextTag)) {
      setTagInput('')
      return
    }
    setFormData(prev => ({ ...prev, tags: [...prev.tags, nextTag] }))
    setTagInput('')
  }

  const removeTag = (tag) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter((item) => item !== tag) }))
  }

  const addSelectedFiles = (selected) => {
    let foundDuplicate = false
    const existingKeys = new Set(uploadedItems.map((item) => item.key))
    const nextItems = [...uploadedItems]
    const invalidFiles = []
    selected.forEach((file) => {
      const name = file.name || file.webkitRelativePath || ''
      const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
      if (ext && !allowedExtensions.includes(ext)) {
        invalidFiles.push(name || 'Unknown')
        return
      }
      const key = buildFileKey(file)
      if (existingKeys.has(key)) {
        foundDuplicate = true
        return
      }
      existingKeys.add(key)
      const previewUrl = file && typeof file === 'object' && file instanceof File ? URL.createObjectURL(file) : null
      nextItems.push({
        key,
        name: file.webkitRelativePath || file.name,
        type: file.webkitRelativePath ? 'Folder' : 'File',
        size: file.size,
        extension: file.name.includes('.') ? file.name.split('.').pop().toUpperCase() : 'FILE',
        rawFile: file,
        previewUrl,
      })
    })
    if (invalidFiles.length > 0) showToast('error', `These files are not supported: ${invalidFiles.join(', ')}`)
    if (foundDuplicate) showToast('error', 'This file has already been added.')
    setUploadedItems(nextItems)
    if (nextItems.length > 0) setErrors(prev => ({ ...prev, files: '' }))
  }

  const handleFileSelect = (e) => {
    console.log('[DEBUG] handleFileSelect called, files:', e.target.files?.length);
    const selected = Array.from(e.target.files || [])
    console.log('[DEBUG] Selected files array:', selected.map(f => f.name));
    addSelectedFiles(selected)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (!category) {
      setErrors(prev => ({ ...prev, category: requiredMessage }))
      showToast('error', 'Please select a document category.')
      return
    }
    addSelectedFiles(Array.from(e.dataTransfer.files || []))
  }

  const openPicker = () => {
    console.log('[DEBUG] openPicker called, category:', category, 'uploadType:', formData.uploadType);
    console.log('[DEBUG] fileInputRef.current:', fileInputRef.current);
    console.log('[DEBUG] folderInputRef.current:', folderInputRef.current);
    if (!category) {
      setErrors(prev => ({ ...prev, category: requiredMessage }))
      showToast('error', 'Please select a document category.')
      return
    }
    // default to files if user didn't select
    const uploadType = formData.uploadType || 'files'
    if (!formData.uploadType) updateField('uploadType', uploadType)
    if (uploadType === 'folders') folderInputRef.current?.click()
    else fileInputRef.current?.click()
  }

  const removeItem = (key) => {
    const nextItems = uploadedItems.filter((item) => item.key !== key)
    setUploadedItems(nextItems)
    if (nextItems.length === 0) setErrors(prev => ({ ...prev, files: requiredMessage }))
  }

  const getValidationErrors = () => {
    const nextErrors = {}
    if (!category) nextErrors.category = requiredMessage
    if (!formData.documentOwner) nextErrors.documentOwner = requiredMessage
    if (!formData.uploadType) nextErrors.uploadType = requiredMessage
    if (uploadedItems.length === 0) nextErrors.files = requiredMessage
    if (isExpenseCategory) {
      if (!formData.vendorName.trim()) nextErrors.vendorName = requiredMessage
      if (!formData.expenseClass || !formData.expenseClass.trim()) nextErrors.expenseClass = requiredMessage
      if (!formData.expenseDate) nextErrors.expenseDate = requiredMessage
    }
    if (isSalesCategory) {
      if (!formData.customerName.trim()) nextErrors.customerName = requiredMessage
      if (!formData.salesClass || !formData.salesClass.trim()) nextErrors.salesClass = requiredMessage
    }
    if (isBankCategory) {
      if (!formData.bankName.trim()) nextErrors.bankName = requiredMessage
      if (!formData.accountName.trim()) nextErrors.accountName = requiredMessage
      if (!formData.statementStartDate) nextErrors.statementStartDate = requiredMessage
      if (!formData.statementEndDate) nextErrors.statementEndDate = requiredMessage
      if (formData.accountLast4 && !/^\d{4}$/.test(formData.accountLast4)) nextErrors.accountLast4 = 'Enter last 4 digits only.'
    }
    return nextErrors
  }

  const canSubmit = category && formData.uploadType && uploadedItems.length > 0 && Object.keys(getValidationErrors()).length === 0

  const submitUpload = async () => {
    const validationErrors = getValidationErrors()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      if (validationErrors.category) showToast('error', 'Please select a document category.')
      else showToast('error', 'Please complete all required fields.')
      return
    }
    setIsSubmitting(true)
    const result = await onUpload({ category, formData, uploadedItems })
    if (!result?.ok) showToast('error', result?.message || 'Unable to process document upload.')
    setIsSubmitting(false)
  }

  const fieldClass = (name) => `w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors[name] ? 'border-error' : 'border-border'}`

  const renderCategoryFields = () => {
    if (isExpenseCategory) {
      return (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Vendor Name <span className="text-error">*</span></label>
            <input value={formData.vendorName} onChange={(e) => updateField('vendorName', e.target.value)} className={fieldClass('vendorName')} />
            {errors.vendorName && <p className="text-xs text-error mt-1">{errors.vendorName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Class <span className="text-error">*</span></label>
            {showExpenseClassDropdown ? (
              <select
                value={formData.expenseClass}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    setIsAddingNewExpenseClass(true)
                    updateField('expenseClass', '')
                    return
                  }
                  updateField('expenseClass', e.target.value)
                }}
                className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              >
                <option value="">Select class</option>
                {expenseClassOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
                <option value="__add_new__">Add New Class</option>
              </select>
            ) : (
              <input value={formData.expenseClass} onChange={(e) => updateField('expenseClass', e.target.value)} placeholder="Enter class" className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            )}
            {isAddingNewExpenseClass && expenseClassOptions.length > 1 && (
              <button type="button" onClick={() => setIsAddingNewExpenseClass(false)} className="text-xs text-primary mt-1 hover:text-primary-light">
                Back to Class List
              </button>
            )}
            {errors.expenseClass && <p className="text-xs text-error mt-1">{errors.expenseClass}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Expense Date <span className="text-error">*</span></label>
            <input type="date" value={formData.expenseDate} onChange={(e) => updateField('expenseDate', e.target.value)} className={fieldClass('expenseDate')} />
            {errors.expenseDate && <p className="text-xs text-error mt-1">{errors.expenseDate}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Payment Method</label>
            <select value={formData.paymentMethod} onChange={(e) => updateField('paymentMethod', e.target.value)} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary">
              <option value="">Select payment method</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Card">Card</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Reference Number</label>
            <input placeholder="Optional" className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-text-primary mb-1.5">Description</label>
            <textarea rows={3} value={formData.description} onChange={(e) => updateField('description', e.target.value)} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-primary resize-none" />
          </div>
        </div>
      )
    }

    if (isSalesCategory) {
      return (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Customer Name <span className="text-error">*</span></label>
            <input value={formData.customerName} onChange={(e) => updateField('customerName', e.target.value)} className={fieldClass('customerName')} />
            {errors.customerName && <p className="text-xs text-error mt-1">{errors.customerName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Invoice Number</label>
            <input value={formData.invoiceNumber} onChange={(e) => updateField('invoiceNumber', e.target.value)} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Class <span className="text-error">*</span></label>
            {showSalesClassDropdown ? (
              <select
                value={formData.salesClass}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    setIsAddingNewSalesClass(true)
                    updateField('salesClass', '')
                    return
                  }
                  updateField('salesClass', e.target.value)
                }}
                className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              >
                <option value="">Select class</option>
                {salesClassOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
                <option value="__add_new__">Add New Class</option>
              </select>
            ) : (
              <input value={formData.salesClass} onChange={(e) => updateField('salesClass', e.target.value)} placeholder="Enter class" className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            )}
            {isAddingNewSalesClass && salesClassOptions.length > 1 && (
              <button type="button" onClick={() => setIsAddingNewSalesClass(false)} className="text-xs text-primary mt-1 hover:text-primary-light">
                Back to Class List
              </button>
            )}
            {errors.salesClass && <p className="text-xs text-error mt-1">{errors.salesClass}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Invoice Date</label>
            <input type="date" value={formData.invoiceDate} onChange={(e) => updateField('invoiceDate', e.target.value)} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Payment Status</label>
            <select value={formData.paymentStatus} onChange={(e) => updateField('paymentStatus', e.target.value)} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary">
              <option value="">Select payment status</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partially Paid">Partially Paid</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-text-primary mb-1.5">Description</label>
            <textarea rows={3} value={formData.description} onChange={(e) => updateField('description', e.target.value)} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-primary resize-none" />
          </div>
        </div>
      )
    }

    if (isBankCategory) {
      return (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Bank Name <span className="text-error">*</span></label>
            <input value={formData.bankName} onChange={(e) => updateField('bankName', e.target.value)} className={fieldClass('bankName')} />
            {errors.bankName && <p className="text-xs text-error mt-1">{errors.bankName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Account Name <span className="text-error">*</span></label>
            <input value={formData.accountName} onChange={(e) => updateField('accountName', e.target.value)} className={fieldClass('accountName')} />
            {errors.accountName && <p className="text-xs text-error mt-1">{errors.accountName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Account Number (Last 4 Digits)</label>
            <input value={formData.accountLast4} maxLength={4} inputMode="numeric" onChange={(e) => updateField('accountLast4', e.target.value.replace(/\D/g, '').slice(0, 4))} className={fieldClass('accountLast4')} />
            {errors.accountLast4 && <p className="text-xs text-error mt-1">{errors.accountLast4}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Statement Period Start Date <span className="text-error">*</span></label>
            <input type="date" value={formData.statementStartDate} onChange={(e) => updateField('statementStartDate', e.target.value)} className={fieldClass('statementStartDate')} />
            {errors.statementStartDate && <p className="text-xs text-error mt-1">{errors.statementStartDate}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Statement Period End Date <span className="text-error">*</span></label>
            <input type="date" value={formData.statementEndDate} onChange={(e) => updateField('statementEndDate', e.target.value)} className={fieldClass('statementEndDate')} />
            {errors.statementEndDate && <p className="text-xs text-error mt-1">{errors.statementEndDate}</p>}
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[180] p-4 animate-fade-in">
      <div className="bg-white border border-border-light rounded-xl shadow-xl w-[980px] max-w-[96vw] max-h-[92vh] overflow-hidden">
        <div className="flex items-start justify-between px-6 py-5 border-b border-border-light">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Add Document</h2>
            <p className="text-sm text-text-muted mt-1">Upload financial records for review and processing.</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:bg-background hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(92vh-78px)]">
          <div className="border border-border-light rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">Step 1: Document Category Selection</h3>
              <span className="text-xs text-text-muted">Mandatory</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id)
                    setIsAddingNewExpenseClass(false)
                    setIsAddingNewSalesClass(false)
                    setErrors(prev => ({ ...prev, category: '' }))
                  }}
                  className={`h-20 rounded-md border text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                    category === cat.id ? 'bg-primary border-primary text-white' : 'bg-white border-border text-text-primary hover:border-primary-light'
                  }`}
                >
                  <cat.icon className={`w-4 h-4 ${category === cat.id ? 'text-white' : 'text-text-muted'}`} />
                  {cat.label}
                </button>
              ))}
            </div>
            {errors.category && <p className="text-xs text-error mt-2">{errors.category}</p>}
          </div>

          {category && (
            <>
              <div className="border border-border-light rounded-lg p-4 mt-5">
                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-4">Step 2: Intake Form</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Document Owner <span className="text-error">*</span></label>
                    <input value={formData.documentOwner} onChange={(e) => updateField('documentOwner', e.target.value)} placeholder="Enter document owner name" className={fieldClass('documentOwner')} />
                    <p className="text-xs text-text-muted mt-1">Enter the person responsible for this document.</p>
                    {errors.documentOwner && <p className="text-xs text-error mt-1">{errors.documentOwner}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Upload Type <span className="text-error">*</span></label>
                    <div className={`h-10 px-3 border rounded-md flex items-center gap-6 ${errors.uploadType ? 'border-error' : 'border-border'}`}>
                      <label className="inline-flex items-center gap-2 text-sm text-text-secondary"><input type="radio" checked={formData.uploadType === 'files'} onChange={() => updateField('uploadType', 'files')} className="accent-primary" />File(s)</label>
                      <label className="inline-flex items-center gap-2 text-sm text-text-secondary"><input type="radio" checked={formData.uploadType === 'folders'} onChange={() => updateField('uploadType', 'folders')} className="accent-primary" />Folder(s)</label>
                    </div>
                    <p className="text-xs text-text-muted mt-1">You may upload multiple files or multiple folders.</p>
                    {errors.uploadType && <p className="text-xs text-error mt-1">{errors.uploadType}</p>}
                  </div>
                </div>
                {renderCategoryFields()}
              </div>

              <div className="border border-border-light rounded-lg p-4 mt-5">
                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-4">Step 3: Upload Area</h3>
                <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver ? 'border-primary bg-primary-tint/30' : 'border-border hover:border-primary/70'}`} onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }} onDragLeave={() => setIsDragOver(false)} onDrop={handleDrop}>
                  <div className="w-12 h-12 mx-auto mb-3 bg-background rounded-full flex items-center justify-center"><FileUp className="w-6 h-6 text-text-muted" /></div>
                  <p className="text-sm font-medium text-text-primary">Drag &amp; drop files or folders here</p>
                  <p className="text-sm text-text-muted my-1">or</p>
                  <button type="button" onClick={openPicker} className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors">Select Files / Folders</button>
                  <p className="text-xs text-text-muted mt-2">All file types supported.</p>
                  <p className="text-xs text-text-muted mt-1">Accepted: PDF, PNG, JPG, GIF, BMP, CSV, XLS/XLSX, DOC/DOCX, PPT/PPTX</p>
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.xls,.xlsx,.xlsm,.xlsb,.csv,.doc,.docx,.ppt,.pptx" className="hidden" onChange={handleFileSelect} />
                  <input ref={folderInputRef} type="file" multiple webkitdirectory="" directory="" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.xls,.xlsx,.xlsm,.xlsb,.csv,.doc,.docx,.ppt,.pptx" className="hidden" onChange={handleFileSelect} />
                </div>
                {errors.files && <p className="text-xs text-error mt-2">{errors.files}</p>}
                {uploadedItems.length > 0 && (
                  <div className="mt-4 border border-border-light rounded-md overflow-hidden">
                    <div className="grid grid-cols-[1.8fr_0.7fr_0.7fr_48px] gap-3 px-3 py-2 bg-background text-[11px] font-semibold text-text-secondary uppercase tracking-wide"><span>Name</span><span>Type</span><span>Size</span><span></span></div>
                    <div className="max-h-44 overflow-y-auto divide-y divide-border-light">
                      {uploadedItems.map((item) => (
                        <div key={item.key} className="grid grid-cols-[1.8fr_0.7fr_0.7fr_48px] gap-3 px-3 py-2.5 text-sm items-center">
                          <div className="truncate text-text-primary">{item.name}</div>
                          <div className="text-text-secondary">{item.type}</div>
                          <div className="text-text-secondary">{formatFileSize(item.size)}</div>
                          <button type="button" onClick={() => removeItem(item.key)} className="w-7 h-7 rounded-md border border-border text-text-muted hover:text-error hover:border-error transition-colors flex items-center justify-center"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-border-light rounded-lg p-4 mt-5">
                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-4">Step 4: Additional Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Confidentiality Level</label>
                    <select value={formData.confidentialityLevel} onChange={(e) => updateField('confidentialityLevel', e.target.value)} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"><option>Standard</option><option>Confidential</option><option>Highly Confidential</option></select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Processing Priority</label>
                    <select value={formData.processingPriority} onChange={(e) => updateField('processingPriority', e.target.value)} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"><option>Normal</option><option>High</option><option>Urgent</option></select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Tags</label>
                    <div className="border border-border rounded-md px-2 py-2">
                      <div className="flex flex-wrap gap-2 mb-2">{formData.tags.map(tag => <span key={tag} className="inline-flex items-center gap-1 text-xs bg-background text-text-secondary border border-border-light rounded px-2 py-1">{tag}<button type="button" onClick={() => removeTag(tag)} className="text-text-muted hover:text-error"><X className="w-3 h-3" /></button></span>)}</div>
                      <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }} onBlur={addTag} placeholder="Type tag and press Enter" className="w-full h-8 px-2 text-sm border border-border rounded focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Internal Notes (Visible to Admin only)</label>
                    <textarea rows={3} value={formData.internalNotes} onChange={(e) => updateField('internalNotes', e.target.value)} className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-primary resize-none" />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button type="button" onClick={onClose} className="h-10 px-5 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background transition-colors">Cancel</button>
            <button type="button" onClick={() => void submitUpload()} disabled={!canSubmit || isSubmitting} className="h-10 px-5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
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

