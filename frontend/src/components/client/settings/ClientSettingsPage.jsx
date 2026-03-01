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
  Lock,
  Users,
  UserPlus,
  Copy,
  Trash2,
  Loader2,
} from 'lucide-react'
import { INDUSTRY_OPTIONS } from '../../../data/client/mockData'
import { verifyIdentityWithDojah } from '../../../utils/dojahIdentity'

const SETTINGS_REDIRECT_SECTION_KEY = 'kiaminaClientSettingsRedirectSection'
const GOVERNMENT_ID_TYPE_OPTIONS = ['NIN', "Voter's Card", 'International Passport', "Driver's Licence"]
const MIN_GOV_ID_FILE_SIZE_BYTES = 80 * 1024
const MIN_GOV_ID_IMAGE_WIDTH = 600
const MIN_GOV_ID_IMAGE_HEIGHT = 400
const PHONE_COUNTRY_CODE_OPTIONS = [
  { value: '+234', label: 'NG +234' },
  { value: '+1', label: 'US/CA +1' },
  { value: '+44', label: 'UK +44' },
  { value: '+61', label: 'AU +61' },
]
const ACCOUNT_DELETE_REASON_OPTIONS = [
  'Too expensive',
  'Missing features',
  'Using another platform',
  'Temporary break',
  'Other',
]
const ACCOUNT_DELETE_RETENTION_OPTIONS = [
  'I want support to help me fix this instead',
  'I may return later',
  'I want to delete permanently now',
]
const resolvePhoneParts = (value = '', fallbackCode = '+234') => {
  const raw = String(value || '').trim()
  const matchingOption = PHONE_COUNTRY_CODE_OPTIONS.find((option) => raw.startsWith(option.value))
  if (!raw) {
    return {
      code: fallbackCode,
      number: '',
    }
  }
  if (!matchingOption) {
    return {
      code: fallbackCode,
      number: raw,
    }
  }
  return {
    code: matchingOption.value,
    number: raw.slice(matchingOption.value.length).trim(),
  }
}
const formatPhoneNumber = (code = '+234', number = '') => {
  const normalizedCode = String(code || '').trim() || '+234'
  const normalizedNumber = String(number || '').trim()
  if (!normalizedNumber) return ''
  return `${normalizedCode} ${normalizedNumber}`.trim()
}

