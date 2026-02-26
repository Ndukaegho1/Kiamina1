import { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, X, Loader2, ShieldAlert, ArrowLeftRight } from 'lucide-react'
import {
  Sidebar as ClientSidebar,
  TopBar as ClientTopBar,
  DashboardPage as ClientDashboardPage,
  ExpensesPage as ClientExpensesPage,
  HomePage,
  SalesPage as ClientSalesPage,
  BankStatementsPage as ClientBankStatementsPage,
  UploadHistoryPage as ClientUploadHistoryPage,
  ClientSupportWidget,
} from './components/client/dashboard/ClientDashboardViews'
import ClientSettingsPage from './components/client/settings/ClientSettingsPage'
import ClientAddDocumentModal from './components/client/documents/ClientAddDocumentModal'
import AuthExperience from './components/auth/AuthExperience'
import ClientOnboardingExperience from './components/client/onboarding/ClientOnboardingExperience'
import AdminWorkspace from './components/admin/AdminWorkspace'
import AdminLoginPortal from './components/admin/auth/AdminLoginPortal'
import AdminAccountSetup from './components/admin/auth/AdminAccountSetup'
import { ADMIN_PAGE_IDS, ADMIN_DEFAULT_PAGE } from './components/admin/adminConfig'
import {
  ADMIN_LEVELS,
  FULL_ADMIN_PERMISSION_IDS,
  hasAdminPermission,
  normalizeAdminAccount,
  normalizeAdminInvite,
  isAdminInvitePending,
} from './components/admin/adminIdentity'
import {
  uploadHistoryData,
  expenseDocumentSeed,
  salesDocumentSeed,
  bankStatementDocumentSeed,
} from './data/client/mockData'
import { getScopedStorageKey } from './utils/storage'

const CLIENT_PAGE_IDS = ['dashboard', 'expenses', 'sales', 'bank-statements', 'upload-history', 'settings']
const APP_PAGE_IDS = [...CLIENT_PAGE_IDS, ...ADMIN_PAGE_IDS]
const ADMIN_INVITES_STORAGE_KEY = 'kiaminaAdminInvites'
const ADMIN_ACTIVITY_STORAGE_KEY = 'kiaminaAdminActivityLog'
const ADMIN_SETTINGS_STORAGE_KEY = 'kiaminaAdminSettings'
const IMPERSONATION_SESSION_STORAGE_KEY = 'kiaminaImpersonationSession'
const OTP_PREVIEW_STORAGE_KEY = 'kiaminaOtpPreview'
const CLIENT_DOCUMENTS_STORAGE_KEY = 'kiaminaClientDocuments'
const CLIENT_ACTIVITY_STORAGE_KEY = 'kiaminaClientActivityLog'
const IMPERSONATION_IDLE_TIMEOUT_MS = 10 * 60 * 1000
const DEFAULT_DEV_ADMIN_ACCOUNT = {
  fullName: 'Senior Admin',
  email: 'admin@kiamina.local',
  password: 'Admin@123!',
  role: 'admin',
  adminLevel: ADMIN_LEVELS.SENIOR,
  adminPermissions: FULL_ADMIN_PERMISSION_IDS,
  status: 'active',
}

const inferRoleFromEmail = (email = '') => {
  const normalized = email.trim().toLowerCase()
  if (normalized.startsWith('admin@')) return 'admin'
  if (normalized.endsWith('@admin.kiamina.local')) return 'admin'
  return 'client'
}

const normalizeRole = (role, email = '') => {
  if (role === 'admin' || role === 'client') return role
  return inferRoleFromEmail(email)
}

const normalizeAccount = (account = {}) => {
  const normalizedRole = normalizeRole(account.role, account.email || '')
  if (normalizedRole !== 'admin') {
    return {
      ...account,
      role: normalizedRole,
    }
  }
  return normalizeAdminAccount({
    ...account,
    role: 'admin',
  })
}

const normalizeUser = (user) => {
  if (!user) return null
  const normalizedRole = normalizeRole(user.role, user.email || '')
  if (normalizedRole !== 'admin') {
    return {
      ...user,
      role: normalizedRole,
    }
  }
  return normalizeAdminAccount({
    ...user,
    role: 'admin',
  })
}

const getDefaultPageForRole = (role = 'client') => (role === 'admin' ? ADMIN_DEFAULT_PAGE : 'dashboard')

const getAdminSystemSettings = () => {
  try {
    const saved = localStorage.getItem(ADMIN_SETTINGS_STORAGE_KEY)
    if (!saved) {
      return {
        impersonationEnabled: true,
      }
    }
    const parsed = JSON.parse(saved)
    return {
      impersonationEnabled: parsed?.impersonationEnabled !== false,
    }
  } catch {
    return {
      impersonationEnabled: true,
    }
  }
}

