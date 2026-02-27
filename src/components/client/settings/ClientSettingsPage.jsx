import { useEffect, useState } from 'react'
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
  UploadCloud,
  MapPin,
  Building,
  Lock
} from 'lucide-react'
import { INDUSTRY_OPTIONS } from '../../../data/client/mockData'
function SettingsPage({
  showToast,
  profilePhoto,
  setProfilePhoto,
  companyLogo,
  setCompanyLogo,
  setCompanyName,
  setClientFirstName,
  settingsStorageKey,
}) {
  const [activeSection, setActiveSection] = useState('user-profile')
  const [editMode, setEditMode] = useState({
    'user-profile': false,
    'notifications': false,
    'identity': false,
    'business-profile': false,
    'tax-details': false,
    'registered-address': false,
  })

  const scopedStorageSuffix = settingsStorageKey?.includes(':')
    ? settingsStorageKey.split(':').slice(1).join(':')
    : ''
  const getScopedClientKey = (baseKey) => (
    scopedStorageSuffix ? `${baseKey}:${scopedStorageSuffix}` : baseKey
  )
  const notificationSettingsKey = getScopedClientKey('notificationSettings')
  const verificationDocsKey = getScopedClientKey('verificationDocs')
  const profilePhotoKey = getScopedClientKey('profilePhoto')
  const companyLogoKey = getScopedClientKey('companyLogo')

  // Initialize form data from localStorage
  const getInitialFormData = () => {
    const saved = localStorage.getItem(settingsStorageKey || 'settingsFormData')
    if (saved) {
      return JSON.parse(saved)
    }
    return {
      fullName: '',
      email: '',
      phone: '',
      roleInCompany: '',
      businessType: '',
      cacNumber: '',
      businessName: '',
      country: '',
      currency: 'NGN',
      language: 'English',
      industry: '',
      industryOther: '',
      tin: '',
      reportingCycle: '',
      startMonth: '',
      address1: '',
      address2: '',
      city: '',
      postalCode: '',
      addressCountry: 'Nigeria',
    }
  }

  const [formData, setFormData] = useState(getInitialFormData)
  const [draftData, setDraftData] = useState(getInitialFormData)
  const [errors, setErrors] = useState({})
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem(notificationSettingsKey) || localStorage.getItem('notificationSettings')
    return saved ? JSON.parse(saved) : {
      newUploads: true,
      approvals: true,
      weeklySummary: false,
      compliance: true,
      security: true,
    }
  })
  const [verificationDocs, setVerificationDocs] = useState(() => {
    const saved = localStorage.getItem(verificationDocsKey) || localStorage.getItem('verificationDocs')
    return saved ? JSON.parse(saved) : {
      govId: null,
      proofOfAddress: null,
      businessReg: null,
    }
  })
  const [logoFile, setLogoFile] = useState(companyLogo)
  const [photoFile, setPhotoFile] = useState(profilePhoto)

  useEffect(() => {
    setLogoFile(companyLogo || null)
  }, [companyLogo])

  useEffect(() => {
    setPhotoFile(profilePhoto || null)
  }, [profilePhoto])

  // Fields that become admin-controlled after initial successful save.
  const adminOnlyFields = ['fullName', 'email', 'cacNumber', 'businessName', 'tin']
  const complianceLockedFields = ['email', 'businessType', 'country']

  const [lockedAdminFields, setLockedAdminFields] = useState(() => {
    const initialData = getInitialFormData()
    return adminOnlyFields.reduce((acc, field) => {
      const value = initialData[field]
      acc[field] = typeof value === 'string' && value.trim().length > 0
      return acc
    }, {})
  })

  const hasValue = (value) => {
    if (typeof value === 'string') return value.trim().length > 0
    return value !== null && value !== undefined && value !== ''
  }

  const isComplianceLocked = (field) => {
    return complianceLockedFields.includes(field) && hasValue(formData[field])
  }

  const isFieldLocked = (field) => {
    return Boolean(lockedAdminFields[field]) || isComplianceLocked(field)
  }

  const showLockedFieldToast = () => {
    showToast('error', 'This information is system-controlled and cannot be edited. To change this information, please contact support.')
  }

  const handleLockedFieldClick = (fieldName) => {
    showLockedFieldToast()
    if (fieldName) {
      setErrors(prev => ({ ...prev, [fieldName]: prev[fieldName] || '' }))
    }
  }

  const navItems = [
    { id: 'user-profile', label: 'User Profile', icon: User },
    { id: 'notifications', label: 'Notification Settings', icon: Bell },
    { id: 'identity', label: 'Identity Verification', icon: Shield },
  ]

  const businessNavItems = [
    { id: 'business-profile', label: 'Business Profile', icon: Building },
    { id: 'tax-details', label: 'Tax Details', icon: DollarSign },
    { id: 'registered-address', label: 'Registered Address', icon: MapPin },
  ]

  const countries = ['Nigeria', 'UK', 'US', 'Canada', 'Australia']

  const handleInputChange = (field, value) => {
    if (isFieldLocked(field)) {
      handleLockedFieldClick(field)
      return
    }

    setDraftData(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'businessType' && value === 'Individual') {
        next.cacNumber = ''
      }
      return next
    })

    setErrors(prev => {
      const nextErrors = { ...prev, [field]: '' }
      if (field === 'businessType' && value === 'Individual') {
        nextErrors.cacNumber = ''
      }
      return nextErrors
    })
  }

  const startSectionEdit = (section) => {
    setDraftData(formData)
    setErrors({})
    setEditMode(prev => ({ ...prev, [section]: true }))
  }

  const cancelSectionEdit = (section) => {
    setDraftData(formData)
    setErrors({})
    setEditMode(prev => ({ ...prev, [section]: false }))
  }

  const handleNotificationChange = (key) => {
    setNotifications(prev => {
      const newData = { ...prev, [key]: !prev[key] }
      localStorage.setItem(notificationSettingsKey, JSON.stringify(newData))
      return newData
    })
  }

  const scrollToFirstInvalidField = (newErrors) => {
    const firstInvalidField = Object.keys(newErrors)[0]
    if (!firstInvalidField) return
    setTimeout(() => {
      const el = document.getElementById(`settings-${firstInvalidField}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        if (typeof el.focus === 'function') el.focus()
      }
    }, 0)
  }

  const validateProfile = (data) => {
    const newErrors = {}
    if (!hasValue(data.fullName)) newErrors.fullName = 'This field is required.'
    if (!hasValue(data.email)) newErrors.email = 'This field is required.'
    if (!hasValue(data.phone)) newErrors.phone = 'This field is required.'
    return newErrors
  }

  const validateBusiness = (data) => {
    const newErrors = {}
    if (!hasValue(data.businessType)) newErrors.businessType = 'This field is required.'
    if ((data.businessType === 'Business' || data.businessType === 'Non-Profit') && !hasValue(data.cacNumber)) {
      const isNigeriaRegistration = (data.country || '').trim().toLowerCase() === 'nigeria' || !hasValue(data.country)
      newErrors.cacNumber = isNigeriaRegistration ? 'CAC registration number is required.' : 'Business registration number is required.'
    }
    if (!hasValue(data.businessName)) newErrors.businessName = 'This field is required.'
    if (!hasValue(data.country)) newErrors.country = 'This field is required.'
    if (!hasValue(data.currency)) newErrors.currency = 'This field is required.'
    if (!hasValue(data.language)) newErrors.language = 'This field is required.'
    if (!hasValue(data.industry)) newErrors.industry = 'This field is required.'
    if (data.industry === 'Others' && !hasValue(data.industryOther)) newErrors.industryOther = 'This field is required.'
    return newErrors
  }

  const validateTax = (data) => {
    const newErrors = {}
    if (!hasValue(data.tin)) newErrors.tin = 'This field is required.'
    if (!hasValue(data.reportingCycle)) newErrors.reportingCycle = 'This field is required.'
    if (!hasValue(data.startMonth)) newErrors.startMonth = 'This field is required.'
    return newErrors
  }

  const validateAddress = (data) => {
    const newErrors = {}
    if (!hasValue(data.address1)) newErrors.address1 = 'This field is required.'
    if (!hasValue(data.city)) newErrors.city = 'This field is required.'
    if (!hasValue(data.postalCode)) newErrors.postalCode = 'This field is required.'
    if (!hasValue(data.addressCountry)) newErrors.addressCountry = 'This field is required.'
    return newErrors
  }

  const saveSection = (section, validateFn, lockableFields = []) => {
    const newErrors = validateFn(draftData)
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      showToast('error', 'Please complete all required fields.')
      scrollToFirstInvalidField(newErrors)
      return false
    }

    const updatedData = { ...draftData }
    setFormData(updatedData)
    localStorage.setItem(settingsStorageKey || 'settingsFormData', JSON.stringify(updatedData))
    if (typeof setCompanyName === 'function') {
      setCompanyName(updatedData.businessName?.trim() || 'Acme Corporation')
    }
    if (typeof setClientFirstName === 'function') {
      setClientFirstName(updatedData.fullName?.trim()?.split(/\s+/)?.[0] || 'Client')
    }
    setLockedAdminFields(prev => {
      const next = { ...prev }
      lockableFields.forEach((field) => {
        if (hasValue(updatedData[field])) next[field] = true
      })
      return next
    })
    setEditMode(prev => ({ ...prev, [section]: false }))
    setErrors({})
    showToast('success', 'Changes saved successfully.')
    return true
  }

  const handleSaveProfile = () => {
    saveSection('user-profile', validateProfile, ['fullName', 'email'])
  }

  const handleSaveNotifications = () => {
    showToast('success', 'Notification preferences updated.')
  }

  const handleSubmitVerification = () => {
    if (!verificationDocs.govId || !verificationDocs.proofOfAddress || !verificationDocs.businessReg) {
      showToast('error', 'Required documents missing.')
      return
    }
    showToast('success', 'Verification submitted successfully.')
  }

  const handleSaveBusiness = () => {
    const requiresRegistrationNumber = draftData.businessType === 'Business' || draftData.businessType === 'Non-Profit'
    const lockableFields = requiresRegistrationNumber ? ['cacNumber', 'businessName'] : ['businessName']
    saveSection('business-profile', validateBusiness, lockableFields)
  }

  const handleSaveTax = () => {
    saveSection('tax-details', validateTax, ['tin'])
  }

  const handleSaveAddress = () => {
    saveSection('registered-address', validateAddress)
  }

  const handleFileUpload = (docType, e) => {
    const file = e.target.files[0]
    if (file) {
      setVerificationDocs(prev => {
        const next = { ...prev, [docType]: file.name }
        localStorage.setItem(verificationDocsKey, JSON.stringify(next))
        return next
      })
    }
  }

  const handleLogoUpload = (e) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return

    if (!file.type?.startsWith('image/')) {
      showToast('error', 'Invalid file format. Please upload an image file.')
      input.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Company logo must be 5 MB or less.')
      input.value = ''
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      setLogoFile(objectUrl)
      setCompanyLogo(objectUrl)
      localStorage.setItem(companyLogoKey, objectUrl)
      showToast('success', 'Company logo updated successfully.')
      input.value = ''
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      showToast('error', 'Invalid file format. Please upload an image file.')
      input.value = ''
    }
    image.src = objectUrl
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      setPhotoFile(objectUrl)
      setProfilePhoto(objectUrl)
      localStorage.setItem(profilePhotoKey, objectUrl)
    }
  }

  const industries = INDUSTRY_OPTIONS

  const reportingCycles = [
    'Last day of January',
    'Last day of February',
    'Last day of March',
    'Last day of April',
    'Last day of May',
    'Last day of June',
    'Last day of July',
    'Last day of August',
    'Last day of September',
    'Last day of October',
    'Last day of November',
    'Last day of December',
  ]

  const startMonths = [
    'First day of January',
    'First day of February',
    'First day of March',
    'First day of April',
    'First day of May',
    'First day of June',
    'First day of July',
    'First day of August',
    'First day of September',
    'First day of October',
    'First day of November',
    'First day of December',
  ]

  const renderReadonlyField = (label, value, required = false) => {
    const missing = required && !hasValue(value)
    const displayValue = missing ? 'Not Provided' : (hasValue(value) ? value : '-')

    return (
      <div className="rounded-md border border-border-light bg-background/40 px-3 py-2.5">
        <div className="flex items-center gap-1 text-[11px] font-medium text-text-secondary uppercase tracking-wide">
          <span>{label}</span>
          {required && <span className="text-error">*</span>}
          {missing && <AlertCircle className="w-3.5 h-3.5 text-error" />}
        </div>
        <div className={`mt-1 text-sm font-medium ${missing ? 'text-error' : 'text-text-primary'}`}>
          {displayValue}
        </div>
      </div>
    )
  }

  const renderLockedField = (field, label, required = false) => {
    const value = draftData[field]
    const missing = required && !hasValue(value)
    const errorMessage = errors[field]

    return (
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {label} {required && <span className="text-error">*</span>}
          {missing && <AlertCircle className="inline w-3.5 h-3.5 text-error ml-1" />}
        </label>
        <button
          id={`settings-${field}`}
          type="button"
          onClick={() => handleLockedFieldClick(field)}
          className={`w-full h-10 px-3 border rounded-md bg-gray-100 text-left flex items-center justify-between ${
            errorMessage ? 'border-error' : 'border-gray-200'
          }`}
        >
          <span className={`text-sm ${missing ? 'text-error' : 'text-text-primary'}`}>
            {missing ? 'Not Provided' : value}
          </span>
          <Lock className="w-4 h-4 text-text-muted" />
        </button>
        {errorMessage && <p className="text-xs text-error mt-1">{errorMessage}</p>}
      </div>
    )
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'user-profile': {
        const isProfileEditMode = editMode['user-profile']
        const fullNameLocked = isFieldLocked('fullName')
        const emailLocked = isFieldLocked('email')

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">User Profile</h3>
                <p className="text-sm text-text-muted">Manage your personal information</p>
                <p className="text-xs text-text-muted mt-1">Fields marked with <span className="text-error">*</span> are mandatory.</p>
              </div>
              <button
                onClick={() => isProfileEditMode ? cancelSectionEdit('user-profile') : startSectionEdit('user-profile')}
                className={`h-9 px-4 rounded-md text-sm font-medium transition-colors ${
                  isProfileEditMode ? 'bg-error-bg text-error hover:bg-error/10' : 'bg-primary text-white hover:bg-primary-light'
                }`}
              >
                {isProfileEditMode ? 'Cancel Edit' : 'Edit'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-semibold overflow-hidden bg-primary">
                {photoFile ? (
                  <img src={photoFile} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  'JD'
                )}
              </div>
              {isProfileEditMode && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    id="photo-upload"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <label htmlFor="photo-upload" className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors cursor-pointer inline-flex items-center">
                    Upload Photo
                  </label>
                </div>
              )}
            </div>

            {!isProfileEditMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderReadonlyField('Full Name', formData.fullName, true)}
                {renderReadonlyField('Email Address', formData.email, true)}
                {renderReadonlyField('Phone Number', formData.phone, true)}
                {renderReadonlyField('Role in Company', formData.roleInCompany, false)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fullNameLocked ? (
                    renderLockedField('fullName', 'Full Name', true)
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">Full Name <span className="text-error">*</span></label>
                      <input
                        id="settings-fullName"
                        type="text"
                        placeholder="Enter your full legal name"
                        value={draftData.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.fullName ? 'border-error' : 'border-border'}`}
                      />
                      {errors.fullName && <p className="text-xs text-error mt-1">{errors.fullName}</p>}
                    </div>
                  )}

                  {emailLocked ? (
                    renderLockedField('email', 'Email Address', true)
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">Email Address <span className="text-error">*</span></label>
                      <input
                        id="settings-email"
                        type="email"
                        placeholder="name@company.com"
                        value={draftData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.email ? 'border-error' : 'border-border'}`}
                      />
                      {errors.email && <p className="text-xs text-error mt-1">{errors.email}</p>}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Phone Number <span className="text-error">*</span></label>
                    <input
                      id="settings-phone"
                      type="tel"
                      placeholder="+234 800 000 0000"
                      value={draftData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.phone ? 'border-error' : 'border-border'}`}
                    />
                    {errors.phone && <p className="text-xs text-error mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Role in Company</label>
                    <input
                      id="settings-roleInCompany"
                      type="text"
                      placeholder="e.g., Finance Manager"
                      value={draftData.roleInCompany}
                      onChange={(e) => handleInputChange('roleInCompany', e.target.value)}
                      className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                    />
                    <p className="text-xs text-text-muted mt-1">Enter your official role within the organization.</p>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSaveProfile}
                    className="h-10 px-6 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </>
            )}
          </div>
        )
      }

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">Notification Settings</h3>
                <p className="text-sm text-text-muted">Configure how you receive updates</p>
              </div>
              <button
                onClick={() => setEditMode(prev => ({ ...prev, notifications: !prev.notifications }))}
                className={`h-9 px-4 rounded-md text-sm font-medium transition-colors ${
                  editMode['notifications'] 
                    ? 'bg-error-bg text-error hover:bg-error/10' 
                    : 'bg-primary text-white hover:bg-primary-light'
                }`}
              >
                {editMode['notifications'] ? 'Done' : 'Edit'}
              </button>
            </div>

            <div className="space-y-4">
              {[
                { key: 'newUploads', label: 'Email notifications for new uploads', desc: 'Receive alerts when new documents are uploaded to your account' },
                { key: 'approvals', label: 'Email notifications for document approvals', desc: 'Get notified when documents are reviewed and approved' },
                { key: 'weeklySummary', label: 'Weekly activity summary', desc: 'Receive a weekly digest of all account activity' },
                { key: 'compliance', label: 'Compliance reminders', desc: 'Stay informed about regulatory deadlines and requirements' },
                { key: 'security', label: 'Security alerts', desc: 'Get notified about suspicious activity or login attempts' },
              ].map((item) => (
                <div key={item.key} className={`flex items-start gap-4 p-4 rounded-lg ${editMode['notifications'] ? 'bg-background' : 'bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    checked={notifications[item.key]}
                    onChange={() => editMode['notifications'] && handleNotificationChange(item.key)}
                    disabled={!editMode['notifications']}
                    className={`w-4 h-4 mt-0.5 accent-primary ${!editMode['notifications'] ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <div>
                    <div className="text-sm font-medium text-text-primary">{item.label}</div>
                    <div className="text-xs text-text-muted mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <button
                onClick={handleSaveNotifications}
                className="h-10 px-6 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )

      case 'identity': {
        const isIdentityEditMode = editMode['identity']
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">Identity Verification</h3>
                <p className="text-sm text-text-muted">Verify your identity to comply with regulations</p>
                <p className="text-xs text-text-muted mt-1">Fields marked with <span className="text-error">*</span> are mandatory.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center h-7 px-3 rounded-full text-xs font-medium bg-warning-bg text-warning">
                  Pending Verification
                </span>
                <button
                  onClick={() => isIdentityEditMode ? cancelSectionEdit('identity') : startSectionEdit('identity')}
                  className={`h-9 px-4 rounded-md text-sm font-medium transition-colors ${
                    isIdentityEditMode ? 'bg-error-bg text-error hover:bg-error/10' : 'bg-primary text-white hover:bg-primary-light'
                  }`}
                >
                  {isIdentityEditMode ? 'Cancel Edit' : 'Edit'}
                </button>
              </div>
            </div>

            {!isIdentityEditMode ? (
              <div className="grid grid-cols-1 gap-4">
                {renderReadonlyField('Government-issued ID', verificationDocs.govId, true)}
                {renderReadonlyField('Proof of Address', verificationDocs.proofOfAddress, true)}
                {renderReadonlyField('Business Registration Document', verificationDocs.businessReg, true)}
              </div>
            ) : (
              <>
                {[
                  { key: 'govId', label: 'Government-issued ID' },
                  { key: 'proofOfAddress', label: 'Proof of Address' },
                  { key: 'businessReg', label: 'Business Registration Document' },
                ].map((doc) => (
                  <div key={doc.key} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-text-primary">{doc.label} <span className="text-error">*</span></label>
                      {verificationDocs[doc.key] && (
                        <span className="text-xs text-success flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Uploaded
                        </span>
                      )}
                    </div>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer" onClick={() => { console.log('[DEBUG] Verification upload area clicked for:', doc.key); const input = document.querySelector(`#verification-upload-${doc.key}`); if (input) input.click(); else console.log('[DEBUG] Input not found for', doc.key); }}>
                      <UploadCloud className="w-8 h-8 mx-auto mb-2 text-text-muted" />
                      <p className="text-sm text-text-primary mb-1">Upload document</p>
                      <input
                        type="file"
                        id={`verification-upload-${doc.key}`}
                        className="hidden"
                        onChange={(e) => { console.log('[DEBUG] File selected for', doc.key, 'files:', e.target.files?.length); handleFileUpload(doc.key, e); }}
                      />
                      <p className="text-xs text-text-muted">All file types supported.</p>
                    </div>
                  </div>
                ))}

                <div className="pt-4">
                  <button
                    onClick={handleSubmitVerification}
                    className="h-10 px-6 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors"
                  >
                    Submit for Verification
                  </button>
                </div>
              </>
            )}
          </div>
        )
      }

      case 'business-profile': {
        const isBusinessEditMode = editMode['business-profile']
        const businessTypeLocked = isFieldLocked('businessType')
        const cacLocked = isFieldLocked('cacNumber')
        const businessNameLocked = isFieldLocked('businessName')
        const countryLocked = isFieldLocked('country')
        const needsCac = draftData.businessType === 'Business' || draftData.businessType === 'Non-Profit'
        const isNigeriaRegistration = (draftData.country || formData.country || '').trim().toLowerCase() === 'nigeria' || !(draftData.country || formData.country)
        const registrationNumberLabel = isNigeriaRegistration ? 'CAC Registration Number' : 'Business Registration Number'
        const registrationNumberPlaceholder = isNigeriaRegistration ? 'e.g., BN123456, RC123456, or IT123456' : 'e.g., BR123456'

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">Business Profile</h3>
                <p className="text-sm text-text-muted">Manage your business information</p>
                <p className="text-xs text-text-muted mt-1">Fields marked with <span className="text-error">*</span> are mandatory.</p>
              </div>
              <button
                onClick={() => isBusinessEditMode ? cancelSectionEdit('business-profile') : startSectionEdit('business-profile')}
                className={`h-9 px-4 rounded-md text-sm font-medium transition-colors ${
                  isBusinessEditMode ? 'bg-error-bg text-error hover:bg-error/10' : 'bg-primary text-white hover:bg-primary-light'
                }`}
              >
                {isBusinessEditMode ? 'Cancel Edit' : 'Edit'}
              </button>
            </div>

            {!isBusinessEditMode ? (
              <>
                <div className="rounded-md border border-border-light bg-background/40 px-3 py-2.5">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-text-secondary uppercase tracking-wide">
                    <span>Customer Reference ID (CRI)</span>
                    <Lock className="w-3.5 h-3.5 text-text-muted" />
                  </div>
                  <div className="mt-1 text-sm font-medium text-text-primary">CRI-2026-78234</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderReadonlyField('Business Type', formData.businessType, true)}
                  {(formData.businessType === 'Business' || formData.businessType === 'Non-Profit') && renderReadonlyField(
                    ((formData.country || '').trim().toLowerCase() === 'nigeria' || !formData.country) ? 'CAC Registration Number' : 'Business Registration Number',
                    formData.cacNumber,
                    true
                  )}
                  {renderReadonlyField('Business Name', formData.businessName, true)}
                  {renderReadonlyField('Country of Registration', formData.country, true)}
                  {renderReadonlyField('Base Currency', formData.currency, true)}
                  {renderReadonlyField('Account Language', formData.language, true)}
                  {renderReadonlyField('Industry', formData.industry, true)}
                  {formData.industry === 'Others' && renderReadonlyField('Please Specify Your Industry', formData.industryOther, true)}
                </div>
                <div className="border border-border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-text-primary mb-4">Company Branding</h4>
                  <div className="rounded-md border border-border-light bg-background/40 p-4 flex items-center gap-4">
                    {logoFile ? (
                      <div className="w-24 h-16 rounded border border-border-light bg-white p-2 flex items-center justify-center">
                        <img src={logoFile} alt="Company Logo" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-24 h-16 rounded border border-border-light bg-white p-2 flex items-center justify-center text-xs text-text-muted">
                        No Logo
                      </div>
                    )}
                    <div>
                      <p className={`text-sm font-medium ${logoFile ? 'text-text-primary' : 'text-error'}`}>{logoFile ? 'Logo' : 'Not Provided'}</p>
                      <p className="text-xs text-text-muted mt-1">Max size: 5 MB. Accepted formats: image files.</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Customer Reference ID (CRI)</label>
                  <button
                    type="button"
                    onClick={showLockedFieldToast}
                    className="w-full h-10 px-3 border border-gray-200 rounded-md bg-gray-100 text-left flex items-center justify-between"
                  >
                    <span className="text-sm text-text-primary">CRI-2026-78234</span>
                    <Lock className="w-4 h-4 text-text-muted" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {businessTypeLocked ? (
                    renderLockedField('businessType', 'Business Type', true)
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">Business Type <span className="text-error">*</span></label>
                      <select
                        id="settings-businessType"
                        value={draftData.businessType}
                        onChange={(e) => handleInputChange('businessType', e.target.value)}
                        className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.businessType ? 'border-error' : 'border-border'}`}
                      >
                        <option value="">Select business type</option>
                        <option>Business</option>
                        <option>Non-Profit</option>
                        <option>Individual</option>
                      </select>
                      {errors.businessType && <p className="text-xs text-error mt-1">{errors.businessType}</p>}
                    </div>
                  )}

                  {needsCac && (
                    cacLocked ? (
                      renderLockedField('cacNumber', registrationNumberLabel, true)
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">{registrationNumberLabel} <span className="text-error">*</span></label>
                        <input
                          id="settings-cacNumber"
                          type="text"
                          value={draftData.cacNumber}
                          placeholder={registrationNumberPlaceholder}
                          onChange={(e) => handleInputChange('cacNumber', e.target.value)}
                          className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.cacNumber ? 'border-error' : 'border-border'}`}
                        />
                        {errors.cacNumber && <p className="text-xs text-error mt-1">{errors.cacNumber}</p>}
                      </div>
                    )
                  )}

                  {businessNameLocked ? (
                    renderLockedField('businessName', 'Business Name', true)
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">Business Name <span className="text-error">*</span></label>
                      <input
                        id="settings-businessName"
                        type="text"
                        value={draftData.businessName}
                        onChange={(e) => handleInputChange('businessName', e.target.value)}
                        className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.businessName ? 'border-error' : 'border-border'}`}
                      />
                      {errors.businessName && <p className="text-xs text-error mt-1">{errors.businessName}</p>}
                    </div>
                  )}

                  {countryLocked ? (
                    renderLockedField('country', 'Country of Registration', true)
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">Country of Registration <span className="text-error">*</span></label>
                      <select
                        id="settings-country"
                        value={draftData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.country ? 'border-error' : 'border-border'}`}
                      >
                        <option value="">Select country</option>
                        {countries.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {errors.country && <p className="text-xs text-error mt-1">{errors.country}</p>}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Base Currency <span className="text-error">*</span></label>
                    <select
                      id="settings-currency"
                      value={draftData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.currency ? 'border-error' : 'border-border'}`}
                    >
                      <option value="NGN">NGN - Nigerian Naira</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                    {errors.currency && <p className="text-xs text-error mt-1">{errors.currency}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Account Language <span className="text-error">*</span></label>
                    <select
                      id="settings-language"
                      value={draftData.language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                      className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.language ? 'border-error' : 'border-border'}`}
                    >
                      <option value="">Select language</option>
                      <option>English</option>
                      <option>French</option>
                      <option>Portuguese</option>
                    </select>
                    {errors.language && <p className="text-xs text-error mt-1">{errors.language}</p>}
                  </div>

                  <div className={draftData.industry === 'Others' ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Industry <span className="text-error">*</span></label>
                    <select
                      id="settings-industry"
                      value={draftData.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                      className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.industry ? 'border-error' : 'border-border'}`}
                    >
                      <option value="">Select industry</option>
                      {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                    </select>
                    {errors.industry && <p className="text-xs text-error mt-1">{errors.industry}</p>}
                  </div>

                  {draftData.industry === 'Others' && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-text-primary mb-1.5">Please specify your industry <span className="text-error">*</span></label>
                      <input
                        id="settings-industryOther"
                        type="text"
                        value={draftData.industryOther}
                        onChange={(e) => handleInputChange('industryOther', e.target.value)}
                        className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.industryOther ? 'border-error' : 'border-border'}`}
                      />
                      {errors.industryOther && <p className="text-xs text-error mt-1">{errors.industryOther}</p>}
                    </div>
                  )}
                </div>

                <div className="border border-border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-text-primary mb-4">Company Branding</h4>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <UploadCloud className="w-10 h-10 mx-auto mb-3 text-text-muted" />
                    <input
                      type="file"
                      id="business-logo-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <label htmlFor="business-logo-upload" className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors cursor-pointer inline-flex items-center">
                      {logoFile ? 'Change Logo' : 'Upload Company Logo'}
                    </label>
                    <p className="text-xs text-text-muted mt-3">Max size: 5 MB. Accepted formats: image files.</p>
                    {logoFile && (
                      <div className="mt-4 flex items-center justify-center gap-3">
                        <div className="w-20 h-14 rounded border border-border-light bg-white p-2 flex items-center justify-center">
                          <img src={logoFile} alt="Company Logo" className="w-full h-full object-contain" />
                        </div>
                        <p className="text-sm text-success font-medium">Uploaded: Logo</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSaveBusiness}
                    className="h-10 px-6 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </>
            )}
          </div>
        )
      }

      case 'tax-details': {
        const isTaxEditMode = editMode['tax-details']
        const tinLocked = isFieldLocked('tin')
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">Tax Details</h3>
                <p className="text-sm text-text-muted">Configure your tax reporting preferences</p>
                <p className="text-xs text-text-muted mt-1">Fields marked with <span className="text-error">*</span> are mandatory.</p>
              </div>
              <button
                onClick={() => isTaxEditMode ? cancelSectionEdit('tax-details') : startSectionEdit('tax-details')}
                className={`h-9 px-4 rounded-md text-sm font-medium transition-colors ${
                  isTaxEditMode ? 'bg-error-bg text-error hover:bg-error/10' : 'bg-primary text-white hover:bg-primary-light'
                }`}
              >
                {isTaxEditMode ? 'Cancel Edit' : 'Edit'}
              </button>
            </div>

            {!isTaxEditMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderReadonlyField('TIN (Tax Identification Number)', formData.tin, true)}
                {renderReadonlyField('Reporting Cycle', formData.reportingCycle, true)}
                {renderReadonlyField('Start Month', formData.startMonth, true)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tinLocked ? (
                    renderLockedField('tin', 'TIN (Tax Identification Number)', true)
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">TIN (Tax Identification Number) <span className="text-error">*</span></label>
                      <input
                        id="settings-tin"
                        type="text"
                        value={draftData.tin}
                        onChange={(e) => handleInputChange('tin', e.target.value)}
                        className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.tin ? 'border-error' : 'border-border'}`}
                      />
                      {errors.tin && <p className="text-xs text-error mt-1">{errors.tin}</p>}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Reporting Cycle <span className="text-error">*</span></label>
                    <select
                      id="settings-reportingCycle"
                      value={draftData.reportingCycle}
                      onChange={(e) => handleInputChange('reportingCycle', e.target.value)}
                      className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.reportingCycle ? 'border-error' : 'border-border'}`}
                    >
                      <option value="">Select reporting cycle</option>
                      {reportingCycles.map((cycle) => (
                        <option key={cycle} value={cycle}>{cycle}</option>
                      ))}
                    </select>
                    {errors.reportingCycle && <p className="text-xs text-error mt-1">{errors.reportingCycle}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Start Month <span className="text-error">*</span></label>
                    <select
                      id="settings-startMonth"
                      value={draftData.startMonth}
                      onChange={(e) => handleInputChange('startMonth', e.target.value)}
                      className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.startMonth ? 'border-error' : 'border-border'}`}
                    >
                      <option value="">Select start month</option>
                      {startMonths.map((month) => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                    {errors.startMonth ? (
                      <p className="text-xs text-error mt-1">{errors.startMonth}</p>
                    ) : (
                      <p className="text-xs text-text-muted mt-1">These details determine your tax compliance reporting schedule.</p>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSaveTax}
                    className="h-10 px-6 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </>
            )}
          </div>
        )
      }

      case 'registered-address': {
        const isAddressEditMode = editMode['registered-address']
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">Registered Address</h3>
                <p className="text-sm text-text-muted">Your official business address</p>
                <p className="text-xs text-text-muted mt-1">Fields marked with <span className="text-error">*</span> are mandatory.</p>
              </div>
              <button
                onClick={() => isAddressEditMode ? cancelSectionEdit('registered-address') : startSectionEdit('registered-address')}
                className={`h-9 px-4 rounded-md text-sm font-medium transition-colors ${
                  isAddressEditMode ? 'bg-error-bg text-error hover:bg-error/10' : 'bg-primary text-white hover:bg-primary-light'
                }`}
              >
                {isAddressEditMode ? 'Cancel Edit' : 'Edit'}
              </button>
            </div>

            {!isAddressEditMode ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">{renderReadonlyField('Address Line 1', formData.address1, true)}</div>
                <div className="col-span-2">{renderReadonlyField('Address Line 2', formData.address2, false)}</div>
                {renderReadonlyField('City/Town', formData.city, true)}
                {renderReadonlyField('Postal/Zip Code', formData.postalCode, true)}
                <div className="col-span-2">{renderReadonlyField('Country', formData.addressCountry, true)}</div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Address Line 1 <span className="text-error">*</span></label>
                    <input
                      id="settings-address1"
                      type="text"
                      value={draftData.address1}
                      onChange={(e) => handleInputChange('address1', e.target.value)}
                      className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.address1 ? 'border-error' : 'border-border'}`}
                    />
                    {errors.address1 && <p className="text-xs text-error mt-1">{errors.address1}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Address Line 2</label>
                    <input
                      id="settings-address2"
                      type="text"
                      value={draftData.address2}
                      onChange={(e) => handleInputChange('address2', e.target.value)}
                      className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">City/Town <span className="text-error">*</span></label>
                    <input
                      id="settings-city"
                      type="text"
                      value={draftData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.city ? 'border-error' : 'border-border'}`}
                    />
                    {errors.city && <p className="text-xs text-error mt-1">{errors.city}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Postal/Zip Code <span className="text-error">*</span></label>
                    <input
                      id="settings-postalCode"
                      type="text"
                      value={draftData.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.postalCode ? 'border-error' : 'border-border'}`}
                    />
                    {errors.postalCode && <p className="text-xs text-error mt-1">{errors.postalCode}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Country <span className="text-error">*</span></label>
                    <select
                      id="settings-addressCountry"
                      value={draftData.addressCountry}
                      onChange={(e) => handleInputChange('addressCountry', e.target.value)}
                      className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.addressCountry ? 'border-error' : 'border-border'}`}
                    >
                      <option value="">Select country</option>
                      {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.addressCountry && <p className="text-xs text-error mt-1">{errors.addressCountry}</p>}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSaveAddress}
                    className="h-10 px-6 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </>
            )}
          </div>
        )
      }

      default:
        return null
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Business Settings</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Left Navigation */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-card p-4">
            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                    activeSection === item.id
                      ? 'bg-primary-tint text-primary border-l-[3px] border-primary'
                      : 'text-text-secondary hover:bg-background hover:text-text-primary border-l-[3px] border-transparent'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
            <div className="my-4 border-t border-border-light"></div>
            <div className="space-y-1">
              {businessNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                    activeSection === item.id
                      ? 'bg-primary-tint text-primary border-l-[3px] border-primary'
                      : 'text-text-secondary hover:bg-background hover:text-text-primary border-l-[3px] border-transparent'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg shadow-card p-4 sm:p-6">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  )
}
export default SettingsPage