function SettingsPage({
  showToast,
  profilePhoto,
  setProfilePhoto,
  companyLogo,
  setCompanyLogo,
  setCompanyName,
  setClientFirstName,
  settingsStorageKey,
  clientEmail = '',
  clientName = '',
  verificationState = 'pending',
  identityApprovedByAdmin = false,
  businessApprovedByAdmin = false,
  clientTeamRole = 'owner',
  onSettingsProfileChange,
  onVerificationDocsChange,
  verificationLockEnforced = false,
  canDeleteAccount = false,
  onDeleteAccount,
}) {
  const [activeSection, setActiveSection] = useState('user-profile')
  const [editMode, setEditMode] = useState({
    'user-profile': false,
    'notifications': false,
    'identity': false,
    'team-management': false,
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
  const teamMembersKey = getScopedClientKey('clientTeamMembers')
  const teamInvitesKey = getScopedClientKey('clientTeamInvites')

  // Initialize form data from localStorage
  const getInitialFormData = () => {
    const fallbackData = {
      fullName: '',
      email: '',
      phone: '',
      phoneCountryCode: '+234',
      phoneLocalNumber: '',
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
    const saved = localStorage.getItem(settingsStorageKey || 'settingsFormData')
    if (!saved) return fallbackData
    try {
      const parsed = JSON.parse(saved)
      const merged = {
        ...fallbackData,
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
      }
      const fallbackCode = String(merged.phoneCountryCode || '+234').trim() || '+234'
      const storedPhoneValue = merged.phoneLocalNumber || merged.phone
      const phoneParts = resolvePhoneParts(storedPhoneValue, fallbackCode)
      return {
        ...merged,
        phoneCountryCode: phoneParts.code,
        phone: phoneParts.number,
        phoneLocalNumber: phoneParts.number,
      }
    } catch {
      return fallbackData
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
    const parsed = saved ? JSON.parse(saved) : {}
    return {
      govId: null,
      govIdType: '',
      govIdNumber: '',
      govIdVerifiedAt: '',
      govIdVerificationStatus: '',
      govIdClarityStatus: '',
      businessReg: null,
      ...parsed,
    }
  })
  const [logoFile, setLogoFile] = useState(companyLogo)
  const [photoFile, setPhotoFile] = useState(profilePhoto)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'manager',
  })
  const [generatedInviteLink, setGeneratedInviteLink] = useState('')
  const [isIdentitySubmitting, setIsIdentitySubmitting] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteAccountStep, setDeleteAccountStep] = useState(1)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteAccountDraft, setDeleteAccountDraft] = useState({
    reason: '',
    reasonOther: '',
    retentionIntent: '',
    acknowledgedPermanentDeletion: false,
  })

  const toTrimmedValue = (value) => String(value || '').trim()
  const normalizeClientRole = (value = '') => {
    const normalized = toTrimmedValue(value).toLowerCase()
    if (normalized === 'manager') return 'manager'
    if (normalized === 'accountant') return 'accountant'
    if (normalized === 'viewer') return 'viewer'
    return 'owner'
  }
  const toRoleLabel = (value = '') => {
    const normalized = normalizeClientRole(value)
    if (normalized === 'manager') return 'Manager'
    if (normalized === 'accountant') return 'Accountant'
    if (normalized === 'viewer') return 'Viewer'
    return 'Primary Owner'
  }
  const normalizedTeamRole = normalizeClientRole(clientTeamRole)
  const canManageTeam = normalizedTeamRole === 'owner'

  const toIsoDateOrNow = (value = '') => {
    const parsed = Date.parse(value || '')
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString()
  }
  const formatDateTime = (value = '') => {
    const parsed = Date.parse(value || '')
    if (!Number.isFinite(parsed)) return '--'
    return new Date(parsed).toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  const isInviteExpired = (invite = {}) => {
    const expiryMs = Date.parse(invite?.expiresAt || '')
    if (!Number.isFinite(expiryMs)) return true
    return Date.now() > expiryMs
  }
  const getInviteStatus = (invite = {}) => {
    const status = toTrimmedValue(invite?.status).toLowerCase()
    if (status === 'accepted') return 'Accepted'
    if (status === 'cancelled' || status === 'canceled') return 'Cancelled'
    if (status === 'revoked') return 'Cancelled'
    if (status === 'expired') return 'Expired'
    if (isInviteExpired(invite)) return 'Expired'
    return 'Pending'
  }
  const normalizeInviteRecord = (invite = {}, companyId = '') => {
    const normalizedEmail = toTrimmedValue(invite?.email).toLowerCase()
    return {
      id: toTrimmedValue(invite?.id) || `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      email: normalizedEmail,
      role: normalizeClientRole(invite?.role),
      invitedBy: toTrimmedValue(invite?.invitedBy) || 'Primary Owner',
      companyId: toTrimmedValue(invite?.companyId) || companyId,
      token: toTrimmedValue(invite?.token),
      expiresAt: toIsoDateOrNow(invite?.expiresAt),
      status: getInviteStatus(invite),
      createdAt: toIsoDateOrNow(invite?.createdAt),
      acceptedAt: invite?.acceptedAt ? toIsoDateOrNow(invite.acceptedAt) : '',
      cancelledAt: invite?.cancelledAt ? toIsoDateOrNow(invite.cancelledAt) : '',
      singleUse: invite?.singleUse !== false,
      reason: toTrimmedValue(invite?.reason),
    }
  }
  const normalizeTeamMemberRecord = (member = {}, companyId = '') => {
    const normalizedEmail = toTrimmedValue(member?.email).toLowerCase()
    if (!normalizedEmail) return null
    const normalizedRole = normalizeClientRole(member?.role)
    return {
      id: toTrimmedValue(member?.id) || `TM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      email: normalizedEmail,
      fullName: toTrimmedValue(member?.fullName) || normalizedEmail,
      role: normalizedRole,
      companyId: toTrimmedValue(member?.companyId) || companyId,
      status: toTrimmedValue(member?.status) || 'Active',
      joinedAt: toIsoDateOrNow(member?.joinedAt),
      isPrimaryOwner: normalizedRole === 'owner' || Boolean(member?.isPrimaryOwner),
    }
  }
  const buildInviteToken = () => `CINV-${Date.now()}-${Math.random().toString(36).slice(2, 12).toUpperCase()}`
  const buildCompanyId = (seed = '') => {
    const normalized = toTrimmedValue(seed).toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!normalized) return 'CMP-LOCAL-0001'
    return `CMP-${normalized.slice(0, 12).toUpperCase()}`
  }

  const resolvedClientEmail = toTrimmedValue(clientEmail || formData.email || scopedStorageSuffix).toLowerCase()
  const companyId = buildCompanyId(resolvedClientEmail || formData.businessName)
  const ownerDisplayName = toTrimmedValue(clientName || formData.fullName || 'Primary Owner')
  const ownerMemberId = `TM-OWNER-${companyId}`
  const ownerFallbackEmail = resolvedClientEmail || 'owner@company.local'
  const ownerFallbackName = ownerDisplayName || 'Primary Owner'
  const initialOwnerMember = normalizeTeamMemberRecord({
    id: ownerMemberId,
    email: ownerFallbackEmail,
    fullName: ownerFallbackName,
    role: 'owner',
    status: 'Active',
    joinedAt: new Date().toISOString(),
    isPrimaryOwner: true,
  }, companyId)

  const [teamMembers, setTeamMembers] = useState(() => {
    const saved = localStorage.getItem(teamMembersKey)
    if (!saved) return initialOwnerMember ? [initialOwnerMember] : []
    try {
      const parsed = JSON.parse(saved)
      const normalized = (Array.isArray(parsed) ? parsed : [])
        .map((member) => normalizeTeamMemberRecord(member, companyId))
        .filter(Boolean)
      if (normalized.length === 0 && initialOwnerMember) return [initialOwnerMember]
      return normalized
    } catch {
      return initialOwnerMember ? [initialOwnerMember] : []
    }
  })
  const [teamInvites, setTeamInvites] = useState(() => {
    const saved = localStorage.getItem(teamInvitesKey)
    if (!saved) return []
    try {
      const parsed = JSON.parse(saved)
      return (Array.isArray(parsed) ? parsed : [])
        .map((invite) => normalizeInviteRecord(invite, companyId))
        .filter((invite) => invite.email && invite.token)
    } catch {
      return []
    }
  })

  const normalizedProfileForVerification = {
    fullName: toTrimmedValue(formData.fullName),
    email: toTrimmedValue(formData.email).toLowerCase(),
    phone: formatPhoneNumber(formData.phoneCountryCode, formData.phone),
    address: toTrimmedValue(formData.address1),
    businessType: toTrimmedValue(formData.businessType),
  }
  const normalizedBusinessType = toTrimmedValue(formData.businessType).toLowerCase()
  const isIndividualBusinessType = normalizedBusinessType === 'individual'
  const profileStepCompleted = Boolean(
    normalizedProfileForVerification.fullName
    && normalizedProfileForVerification.email
    && normalizedProfileForVerification.phone
    && normalizedProfileForVerification.address,
  )
  const identityDocumentCaptured = Boolean(
    toTrimmedValue(verificationDocs.govId)
    && toTrimmedValue(verificationDocs.govIdType)
    && toTrimmedValue(verificationDocs.govIdNumber),
  )
  const identityVerifiedByAutomation = Boolean(
    identityDocumentCaptured && toTrimmedValue(verificationDocs.govIdVerifiedAt),
  )
  const identityLockedForClient = Boolean(identityApprovedByAdmin && identityVerifiedByAutomation)
  const identityVerified = Boolean(identityApprovedByAdmin && identityVerifiedByAutomation)
  const businessVerificationDocumentReady = isIndividualBusinessType || Boolean(toTrimmedValue(verificationDocs.businessReg))
  const normalizedVerificationState = toTrimmedValue(verificationState).toLowerCase()
  const verificationApprovedByAdmin = (
    normalizedVerificationState === 'verified'
    || normalizedVerificationState.includes('fully')
    || normalizedVerificationState.includes('approved')
    || normalizedVerificationState.includes('compliant')
  )
  const finalBusinessApproval = isIndividualBusinessType || Boolean(businessApprovedByAdmin || verificationApprovedByAdmin)
  const businessVerified = isIndividualBusinessType || Boolean(businessVerificationDocumentReady && finalBusinessApproval)
  const canStartBusinessVerification = Boolean(identityVerified)
  const verificationStepsCompleted = Number(profileStepCompleted) + Number(identityVerified) + Number(businessVerified)
  const verificationProgress = Math.round((verificationStepsCompleted / 3) * 100)
  const nextVerificationSection = !profileStepCompleted
    ? 'user-profile'
    : (!identityVerified ? 'identity' : (!businessVerified ? 'business-profile' : 'identity'))
  const clientVerificationStatus = verificationStepsCompleted === 3 && finalBusinessApproval
    ? 'Fully Verified'
    : 'Pending Verification'
  const teamInviteUnlocked = clientVerificationStatus === 'Fully Verified'
  const verificationRatioLabel = `${verificationStepsCompleted}/3`
  const hasAnyVerificationSignal = Boolean(
    verificationDocs.govId || verificationDocs.businessReg || profileStepCompleted,
  )
  const identityVerificationBadge = identityVerified
    ? {
      label: 'Verified',
      className: 'bg-success-bg text-success',
    }
    : hasAnyVerificationSignal
      ? {
        label: 'Verification Pending',
        className: 'bg-warning-bg text-warning',
      }
      : {
        label: 'Unverified',
        className: 'bg-error-bg text-error',
      }
  const activePendingInvites = teamInvites.filter((invite) => getInviteStatus(invite) === 'Pending')

  useEffect(() => {
    setLogoFile(companyLogo || null)
  }, [companyLogo])

  useEffect(() => {
    setPhotoFile(profilePhoto || null)
  }, [profilePhoto])

  useEffect(() => {
    try {
      const pendingSection = sessionStorage.getItem(SETTINGS_REDIRECT_SECTION_KEY)
      if (!pendingSection) return
      if (pendingSection === 'user-profile' || pendingSection === 'identity' || pendingSection === 'team-management') {
        setActiveSection(pendingSection)
      }
      sessionStorage.removeItem(SETTINGS_REDIRECT_SECTION_KEY)
    } catch {
      // no-op
    }
  }, [])

  useEffect(() => {
    if (typeof onVerificationDocsChange !== 'function') return
    onVerificationDocsChange(verificationDocs)
  }, [onVerificationDocsChange, verificationDocs])

  useEffect(() => {
    if (typeof onSettingsProfileChange !== 'function') return
    onSettingsProfileChange(normalizedProfileForVerification)
  }, [
    normalizedProfileForVerification.address,
    normalizedProfileForVerification.businessType,
    normalizedProfileForVerification.email,
    normalizedProfileForVerification.fullName,
    normalizedProfileForVerification.phone,
    onSettingsProfileChange,
  ])

  useEffect(() => {
    if (!verificationLockEnforced) return
    if (activeSection === 'user-profile') return
    setActiveSection('user-profile')
  }, [activeSection, verificationLockEnforced])

  useEffect(() => {
    if (teamInviteUnlocked) return
    if (activeSection !== 'team-management') return
    setActiveSection(nextVerificationSection)
  }, [activeSection, nextVerificationSection, teamInviteUnlocked])

  useEffect(() => {
    if (!ownerFallbackEmail) return
    setTeamMembers((previous) => {
      const existing = Array.isArray(previous) ? previous : []
      const ownerIndex = existing.findIndex((member) => member?.isPrimaryOwner || normalizeClientRole(member?.role) === 'owner')
      if (ownerIndex === -1) {
        const fallbackOwner = normalizeTeamMemberRecord({
          id: ownerMemberId,
          email: ownerFallbackEmail,
          fullName: ownerFallbackName,
          role: 'owner',
          status: 'Active',
          joinedAt: new Date().toISOString(),
          isPrimaryOwner: true,
        }, companyId)
        return fallbackOwner ? [fallbackOwner, ...existing] : existing
      }
      const currentOwner = existing[ownerIndex]
      const nextOwner = {
        ...currentOwner,
        id: currentOwner.id || ownerMemberId,
        email: resolvedClientEmail || currentOwner.email || ownerFallbackEmail,
        fullName: ownerDisplayName || currentOwner.fullName || ownerFallbackName,
        role: 'owner',
        isPrimaryOwner: true,
        companyId,
      }
      const ownerUnchanged = (
        currentOwner.id === nextOwner.id
        && currentOwner.email === nextOwner.email
        && currentOwner.fullName === nextOwner.fullName
        && currentOwner.role === nextOwner.role
        && Boolean(currentOwner.isPrimaryOwner) === Boolean(nextOwner.isPrimaryOwner)
        && currentOwner.companyId === nextOwner.companyId
      )
      if (ownerUnchanged) return existing
      const next = [...existing]
      next[ownerIndex] = nextOwner
      return next
    })
  }, [companyId, ownerDisplayName, ownerFallbackEmail, ownerFallbackName, ownerMemberId, resolvedClientEmail])

  useEffect(() => {
    localStorage.setItem(teamMembersKey, JSON.stringify(teamMembers))
  }, [teamMembers, teamMembersKey])

  useEffect(() => {
    localStorage.setItem(teamInvitesKey, JSON.stringify(teamInvites.map((invite) => normalizeInviteRecord(invite, companyId))))
  }, [companyId, teamInvites, teamInvitesKey])

  useEffect(() => {
    setTeamInvites((previous) => {
      let changed = false
      const next = (Array.isArray(previous) ? previous : []).map((invite) => {
        const normalized = normalizeInviteRecord(invite, companyId)
        if (normalized.status !== invite.status) changed = true
        return normalized
      })
      return changed ? next : previous
    })
  }, [companyId])

  useEffect(() => {
    if (teamInviteUnlocked) return
    if (!activePendingInvites.length) return
    setTeamInvites((previous) => (
      (Array.isArray(previous) ? previous : []).map((invite) => {
        if (getInviteStatus(invite) !== 'Pending') return invite
        return {
          ...invite,
          status: 'Cancelled',
          reason: 'verification-revoked',
          cancelledAt: new Date().toISOString(),
        }
      })
    ))
    showToast('error', 'Verification changed. Pending team invites were cancelled automatically.')
  }, [activePendingInvites.length, showToast, teamInviteUnlocked])

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

  const handleSectionSelect = (sectionId = '') => {
    const normalizedSection = String(sectionId || '').trim()
    if (!normalizedSection) return
    if (verificationLockEnforced && normalizedSection !== 'user-profile') {
      showToast('error', 'Verify your account before accessing other settings sections.')
      setActiveSection('user-profile')
      return
    }
    if (normalizedSection === 'team-management' && !teamInviteUnlocked) {
      showToast('error', 'Team Management unlocks only after full verification (3/3).')
      setActiveSection(nextVerificationSection)
      return
    }
    setActiveSection(normalizedSection)
  }

  const navItems = [
    { id: 'user-profile', label: 'User Profile', icon: User },
    { id: 'notifications', label: 'Notification Settings', icon: Bell },
    { id: 'identity', label: 'Identity Verification', icon: Shield },
    { id: 'team-management', label: 'Team Management', icon: Users },
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
    if (
      field === 'businessType'
      && toTrimmedValue(formData.businessType).toLowerCase() === 'individual'
      && toTrimmedValue(value).toLowerCase() !== 'individual'
    ) {
      showToast('error', 'Business type change from Individual can only be handled by Super Admin or Technical Support Admin.')
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
    if (!hasValue(data.address1)) newErrors.address1 = 'This field is required.'
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
    const normalizedPhoneNumber = formatPhoneNumber(updatedData.phoneCountryCode, updatedData.phone)
    const persistedData = {
      ...updatedData,
      phone: normalizedPhoneNumber,
      phoneCountryCode: updatedData.phoneCountryCode || '+234',
      phoneLocalNumber: updatedData.phone || '',
    }
    setFormData({
      ...updatedData,
      phoneCountryCode: persistedData.phoneCountryCode,
      phoneLocalNumber: persistedData.phoneLocalNumber,
    })
    localStorage.setItem(settingsStorageKey || 'settingsFormData', JSON.stringify(persistedData))
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

  const handleSubmitVerification = async () => {
    if (identityLockedForClient) {
      showToast('success', 'Identity verification is already approved.')
      return
    }
    if (!verificationDocs.govId || !verificationDocs.govIdType || !verificationDocs.govIdNumber) {
      showToast('error', 'Government ID, ID type, and ID card number are required.')
      return
    }
    if (!toTrimmedValue(formData.fullName)) {
      showToast('error', 'Full name is required in profile before identity verification.')
      return
    }
    if (verificationDocs.govIdClarityStatus !== 'clear') {
      showToast('error', 'Government ID is not clear. Please re-upload.')
      return
    }

    setIsIdentitySubmitting(true)
    setVerificationDocs((prev) => {
      const next = {
        ...prev,
        govIdVerifiedAt: '',
        govIdVerificationStatus: 'verifying',
      }
      localStorage.setItem(verificationDocsKey, JSON.stringify(next))
      return next
    })

    const verifyResult = await verifyIdentityWithDojah({
      fullName: formData.fullName,
      idType: verificationDocs.govIdType,
      cardNumber: verificationDocs.govIdNumber,
    })

    if (!verifyResult.ok) {
      setVerificationDocs((prev) => {
        const next = {
          ...prev,
          govId: '',
          govIdVerifiedAt: '',
          govIdVerificationStatus: 'failed',
        }
        localStorage.setItem(verificationDocsKey, JSON.stringify(next))
        return next
      })
      setIsIdentitySubmitting(false)
      showToast('error', 'Verification failed. Please re-upload.')
      return
    }

    setVerificationDocs((prev) => {
      const next = {
        ...prev,
        govIdVerifiedAt: new Date().toISOString(),
        govIdVerificationStatus: 'verified',
      }
      localStorage.setItem(verificationDocsKey, JSON.stringify(next))
      return next
    })
    setIsIdentitySubmitting(false)
    showToast('success', identityApprovedByAdmin
      ? 'Identity verification is approved.'
      : 'Identity verified. Awaiting admin approval.')
  }

  const handleSubmitBusinessVerification = () => {
    if (isIndividualBusinessType) {
      showToast('success', 'Business verification step is automatically completed for Individual accounts.')
      return
    }
    if (!canStartBusinessVerification) {
      showToast('error', 'Identity verification must be approved by admin before business verification starts.')
      return
    }
    if (!verificationDocs.businessReg) {
      showToast('error', 'Business registration document is required.')
      return
    }
    showToast('success', 'Verification submitted successfully.')
  }

  const handleSaveBusiness = () => {
    const requiresRegistrationNumber = draftData.businessType === 'Business' || draftData.businessType === 'Non-Profit'
    const lockableFields = requiresRegistrationNumber ? ['cacNumber', 'businessName'] : ['businessName']
    const didSave = saveSection('business-profile', validateBusiness, lockableFields)
    if (didSave && String(draftData.businessType || '').trim().toLowerCase() === 'individual') {
      setVerificationDocs((prev) => {
        const next = {
          ...prev,
          businessReg: '',
        }
        localStorage.setItem(verificationDocsKey, JSON.stringify(next))
        return next
      })
    }
  }

  const handleSaveTax = () => {
    saveSection('tax-details', validateTax, ['tin'])
  }

  const handleSaveAddress = () => {
    saveSection('registered-address', validateAddress)
  }

  const verifyGovernmentIdClarity = (file) => new Promise((resolve) => {
    if (!file) {
      resolve({ ok: false, message: 'No file selected.' })
      return
    }
    if (!file.type?.startsWith('image/')) {
      resolve({ ok: false, message: 'Government ID must be an image file.' })
      return
    }
    if (file.size < MIN_GOV_ID_FILE_SIZE_BYTES) {
      resolve({ ok: false, message: 'Government ID is not clear, re-upload.' })
      return
    }
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      const isClear = image.width >= MIN_GOV_ID_IMAGE_WIDTH && image.height >= MIN_GOV_ID_IMAGE_HEIGHT
      URL.revokeObjectURL(objectUrl)
      if (!isClear) {
        resolve({ ok: false, message: 'Government ID is not clear, re-upload.' })
        return
      }
      resolve({ ok: true, message: 'Government ID verified successfully.' })
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({ ok: false, message: 'Unable to read image. Re-upload a clear government ID.' })
    }
    image.src = objectUrl
  })

  const handleFileUpload = async (docType, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const resetInput = () => {
      if (e?.target) e.target.value = ''
    }

    if (docType === 'govId') {
      if (identityLockedForClient) {
        showToast('error', 'Identity is already verified and locked. Contact admin for changes.')
        resetInput()
        return
      }
      if (!verificationDocs.govIdType) {
        showToast('error', 'Select government ID type before uploading.')
        resetInput()
        return
      }
      const clarityResult = await verifyGovernmentIdClarity(file)
      if (!clarityResult.ok) {
        setVerificationDocs((prev) => {
          const next = {
            ...prev,
            govId: '',
            govIdVerifiedAt: '',
            govIdVerificationStatus: 'failed',
            govIdClarityStatus: 'not-clear',
          }
          localStorage.setItem(verificationDocsKey, JSON.stringify(next))
          return next
        })
        showToast('error', clarityResult.message)
        resetInput()
        return
      }
      setVerificationDocs((prev) => {
        const next = {
          ...prev,
          govId: file.name,
          govIdVerifiedAt: '',
          govIdVerificationStatus: 'pending',
          govIdClarityStatus: 'clear',
        }
        localStorage.setItem(verificationDocsKey, JSON.stringify(next))
        return next
      })
      showToast('success', clarityResult.message)
      resetInput()
      return
    }

    if (docType === 'businessReg' && isIndividualBusinessType) {
      showToast('error', 'Business registration document is not required for Individual business type.')
      resetInput()
      return
    }
    if (docType === 'businessReg' && !canStartBusinessVerification) {
      showToast('error', 'Identity verification must be approved by admin before business verification starts.')
      resetInput()
      return
    }

    setVerificationDocs((prev) => {
      const next = { ...prev, [docType]: file.name }
      localStorage.setItem(verificationDocsKey, JSON.stringify(next))
      return next
    })
    resetInput()
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

  const getInviteLink = (invite = {}) => {
    const token = toTrimmedValue(invite?.token)
    if (!token) return ''
    const encodedToken = encodeURIComponent(token)
    const encodedCompanyId = encodeURIComponent(toTrimmedValue(invite?.companyId || companyId))
    return `${window.location.origin}/team/setup?invite=${encodedToken}&company=${encodedCompanyId}`
  }

  const handleOpenInviteModal = () => {
    if (!canManageTeam) {
      showToast('error', 'Only the primary account owner can invite team members.')
      return
    }
    if (!teamInviteUnlocked) {
      showToast('error', 'Complete all 3 verification steps before inviting team members.')
      return
    }
    setGeneratedInviteLink('')
    setInviteForm({ email: '', role: 'manager' })
    setIsInviteModalOpen(true)
  }

  const handleCreateInvite = () => {
    if (!canManageTeam) {
      showToast('error', 'Only the primary account owner can invite team members.')
      return
    }
    if (!teamInviteUnlocked) {
      showToast('error', 'Complete all 3 verification steps before inviting team members.')
      return
    }

    const normalizedEmail = toTrimmedValue(inviteForm.email).toLowerCase()
    const normalizedRole = normalizeClientRole(inviteForm.role)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      showToast('error', 'Enter a valid email address.')
      return
    }
    if (normalizedEmail === resolvedClientEmail) {
      showToast('error', 'Primary account owner cannot invite their own email.')
      return
    }

    const alreadyMember = teamMembers.some((member) => member.email === normalizedEmail)
    if (alreadyMember) {
      showToast('error', 'This user is already a team member.')
      return
    }
    const duplicatePending = teamInvites.some((invite) => invite.email === normalizedEmail && getInviteStatus(invite) === 'Pending')
    if (duplicatePending) {
      showToast('error', 'A pending invite already exists for this email.')
      return
    }

    const inviteRecord = normalizeInviteRecord({
      id: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      email: normalizedEmail,
      role: normalizedRole,
      invitedBy: ownerDisplayName,
      companyId,
      token: buildInviteToken(),
      expiresAt: new Date(Date.now() + (48 * 60 * 60 * 1000)).toISOString(),
      status: 'Pending',
      createdAt: new Date().toISOString(),
      singleUse: true,
    }, companyId)

    setTeamInvites((previous) => [inviteRecord, ...previous])
    const inviteLink = getInviteLink(inviteRecord)
    setGeneratedInviteLink(inviteLink)
    showToast('success', 'Invite created. Link expires in 48 hours and can be used once.')
  }

  const handleCopyInviteLink = async (invite = null) => {
    const inviteLink = invite ? getInviteLink(invite) : toTrimmedValue(generatedInviteLink)
    if (!inviteLink) {
      showToast('error', 'No invite link available to copy.')
      return
    }
    try {
      await navigator.clipboard.writeText(inviteLink)
      showToast('success', 'Invite link copied.')
    } catch {
      showToast('error', 'Unable to copy invite link on this browser.')
    }
  }

  const handleCancelInvite = (inviteId = '') => {
    if (!canManageTeam) {
      showToast('error', 'Only the primary account owner can cancel invites.')
      return
    }
    const normalizedId = toTrimmedValue(inviteId)
    if (!normalizedId) return
    setTeamInvites((previous) => (
      previous.map((invite) => {
        if (invite.id !== normalizedId) return invite
        if (getInviteStatus(invite) !== 'Pending') return invite
        return {
          ...invite,
          status: 'Cancelled',
          cancelledAt: new Date().toISOString(),
          reason: 'owner-cancelled',
        }
      })
    ))
    showToast('success', 'Invite cancelled.')
  }

  const handleTeamRoleChange = (memberId = '', nextRole = '') => {
    if (!canManageTeam) {
      showToast('error', 'Only the primary account owner can change team roles.')
      return
    }
    const normalizedId = toTrimmedValue(memberId)
    if (!normalizedId) return
    const normalizedRole = normalizeClientRole(nextRole)
    setTeamMembers((previous) => (
      previous.map((member) => {
        if (member.id !== normalizedId) return member
        if (member.isPrimaryOwner) return member
        return {
          ...member,
          role: normalizedRole,
        }
      })
    ))
    showToast('success', 'Team role updated.')
  }

  const handleRemoveTeamMember = (memberId = '') => {
    if (!canManageTeam) {
      showToast('error', 'Only the primary account owner can remove team members.')
      return
    }
    const normalizedId = toTrimmedValue(memberId)
    if (!normalizedId) return
    setTeamMembers((previous) => {
      const target = previous.find((member) => member.id === normalizedId)
      if (!target || target.isPrimaryOwner) return previous
      return previous.filter((member) => member.id !== normalizedId)
    })
    showToast('success', 'Team member removed.')
  }

  const resetDeleteAccountFlow = () => {
    setDeleteAccountStep(1)
    setDeleteAccountDraft({
      reason: '',
      reasonOther: '',
      retentionIntent: '',
      acknowledgedPermanentDeletion: false,
    })
    setIsDeletingAccount(false)
  }

  const handleOpenDeleteAccountModal = () => {
    if (!canDeleteAccount) {
      showToast('error', 'Account deletion is not available in this session.')
      return
    }
    resetDeleteAccountFlow()
    setIsDeleteModalOpen(true)
  }

  const handleCloseDeleteAccountModal = () => {
    if (isDeletingAccount) return
    setIsDeleteModalOpen(false)
    resetDeleteAccountFlow()
  }

  const goToNextDeleteStep = async () => {
    if (deleteAccountStep === 1) {
      if (!deleteAccountDraft.reason) {
        showToast('error', 'Select a reason before continuing.')
        return
      }
      if (deleteAccountDraft.reason === 'Other' && !deleteAccountDraft.reasonOther.trim()) {
        showToast('error', 'Please tell us why you want to delete this account.')
        return
      }
      setDeleteAccountStep(2)
      return
    }
    if (deleteAccountStep === 2) {
      if (!deleteAccountDraft.retentionIntent) {
        showToast('error', 'Please answer this question before continuing.')
        return
      }
      setDeleteAccountStep(3)
      return
    }
    if (!deleteAccountDraft.acknowledgedPermanentDeletion) {
      showToast('error', 'Confirm permanent deletion before submitting.')
      return
    }
    if (typeof onDeleteAccount !== 'function') {
      showToast('error', 'Account deletion is unavailable right now.')
      return
    }
    setIsDeletingAccount(true)
    const result = await onDeleteAccount(deleteAccountDraft)
    if (!result?.ok) {
      setIsDeletingAccount(false)
      showToast('error', result?.message || 'Unable to delete account.')
      return
    }
    setIsDeletingAccount(false)
    setIsDeleteModalOpen(false)
    resetDeleteAccountFlow()
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
                {renderReadonlyField('Phone Number', formatPhoneNumber(formData.phoneCountryCode, formData.phone), true)}
                {renderReadonlyField('Address', formData.address1, true)}
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
                    <div className="grid grid-cols-[130px_1fr] gap-2">
                      <select
                        value={draftData.phoneCountryCode || '+234'}
                        onChange={(e) => handleInputChange('phoneCountryCode', e.target.value)}
                        className="h-10 px-2 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                      >
                        {PHONE_COUNTRY_CODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <input
                        id="settings-phone"
                        type="tel"
                        placeholder="Enter phone number"
                        value={draftData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.phone ? 'border-error' : 'border-border'}`}
                      />
                    </div>
                    {errors.phone && <p className="text-xs text-error mt-1">{errors.phone}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-1.5">Address <span className="text-error">*</span></label>
                    <input
                      id="settings-address1"
                      type="text"
                      placeholder="Enter your residential address"
                      value={draftData.address1}
                      onChange={(e) => handleInputChange('address1', e.target.value)}
                      className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${errors.address1 ? 'border-error' : 'border-border'}`}
                    />
                    {errors.address1 && <p className="text-xs text-error mt-1">{errors.address1}</p>}
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
                <span className={`inline-flex items-center h-7 px-3 rounded-full text-xs font-medium ${identityVerificationBadge.className}`}>
                  {identityVerificationBadge.label}
                </span>
                <button
                  disabled={identityLockedForClient && !isIdentityEditMode}
                  onClick={() => isIdentityEditMode ? cancelSectionEdit('identity') : startSectionEdit('identity')}
                  className={`h-9 px-4 rounded-md text-sm font-medium transition-colors ${
                    isIdentityEditMode ? 'bg-error-bg text-error hover:bg-error/10' : 'bg-primary text-white hover:bg-primary-light'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {identityLockedForClient && !isIdentityEditMode ? 'Verified (Locked)' : (isIdentityEditMode ? 'Cancel Edit' : 'Edit')}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border-light bg-background/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-text-primary">Verification Progress</p>
                <span className="inline-flex items-center h-6 px-2.5 rounded text-xs font-medium bg-primary-tint text-primary">
                  {verificationRatioLabel}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white border border-border-light overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${verificationProgress}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between text-xs text-text-muted gap-2">
                <span>User Profile Step: {profileStepCompleted ? 'Completed' : 'Pending'}</span>
                <span>Identity Step: {identityVerified ? 'Approved' : (identityVerifiedByAutomation ? 'Awaiting Admin Approval' : 'Pending')}</span>
                <span>Business Step: {businessVerified ? 'Completed' : 'Pending'}</span>
              </div>
            </div>

            {!isIdentityEditMode ? (
              <div className="grid grid-cols-1 gap-4">
                {renderReadonlyField('Government ID Type', verificationDocs.govIdType, true)}
                {renderReadonlyField('ID Card Number', verificationDocs.govIdNumber, true)}
                {renderReadonlyField('Government-issued ID', verificationDocs.govId, true)}
                {verificationDocs.govIdClarityStatus === 'not-clear' && (
                  <div className="rounded-md border border-error/30 bg-error-bg/40 px-3 py-2.5 text-xs text-error">
                    Government ID was not clear. Re-upload a clearer image.
                  </div>
                )}
                {verificationDocs.govIdVerificationStatus === 'failed' && (
                  <div className="rounded-md border border-error/30 bg-error-bg/40 px-3 py-2.5 text-xs text-error">
                    Verification failed. Please re-upload.
                  </div>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Government ID Type <span className="text-error">*</span></label>
                  <select
                    value={verificationDocs.govIdType || ''}
                    onChange={(event) => {
                      if (identityLockedForClient) return
                      const nextType = event.target.value
                      const next = {
                        ...verificationDocs,
                        govIdType: nextType,
                        govIdNumber: nextType === verificationDocs.govIdType ? verificationDocs.govIdNumber : '',
                        govId: nextType === verificationDocs.govIdType ? verificationDocs.govId : '',
                        govIdVerifiedAt: nextType === verificationDocs.govIdType ? verificationDocs.govIdVerifiedAt : '',
                        govIdVerificationStatus: nextType === verificationDocs.govIdType ? verificationDocs.govIdVerificationStatus : '',
                        govIdClarityStatus: nextType === verificationDocs.govIdType ? verificationDocs.govIdClarityStatus : '',
                      }
                      setVerificationDocs(next)
                      localStorage.setItem(verificationDocsKey, JSON.stringify(next))
                    }}
                    disabled={identityLockedForClient}
                    className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select ID type</option>
                    {GOVERNMENT_ID_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">ID Card Number <span className="text-error">*</span></label>
                  <input
                    type="text"
                    value={verificationDocs.govIdNumber || ''}
                    onChange={(event) => {
                      if (identityLockedForClient) return
                      const next = {
                        ...verificationDocs,
                        govIdNumber: event.target.value,
                        govIdVerifiedAt: '',
                        govIdVerificationStatus: '',
                      }
                      setVerificationDocs(next)
                      localStorage.setItem(verificationDocsKey, JSON.stringify(next))
                    }}
                    disabled={identityLockedForClient}
                    placeholder="Enter ID card number"
                    className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-text-primary">Government-issued ID <span className="text-error">*</span></label>
                    {verificationDocs.govId && (
                      <span className="text-xs text-success flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Uploaded: {verificationDocs.govId}
                      </span>
                    )}
                  </div>
                  <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${identityLockedForClient ? 'border-border-light bg-background/50 cursor-not-allowed' : 'border-border hover:border-primary cursor-pointer'}`} onClick={() => { if (identityLockedForClient) return; const input = document.querySelector('#verification-upload-govId'); if (input) input.click() }}>
                    <UploadCloud className="w-8 h-8 mx-auto mb-2 text-text-muted" />
                    <p className="text-sm text-text-primary mb-1">{identityLockedForClient ? 'Identity verification is locked' : 'Upload government ID'}</p>
                    <input
                      type="file"
                      id="verification-upload-govId"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { handleFileUpload('govId', e) }}
                      disabled={identityLockedForClient}
                    />
                    <p className="text-xs text-text-muted">Accepted: clear image files.</p>
                  </div>
                  {verificationDocs.govIdClarityStatus === 'not-clear' && (
                    <p className="text-xs text-error mt-2">Government ID is not clear, re-upload.</p>
                  )}
                  {verificationDocs.govId && (
                    <p className="text-xs text-success mt-2">Selected file: {verificationDocs.govId}</p>
                  )}
                  {verificationDocs.govIdVerificationStatus === 'failed' && (
                    <p className="text-xs text-error mt-2">Verification failed. Please re-upload.</p>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    disabled={identityLockedForClient || isIdentitySubmitting}
                    onClick={handleSubmitVerification}
                    className="h-10 px-6 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {isIdentitySubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isIdentitySubmitting ? 'Identifying...' : 'Submit Identity Verification'}
                  </button>
                </div>
              </>
            )}
          </div>
        )
      }

      case 'team-management': {
        const inviteButtonDisabled = !teamInviteUnlocked || !canManageTeam
        const progressLabel = `${verificationRatioLabel} verification steps completed.`
        const verificationMessage = verificationStepsCompleted === 0
          ? 'Complete user profile, identity, and business verification to invite team members.'
          : verificationStepsCompleted < 3
            ? 'Invite access remains locked until all verification steps are completed and approved.'
            : 'Awaiting final compliance approval before invite access can be enabled.'
        const sortedTeamMembers = [...teamMembers].sort((left, right) => {
          if (left.isPrimaryOwner && !right.isPrimaryOwner) return -1
          if (!left.isPrimaryOwner && right.isPrimaryOwner) return 1
          return (left.fullName || left.email).localeCompare(right.fullName || right.email)
        })
        const sortedTeamInvites = [...teamInvites].sort((left, right) => (
          Date.parse(right.createdAt || '') - Date.parse(left.createdAt || '')
        ))

        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">Team Management</h3>
                <p className="text-sm text-text-muted">Manage collaboration access for your company workspace.</p>
              </div>
              <button
                type="button"
                onClick={handleOpenInviteModal}
                disabled={inviteButtonDisabled}
                className={`h-9 px-4 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-2 ${
                  inviteButtonDisabled
                    ? 'bg-gray-100 text-text-muted cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary-light'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Invite Team Member
              </button>
            </div>

            <div className={`rounded-lg border p-4 ${teamInviteUnlocked ? 'border-success/20 bg-success-bg/40' : 'border-border-light bg-background/40'}`}>
              {teamInviteUnlocked ? (
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Fully Verified</p>
                    <p className="text-sm text-text-secondary mt-1">Team collaboration is unlocked. You can now invite team members.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">Team Access Locked</p>
                      <p className="text-sm text-text-secondary mt-1">{verificationMessage}</p>
                      <p className="text-xs text-text-muted mt-1">{progressLabel}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-white border border-border-light overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${verificationProgress}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between text-xs text-text-muted gap-2">
                      <span>User Profile Verified: {profileStepCompleted ? 'Yes' : 'No'}</span>
                      <span>Identity Verified: {identityVerified ? 'Yes' : 'No'}</span>
                      <span>Business Verified: {businessVerified ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setActiveSection(nextVerificationSection)}
                      className="h-9 px-4 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors"
                    >
                      Complete Verification
                    </button>
                  </div>
                </div>
              )}
            </div>

            {!canManageTeam && (
              <div className="rounded-lg border border-warning/30 bg-warning-bg/40 p-4">
                <p className="text-sm font-semibold text-text-primary">Owner Permission Required</p>
                <p className="text-sm text-text-secondary mt-1">
                  Only the primary account owner can invite users, remove users, or change team roles.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border-light bg-white p-4">
                <p className="text-sm font-semibold text-text-primary">Team Members</p>
                <p className="text-xs text-text-muted mt-1">{sortedTeamMembers.length} active user(s)</p>
                <div className="mt-4 space-y-3">
                  {sortedTeamMembers.length === 0 && (
                    <p className="text-sm text-text-muted">No team members found.</p>
                  )}
                  {sortedTeamMembers.map((member) => (
                    <div key={member.id} className="rounded-md border border-border-light p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{member.fullName || member.email}</p>
                          <p className="text-xs text-text-muted break-all mt-0.5">{member.email}</p>
                          <p className="text-xs text-text-muted mt-1">Joined: {formatDateTime(member.joinedAt)}</p>
                        </div>
                        <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${
                          member.isPrimaryOwner
                            ? 'bg-primary-tint text-primary'
                            : 'bg-background text-text-secondary'
                        }`}>
                          {toRoleLabel(member.role)}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {member.isPrimaryOwner ? (
                          <span className="text-xs text-text-muted">Primary owner role is fixed.</span>
                        ) : (
                          <>
                            <select
                              value={member.role}
                              onChange={(e) => handleTeamRoleChange(member.id, e.target.value)}
                              disabled={!canManageTeam}
                              className="h-8 px-2.5 border border-border rounded text-xs text-text-primary focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="manager">Manager</option>
                              <option value="accountant">Accountant</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleRemoveTeamMember(member.id)}
                              disabled={!canManageTeam}
                              className="h-8 px-2.5 rounded border border-border text-xs font-medium text-text-primary hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border-light bg-white p-4">
                <p className="text-sm font-semibold text-text-primary">Invite History</p>
                <p className="text-xs text-text-muted mt-1">Links expire after 48 hours and are single-use.</p>
                <div className="mt-4 space-y-3 max-h-[420px] overflow-auto pr-1">
                  {sortedTeamInvites.length === 0 && (
                    <p className="text-sm text-text-muted">No invites created yet.</p>
                  )}
                  {sortedTeamInvites.map((invite) => {
                    const status = getInviteStatus(invite)
                    const isPending = status === 'Pending'
                    const statusClass = status === 'Accepted'
                      ? 'bg-success-bg text-success'
                      : status === 'Cancelled'
                        ? 'bg-error-bg text-error'
                        : status === 'Expired'
                          ? 'bg-warning-bg text-warning'
                          : 'bg-primary-tint text-primary'
                    return (
                      <div key={invite.id} className="rounded-md border border-border-light p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary break-all">{invite.email}</p>
                            <p className="text-xs text-text-secondary mt-0.5">{toRoleLabel(invite.role)}</p>
                            <p className="text-xs text-text-muted mt-1">Invited: {formatDateTime(invite.createdAt)}</p>
                            <p className="text-xs text-text-muted">Expires: {formatDateTime(invite.expiresAt)}</p>
                          </div>
                          <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${statusClass}`}>
                            {status}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyInviteLink(invite)}
                            className="h-8 px-2.5 rounded border border-border text-xs font-medium text-text-primary hover:bg-background inline-flex items-center gap-1.5"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copy Link
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelInvite(invite.id)}
                            disabled={!isPending || !canManageTeam}
                            className="h-8 px-2.5 rounded border border-border text-xs font-medium text-text-primary hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
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
                  <h4 className="text-sm font-semibold text-text-primary mb-4">Business Verification</h4>
                  {isIndividualBusinessType ? (
                    <div className="rounded-md border border-success/30 bg-success-bg/40 px-3 py-2.5 text-sm text-text-secondary">
                      Individual business type is automatically passed for verification step 3. No business registration upload is required.
                    </div>
                  ) : !canStartBusinessVerification ? (
                    <div className="rounded-md border border-warning/30 bg-warning-bg/40 px-3 py-2.5 text-sm text-text-secondary">
                      Complete and get approval for identity verification before starting business verification.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {renderReadonlyField('Business Registration Document', verificationDocs.businessReg, true)}
                    </div>
                  )}
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
                    <>
                      {renderLockedField('businessType', 'Business Type', true)}
                      {toTrimmedValue(formData.businessType).toLowerCase() === 'individual' && (
                        <div className="rounded-md border border-warning/30 bg-warning-bg/40 px-3 py-2.5 text-xs text-text-secondary md:col-span-2">
                          To change from Individual to Business or Non-Profit, contact Super Admin or Technical Support Admin.
                        </div>
                      )}
                    </>
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

                <div className="border border-border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-text-primary mb-4">Business Verification</h4>
                  {isIndividualBusinessType ? (
                    <div className="rounded-md border border-success/30 bg-success-bg/40 px-3 py-2.5 text-sm text-text-secondary">
                      Individual business type is automatically passed for verification step 3. No business registration upload is required.
                    </div>
                  ) : !canStartBusinessVerification ? (
                    <div className="rounded-md border border-warning/30 bg-warning-bg/40 px-3 py-2.5 text-sm text-text-secondary">
                      Identity verification must be approved by admin before business verification can start.
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer" onClick={() => { const input = document.querySelector('#verification-upload-businessReg'); if (input) input.click() }}>
                      <UploadCloud className="w-8 h-8 mx-auto mb-2 text-text-muted" />
                      <p className="text-sm text-text-primary mb-1">Upload business registration document</p>
                      <input
                        type="file"
                        id="verification-upload-businessReg"
                        className="hidden"
                        onChange={(e) => { handleFileUpload('businessReg', e) }}
                      />
                      <p className="text-xs text-text-muted">All file types supported.</p>
                    </div>
                  )}
                  {!isIndividualBusinessType && verificationDocs.businessReg && (
                    <p className="text-xs text-success mt-2">Uploaded: {verificationDocs.businessReg}</p>
                  )}
                  {!isIndividualBusinessType && (
                    <div className="pt-4">
                      <button
                        disabled={!canStartBusinessVerification}
                        onClick={handleSubmitBusinessVerification}
                        className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Submit Business Verification
                      </button>
                    </div>
                  )}
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

      {verificationLockEnforced && (
        <div className="mb-4 rounded-lg border border-warning/30 bg-warning-bg/50 px-4 py-3">
          <p className="text-sm font-semibold text-text-primary">Verify your account</p>
          <p className="text-sm text-text-secondary mt-1">
            Complete at least 1 of 3 verification steps to unlock dashboard actions.
          </p>
          <button
            type="button"
            onClick={() => setActiveSection('user-profile')}
            className="mt-3 h-8 px-3 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary-light transition-colors"
          >
            Open User Profile
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Left Navigation */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-card p-4">
            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSectionSelect(item.id)}
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
                  onClick={() => handleSectionSelect(item.id)}
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

      <div className="mt-6 rounded-lg border border-error/30 bg-error-bg/30 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Danger Zone</h3>
            <p className="text-xs text-text-secondary mt-1">Delete your account permanently. This cannot be undone.</p>
          </div>
          <button
            type="button"
            onClick={handleOpenDeleteAccountModal}
            disabled={!canDeleteAccount}
            className="h-9 px-4 rounded-md border border-error text-error text-sm font-medium hover:bg-error-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </div>
      </div>

      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[160] bg-black/30 backdrop-blur-[1px] p-4 flex items-center justify-center">
          <div className="w-full max-w-md rounded-lg border border-border-light bg-white shadow-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-text-primary">Invite Team Member</h4>
                <p className="text-xs text-text-muted mt-1">Links expire in 48 hours and can only be used once.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="h-8 w-8 rounded border border-border-light text-text-secondary hover:text-text-primary hover:bg-background inline-flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((previous) => ({ ...previous, email: e.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((previous) => ({ ...previous, role: e.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                >
                  <option value="manager">Manager</option>
                  <option value="accountant">Accountant</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              {generatedInviteLink && (
                <div className="rounded-md border border-border-light bg-background/40 p-3">
                  <p className="text-xs text-text-muted">Generated Invite Link</p>
                  <p className="text-xs text-text-primary mt-1 break-all">{generatedInviteLink}</p>
                  <button
                    type="button"
                    onClick={() => handleCopyInviteLink()}
                    className="mt-2 h-8 px-2.5 rounded border border-border text-xs font-medium text-text-primary hover:bg-background inline-flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Invite Link
                  </button>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="h-9 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCreateInvite}
                className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors"
              >
                Create Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[170] bg-black/40 p-4 flex items-center justify-center">
          <div className="w-full max-w-xl rounded-lg border border-border-light bg-white shadow-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-text-primary">Delete Account</h4>
                <p className="text-xs text-text-muted mt-1">Step {deleteAccountStep} of 3</p>
              </div>
              <button
                type="button"
                onClick={handleCloseDeleteAccountModal}
                disabled={isDeletingAccount}
                className="h-8 w-8 rounded border border-border-light text-text-secondary hover:text-text-primary hover:bg-background inline-flex items-center justify-center disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {deleteAccountStep === 1 && (
                <>
                  <p className="text-sm font-medium text-text-primary">Why do you want to delete your account?</p>
                  <div className="space-y-2">
                    {ACCOUNT_DELETE_REASON_OPTIONS.map((option) => (
                      <label key={option} className="flex items-center gap-2 text-sm text-text-secondary">
                        <input
                          type="radio"
                          name="delete-reason"
                          checked={deleteAccountDraft.reason === option}
                          onChange={() => setDeleteAccountDraft((previous) => ({ ...previous, reason: option }))}
                          className="accent-primary"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                  {deleteAccountDraft.reason === 'Other' && (
                    <textarea
                      value={deleteAccountDraft.reasonOther}
                      onChange={(event) => setDeleteAccountDraft((previous) => ({ ...previous, reasonOther: event.target.value }))}
                      placeholder="Please tell us your reason."
                      className="w-full h-24 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-primary resize-none"
                    />
                  )}
                </>
              )}

              {deleteAccountStep === 2 && (
                <>
                  <p className="text-sm font-medium text-text-primary">Before deleting, what would you like us to do?</p>
                  <div className="space-y-2">
                    {ACCOUNT_DELETE_RETENTION_OPTIONS.map((option) => (
                      <label key={option} className="flex items-center gap-2 text-sm text-text-secondary">
                        <input
                          type="radio"
                          name="delete-retention"
                          checked={deleteAccountDraft.retentionIntent === option}
                          onChange={() => setDeleteAccountDraft((previous) => ({ ...previous, retentionIntent: option }))}
                          className="accent-primary"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </>
              )}

              {deleteAccountStep === 3 && (
                <>
                  <div className="rounded-md border border-error/30 bg-error-bg/30 px-3 py-3">
                    <p className="text-sm font-semibold text-text-primary">Permanent deletion warning</p>
                    <p className="text-sm text-text-secondary mt-1">
                      If you delete this account, all your records and uploaded details will be permanently lost.
                    </p>
                  </div>
                  <label className="flex items-start gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={deleteAccountDraft.acknowledgedPermanentDeletion}
                      onChange={(event) => setDeleteAccountDraft((previous) => ({
                        ...previous,
                        acknowledgedPermanentDeletion: event.target.checked,
                      }))}
                      className="mt-0.5 accent-primary"
                    />
                    I understand this action is permanent and cannot be undone.
                  </label>
                </>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDeleteAccountStep((previous) => Math.max(1, previous - 1))}
                disabled={isDeletingAccount || deleteAccountStep === 1}
                className="h-9 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseDeleteAccountModal}
                  disabled={isDeletingAccount}
                  className="h-9 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={goToNextDeleteStep}
                  disabled={isDeletingAccount}
                  className="h-9 px-4 bg-error text-white rounded-md text-sm font-medium hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteAccountStep < 3 ? 'Continue' : (isDeletingAccount ? 'Deleting...' : 'Delete Permanently')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default SettingsPage