const formatAdminActivityTimestamp = (value = '') => {
  const parsed = Date.parse(value)
  const sourceDate = Number.isFinite(parsed) ? new Date(parsed) : new Date()
  return sourceDate.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const readAdminActivityLog = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(ADMIN_ACTIVITY_STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const appendAdminActivityLog = (entry = {}) => {
  const existing = readAdminActivityLog()
  const timestampIso = new Date().toISOString()
  const logEntry = {
    id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    adminName: entry.adminName || 'Admin User',
    action: entry.action || 'Admin action',
    affectedUser: entry.affectedUser || '--',
    details: entry.details || '--',
    timestamp: timestampIso,
  }
  localStorage.setItem(ADMIN_ACTIVITY_STORAGE_KEY, JSON.stringify([logEntry, ...existing]))
  return {
    ...logEntry,
    timestamp: formatAdminActivityTimestamp(timestampIso),
  }
}

const cloneDocumentRows = (rows = []) => (
  Array.isArray(rows) ? rows.map((row) => ({ ...row })) : []
)

const createDefaultClientDocuments = (ownerName = '') => {
  const normalizedOwner = ownerName?.trim() || 'Client User'
  return {
    expenses: expenseDocumentSeed.map((item) => ({ ...item, user: normalizedOwner })),
    sales: salesDocumentSeed.map((item) => ({ ...item, user: normalizedOwner })),
    bankStatements: bankStatementDocumentSeed.map((item) => ({ ...item, user: normalizedOwner })),
    uploadHistory: uploadHistoryData.map((item) => ({ ...item, user: normalizedOwner })),
  }
}

const readClientDocuments = (email, ownerName = '') => {
  const fallback = createDefaultClientDocuments(ownerName)
  if (!email) return fallback

  const scopedKey = getScopedStorageKey(CLIENT_DOCUMENTS_STORAGE_KEY, email)
  const rawScopedValue = localStorage.getItem(scopedKey)
  const rawFallbackValue = localStorage.getItem(CLIENT_DOCUMENTS_STORAGE_KEY)
  const source = rawScopedValue || rawFallbackValue
  if (!source) return fallback

  try {
    const parsed = JSON.parse(source)
    if (!parsed || typeof parsed !== 'object') return fallback
    return {
      expenses: Array.isArray(parsed.expenses) ? cloneDocumentRows(parsed.expenses) : fallback.expenses,
      sales: Array.isArray(parsed.sales) ? cloneDocumentRows(parsed.sales) : fallback.sales,
      bankStatements: Array.isArray(parsed.bankStatements) ? cloneDocumentRows(parsed.bankStatements) : fallback.bankStatements,
      uploadHistory: Array.isArray(parsed.uploadHistory) ? cloneDocumentRows(parsed.uploadHistory) : fallback.uploadHistory,
    }
  } catch {
    return fallback
  }
}

const persistClientDocuments = (email, documents) => {
  if (!email || !documents) return
  const scopedKey = getScopedStorageKey(CLIENT_DOCUMENTS_STORAGE_KEY, email)
  localStorage.setItem(scopedKey, JSON.stringify(documents))
}

const appendClientActivityLog = (email, entry = {}) => {
  const normalizedEmail = email?.trim()?.toLowerCase()
  if (!normalizedEmail) return null

  const key = getScopedStorageKey(CLIENT_ACTIVITY_STORAGE_KEY, normalizedEmail)
  let existing = []
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')
    existing = Array.isArray(parsed) ? parsed : []
  } catch {
    existing = []
  }

  const timestampIso = new Date().toISOString()
  const logEntry = {
    id: `CLLOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    actorName: entry.actorName || 'Client User',
    actorRole: entry.actorRole || 'client',
    action: entry.action || 'Client activity',
    details: entry.details || '--',
    timestamp: timestampIso,
  }
  localStorage.setItem(key, JSON.stringify([logEntry, ...existing]))
  return logEntry
}

function App() {
  const defaultOnboardingData = {
    businessType: '',
    businessName: '',
    country: '',
    industry: '',
    industryOther: '',
    cacNumber: '',
    tin: '',
    reportingCycle: '',
    startMonth: '',
    currency: 'NGN',
    language: 'English',
    primaryContact: '',
    servicesNeeded: [],
    govId: '',
    proofOfAddress: '',
    businessReg: '',
    defaultLandingPage: 'dashboard',
    notifyEmail: true,
    notifyCompliance: true,
    uploadPreference: 'standard',
  }

  const getSavedScopedJson = (baseKey, email) => {
    const scopedKey = getScopedStorageKey(baseKey, email)
    const keysToCheck = scopedKey === baseKey ? [baseKey] : [scopedKey, baseKey]
    for (const key of keysToCheck) {
      try {
        const saved = localStorage.getItem(key)
        if (!saved) continue
        return JSON.parse(saved)
      } catch {
        // Keep checking fallback keys when one entry is malformed.
      }
    }
    return null
  }
  const getSavedCompanyName = (email, fallback = 'Acme Corporation') => {
    const parsed = getSavedScopedJson('settingsFormData', email)
    return parsed?.businessName?.trim() || fallback
  }
  const getSavedClientFirstName = (email, fallback = 'Client') => {
    const parsed = getSavedScopedJson('settingsFormData', email)
    return parsed?.fullName?.trim()?.split(/\s+/)?.[0] || fallback
  }
  const getSavedScopedString = (baseKey, email) => {
    const scopedKey = getScopedStorageKey(baseKey, email)
    const keysToCheck = scopedKey === baseKey ? [baseKey] : [scopedKey, baseKey]
    for (const key of keysToCheck) {
      const saved = localStorage.getItem(key)
      if (saved) return saved
    }
    return null
  }
  const getSavedProfilePhoto = (email) => getSavedScopedString('profilePhoto', email)
  const getSavedCompanyLogo = (email) => getSavedScopedString('companyLogo', email)
  const getSavedAccounts = () => {
    try {
      const saved = localStorage.getItem('kiaminaAccounts')
      const parsed = saved ? JSON.parse(saved) : []
      if (!Array.isArray(parsed)) return []

      const normalized = parsed.map(normalizeAccount)
      if (saved && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
        localStorage.setItem('kiaminaAccounts', JSON.stringify(normalized))
      }
      return normalized
    } catch {
      return []
    }
  }
  const ensureDefaultDevAdminAccount = () => {
    if (!import.meta.env.DEV) return
    try {
      const accounts = getSavedAccounts()
      const normalizedSeed = normalizeAccount(DEFAULT_DEV_ADMIN_ACCOUNT)
      const adminIndex = accounts.findIndex(
        (account) => account.email?.trim()?.toLowerCase() === normalizedSeed.email.toLowerCase(),
      )
      if (adminIndex === -1) {
        localStorage.setItem('kiaminaAccounts', JSON.stringify([...accounts, normalizedSeed]))
        return
      }

      const existing = accounts[adminIndex]
      const nextAccounts = [...accounts]
      nextAccounts[adminIndex] = normalizeAccount({
        ...existing,
        ...normalizedSeed,
      })
      localStorage.setItem('kiaminaAccounts', JSON.stringify(nextAccounts))
    } catch {
      // Ignore seeding failures in local demo mode.
    }
  }
  const getSavedAdminInvites = () => {
    try {
      const saved = localStorage.getItem(ADMIN_INVITES_STORAGE_KEY)
      const parsed = saved ? JSON.parse(saved) : []
      if (!Array.isArray(parsed)) return []
      return parsed.map(normalizeAdminInvite)
    } catch {
      return []
    }
  }
  const saveAdminInvites = (invites) => {
    localStorage.setItem(ADMIN_INVITES_STORAGE_KEY, JSON.stringify(invites.map(normalizeAdminInvite)))
  }
  const getAdminInviteByToken = (token = '') => {
    const normalizedToken = token.trim()
    if (!normalizedToken) return null
    const invites = getSavedAdminInvites()
    return invites.find((invite) => invite.token === normalizedToken) || null
  }
  const getStoredAuthUser = () => {
    try {
      const sessionUser = sessionStorage.getItem('kiaminaAuthUser')
      if (sessionUser) return normalizeUser(JSON.parse(sessionUser))
      const persistentUser = localStorage.getItem('kiaminaAuthUser')
      return persistentUser ? normalizeUser(JSON.parse(persistentUser)) : null
    } catch {
      return null
    }
  }
  const createDefaultOnboardingState = () => ({
    currentStep: 1,
    completed: false,
    skipped: false,
    verificationPending: true,
    data: { ...defaultOnboardingData },
  })
  const getSavedOnboardingState = (email) => {
    const parsed = getSavedScopedJson('kiaminaOnboardingState', email)
    if (!parsed) return createDefaultOnboardingState()
    return {
      currentStep: parsed.currentStep || 1,
      completed: Boolean(parsed.completed),
      skipped: Boolean(parsed.skipped),
      verificationPending: parsed.verificationPending !== undefined ? Boolean(parsed.verificationPending) : true,
      data: { ...defaultOnboardingData, ...(parsed.data || {}) },
    }
  }
  const getOtpStore = () => {
    try {
      const saved = sessionStorage.getItem('kiaminaOtpStore')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  }
  const getStoredImpersonationSession = () => {
    try {
      const saved = sessionStorage.getItem(IMPERSONATION_SESSION_STORAGE_KEY)
      if (!saved) return null
      const parsed = JSON.parse(saved)
      if (!parsed?.clientEmail || !parsed?.adminEmail) return null
      return parsed
    } catch {
      return null
    }
  }
  const persistImpersonationSession = (session) => {
    if (!session) {
      sessionStorage.removeItem(IMPERSONATION_SESSION_STORAGE_KEY)
      return
    }
    sessionStorage.setItem(IMPERSONATION_SESSION_STORAGE_KEY, JSON.stringify(session))
  }

  const initialAuthUser = getStoredAuthUser()
  const initialImpersonationSession = getStoredImpersonationSession()
  const initialScopedClientEmail = initialImpersonationSession?.clientEmail || initialAuthUser?.email
  const initialDocumentOwner = initialImpersonationSession?.clientName
    || initialAuthUser?.fullName
    || 'Client User'
  const initialClientDocuments = readClientDocuments(initialScopedClientEmail, initialDocumentOwner)
  const [authMode, setAuthMode] = useState('login')
  const [authUser, setAuthUser] = useState(initialAuthUser)
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialAuthUser))
  const [showAuth, setShowAuth] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminSetupToken, setAdminSetupToken] = useState('')
  const [impersonationSession, setImpersonationSession] = useState(initialImpersonationSession)
  const [pendingImpersonationClient, setPendingImpersonationClient] = useState(null)
  const [onboardingState, setOnboardingState] = useState(() => getSavedOnboardingState(initialScopedClientEmail))
  const [otpStore, setOtpStore] = useState(getOtpStore)
  const [otpChallenge, setOtpChallenge] = useState(null)
  const [passwordResetEmail, setPasswordResetEmail] = useState('')
  const [activePage, setActivePage] = useState(() => getDefaultPageForRole(initialAuthUser?.role))
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [modalInitialCategory, setModalInitialCategory] = useState('expenses')
  const [expenseDocuments, setExpenseDocuments] = useState(initialClientDocuments.expenses)
  const [salesDocuments, setSalesDocuments] = useState(initialClientDocuments.sales)
  const [bankStatementDocuments, setBankStatementDocuments] = useState(initialClientDocuments.bankStatements)
  const [expenseClassOptions, setExpenseClassOptions] = useState([])
  const [salesClassOptions, setSalesClassOptions] = useState([])
  const [uploadHistoryRecords, setUploadHistoryRecords] = useState(initialClientDocuments.uploadHistory)
  const [toast, setToast] = useState(null)
  const [profilePhoto, setProfilePhoto] = useState(() => getSavedProfilePhoto(initialScopedClientEmail))
  const [companyLogo, setCompanyLogo] = useState(() => getSavedCompanyLogo(initialScopedClientEmail))
  const [companyName, setCompanyName] = useState(() => getSavedCompanyName(initialScopedClientEmail))
  const [clientFirstName, setClientFirstName] = useState(() => {
    const fallbackName = initialImpersonationSession?.clientName?.trim()?.split(/\s+/)?.[0]
      || initialAuthUser?.fullName?.trim()?.split(/\s+/)?.[0]
      || 'Client'
    return getSavedClientFirstName(initialScopedClientEmail, fallbackName)
  })
  
  // Mock user notifications
  const [userNotifications, setUserNotifications] = useState([
    { id: 'NOT-001', type: 'comment', message: 'Admin commented on your Expense document.', timestamp: 'Feb 24, 2026 11:00 AM', read: false, documentId: 'DOC-001' },
    { id: 'NOT-002', type: 'approved', message: 'Your Bank Statement was approved.', timestamp: 'Feb 23, 2026 3:30 PM', read: false, documentId: 'DOC-002' },
    { id: 'NOT-003', type: 'info', message: 'Additional information requested for Sales invoice.', timestamp: 'Feb 22, 2026 9:45 AM', read: true, documentId: 'DOC-003' },
    { id: 'NOT-004', type: 'rejected', message: 'Your Expense document was rejected. Reason: Missing required signatures.', timestamp: 'Feb 21, 2026 4:30 PM', read: true, documentId: 'DOC-004' },
    { id: 'NOT-005', type: 'critical', message: 'Important: Complete your business verification by March 1st.', timestamp: 'Feb 20, 2026 10:00 AM', read: false, priority: 'critical' },
  ])
  
  const currentUserRole = normalizeRole(authUser?.role, authUser?.email || '')
  const isAdminView = currentUserRole === 'admin'
  const isImpersonatingClient = Boolean(
    isAuthenticated
      && isAdminView
      && impersonationSession?.clientEmail
      && impersonationSession?.adminEmail?.toLowerCase() === (authUser?.email || '').toLowerCase(),
  )
  const scopedClientEmail = isImpersonatingClient
    ? impersonationSession.clientEmail
    : authUser?.email

  const getResolvedCurrentAdminAccount = () => {
    if (!isAuthenticated || !isAdminView || !authUser?.email) return null
    const accounts = getSavedAccounts()
    const match = accounts.find((account) => account.email.toLowerCase() === authUser.email.toLowerCase())
    if (match) return normalizeAdminAccount(match)
    return normalizeAdminAccount({
      fullName: authUser.fullName,
      email: authUser.email,
      role: 'admin',
      adminLevel: ADMIN_LEVELS.SENIOR,
      adminPermissions: FULL_ADMIN_PERMISSION_IDS,
      status: 'active',
    })
  }
  const currentAdminAccount = getResolvedCurrentAdminAccount()
  const adminSystemSettings = getAdminSystemSettings()
  const impersonationEnabled = adminSystemSettings.impersonationEnabled !== false
  const canImpersonateClients = Boolean(
    currentAdminAccount && (
      currentAdminAccount.adminLevel === ADMIN_LEVELS.SENIOR
      || hasAdminPermission(currentAdminAccount, 'client_assistance')
    ),
  )

  // Navigation helpers: keep `activePage` and URL in sync without adding a router
  const handleSetActivePage = (page, { replace = false } = {}) => {
    if (isImpersonatingClient) {
      setImpersonationSession((prev) => {
        if (!prev) return prev
        const next = { ...prev, lastActivityAt: Date.now() }
        persistImpersonationSession(next)
        return next
      })
    }
    setActivePage(page)
    const path = page === 'dashboard' ? '/dashboard' : `/${page}`
    try {
      if (replace) history.replaceState({}, '', path)
      else history.pushState({}, '', path)
    } catch {
      // ignore
    }
  }

  const navigateToAuth = (mode = 'login', { replace = false } = {}) => {
    setAuthMode(mode)
    setShowAuth(true)
    setShowAdminLogin(false)
    setAdminSetupToken('')
    try {
      if (replace) history.replaceState({}, '', mode === 'signup' ? '/signup' : '/login')
      else history.pushState({}, '', mode === 'signup' ? '/signup' : '/login')
    } catch {}
  }

  const navigateToAdminLogin = ({ replace = false } = {}) => {
    setAuthMode('login')
    setShowAuth(false)
    setShowAdminLogin(true)
    setAdminSetupToken('')
    try {
      if (replace) history.replaceState({}, '', '/admin/login')
      else history.pushState({}, '', '/admin/login')
    } catch {}
  }

  useEffect(() => {
    ensureDefaultDevAdminAccount()
  }, [])

  useEffect(() => {
    // Initialize route from URL on first load
    const syncFromLocation = () => {
      const path = window.location.pathname || '/'
      if (path === '/' || path === '/home') {
        setShowAuth(false)
        setShowAdminLogin(false)
        setAdminSetupToken('')
        setActivePage(getDefaultPageForRole(initialAuthUser?.role))
        return
      }
      if (path === '/login' || path === '/signup' || path === '/auth') {
        setShowAuth(true)
        setShowAdminLogin(false)
        setAdminSetupToken('')
        setAuthMode(path === '/signup' ? 'signup' : 'login')
        return
      }
      if (path === '/admin/login') {
        setShowAuth(false)
        setShowAdminLogin(true)
        setAdminSetupToken('')
        setAuthMode('login')
        return
      }
      if (path === '/admin/setup') {
        const inviteToken = new URLSearchParams(window.location.search).get('invite') || ''
        setShowAuth(false)
        setShowAdminLogin(false)
        setAdminSetupToken(inviteToken)
        setAuthMode('login')
        return
      }
      const candidate = path.replace(/^\//, '')
      if (APP_PAGE_IDS.includes(candidate)) {
        setShowAuth(false)
        setShowAdminLogin(false)
        setAdminSetupToken('')
        setActivePage(candidate)
        return
      }
      setShowAuth(false)
      setShowAdminLogin(false)
      setAdminSetupToken('')
      setActivePage(getDefaultPageForRole(initialAuthUser?.role))
    }

    syncFromLocation()

    const onPop = () => syncFromLocation()
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    if (isAuthenticated && isAdminView) return
    if (!impersonationSession) return
    setImpersonationSession(null)
    persistImpersonationSession(null)
  }, [isAuthenticated, isAdminView, impersonationSession])

  useEffect(() => {
    if (!scopedClientEmail) return
    setOnboardingState(getSavedOnboardingState(scopedClientEmail))
    const fallbackCompanyName = impersonationSession?.businessName || 'Acme Corporation'
    const fallbackFirstName = impersonationSession?.clientName?.trim()?.split(/\s+/)?.[0]
      || authUser?.fullName?.trim()?.split(/\s+/)?.[0]
      || 'Client'
    setCompanyName(getSavedCompanyName(scopedClientEmail, fallbackCompanyName))
    setClientFirstName(getSavedClientFirstName(scopedClientEmail, fallbackFirstName))
    setProfilePhoto(getSavedProfilePhoto(scopedClientEmail))
    setCompanyLogo(getSavedCompanyLogo(scopedClientEmail))
    const fallbackOwnerName = impersonationSession?.clientName || authUser?.fullName || fallbackFirstName
    const scopedDocuments = readClientDocuments(scopedClientEmail, fallbackOwnerName)
    setExpenseDocuments(scopedDocuments.expenses)
    setSalesDocuments(scopedDocuments.sales)
    setBankStatementDocuments(scopedDocuments.bankStatements)
    setUploadHistoryRecords(scopedDocuments.uploadHistory)
  }, [scopedClientEmail, impersonationSession?.businessName, impersonationSession?.clientName, authUser?.fullName])

  useEffect(() => {
    if (!isImpersonatingClient || !impersonationSession) return
    const timeoutId = window.setInterval(() => {
      const lastActivityAt = impersonationSession.lastActivityAt || impersonationSession.startedAt || 0
      if (Date.now() - lastActivityAt <= IMPERSONATION_IDLE_TIMEOUT_MS) return
      appendAdminActivityLog({
        adminName: impersonationSession.adminName || authUser?.fullName || 'Admin User',
        action: 'Impersonation session expired',
        affectedUser: impersonationSession.businessName || impersonationSession.clientEmail || '--',
        details: `Impersonation session expired due to inactivity for ${impersonationSession.businessName || impersonationSession.clientEmail}.`,
      })
      setImpersonationSession(null)
      persistImpersonationSession(null)
      setPendingImpersonationClient(null)
      setActivePage(ADMIN_DEFAULT_PAGE)
      try {
        history.replaceState({}, '', `/${ADMIN_DEFAULT_PAGE}`)
      } catch {
        // ignore
      }
      showToast('error', 'Client view session expired due to inactivity.')
    }, 10000)
    return () => window.clearInterval(timeoutId)
  }, [isImpersonatingClient, impersonationSession, authUser?.fullName])

  useEffect(() => {
    if (!isImpersonatingClient) return
    const touchSessionActivity = () => {
      setImpersonationSession((prev) => {
        if (!prev) return prev
        const now = Date.now()
        if (now - (prev.lastActivityAt || 0) < 12000) return prev
        const next = { ...prev, lastActivityAt: now }
        persistImpersonationSession(next)
        return next
      })
    }

    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart']
    events.forEach((eventName) => window.addEventListener(eventName, touchSessionActivity, { passive: true }))
    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, touchSessionActivity))
    }
  }, [isImpersonatingClient])

  useEffect(() => {
    if (!scopedClientEmail) return
    persistClientDocuments(scopedClientEmail, {
      expenses: expenseDocuments,
      sales: salesDocuments,
      bankStatements: bankStatementDocuments,
      uploadHistory: uploadHistoryRecords,
    })
  }, [scopedClientEmail, expenseDocuments, salesDocuments, bankStatementDocuments, uploadHistoryRecords])

  const persistOnboardingState = (nextState, emailOverride) => {
    const targetEmail = emailOverride ?? scopedClientEmail
    setOnboardingState(nextState)
    localStorage.setItem(getScopedStorageKey('kiaminaOnboardingState', targetEmail), JSON.stringify(nextState))
  }

  const persistOtpStore = (nextStore) => {
    setOtpStore(nextStore)
    sessionStorage.setItem('kiaminaOtpStore', JSON.stringify(nextStore))
  }

  const setOnboardingData = (updater) => {
    const targetEmail = scopedClientEmail
    const nextData = typeof updater === 'function' ? updater(onboardingState.data) : updater
    persistOnboardingState({ ...onboardingState, data: nextData }, targetEmail)
    try {
      const settingsKey = getScopedStorageKey('settingsFormData', targetEmail)
      const saved = localStorage.getItem(settingsKey) || (targetEmail ? localStorage.getItem('settingsFormData') : null)
      const existing = saved ? JSON.parse(saved) : {}
      const effectiveFullName = isImpersonatingClient
        ? (impersonationSession?.clientName || existing.fullName || '')
        : (authUser?.fullName || existing.fullName || '')
      const merged = {
        ...existing,
        fullName: effectiveFullName,
        email: targetEmail || existing.email || '',
        businessType: nextData.businessType ?? existing.businessType ?? '',
        businessName: nextData.businessName ?? existing.businessName ?? '',
        country: nextData.country ?? existing.country ?? '',
        industry: nextData.industry ?? existing.industry ?? '',
        industryOther: nextData.industryOther ?? existing.industryOther ?? '',
        cacNumber: nextData.cacNumber ?? existing.cacNumber ?? '',
        tin: nextData.tin ?? existing.tin ?? '',
        reportingCycle: nextData.reportingCycle ?? existing.reportingCycle ?? '',
        startMonth: nextData.startMonth ?? existing.startMonth ?? '',
        currency: nextData.currency ?? existing.currency ?? '',
        language: nextData.language ?? existing.language ?? '',
      }
      localStorage.setItem(settingsKey, JSON.stringify(merged))
      setCompanyName(merged.businessName?.trim() || 'Acme Corporation')
      setClientFirstName(merged.fullName?.trim()?.split(/\s+/)?.[0] || 'Client')
      if (isImpersonatingClient) {
        appendAdminActivityLog({
          adminName: impersonationSession?.adminName || authUser?.fullName || 'Admin User',
          action: 'Updated client onboarding data in impersonation mode',
          affectedUser: impersonationSession?.businessName || targetEmail,
          details: 'Admin updated onboarding and profile data while in impersonation mode.',
        })
      }
    } catch {
      // no-op
    }
  }

  const setOnboardingStep = (step) => {
    persistOnboardingState({ ...onboardingState, currentStep: Math.min(5, Math.max(1, step)) }, scopedClientEmail)
  }

  const syncProfileToSettings = (fullName, email) => {
    try {
      const settingsKey = getScopedStorageKey('settingsFormData', email)
      const saved = localStorage.getItem(settingsKey) || (email ? localStorage.getItem('settingsFormData') : null)
      const existing = saved ? JSON.parse(saved) : {}
      const next = {
        ...existing,
        fullName: fullName || existing.fullName || '',
        email: email || existing.email || '',
      }
      localStorage.setItem(settingsKey, JSON.stringify(next))
    } catch {
      // no-op
    }
  }

  const appendScopedClientLog = (action, details) => {
    if (!scopedClientEmail) return
    const actorName = isImpersonatingClient
      ? (impersonationSession?.adminName || authUser?.fullName || 'Admin User')
      : (authUser?.fullName || clientFirstName || 'Client User')
    const actorRole = isImpersonatingClient ? 'admin' : 'client'
    appendClientActivityLog(scopedClientEmail, {
      actorName,
      actorRole,
      action,
      details,
    })
  }

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const persistAuthUser = (user, remember = true) => {
    const normalizedUser = normalizeUser(user)
    if (!normalizedUser) return

    setAuthUser(normalizedUser)
    setIsAuthenticated(true)
    setShowAuth(false)
    setShowAdminLogin(false)
    setAdminSetupToken('')
    setImpersonationSession(null)
    setPendingImpersonationClient(null)
    persistImpersonationSession(null)
    if (remember) {
      localStorage.setItem('kiaminaAuthUser', JSON.stringify(normalizedUser))
      sessionStorage.removeItem('kiaminaAuthUser')
    } else {
      sessionStorage.setItem('kiaminaAuthUser', JSON.stringify(normalizedUser))
      localStorage.removeItem('kiaminaAuthUser')
    }
    setOnboardingState(getSavedOnboardingState(normalizedUser.email))
    setCompanyName(getSavedCompanyName(normalizedUser.email))
    setClientFirstName(getSavedClientFirstName(normalizedUser.email, normalizedUser.fullName?.trim()?.split(/\s+/)?.[0] || 'Client'))

    const defaultPage = getDefaultPageForRole(normalizedUser.role)
    setActivePage(defaultPage)
    try {
      history.replaceState({}, '', defaultPage === 'dashboard' ? '/dashboard' : `/${defaultPage}`)
    } catch {
      // ignore
    }
  }

  const issueEmailOtp = async (email, purpose = 'login') => {
    const normalizedEmail = email?.trim()?.toLowerCase()
    if (!normalizedEmail) return false

    const otp = `${Math.floor(100000 + Math.random() * 900000)}`
    const nextStore = {
      ...otpStore,
      [normalizedEmail]: {
        code: otp,
        expiresAt: Date.now() + (5 * 60 * 1000),
      },
    }
    persistOtpStore(nextStore)
    try {
      const storedPreview = sessionStorage.getItem(OTP_PREVIEW_STORAGE_KEY)
      const parsedPreview = storedPreview ? JSON.parse(storedPreview) : {}
      const nextPreview = {
        ...(parsedPreview && typeof parsedPreview === 'object' ? parsedPreview : {}),
        [normalizedEmail]: {
          code: otp,
          purpose,
          createdAt: Date.now(),
        },
      }
      sessionStorage.setItem(OTP_PREVIEW_STORAGE_KEY, JSON.stringify(nextPreview))
    } catch {
      // no-op
    }

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, otp, purpose }),
      })
      if (!response.ok) throw new Error('OTP service unavailable')
    } catch {
      // Fallback to local demo flow when backend endpoint is unavailable.
    }

    return true
  }

  const issuePasswordResetLink = async (email) => {
    const normalizedEmail = email?.trim()?.toLowerCase()
    if (!normalizedEmail) return false

    const resetToken = `${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`
    const resetLink = `${window.location.origin}/reset-password?email=${encodeURIComponent(normalizedEmail)}&token=${encodeURIComponent(resetToken)}`

    try {
      const response = await fetch('/api/auth/send-password-reset-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          resetLink,
        }),
      })
      if (!response.ok) throw new Error('Password reset email service unavailable')
    } catch {
      // Fallback to local demo flow when backend endpoint is unavailable.
    }

    return true
  }

  const handleSocialLogin = async (provider, providedFullName = '') => {
    const providerMap = {
      google: { name: 'Google', email: 'google.user@oauth.kiamina.local' },
      apple: { name: 'Apple', email: 'apple.user@oauth.kiamina.local' },
      linkedin: { name: 'LinkedIn', email: 'linkedin.user@oauth.kiamina.local' },
    }
    const selected = providerMap[provider]
    if (!selected) {
      showToast('error', 'Authentication failed. Please try again.')
      return { ok: false, message: 'Authentication failed. Please try again.' }
    }

    const accounts = getSavedAccounts()
    const existing = accounts.find((account) => account.email.toLowerCase() === selected.email.toLowerCase())
    const normalizedProvidedFullName = providedFullName.trim()
    const existingName = existing?.fullName?.trim() || ''
    const needsFullNameCapture = !normalizedProvidedFullName && (!existingName || existingName.endsWith(' User'))
    if (needsFullNameCapture) {
      return { ok: false, requiresFullName: true, provider }
    }

    const fullName = normalizedProvidedFullName || existingName || `${selected.name} User`
    const socialRole = existing?.role || 'client'
    if (!existing) {
      const nextAccounts = [...accounts, { fullName, email: selected.email, password: `oauth-${provider}`, role: socialRole }]
      localStorage.setItem('kiaminaAccounts', JSON.stringify(nextAccounts))
      persistOnboardingState({
        currentStep: 1,
        completed: false,
        skipped: false,
        verificationPending: true,
        data: {
          ...defaultOnboardingData,
          primaryContact: fullName,
        },
      }, selected.email)
    } else if (normalizedProvidedFullName && normalizedProvidedFullName !== existingName) {
      const nextAccounts = accounts.map((account) => (
        account.email.toLowerCase() === selected.email.toLowerCase()
          ? { ...account, fullName: normalizedProvidedFullName, role: account.role || socialRole }
          : account
      ))
      localStorage.setItem('kiaminaAccounts', JSON.stringify(nextAccounts))
    }

    const user = { fullName, email: selected.email, role: socialRole }
    persistAuthUser(user, true)
    syncProfileToSettings(user.fullName, user.email)
    setOtpChallenge(null)
    showToast('success', `${selected.name} authentication successful.`)
    return { ok: true }
  }

  const handleLogin = async ({ email, password, remember, agree }) => {
    const loginFailureMessage = 'Email or password incorrect.'
    if (!agree) {
      return { ok: false, message: loginFailureMessage }
    }

    const accounts = getSavedAccounts()
    const normalizedEmail = email.trim().toLowerCase()
    const match = accounts.find((account) => account.email.toLowerCase() === normalizedEmail)
    if (!match) {
      return { ok: false, message: loginFailureMessage }
    }
    if (normalizeRole(match.role, match.email) === 'admin') {
      return { ok: false, message: 'Use /admin/login to access the Admin Portal.' }
    }
    if (match.status === 'suspended') {
      return { ok: false, message: 'This account is suspended. Please contact support.' }
    }
    if (match.password !== password) {
      return { ok: false, message: loginFailureMessage }
    }

    await issueEmailOtp(normalizedEmail, 'client-login')
    setOtpChallenge({
      requestId: Date.now(),
      purpose: 'client-login',
      email: match.email,
      remember: Boolean(remember),
      role: match.role,
    })
    return { ok: true, requiresOtp: true }
  }

  const handleAdminLogin = async ({ email, password, remember }) => {
    const loginFailureMessage = 'Admin email or password incorrect.'
    const normalizedEmail = email?.trim()?.toLowerCase()
    if (!normalizedEmail || !password) {
      return { ok: false, message: loginFailureMessage }
    }

    ensureDefaultDevAdminAccount()
    const accounts = getSavedAccounts()
    const match = accounts.find((account) => account.email.toLowerCase() === normalizedEmail)
    if (!match) {
      return { ok: false, message: loginFailureMessage }
    }
    if (normalizeRole(match.role, match.email) !== 'admin') {
      return { ok: false, message: loginFailureMessage }
    }
    if (match.status === 'suspended') {
      return { ok: false, message: 'This admin account is suspended.' }
    }
    if (match.password !== password) {
      return { ok: false, message: loginFailureMessage }
    }

    await issueEmailOtp(normalizedEmail, 'admin-login')
    setOtpChallenge({
      requestId: Date.now(),
      purpose: 'admin-login',
      email: match.email,
      remember: Boolean(remember),
      role: 'admin',
    })
    return { ok: true, requiresOtp: true }
  }

  const handleLogout = () => {
    setIsLogoutConfirmOpen(true)
  }

  const cancelLogout = () => {
    if (isLoggingOut) return
    setIsLogoutConfirmOpen(false)
  }

  const confirmLogout = async () => {
    if (isLoggingOut) return
    const wasAdmin = currentUserRole === 'admin'
    setIsLoggingOut(true)
    await new Promise((resolve) => setTimeout(resolve, 450))
    setIsLogoutConfirmOpen(false)
    setIsModalOpen(false)
    setIsAuthenticated(false)
    setAuthUser(null)
    setImpersonationSession(null)
    setPendingImpersonationClient(null)
    persistImpersonationSession(null)
    setAuthMode('login')
    setActivePage(getDefaultPageForRole('client'))
    sessionStorage.removeItem('kiaminaAuthUser')
    localStorage.removeItem('kiaminaAuthUser')
    setIsLoggingOut(false)
    if (wasAdmin) {
      navigateToAdminLogin({ replace: true })
    } else {
      navigateToAuth('login', { replace: true })
    }
    showToast('success', 'You have successfully logged out.')
  }

  const handleSignup = async ({ fullName, email, password, confirmPassword, agree }) => {
    const signupPasswordRegex = /^(?=.*\d)(?=.*[^A-Za-z0-9]).+$/
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      return { ok: false, message: 'Please complete all required fields.' }
    }
    if (!signupPasswordRegex.test(password)) {
      return { ok: false, message: 'Password must include at least one number and one special character.' }
    }
    if (password !== confirmPassword) {
      return { ok: false, message: 'Please complete all required fields.' }
    }
    if (!agree) {
      return { ok: false, message: 'Please complete all required fields.' }
    }

    const accounts = getSavedAccounts()
    const exists = accounts.some((account) => account.email.toLowerCase() === email.trim().toLowerCase())
    if (exists) {
      return { ok: false, message: 'Invalid credentials. Please try again.' }
    }

    const normalizedEmail = email.trim().toLowerCase()
    await issueEmailOtp(normalizedEmail, 'signup')
    setOtpChallenge({
      requestId: Date.now(),
      purpose: 'signup',
      email: normalizedEmail,
      remember: true,
      pendingSignup: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        password,
        role: 'client',
      },
    })
    return { ok: true, requiresOtp: true }
  }

  const handleAdminSetupCreateAccount = async ({ inviteToken, fullName, email, password, confirmPassword }) => {
    const normalizedToken = inviteToken?.trim() || ''
    const invite = getAdminInviteByToken(normalizedToken)
    if (!isAdminInvitePending(invite)) {
      return { ok: false, message: 'Invitation link is invalid or has expired.' }
    }

    const normalizedEmail = email?.trim()?.toLowerCase() || ''
    if (!fullName?.trim() || !normalizedEmail || !password || !confirmPassword) {
      return { ok: false, message: 'Please complete all required fields.' }
    }
    if (normalizedEmail !== invite.email) {
      return { ok: false, message: 'Work email must match your invitation email.' }
    }

    const signupPasswordRegex = /^(?=.*\d)(?=.*[^A-Za-z0-9]).+$/
    if (!signupPasswordRegex.test(password)) {
      return { ok: false, message: 'Password must include at least one number and one special character.' }
    }
    if (password !== confirmPassword) {
      return { ok: false, message: 'Please complete all required fields.' }
    }

    const accounts = getSavedAccounts()
    const exists = accounts.some((account) => account.email.toLowerCase() === normalizedEmail)
    if (exists) {
      return { ok: false, message: 'An account with this email already exists.' }
    }

    await issueEmailOtp(normalizedEmail, 'admin-setup')
    setOtpChallenge({
      requestId: Date.now(),
      purpose: 'admin-setup',
      email: normalizedEmail,
      remember: true,
      inviteToken: normalizedToken,
      pendingSignup: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        password,
        role: 'admin',
        adminLevel: invite.adminLevel || ADMIN_LEVELS.OPERATIONAL,
        adminPermissions: Array.isArray(invite.adminPermissions) ? invite.adminPermissions : [],
        status: 'active',
      },
    })
    return { ok: true, requiresOtp: true }
  }

  const handleVerifyOtp = async (code) => {
    if (!otpChallenge?.email) return { ok: false, message: 'Incorrect verification code.' }

    const normalizedEmail = otpChallenge.email.trim().toLowerCase()
    const otpEntry = otpStore[normalizedEmail]
    const isExpired = !otpEntry || Date.now() > otpEntry.expiresAt
    if (isExpired || otpEntry.code !== code.trim()) {
      return { ok: false, message: 'Incorrect verification code.' }
    }

    const { [normalizedEmail]: _removed, ...restOtpStore } = otpStore
    persistOtpStore(restOtpStore)
    try {
      const storedPreview = sessionStorage.getItem(OTP_PREVIEW_STORAGE_KEY)
      if (storedPreview) {
        const parsedPreview = JSON.parse(storedPreview)
        if (parsedPreview && typeof parsedPreview === 'object' && parsedPreview[normalizedEmail]) {
          delete parsedPreview[normalizedEmail]
          sessionStorage.setItem(OTP_PREVIEW_STORAGE_KEY, JSON.stringify(parsedPreview))
        }
      }
    } catch {
      // no-op
    }

    if (otpChallenge.purpose === 'signup' || otpChallenge.purpose === 'admin-setup') {
      const pendingSignup = otpChallenge.pendingSignup
      if (!pendingSignup?.email || !pendingSignup?.fullName || !pendingSignup?.password) {
        return { ok: false, message: 'Incorrect verification code.' }
      }

      const accounts = getSavedAccounts()
      const alreadyExists = accounts.some((account) => account.email.toLowerCase() === pendingSignup.email.toLowerCase())
      if (alreadyExists) {
        return { ok: false, message: 'Invalid credentials. Please try again.' }
      }

      const nextAccount = normalizeAccount({
        fullName: pendingSignup.fullName,
        email: pendingSignup.email,
        password: pendingSignup.password,
        role: pendingSignup.role || 'client',
        adminLevel: pendingSignup.adminLevel,
        adminPermissions: pendingSignup.adminPermissions,
        status: pendingSignup.status,
      })
      const nextAccounts = [...accounts, nextAccount]
      localStorage.setItem('kiaminaAccounts', JSON.stringify(nextAccounts))

      const user = normalizeUser({
        fullName: pendingSignup.fullName,
        email: pendingSignup.email,
        role: nextAccount.role || pendingSignup.role || 'client',
        adminLevel: nextAccount.adminLevel,
        adminPermissions: nextAccount.adminPermissions,
        status: nextAccount.status,
      })
      persistAuthUser(user, true)
      syncProfileToSettings(user.fullName, user.email)

      if (user.role === 'client') {
        persistOnboardingState({
          currentStep: 1,
          completed: false,
          skipped: false,
          verificationPending: true,
          data: {
            ...defaultOnboardingData,
            businessName: '',
            primaryContact: user.fullName,
          },
        }, user.email)
        appendClientActivityLog(user.email, {
          actorName: user.fullName || 'Client User',
          actorRole: 'client',
          action: 'Client account created',
          details: 'Client completed signup and verified OTP.',
        })
      }

      if (otpChallenge.purpose === 'admin-setup' && otpChallenge.inviteToken) {
        const invites = getSavedAdminInvites()
        const inviteIndex = invites.findIndex((invite) => invite.token === otpChallenge.inviteToken)
        if (inviteIndex !== -1) {
          const nextInvites = [...invites]
          nextInvites[inviteIndex] = normalizeAdminInvite({
            ...nextInvites[inviteIndex],
            status: 'accepted',
            acceptedAt: new Date().toISOString(),
          })
          saveAdminInvites(nextInvites)
        }
      }
    } else {
      const accounts = getSavedAccounts()
      const match = accounts.find((account) => account.email.toLowerCase() === normalizedEmail)
      if (!match) return { ok: false, message: 'Email or password incorrect.' }
      if (normalizeRole(match.role, match.email) === 'admin' && match.status === 'suspended') {
        return { ok: false, message: 'This admin account is suspended.' }
      }

      const user = normalizeUser({
        fullName: match.fullName,
        email: match.email,
        role: match.role || otpChallenge.role || 'client',
        adminLevel: match.adminLevel,
        adminPermissions: match.adminPermissions,
        status: match.status,
      })
      persistAuthUser(user, Boolean(otpChallenge.remember))
      syncProfileToSettings(user.fullName, user.email)
      if (user.role === 'client') {
        appendClientActivityLog(user.email, {
          actorName: user.fullName || 'Client User',
          actorRole: 'client',
          action: 'Client login',
          details: 'Client authenticated successfully via OTP.',
        })
      }
    }

    setOtpChallenge(null)
    showToast('success', 'Verification successful.')
    return { ok: true }
  }

  const handleResendOtp = async () => {
    if (!otpChallenge?.email) return { ok: false }
    await issueEmailOtp(otpChallenge.email, otpChallenge.purpose || 'login')
    return { ok: true }
  }

  const handleCancelOtp = () => {
    setOtpChallenge(null)
  }

  const handleRequestPasswordReset = async (email) => {
    const normalizedEmail = email?.trim()?.toLowerCase()
    if (!normalizedEmail) {
      return { ok: false, message: 'Please complete all required fields.' }
    }

    const accounts = getSavedAccounts()
    const match = accounts.find((account) => account.email.toLowerCase() === normalizedEmail)
    if (!match) {
      return { ok: false, message: 'No account found with this email.' }
    }

    await issuePasswordResetLink(match.email)

    return {
      ok: true,
      email: match.email,
      message: 'Password reset link sent. Please check your email.',
    }
  }

  const handleUpdatePassword = async ({ email, password, confirmPassword }) => {
    const normalizedEmail = email?.trim()?.toLowerCase()
    if (!normalizedEmail || !password || !confirmPassword) {
      return { ok: false, message: 'Please complete all required fields.' }
    }
    if (password !== confirmPassword) {
      return { ok: false, message: 'Please complete all required fields.' }
    }

    const strengthRegex = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
    if (!strengthRegex.test(password)) {
      return { ok: false, message: 'Password must include at least one number and one special character.' }
    }

    const accounts = getSavedAccounts()
    const matchIndex = accounts.findIndex((account) => account.email.toLowerCase() === normalizedEmail)
    if (matchIndex === -1) {
      return { ok: false, message: 'No account found with this email.' }
    }

    const nextAccounts = [...accounts]
    nextAccounts[matchIndex] = { ...nextAccounts[matchIndex], password }
    localStorage.setItem('kiaminaAccounts', JSON.stringify(nextAccounts))
    showToast('success', 'Password updated successfully.')
    return { ok: true }
  }

  const handleAdminActionLog = ({ action, affectedUser, details }) => {
    appendAdminActivityLog({
      adminName: authUser?.fullName || 'Admin User',
      action,
      affectedUser,
      details,
    })
  }

  const handleRequestImpersonation = (clientRecord) => {
    if (!clientRecord?.email) return
    if (!impersonationEnabled) {
      showToast('error', 'Insufficient Permissions')
      return
    }
    if (!canImpersonateClients) {
      showToast('error', 'Insufficient Permissions')
      return
    }
    setPendingImpersonationClient(clientRecord)
  }

  const enterImpersonationMode = () => {
    if (!pendingImpersonationClient?.email || !authUser?.email) return
    if (!impersonationEnabled || !canImpersonateClients) {
      showToast('error', 'Insufficient Permissions')
      setPendingImpersonationClient(null)
      return
    }

    const now = Date.now()
    const nextSession = {
      adminEmail: authUser.email.toLowerCase(),
      adminName: authUser.fullName || 'Admin User',
      clientEmail: pendingImpersonationClient.email.toLowerCase(),
      clientName: pendingImpersonationClient.primaryContact || pendingImpersonationClient.businessName || 'Client',
      businessName: pendingImpersonationClient.businessName || 'Client Account',
      cri: pendingImpersonationClient.cri || '',
      startedAt: now,
      lastActivityAt: now,
    }
    setImpersonationSession(nextSession)
    persistImpersonationSession(nextSession)
    setPendingImpersonationClient(null)
    setOnboardingState(getSavedOnboardingState(nextSession.clientEmail))
    setCompanyName(getSavedCompanyName(nextSession.clientEmail, nextSession.businessName))
    setClientFirstName(getSavedClientFirstName(nextSession.clientEmail, nextSession.clientName))
    setActivePage('dashboard')
    try {
      history.replaceState({}, '', '/dashboard')
    } catch {
      // ignore
    }

    appendAdminActivityLog({
      adminName: nextSession.adminName,
      action: 'Client impersonation started',
      affectedUser: nextSession.businessName,
      details: `Admin (${nextSession.adminName}) impersonated Business (${nextSession.businessName}).`,
    })
    showToast('success', 'Entered client view mode.')
  }

  const exitImpersonationMode = ({ expired = false } = {}) => {
    if (!impersonationSession) return
    appendAdminActivityLog({
      adminName: impersonationSession.adminName || authUser?.fullName || 'Admin User',
      action: expired ? 'Client impersonation expired' : 'Client impersonation ended',
      affectedUser: impersonationSession.businessName || impersonationSession.clientEmail || '--',
      details: expired
        ? `Impersonation for ${impersonationSession.businessName || impersonationSession.clientEmail} ended due to inactivity.`
        : `Admin exited client view mode for ${impersonationSession.businessName || impersonationSession.clientEmail}.`,
    })
    setImpersonationSession(null)
    persistImpersonationSession(null)
    setPendingImpersonationClient(null)
    setActivePage(ADMIN_DEFAULT_PAGE)
    try {
      history.replaceState({}, '', `/${ADMIN_DEFAULT_PAGE}`)
    } catch {
      // ignore
    }
    showToast(expired ? 'error' : 'success', expired ? 'Client view session expired.' : 'Exited client view mode.')
  }

  const handleForceVerificationApproval = () => {
    if (!isImpersonatingClient || !scopedClientEmail) return
    const nextState = {
      ...onboardingState,
      verificationPending: false,
      completed: true,
      skipped: false,
    }
    persistOnboardingState(nextState, scopedClientEmail)
    appendAdminActivityLog({
      adminName: impersonationSession?.adminName || authUser?.fullName || 'Admin User',
      action: 'Forced verification approval in impersonation mode',
      affectedUser: impersonationSession?.businessName || scopedClientEmail,
      details: 'Admin force-approved client verification while in impersonation mode.',
    })
    showToast('success', 'Verification status force-approved.')
  }

  const handleCorrectCri = () => {
    if (!isImpersonatingClient || !scopedClientEmail) return
    const input = window.prompt('Enter corrected CRI', impersonationSession?.cri || '')
    if (!input) return
    const settingsKey = getScopedStorageKey('settingsFormData', scopedClientEmail)
    const existing = (() => {
      try {
        return JSON.parse(localStorage.getItem(settingsKey) || '{}')
      } catch {
        return {}
      }
    })()
    const next = {
      ...existing,
      cri: input.trim(),
    }
    localStorage.setItem(settingsKey, JSON.stringify(next))
    setImpersonationSession((prev) => {
      if (!prev) return prev
      const updated = { ...prev, cri: input.trim(), lastActivityAt: Date.now() }
      persistImpersonationSession(updated)
      return updated
    })
    appendAdminActivityLog({
      adminName: impersonationSession?.adminName || authUser?.fullName || 'Admin User',
      action: 'Corrected CRI in impersonation mode',
      affectedUser: impersonationSession?.businessName || scopedClientEmail,
      details: `Admin corrected CRI to ${input.trim()} while in impersonation mode.`,
    })
    showToast('success', 'Client CRI corrected.')
  }

  const handleOverrideDocumentStatus = () => {
    if (!isImpersonatingClient) return
    let updated = false
    setExpenseDocuments((prev) => {
      if (updated) return prev
      const targetIndex = prev.findIndex((item) => item.status === 'Pending')
      if (targetIndex === -1) return prev
      updated = true
      const next = [...prev]
      next[targetIndex] = { ...next[targetIndex], status: 'Approved' }
      return next
    })
    if (!updated) {
      setSalesDocuments((prev) => {
        if (updated) return prev
        const targetIndex = prev.findIndex((item) => item.status === 'Pending')
        if (targetIndex === -1) return prev
        updated = true
        const next = [...prev]
        next[targetIndex] = { ...next[targetIndex], status: 'Approved' }
        return next
      })
    }
    if (!updated) {
      setBankStatementDocuments((prev) => {
        if (updated) return prev
        const targetIndex = prev.findIndex((item) => item.status === 'Pending')
        if (targetIndex === -1) return prev
        updated = true
        const next = [...prev]
        next[targetIndex] = { ...next[targetIndex], status: 'Approved' }
        return next
      })
    }

    if (updated) {
      appendAdminActivityLog({
        adminName: impersonationSession?.adminName || authUser?.fullName || 'Admin User',
        action: 'Overrode document status in impersonation mode',
        affectedUser: impersonationSession?.businessName || scopedClientEmail || '--',
        details: 'Admin overrode a pending document status to approved while in impersonation mode.',
      })
      showToast('success', 'Document status overridden.')
      return
    }
    showToast('error', 'No pending documents available for override.')
  }

  const showClientToast = (type, message) => {
    showToast(type, message)
    const activityByMessage = {
      'Changes saved successfully.': {
        action: 'Updated client settings',
        details: 'Client saved updates to profile, business, tax, or address settings.',
      },
      'Verification submitted successfully.': {
        action: 'Submitted verification',
        details: 'Client submitted verification documents for review.',
      },
      'Notification preferences updated.': {
        action: 'Updated notification preferences',
        details: 'Client updated notification settings.',
      },
      'Documents uploaded successfully.': {
        action: 'Uploaded documents',
        details: 'Client uploaded one or more documents.',
      },
    }
    const fallbackAction = type === 'success' ? 'Client action' : 'Client warning'
    const mapped = activityByMessage[message] || {
      action: fallbackAction,
      details: message,
    }
    appendScopedClientLog(mapped.action, mapped.details)

    if (!isImpersonatingClient) return
    const detailsByMessage = {
      'Changes saved successfully.': 'Admin updated tax details while in impersonation mode.',
      'Verification submitted successfully.': 'Admin submitted verification on behalf of client while in impersonation mode.',
      'Notification preferences updated.': 'Admin updated notification settings while in impersonation mode.',
      'Documents uploaded successfully.': 'Admin uploaded document on behalf of client.',
    }
    const details = detailsByMessage[message] || `Admin ${impersonationSession?.adminName || authUser?.fullName || 'Admin User'} action in client view: ${message}`
    appendAdminActivityLog({
      adminName: impersonationSession?.adminName || authUser?.fullName || 'Admin User',
      action: type === 'success' ? 'Impersonation action' : 'Impersonation warning',
      affectedUser: impersonationSession?.businessName || scopedClientEmail || '--',
      details,
    })
  }

  const handleSkipOnboarding = () => {
    persistOnboardingState({
      ...onboardingState,
      skipped: true,
      completed: false,
      verificationPending: true,
    }, scopedClientEmail)
    if (isImpersonatingClient) {
      appendAdminActivityLog({
        adminName: impersonationSession?.adminName || authUser?.fullName || 'Admin User',
        action: 'Skipped onboarding in impersonation mode',
        affectedUser: impersonationSession?.businessName || scopedClientEmail || '--',
        details: 'Admin skipped onboarding steps while in impersonation mode.',
      })
    }
    appendScopedClientLog('Skipped onboarding', 'Onboarding flow was skipped and marked pending verification.')
    showToast('success', 'Onboarding skipped. You can complete setup later.')
  }

  const handleCompleteOnboarding = (finalData) => {
    const entityNeedsBusinessDoc = finalData.businessType === 'Business' || finalData.businessType === 'Non-Profit'
    const verificationPending = !(finalData.govId && finalData.proofOfAddress && (!entityNeedsBusinessDoc || finalData.businessReg))

    persistOnboardingState({
      currentStep: 5,
      completed: true,
      skipped: false,
      verificationPending,
      data: finalData,
    }, scopedClientEmail)

    try {
      const settingsKey = getScopedStorageKey('settingsFormData', scopedClientEmail)
      const saved = localStorage.getItem(settingsKey) || (scopedClientEmail ? localStorage.getItem('settingsFormData') : null)
      const existing = saved ? JSON.parse(saved) : {}
      const effectiveFullName = isImpersonatingClient
        ? (impersonationSession?.clientName || existing.fullName || '')
        : (authUser?.fullName || existing.fullName || '')
      const merged = {
        ...existing,
        fullName: effectiveFullName,
        email: scopedClientEmail || existing.email || '',
        businessType: finalData.businessType,
        businessName: finalData.businessName,
        country: finalData.country,
        industry: finalData.industry,
        industryOther: finalData.industryOther,
        cacNumber: finalData.cacNumber,
        tin: finalData.tin,
        reportingCycle: finalData.reportingCycle,
        startMonth: finalData.startMonth,
        currency: finalData.currency,
        language: finalData.language,
      }
      localStorage.setItem(settingsKey, JSON.stringify(merged))
      setCompanyName(merged.businessName?.trim() || 'Acme Corporation')
      setClientFirstName(merged.fullName?.trim()?.split(/\s+/)?.[0] || 'Client')
    } catch {
      // no-op
    }

    const defaultLandingPage = isImpersonatingClient
      ? 'dashboard'
      : (finalData.defaultLandingPage || getDefaultPageForRole(currentUserRole))
    handleSetActivePage(defaultLandingPage, { replace: true })
    if (isImpersonatingClient) {
      appendAdminActivityLog({
        adminName: impersonationSession?.adminName || authUser?.fullName || 'Admin User',
        action: 'Completed onboarding in impersonation mode',
        affectedUser: impersonationSession?.businessName || scopedClientEmail || '--',
        details: 'Admin completed onboarding and verification submission while in impersonation mode.',
      })
    }
    appendScopedClientLog('Completed onboarding', 'Onboarding steps and verification details were completed.')
    showToast('success', 'Account setup completed successfully.')
  }

  const handleAddDocument = (categoryOverride = '') => {
    if (isAdminView && !isImpersonatingClient) return

    const fallbackCategory = activePage === 'bank-statements'
      ? 'bank-statements'
      : activePage === 'sales'
        ? 'sales'
        : 'expenses'
    setModalInitialCategory(categoryOverride || fallbackCategory)
    setIsModalOpen(true)
  }

  const handleUpload = async ({ category, formData, uploadedItems }) => {
    if (!category) return { ok: false, message: 'Please select a document category.' }
    if (!Array.isArray(uploadedItems) || uploadedItems.length === 0) return { ok: false, message: 'Please complete all required fields.' }

    const ownerName = formData?.documentOwner
      || (isImpersonatingClient ? (impersonationSession?.clientName || clientFirstName || 'Client') : authUser?.fullName)
      || 'Admin User'
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    const categoryConfig = {
      expenses: { prefix: 'EXP', label: 'Expense', records: expenseDocuments, setter: setExpenseDocuments },
      sales: { prefix: 'SAL', label: 'Sales', records: salesDocuments, setter: setSalesDocuments },
      'bank-statements': { prefix: 'BNK', label: 'Bank Statement', records: bankStatementDocuments, setter: setBankStatementDocuments },
    }

    const selectedConfig = categoryConfig[category]
    if (!selectedConfig) return { ok: false, message: 'Please select a document category.' }

    const createDocumentReferenceId = (prefix, index) => {
      const timePart = (Date.now() + index).toString(36).toUpperCase()
      const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase()
      return `${prefix}-${timePart}-${randomPart}`
    }

    const trimmedExpenseClass = formData?.expenseClass?.trim()
    const trimmedSalesClass = formData?.salesClass?.trim()
    if (category === 'expenses' && trimmedExpenseClass) {
      setExpenseClassOptions((prev) => (prev.includes(trimmedExpenseClass) ? prev : [...prev, trimmedExpenseClass]))
    }
    if (category === 'sales' && trimmedSalesClass) {
      setSalesClassOptions((prev) => (prev.includes(trimmedSalesClass) ? prev : [...prev, trimmedSalesClass]))
    }

    const nextRows = uploadedItems.map((item, index) => ({
      id: Date.now() + index,
      fileId: createDocumentReferenceId(selectedConfig.prefix, index),
      filename: item.name,
      extension: item.extension,
      user: ownerName,
      date: timestamp,
      status: 'Pending',
      previewUrl: item.previewUrl || (item.rawFile ? URL.createObjectURL(item.rawFile) : null),
      rawFile: item.rawFile || null,
      // include full metadata from formData depending on category
      ...(category === 'expenses' ? {
        vendorName: formData.vendorName,
        expenseClass: formData.expenseClass,
        expenseDate: formData.expenseDate,
        paymentMethod: formData.paymentMethod,
        description: formData.description,
      } : {}),
      ...(category === 'sales' ? {
        customerName: formData.customerName,
        invoiceNumber: formData.invoiceNumber,
        salesClass: formData.salesClass,
        invoiceDate: formData.invoiceDate,
        paymentStatus: formData.paymentStatus,
        description: formData.description,
      } : {}),
      ...(category === 'bank-statements' ? {
        bankName: formData.bankName,
        accountName: formData.accountName,
        accountLast4: formData.accountLast4,
        statementStartDate: formData.statementStartDate,
        statementEndDate: formData.statementEndDate,
      } : {}),
    }))
    selectedConfig.setter((prev) => [...nextRows, ...prev])

    const historyRows = uploadedItems.map((item, index) => ({
      id: Date.now() + uploadedItems.length + index,
      filename: item.name,
      type: item.type === 'Folder' ? 'Folder' : (item.extension || 'FILE'),
      category: selectedConfig.label,
      date: timestamp,
      user: ownerName,
      status: 'Pending',
      previewUrl: item.previewUrl || (item.rawFile ? URL.createObjectURL(item.rawFile) : null),
      rawFile: item.rawFile || null,
    }))
    setUploadHistoryRecords((prev) => [...historyRows, ...prev])

    setIsModalOpen(false)
    showClientToast('success', 'Documents uploaded successfully.')
    return { ok: true }
  }

  const renderClientPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <ClientDashboardPage
            onAddDocument={handleAddDocument}
            setActivePage={handleSetActivePage}
            profilePhoto={profilePhoto}
            clientFirstName={clientFirstName}
            verificationPending={onboardingState.verificationPending}
          />
        )
      case 'expenses':
        return <ClientExpensesPage onAddDocument={handleAddDocument} records={expenseDocuments} setRecords={setExpenseDocuments} setActivePage={handleSetActivePage} />
      case 'sales':
        return <ClientSalesPage onAddDocument={handleAddDocument} records={salesDocuments} setRecords={setSalesDocuments} setActivePage={handleSetActivePage} />
      case 'bank-statements':
        return <ClientBankStatementsPage onAddDocument={handleAddDocument} records={bankStatementDocuments} setRecords={setBankStatementDocuments} setActivePage={handleSetActivePage} />
      case 'upload-history':
        return <ClientUploadHistoryPage records={uploadHistoryRecords} />
      case 'settings':
        return (
          <ClientSettingsPage
            showToast={showClientToast}
            profilePhoto={profilePhoto}
            setProfilePhoto={setProfilePhoto}
            companyLogo={companyLogo}
            setCompanyLogo={setCompanyLogo}
            setCompanyName={setCompanyName}
            setClientFirstName={setClientFirstName}
            settingsStorageKey={getScopedStorageKey('settingsFormData', scopedClientEmail)}
          />
        )
      default:
        return (
          <ClientDashboardPage
            onAddDocument={handleAddDocument}
            setActivePage={handleSetActivePage}
            clientFirstName={clientFirstName}
            verificationPending={onboardingState.verificationPending}
          />
        )
    }
  }

  const activeAdminInvite = adminSetupToken ? getAdminInviteByToken(adminSetupToken) : null

  const clientOtpChallenge = otpChallenge && (otpChallenge.purpose === 'signup' || otpChallenge.purpose === 'client-login')
    ? otpChallenge
    : null
  const adminLoginOtpChallenge = otpChallenge?.purpose === 'admin-login' ? otpChallenge : null
  const adminSetupOtpChallenge = otpChallenge?.purpose === 'admin-setup' ? otpChallenge : null

  const needsOnboarding = isAuthenticated
    && (isImpersonatingClient || !isAdminView)
    && !onboardingState.completed
    && !onboardingState.skipped

  return (
    <div className="min-h-screen w-screen bg-background">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-[320px] ${toast.type === 'success' ? 'bg-success-bg border-l-4 border-success' : 'bg-error-bg border-l-4 border-error'}`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
          )}
          <span className={`text-sm font-medium ${toast.type === 'success' ? 'text-success' : 'text-error'}`}>
            {toast.message}
          </span>
          <button 
            onClick={() => setToast(null)}
            className="ml-auto text-text-muted hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-[210] bg-black/35 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-border-light rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-text-primary">Confirm Logout</h3>
            <p className="text-sm text-text-secondary mt-2">Are you sure you want to log out of your account?</p>
            <p className="text-xs text-text-muted mt-2">For security reasons, you will need to sign in again to access your dashboard.</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={cancelLogout}
                disabled={isLoggingOut}
                className="h-9 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmLogout()}
                disabled={isLoggingOut}
                className="h-9 px-4 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isLoggingOut && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoggingOut ? 'Processing...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingImpersonationClient && (
        <div className="fixed inset-0 z-[214] bg-black/45 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-border-light rounded-xl shadow-card p-6">
            <h3 className="text-xl font-semibold text-text-primary">Enter Client View Mode</h3>
            <p className="text-sm text-text-secondary mt-2">
              You are about to access this client&apos;s account as a support administrator. All actions will be logged.
            </p>
            <div className="mt-4 rounded-lg border border-border-light bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-text-muted">Target Business</p>
              <p className="text-sm font-semibold text-text-primary mt-1">{pendingImpersonationClient.businessName}</p>
              <p className="text-xs text-text-muted mt-1">{pendingImpersonationClient.email}</p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingImpersonationClient(null)}
                className="h-9 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={enterImpersonationMode}
                className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors"
              >
                Enter Client View
              </button>
            </div>
          </div>
        </div>
      )}

      {!isAuthenticated ? (
        adminSetupToken ? (
          <AdminAccountSetup
            invite={activeAdminInvite}
            otpChallenge={adminSetupOtpChallenge}
            onCreateAccount={handleAdminSetupCreateAccount}
            onVerifyOtp={handleVerifyOtp}
            onResendOtp={handleResendOtp}
            onCancelOtp={handleCancelOtp}
            onReturnToAdminLogin={() => navigateToAdminLogin({ replace: true })}
          />
        ) : showAdminLogin ? (
          <AdminLoginPortal
            onLogin={handleAdminLogin}
            otpChallenge={adminLoginOtpChallenge}
            onVerifyOtp={handleVerifyOtp}
            onResendOtp={handleResendOtp}
            onCancelOtp={handleCancelOtp}
            onSwitchToClientLogin={() => navigateToAuth('login', { replace: true })}
          />
        ) : showAuth ? (
          <AuthExperience
            mode={authMode}
            setMode={setAuthMode}
            onLogin={handleLogin}
            onSignup={handleSignup}
            onSocialLogin={handleSocialLogin}
            onRequestPasswordReset={handleRequestPasswordReset}
            onUpdatePassword={handleUpdatePassword}
            passwordResetEmail={passwordResetEmail}
            setPasswordResetEmail={setPasswordResetEmail}
            otpChallenge={clientOtpChallenge}
            onVerifyOtp={handleVerifyOtp}
            onResendOtp={handleResendOtp}
            onCancelOtp={handleCancelOtp}
          />
        ) : (
          <>
            <HomePage
              onGetStarted={() => navigateToAuth('signup')}
              onLogin={() => navigateToAuth('login')}
            />
            <button
              type="button"
              onClick={() => navigateToAdminLogin()}
              className="fixed top-5 right-5 z-[205] h-10 px-4 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light transition-colors"
            >
              Admin Portal
            </button>
          </>
        )
      ) : needsOnboarding ? (
        <ClientOnboardingExperience
          currentStep={onboardingState.currentStep}
          setCurrentStep={setOnboardingStep}
          data={onboardingState.data}
          setData={setOnboardingData}
          onSkip={handleSkipOnboarding}
          onComplete={handleCompleteOnboarding}
          showToast={showClientToast}
        />
      ) : isAdminView && !isImpersonatingClient ? (
        <AdminWorkspace
          activePage={activePage}
          setActivePage={handleSetActivePage}
          onLogout={handleLogout}
          showToast={showToast}
          adminFirstName={authUser?.fullName?.trim()?.split(/\s+/)?.[0] || clientFirstName}
          currentAdminAccount={currentAdminAccount}
          onRequestImpersonation={handleRequestImpersonation}
          impersonationEnabled={impersonationEnabled}
          onAdminActionLog={handleAdminActionLog}
        />
      ) : (
        <>
          {isImpersonatingClient && (
            <div className="fixed top-0 left-0 right-0 z-[215] bg-error-bg border-b border-error/30">
              <div className="h-12 px-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-error">
                  <ShieldAlert className="w-4 h-4" />
                  <span className="font-medium">You are viewing this account as Admin.</span>
                  <span className="text-xs text-text-secondary">All actions are logged.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOverrideDocumentStatus}
                    className="h-8 px-2.5 rounded border border-error/40 text-xs font-medium text-error hover:bg-error/10 transition-colors"
                  >
                    Override Doc Status
                  </button>
                  <button
                    type="button"
                    onClick={handleForceVerificationApproval}
                    className="h-8 px-2.5 rounded border border-error/40 text-xs font-medium text-error hover:bg-error/10 transition-colors"
                  >
                    Force Verify
                  </button>
                  <button
                    type="button"
                    onClick={handleCorrectCri}
                    className="h-8 px-2.5 rounded border border-error/40 text-xs font-medium text-error hover:bg-error/10 transition-colors"
                  >
                    Correct CRI
                  </button>
                  <button
                    type="button"
                    onClick={() => exitImpersonationMode({ expired: false })}
                    className="h-8 px-3 rounded bg-success text-white text-xs font-semibold hover:bg-[#0a6a41] transition-colors inline-flex items-center gap-1.5"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Exit Client View
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={`flex min-h-screen w-screen bg-background ${isImpersonatingClient ? 'pt-12' : ''}`}>
            <ClientSidebar activePage={activePage} setActivePage={handleSetActivePage} companyLogo={companyLogo} companyName={companyName} onLogout={handleLogout} />

            <div className="flex-1 flex flex-col ml-64">
              <ClientTopBar
                profilePhoto={isImpersonatingClient ? null : profilePhoto}
                clientFirstName={clientFirstName}
                notifications={userNotifications}
                onNotificationClick={(notification) => {
                  if (notification.documentId) {
                    handleSetActivePage('upload-history', { replace: true })
                  }
                }}
                onMarkAllRead={() => {
                  setUserNotifications(prev => prev.map(n => ({ ...n, read: true })))
                }}
                isImpersonationMode={isImpersonatingClient}
                roleLabel={isImpersonatingClient ? 'Client (Admin View)' : 'Client'}
                forceClientIcon={isImpersonatingClient}
              />
              <main className="p-6 flex-1 overflow-auto">
                {renderClientPage()}
              </main>
            </div>

            {!isImpersonatingClient && <ClientSupportWidget />}

            {isModalOpen && <ClientAddDocumentModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              initialCategory={modalInitialCategory}
              onUpload={handleUpload}
              showToast={showClientToast}
              expenseClassOptions={expenseClassOptions}
              salesClassOptions={salesClassOptions}
            />}
          </div>
        </>
      )}
    </div>
  )
}

export default App

