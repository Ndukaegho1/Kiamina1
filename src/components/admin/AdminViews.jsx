import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Bell,
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Search,
  X,
  Download,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Send,
  MessageSquare,
  Edit2,
  Trash2,
  Calendar,
  Building2,
  User,
  Clock,
  Filter,
  UsersRound,
  Building,
  AlertCircle,
  CheckSquare,
  XCircle,
  HelpCircle,
  Mail,
  Activity,
  Flag,
  Pin,
  Eye,
  MoreHorizontal,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react'
import {
  getAdminLevelLabel,
  hasAdminPermission,
  normalizeAdminAccount,
  normalizeRoleWithLegacyFallback,
} from './adminIdentity'
import {
  expenseDocumentSeed,
  salesDocumentSeed,
  bankStatementDocumentSeed,
  uploadHistoryData,
} from '../../data/client/mockData'

// Mock admin data
const mockAdmin = {
  id: 'ADM-001',
  fullName: 'System Administrator',
  email: 'admin@kiamina.local',
  role: 'Super Admin',
}

// Mock documents for document review
const mockDocuments = [
  { id: 'DOC-001', filename: 'Expense_Report_Feb2026.pdf', category: 'Expense', user: 'John Doe', businessName: 'Acme Corporation', date: 'Feb 24, 2026 10:30 AM', status: 'Pending', priority: 'Normal', confidentiality: 'Internal', notes: '' },
  { id: 'DOC-002', filename: 'Sales_Data_Jan2026.xlsx', category: 'Sales', user: 'Sarah Smith', businessName: 'Delta Ventures', date: 'Feb 23, 2026 2:15 PM', status: 'Approved', priority: 'High', confidentiality: 'Confidential', notes: '' },
  { id: 'DOC-003', filename: 'Bank_Statement_GTB_Feb2026.pdf', category: 'Bank Statement', user: 'Mike Johnson', businessName: 'Prime Logistics', date: 'Feb 22, 2026 9:45 AM', status: 'Pending', priority: 'Normal', confidentiality: 'Internal', notes: '' },
  { id: 'DOC-004', filename: 'Transactions_Export.csv', category: 'Bank Statement', user: 'John Doe', businessName: 'Acme Corporation', date: 'Feb 21, 2026 4:20 PM', status: 'Rejected', priority: 'Low', confidentiality: 'Internal', notes: 'Missing required signatures' },
  { id: 'DOC-005', filename: 'Invoice_Template.docx', category: 'Sales', user: 'Sarah Smith', businessName: 'Delta Ventures', date: 'Feb 20, 2026 11:00 AM', status: 'Approved', priority: 'Normal', confidentiality: 'Public', notes: '' },
  { id: 'DOC-006', filename: 'Receipt_Scanned_0042.pdf', category: 'Expense', user: 'Mike Johnson', businessName: 'Prime Logistics', date: 'Feb 19, 2026 3:30 PM', status: 'Pending', priority: 'High', confidentiality: 'Internal', notes: '' },
]

// Mock document comments
const initialComments = {
  'DOC-001': [
    { id: 'CMT-001', adminId: 'ADM-001', adminName: 'System Administrator', adminRole: 'Super Admin', text: 'Please provide supporting documentation for this expense claim.', timestamp: 'Feb 24, 2026 11:00 AM', isEdited: false },
  ],
  'DOC-004': [
    { id: 'CMT-002', adminId: 'ADM-001', adminName: 'System Administrator', adminRole: 'Super Admin', text: 'This document is missing required signatures as per compliance policy.', timestamp: 'Feb 21, 2026 4:30 PM', isEdited: false },
  ],
}

// Mock notifications for admin
const mockAdminNotifications = [
  { id: 'NOT-001', type: 'comment', message: 'New comment on Expense_Report_Feb2026.pdf', timestamp: 'Feb 24, 2026 11:00 AM', read: false },
  { id: 'NOT-002', type: 'status', message: 'Bank_Statement_GTB_Feb2026.pdf requires review', timestamp: 'Feb 22, 2026 9:45 AM', read: false },
]

// Mock sent notifications (for message center)
const mockSentNotifications = [
  { id: 'SN-001', title: 'Compliance Update Required', message: 'All businesses must update their tax documents by March 31st.', audience: 'All Businesses', dateSent: 'Feb 20, 2026', openRate: '45%', status: 'Delivered' },
  { id: 'SN-002', title: 'System Maintenance Notice', message: 'Scheduled maintenance on Feb 28th from 2AM-4AM.', audience: 'All Users', dateSent: 'Feb 18, 2026', openRate: '78%', status: 'Delivered' },
  { id: 'SN-003', title: 'Verification Reminder', message: 'Complete your business verification to avoid service interruption.', audience: 'Pending Verification Users', dateSent: 'Feb 15, 2026', openRate: '62%', status: 'Delivered' },
]

// Mock activity log
const mockActivityLog = [
  { id: 'LOG-001', adminName: 'System Administrator', action: 'Commented on document', affectedUser: 'John Doe', details: 'Expense_Report_Feb2026.pdf', timestamp: 'Feb 24, 2026 11:00 AM' },
  { id: 'LOG-002', adminName: 'System Administrator', action: 'Approved document', affectedUser: 'Sarah Smith', details: 'Sales_Data_Jan2026.xlsx', timestamp: 'Feb 23, 2026 3:30 PM' },
  { id: 'LOG-003', adminName: 'System Administrator', action: 'Rejected document', affectedUser: 'John Doe', details: 'Transactions_Export.csv - Missing signatures', timestamp: 'Feb 21, 2026 4:30 PM' },
  { id: 'LOG-004', adminName: 'System Administrator', action: 'Sent bulk notification', affectedUser: '324 Users', details: 'Compliance Update Required', timestamp: 'Feb 20, 2026 10:00 AM' },
  { id: 'LOG-005', adminName: 'System Administrator', action: 'Sent targeted notification', affectedUser: 'Mike Johnson', details: 'Verification Reminder', timestamp: 'Feb 15, 2026 2:15 PM' },
]

// Mock users for targeted notification
const mockUsers = [
  { id: 'USR-001', fullName: 'John Doe', email: 'john@acme.com', businessName: 'Acme Corporation', role: 'Client', verificationStatus: 'Verified', country: 'Nigeria', registrationStage: 'Completed' },
  { id: 'USR-002', fullName: 'Sarah Smith', email: 'sarah@delta.com', businessName: 'Delta Ventures', role: 'Client', verificationStatus: 'Verified', country: 'Nigeria', registrationStage: 'Completed' },
  { id: 'USR-003', fullName: 'Mike Johnson', email: 'mike@prime.com', businessName: 'Prime Logistics', role: 'Client', verificationStatus: 'Pending', country: 'Nigeria', registrationStage: 'Onboarding' },
  { id: 'USR-004', fullName: 'Emily Davis', email: 'emily@omega.com', businessName: 'Omega Holdings', role: 'Client', verificationStatus: 'Rejected', country: 'Nigeria', registrationStage: 'Onboarding' },
  { id: 'USR-005', fullName: 'Robert Wilson', email: 'robert@alpha.com', businessName: 'Alpha Industries', role: 'Accountant', verificationStatus: 'Verified', country: 'Nigeria', registrationStage: 'Completed' },
]

const ACCOUNTS_STORAGE_KEY = 'kiaminaAccounts'
const ADMIN_ACTIVITY_STORAGE_KEY = 'kiaminaAdminActivityLog'
const CLIENT_DOCUMENTS_STORAGE_KEY = 'kiaminaClientDocuments'
const CLIENT_ACTIVITY_STORAGE_KEY = 'kiaminaClientActivityLog'
const CLIENT_STATUS_CONTROL_STORAGE_KEY = 'kiaminaClientStatusControl'
const ADMIN_PAGE_PERMISSION_RULES = {
  'admin-documents': ['view_documents'],
  'admin-communications': ['send_notifications'],
  'admin-notifications': ['send_notifications'],
  'admin-clients': ['view_businesses'],
  'admin-activity': ['view_activity_logs'],
  'admin-client-profile': ['view_businesses'],
  'admin-client-documents': ['view_documents'],
  'admin-client-upload-history': ['view_documents'],
}

const CATEGORY_BUCKET_CONFIG = {
  expenses: { bundleKey: 'expenses', label: 'Expense' },
  sales: { bundleKey: 'sales', label: 'Sales' },
  'bank-statements': { bundleKey: 'bankStatements', label: 'Bank Statement' },
}

const safeParseJson = (rawValue, fallback) => {
  try {
    const parsed = rawValue ? JSON.parse(rawValue) : fallback
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

const formatTimestamp = (value) => {
  const parsedDate = Date.parse(value || '')
  if (!Number.isFinite(parsedDate)) return value || '--'
  return new Date(parsedDate).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const getScopedStorageObject = (baseKey, email) => {
  const normalizedEmail = (email || '').trim().toLowerCase()
  const scopedKey = normalizedEmail ? `${baseKey}:${normalizedEmail}` : baseKey
  const scopedValue = safeParseJson(localStorage.getItem(scopedKey), null)
  if (scopedValue && typeof scopedValue === 'object') return scopedValue
  const fallbackValue = safeParseJson(localStorage.getItem(baseKey), null)
  return fallbackValue && typeof fallbackValue === 'object' ? fallbackValue : {}
}

const getScopedStorageArray = (baseKey, email) => {
  const normalizedEmail = (email || '').trim().toLowerCase()
  const scopedKey = normalizedEmail ? `${baseKey}:${normalizedEmail}` : baseKey
  const scopedValue = safeParseJson(localStorage.getItem(scopedKey), null)
  if (Array.isArray(scopedValue)) return scopedValue
  const fallbackValue = safeParseJson(localStorage.getItem(baseKey), null)
  return Array.isArray(fallbackValue) ? fallbackValue : []
}

const getScopedStorageString = (baseKey, email) => {
  const normalizedEmail = (email || '').trim().toLowerCase()
  const scopedKey = normalizedEmail ? `${baseKey}:${normalizedEmail}` : baseKey
  const scopedValue = localStorage.getItem(scopedKey)
  if (scopedValue) return scopedValue
  return localStorage.getItem(baseKey) || ''
}

const writeScopedStorageObject = (baseKey, email, value) => {
  const normalizedEmail = (email || '').trim().toLowerCase()
  const scopedKey = normalizedEmail ? `${baseKey}:${normalizedEmail}` : baseKey
  localStorage.setItem(scopedKey, JSON.stringify(value))
}

const writeScopedStorageString = (baseKey, email, value) => {
  const normalizedEmail = (email || '').trim().toLowerCase()
  const scopedKey = normalizedEmail ? `${baseKey}:${normalizedEmail}` : baseKey
  localStorage.setItem(scopedKey, value)
}

const removeScopedStorageValue = (baseKey, email) => {
  const normalizedEmail = (email || '').trim().toLowerCase()
  if (!normalizedEmail) return
  localStorage.removeItem(`${baseKey}:${normalizedEmail}`)
}

const migrateScopedClientData = (fromEmail, toEmail) => {
  const sourceEmail = (fromEmail || '').trim().toLowerCase()
  const targetEmail = (toEmail || '').trim().toLowerCase()
  if (!sourceEmail || !targetEmail || sourceEmail === targetEmail) return

  const keysToMove = [
    'settingsFormData',
    'kiaminaOnboardingState',
    'notificationSettings',
    'verificationDocs',
    'profilePhoto',
    'companyLogo',
    CLIENT_DOCUMENTS_STORAGE_KEY,
    CLIENT_ACTIVITY_STORAGE_KEY,
    CLIENT_STATUS_CONTROL_STORAGE_KEY,
  ]

  keysToMove.forEach((baseKey) => {
    const sourceKey = `${baseKey}:${sourceEmail}`
    const targetKey = `${baseKey}:${targetEmail}`
    const sourceValue = localStorage.getItem(sourceKey)
    if (sourceValue === null) return
    localStorage.setItem(targetKey, sourceValue)
    localStorage.removeItem(sourceKey)
  })
}

const appendScopedClientActivityLog = (email, entry = {}) => {
  const normalizedEmail = (email || '').trim().toLowerCase()
  if (!normalizedEmail) return
  const key = `${CLIENT_ACTIVITY_STORAGE_KEY}:${normalizedEmail}`
  const existing = safeParseJson(localStorage.getItem(key), [])
  const list = Array.isArray(existing) ? existing : []
  const nextEntry = {
    id: `CLLOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    actorName: entry.actorName || 'Admin User',
    actorRole: entry.actorRole || 'admin',
    action: entry.action || 'Client activity',
    details: entry.details || '--',
    timestamp: new Date().toISOString(),
  }
  localStorage.setItem(key, JSON.stringify([nextEntry, ...list]))
}

const createClientDocumentFallback = (client) => {
  const ownerName = client?.primaryContact || client?.settings?.fullName || 'Client User'
  const businessName = client?.businessName || 'Client Business'

  const expenses = expenseDocumentSeed.map((item, index) => ({
    ...item,
    id: `${client?.id || 'CL'}-EXP-${index + 1}`,
    user: ownerName,
    businessName,
    category: 'Expense',
  }))
  const sales = salesDocumentSeed.map((item, index) => ({
    ...item,
    id: `${client?.id || 'CL'}-SAL-${index + 1}`,
    user: ownerName,
    businessName,
    category: 'Sales',
  }))
  const bankStatements = bankStatementDocumentSeed.map((item, index) => ({
    ...item,
    id: `${client?.id || 'CL'}-BNK-${index + 1}`,
    user: ownerName,
    businessName,
    category: 'Bank Statement',
  }))
  const uploadHistory = uploadHistoryData.map((item, index) => ({
    ...item,
    id: `${client?.id || 'CL'}-UPL-${index + 1}`,
    user: ownerName,
    businessName,
  }))

  return { expenses, sales, bankStatements, uploadHistory }
}

const readClientDocumentBundle = (client) => {
  const email = (client?.email || '').trim().toLowerCase()
  if (!email) return createClientDocumentFallback(client)

  const scopedKey = `${CLIENT_DOCUMENTS_STORAGE_KEY}:${email}`
  const scopedValue = safeParseJson(localStorage.getItem(scopedKey), null)
  const fallbackValue = safeParseJson(localStorage.getItem(CLIENT_DOCUMENTS_STORAGE_KEY), null)
  const source = scopedValue && typeof scopedValue === 'object'
    ? scopedValue
    : (fallbackValue && typeof fallbackValue === 'object' ? fallbackValue : null)

  if (!source) return createClientDocumentFallback(client)

  const fallback = createClientDocumentFallback(client)
  const normalizedExpenses = Array.isArray(source.expenses) ? source.expenses : fallback.expenses
  const normalizedSales = Array.isArray(source.sales) ? source.sales : fallback.sales
  const normalizedBankStatements = Array.isArray(source.bankStatements) ? source.bankStatements : fallback.bankStatements
  const normalizedUploadHistory = Array.isArray(source.uploadHistory)
    ? source.uploadHistory
    : [...normalizedExpenses, ...normalizedSales, ...normalizedBankStatements].map((item, index) => ({
      id: `UPL-${index + 1}-${item.id}`,
      filename: item.filename || 'Document',
      type: item.extension || (item.filename?.split('.').pop() || 'FILE').toUpperCase(),
      category: item.category || 'Expense',
      date: item.date || '--',
      user: item.user || client?.primaryContact || 'Client User',
      status: item.status || 'Pending',
      businessName: client?.businessName || '--',
    }))

  return {
    expenses: normalizedExpenses.map((row) => ({ ...row, category: 'Expense' })),
    sales: normalizedSales.map((row) => ({ ...row, category: 'Sales' })),
    bankStatements: normalizedBankStatements.map((row) => ({ ...row, category: 'Bank Statement' })),
    uploadHistory: normalizedUploadHistory.map((row) => ({ ...row })),
  }
}

const readClientActivityLogs = (client) => {
  const email = (client?.email || '').trim().toLowerCase()
  const rawLogs = getScopedStorageArray(CLIENT_ACTIVITY_STORAGE_KEY, email)
  const normalizedLogs = rawLogs.map((entry, index) => ({
    id: entry?.id || `CLLOG-${index + 1}`,
    action: entry?.action || 'Client activity',
    details: entry?.details || '--',
    actorName: entry?.actorName || client?.primaryContact || 'Client User',
    actorRole: entry?.actorRole || 'client',
    timestamp: formatTimestamp(entry?.timestamp),
    _sortMs: Date.parse(entry?.timestamp || '') || 0,
  })).sort((left, right) => right._sortMs - left._sortMs)

  if (normalizedLogs.length > 0) return normalizedLogs

  return [
    {
      id: `${client?.id || 'CL'}-LOG-CREATED`,
      action: 'Account initialized',
      details: 'Client profile was provisioned for onboarding.',
      actorName: client?.primaryContact || 'Client User',
      actorRole: 'system',
      timestamp: client?.dateCreated || '--',
      _sortMs: Date.parse(client?.dateCreated || '') || 0,
    },
    {
      id: `${client?.id || 'CL'}-LOG-STATUS`,
      action: 'Verification status',
      details: `Current verification status: ${client?.verificationStatus || 'Pending'}.`,
      actorName: 'System',
      actorRole: 'system',
      timestamp: formatTimestamp(new Date().toISOString()),
      _sortMs: Date.now(),
    },
  ]
}

const toTimestamp = (value) => {
  const parsed = Date.parse(value || '')
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeDocumentType = (row = {}) => (
  (row.extension || row.type || row.filename?.split('.').pop() || 'FILE').toUpperCase()
)

const normalizeReviewDocumentRow = (client, bucketKey, row, index) => ({
  id: `${client.email || 'client'}:${bucketKey}:${row.id || row.fileId || index}`,
  filename: row.filename || 'Document',
  category: row.category || (bucketKey === 'bankStatements' ? 'Bank Statement' : bucketKey === 'sales' ? 'Sales' : 'Expense'),
  user: row.user || client.primaryContact || 'Client User',
  businessName: client.businessName || '--',
  date: row.date || '--',
  status: row.status || 'Pending',
  priority: row.priority || 'Normal',
  confidentiality: row.confidentiality || 'Internal',
  notes: row.notes || '',
  extension: normalizeDocumentType(row),
  source: {
    clientEmail: client.email,
    bucketKey,
    rowId: row.id,
    fileId: row.fileId || '',
    filename: row.filename || '',
    date: row.date || '',
    category: row.category || '',
  },
})

const readAllDocumentsForReview = () => {
  const clients = readClientRows()
  const documents = []
  clients.forEach((client) => {
    const bundle = readClientDocumentBundle(client)
    const bucketRows = [
      ['expenses', bundle.expenses || []],
      ['sales', bundle.sales || []],
      ['bankStatements', bundle.bankStatements || []],
    ]
    bucketRows.forEach(([bucketKey, rows]) => {
      rows.forEach((row, index) => {
        documents.push(normalizeReviewDocumentRow(client, bucketKey, row, index))
      })
    })
  })
  if (documents.length > 0) return documents
  return mockDocuments.map((row, index) => ({
    ...row,
    source: null,
    extension: normalizeDocumentType(row),
    id: row.id || `MOCK-${index + 1}`,
  }))
}

const matchDocumentRow = (row, source = {}) => (
  (source.rowId !== undefined && source.rowId !== null && String(row.id) === String(source.rowId))
  || (source.fileId && row.fileId && String(row.fileId) === String(source.fileId))
  || (
    source.filename
    && String(row.filename || '').toLowerCase() === String(source.filename).toLowerCase()
    && (
      !source.date
      || String(row.date || '') === String(source.date)
    )
  )
)

const updateClientDocumentReviewStatus = (document, nextStatus, notes = '') => {
  if (!document?.source?.clientEmail || !document?.source?.bucketKey) return null
  const clientEmail = document.source.clientEmail.trim().toLowerCase()
  if (!clientEmail) return null

  const key = `${CLIENT_DOCUMENTS_STORAGE_KEY}:${clientEmail}`
  const client = readClientRows().find((item) => item.email === clientEmail)
  const bundle = readClientDocumentBundle(client || { email: clientEmail })
  const targetBucket = document.source.bucketKey
  const targetRows = Array.isArray(bundle[targetBucket]) ? bundle[targetBucket] : []

  let updatedTarget = false
  const nextTargetRows = targetRows.map((row) => {
    if (!matchDocumentRow(row, document.source)) return row
    updatedTarget = true
    return {
      ...row,
      status: nextStatus,
      notes: notes || row.notes || '',
    }
  })

  if (!updatedTarget) return null

  const nextUploadHistory = (Array.isArray(bundle.uploadHistory) ? bundle.uploadHistory : []).map((row) => {
    const matchesFileName = String(row.filename || '').toLowerCase() === String(document.source.filename || '').toLowerCase()
    if (!matchesFileName) return row
    return {
      ...row,
      status: nextStatus,
    }
  })

  const nextBundle = {
    ...bundle,
    [targetBucket]: nextTargetRows,
    uploadHistory: nextUploadHistory,
  }
  localStorage.setItem(key, JSON.stringify(nextBundle))

  appendScopedClientActivityLog(clientEmail, {
    actorName: 'Admin User',
    actorRole: 'admin',
    action: `Document review updated to ${nextStatus}`,
    details: `${document.filename || 'Document'} status changed to ${nextStatus}.`,
  })

  return nextBundle
}

const readClientRows = () => {
  const rawAccounts = safeParseJson(localStorage.getItem(ACCOUNTS_STORAGE_KEY), [])
  if (!Array.isArray(rawAccounts)) return []

  const clientAccounts = rawAccounts.filter((account) => (
    normalizeRoleWithLegacyFallback(account?.role, account?.email || '') === 'client'
  ))

  return clientAccounts.map((account, index) => {
    const normalizedEmail = account?.email?.trim()?.toLowerCase() || ''
    const settings = getScopedStorageObject('settingsFormData', normalizedEmail)
    const onboarding = getScopedStorageObject('kiaminaOnboardingState', normalizedEmail)
    const statusControl = getScopedStorageObject(CLIENT_STATUS_CONTROL_STORAGE_KEY, normalizedEmail)
    const verificationDocs = getScopedStorageObject('verificationDocs', normalizedEmail)
    const notificationSettings = getScopedStorageObject('notificationSettings', normalizedEmail)
    const profilePhoto = getScopedStorageString('profilePhoto', normalizedEmail)
    const companyLogo = getScopedStorageString('companyLogo', normalizedEmail)
    const createdAt = account?.createdAt || account?.dateCreated || ''
    const onboardingCompleted = Boolean(onboarding?.completed)
    const onboardingSkipped = Boolean(onboarding?.skipped)
    const verificationPending = onboarding?.verificationPending !== undefined
      ? Boolean(onboarding.verificationPending)
      : true
    const accountSuspended = account.status === 'suspended'
    const statusVerification = statusControl?.verificationStatus
    const verificationStatus = accountSuspended
      ? 'Suspended'
      : (statusVerification || (verificationPending ? 'Pending' : 'Verified'))

    const cri = settings.cri || `CRI-${String(index + 1).padStart(4, '0')}`
    const businessName = settings.businessName?.trim() || account.businessName || account.companyName || 'Unassigned Business'

    return {
      id: account.id || `CL-${String(index + 1).padStart(4, '0')}`,
      businessName,
      cri,
      primaryContact: settings.fullName?.trim() || account.fullName || 'Not set',
      email: normalizedEmail || '--',
      country: settings.country || '--',
      verificationStatus,
      onboardingStatus: onboardingCompleted ? 'Completed' : (onboardingSkipped ? 'Skipped' : 'In Progress'),
      subscriptionStatus: account.subscriptionStatus || 'Active',
      dateCreated: createdAt ? formatTimestamp(createdAt) : '--',
      clientStatus: accountSuspended ? 'Suspended' : 'Active',
      suspensionMessage: statusControl?.suspensionMessage || '',
      rawAccount: account,
      settings,
      onboarding,
      verificationDocs,
      notificationSettings,
      profilePhoto,
      companyLogo,
      statusControl,
    }
  })
}

const getActivityLogsFromStorage = () => {
  const storedLogs = safeParseJson(localStorage.getItem(ADMIN_ACTIVITY_STORAGE_KEY), [])
  if (!Array.isArray(storedLogs)) return []
  return storedLogs
    .map((log, index) => ({
      id: log.id || `LOG-STORED-${index}`,
      adminName: log.adminName || 'Admin User',
      action: log.action || 'Admin action',
      affectedUser: log.affectedUser || '--',
      details: log.details || '--',
      timestamp: formatTimestamp(log.timestamp),
      __sortTs: Date.parse(log.timestamp || '') || 0,
    }))
    .sort((left, right) => right.__sortTs - left.__sortTs)
}

const hasAnyPermission = (account, permissionIds = []) => {
  if (!Array.isArray(permissionIds) || permissionIds.length === 0) return true
  return permissionIds.some((permissionId) => hasAdminPermission(account, permissionId))
}

const canAccessAdminPage = (pageId, account) => {
  const requiredPermissions = ADMIN_PAGE_PERMISSION_RULES[pageId]
  if (!requiredPermissions) return true
  return hasAnyPermission(account, requiredPermissions)
}

// Sidebar Component
function AdminSidebar({ activePage, setActivePage, onLogout, currentAdminAccount }) {
  const navItems = [
    { id: 'admin-dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    { id: 'admin-documents', label: 'Document Review', icon: FileText },
    { id: 'admin-communications', label: 'Communications', icon: Mail },
    { id: 'admin-notifications', label: 'Send Notification', icon: Send },
    { id: 'admin-clients', label: 'Client Management', icon: Users },
  ]

  const footerNavItems = [
    { id: 'admin-activity', label: 'Activity Log', icon: Activity },
    { id: 'admin-settings', label: 'Admin Settings', icon: Settings },
  ]

  const displayAdmin = normalizeAdminAccount({
    ...mockAdmin,
    role: 'admin',
    ...currentAdminAccount,
  })
  const displayRoleLabel = getAdminLevelLabel(displayAdmin.adminLevel)
  const visibleNavItems = navItems.filter((item) => canAccessAdminPage(item.id, displayAdmin))
  const visibleFooterNavItems = footerNavItems.filter((item) => canAccessAdminPage(item.id, displayAdmin))

  return (
    <aside className="w-64 bg-white border-r border-border fixed left-0 top-0 h-screen flex flex-col z-50">
      <div className="p-4 border-b border-border-light">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#7A1F1F] rounded-md flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-semibold text-text-primary">Kiamina</div>
            <div className="text-[11px] text-text-muted uppercase tracking-wide">Admin Control</div>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-border-light">
        <div className="text-sm font-medium text-text-primary">{displayAdmin.fullName}</div>
        <div className="text-xs text-text-muted mt-1">Role: {displayRoleLabel}</div>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {visibleNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={"w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all " + (activePage === item.id ? 'bg-primary-tint text-primary border-l-[3px] border-primary' : 'text-text-secondary hover:bg-background hover:text-text-primary border-l-[3px] border-transparent')}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-4 py-2">
        <div className="border-t border-border-light"></div>
      </div>

      <div className="pb-3">
        {visibleFooterNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={"w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all " + (activePage === item.id ? 'bg-primary-tint text-primary border-l-[3px] border-primary' : 'text-text-secondary hover:bg-background hover:text-text-primary border-l-[3px] border-transparent')}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="py-3 border-t border-border-light">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-text-secondary hover:bg-background hover:text-text-primary transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  )
}

// Admin Top Bar with notifications dropdown
function AdminTopBar({ adminFirstName, notifications, onMarkNotificationRead, currentAdminAccount }) {
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef(null)
  const unreadCount = notifications.filter(n => !n.read).length
  const displayAdmin = normalizeAdminAccount({
    ...mockAdmin,
    role: 'admin',
    ...currentAdminAccount,
  })

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="h-14 bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-40">
      <div>
        <h1 className="text-sm font-semibold text-text-primary uppercase tracking-wide">Admin Console</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-background transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-error rounded-full border-2 border-white text-[10px] text-white flex items-center justify-center">{unreadCount}</span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white border border-border rounded-lg shadow-card z-50">
              <div className="p-3 border-b border-border-light">
                <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-text-muted text-sm">No notifications</div>
                ) : (
                  notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`p-3 border-b border-border-light hover:bg-background cursor-pointer ${!notification.read ? 'bg-primary-tint' : ''}`}
                      onClick={() => onMarkNotificationRead && onMarkNotificationRead(notification.id)}
                    >
                      <div className="flex items-start gap-2">
                        <Bell className="w-4 h-4 text-text-muted mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-text-primary">{notification.message}</p>
                          <p className="text-xs text-text-muted mt-1">{notification.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="pl-3 border-l border-border">
          <p className="text-sm font-medium text-text-primary">{adminFirstName || 'Administrator'}</p>
          <p className="text-[11px] text-text-muted">{getAdminLevelLabel(displayAdmin.adminLevel)}</p>
        </div>
      </div>
    </header>
  )
}

// Admin Dashboard Page
function AdminDashboardPage({ setActivePage }) {
  const cards = [
    { label: 'Total Clients', value: '42', icon: Users, tone: 'bg-info-bg text-primary' },
    { label: 'Pending Verifications', value: '8', icon: AlertTriangle, tone: 'bg-warning-bg text-warning' },
    { label: 'Approved Today', value: '14', icon: CheckCircle, tone: 'bg-success-bg text-success' },
    { label: 'Open Tickets', value: '5', icon: FileText, tone: 'bg-error-bg text-error' },
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-text-primary">Admin Dashboard</h2>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg shadow-card p-4 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${card.tone}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-text-primary leading-tight">{card.value}</p>
              <p className="text-xs text-text-secondary mt-1 uppercase tracking-wide">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <button onClick={() => setActivePage('admin-documents')} className="bg-white rounded-lg shadow-card p-5 text-left hover:shadow-card-hover transition-shadow">
          <p className="text-base font-semibold text-text-primary">Document Review Center</p>
          <p className="text-sm text-text-secondary mt-1">Review, approve, and manage uploaded documents.</p>
          <span className="inline-flex items-center gap-1 text-primary text-sm mt-4">Open <ChevronRight className="w-4 h-4" /></span>
        </button>
        <button onClick={() => setActivePage('admin-communications')} className="bg-white rounded-lg shadow-card p-5 text-left hover:shadow-card-hover transition-shadow">
          <p className="text-base font-semibold text-text-primary">Communications Center</p>
          <p className="text-sm text-text-secondary mt-1">Manage sent notifications and message history.</p>
          <span className="inline-flex items-center gap-1 text-primary text-sm mt-4">Open <ChevronRight className="w-4 h-4" /></span>
        </button>
      </div>
    </div>
  )
}

// Client Management Page
function AdminClientsPage({
  showToast,
  setActivePage,
  onRequestImpersonation,
  currentAdminAccount,
  impersonationEnabled,
  onAdminActionLog,
  onOpenClientProfile,
  onOpenClientDocuments,
  onOpenClientUploadHistory,
}) {
  const [clients, setClients] = useState(() => readClientRows())
  const [searchTerm, setSearchTerm] = useState('')
  const [openActionMenuId, setOpenActionMenuId] = useState(null)
  const actionMenuRef = useRef(null)
  const hasPermission = (permissionId) => (
    currentAdminAccount?.adminLevel === 'senior' || hasAdminPermission(currentAdminAccount, permissionId)
  )

  const canViewDocuments = hasPermission('view_documents')
  const canSendNotifications = hasPermission('send_notifications')
  const canManageUsers = hasPermission('manage_users')
  const canImpersonateClients = hasPermission('client_assistance')
  const canViewBusinesses = hasPermission('view_businesses')

  useEffect(() => {
    const refreshClients = () => setClients(readClientRows())
    refreshClients()
    window.addEventListener('storage', refreshClients)
    return () => window.removeEventListener('storage', refreshClients)
  }, [])

  useEffect(() => {
    const closeActionMenu = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionMenuId(null)
      }
    }
    document.addEventListener('mousedown', closeActionMenu)
    return () => document.removeEventListener('mousedown', closeActionMenu)
  }, [])

  const refreshClientRows = () => setClients(readClientRows())

  const getStatusBadge = (status) => {
    if (status === 'Verified' || status === 'Completed' || status === 'Active') return 'bg-success-bg text-success'
    if (status === 'Pending' || status === 'In Progress') return 'bg-warning-bg text-warning'
    if (status === 'Suspended') return 'bg-error-bg text-error'
    return 'bg-info-bg text-primary'
  }

  const filteredClients = clients.filter((client) => {
    const haystack = [
      client.businessName,
      client.cri,
      client.primaryContact,
      client.email,
      client.country,
    ].join(' ').toLowerCase()
    return haystack.includes(searchTerm.trim().toLowerCase())
  })

  const safeToast = (type, message) => {
    if (typeof showToast === 'function') showToast(type, message)
  }

  const appendActionLog = (action, client, details = '') => {
    if (typeof onAdminActionLog !== 'function') return
    onAdminActionLog({
      action,
      affectedUser: client.businessName,
      details: details || `${action} - ${client.businessName}`,
    })
  }

  const updateClientAccount = (clientEmail, updater) => {
    const storedAccounts = safeParseJson(localStorage.getItem(ACCOUNTS_STORAGE_KEY), [])
    if (!Array.isArray(storedAccounts)) return false

    const targetIndex = storedAccounts.findIndex((account) => (
      (account?.email || '').trim().toLowerCase() === clientEmail.trim().toLowerCase()
    ))
    if (targetIndex === -1) return false

    const nextAccounts = [...storedAccounts]
    nextAccounts[targetIndex] = updater(nextAccounts[targetIndex])
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(nextAccounts))
    refreshClientRows()
    return true
  }

  const handleClientAction = (actionId, client) => {
    setOpenActionMenuId(null)

    if (actionId === 'view-profile') {
      if (!canViewBusinesses) {
        safeToast('error', 'Insufficient Permissions')
        return
      }
      onOpenClientProfile?.(client)
      setActivePage?.('admin-client-profile')
      safeToast('success', `Opened profile for ${client.businessName}.`)
      appendActionLog('Viewed client profile', client)
      return
    }
    if (actionId === 'view-documents') {
      if (!canViewDocuments) {
        safeToast('error', 'Insufficient Permissions')
        return
      }
      onOpenClientDocuments?.(client)
      setActivePage?.('admin-client-documents')
      safeToast('success', `Opened document vault for ${client.businessName}.`)
      appendActionLog('Opened client documents', client)
      return
    }
    if (actionId === 'view-upload-history') {
      if (!canViewDocuments) {
        safeToast('error', 'Insufficient Permissions')
        return
      }
      onOpenClientUploadHistory?.(client)
      setActivePage?.('admin-client-upload-history')
      safeToast('success', `Opened upload history for ${client.businessName}.`)
      appendActionLog('Opened client upload history', client)
      return
    }
    if (actionId === 'reset-password') {
      if (!canManageUsers) {
        safeToast('error', 'Insufficient Permissions')
        return
      }
      const nextPassword = `Temp@${Math.floor(100000 + Math.random() * 900000)}`
      const updated = updateClientAccount(client.email, (account) => ({ ...account, password: nextPassword }))
      if (!updated) {
        safeToast('error', 'Unable to reset client password.')
        return
      }
      safeToast('success', `Temporary password generated for ${client.businessName}.`)
      appendActionLog('Reset client password', client, `Temporary password issued for ${client.email}`)
      return
    }
    if (actionId === 'toggle-status') {
      if (!canManageUsers) {
        safeToast('error', 'Insufficient Permissions')
        return
      }
      const isSuspended = client.clientStatus === 'Suspended'
      const nextStatus = isSuspended ? 'active' : 'suspended'
      const updated = updateClientAccount(client.email, (account) => ({ ...account, status: nextStatus }))
      if (!updated) {
        safeToast('error', 'Unable to update client status.')
        return
      }
      safeToast('success', `${client.businessName} has been ${isSuspended ? 'activated' : 'suspended'}.`)
      appendActionLog(isSuspended ? 'Activated client account' : 'Suspended client account', client)
      return
    }
    if (actionId === 'send-notification') {
      if (!canSendNotifications) {
        safeToast('error', 'Insufficient Permissions')
        return
      }
      setActivePage?.('admin-notifications')
      safeToast('success', `Preparing notification for ${client.businessName}.`)
      appendActionLog('Prepared client notification', client)
      return
    }
    if (actionId === 'impersonate') {
      if (!impersonationEnabled) {
        safeToast('error', 'Impersonation system is currently disabled.')
        return
      }
      if (!canImpersonateClients) {
        safeToast('error', 'Insufficient Permissions')
        return
      }
      onRequestImpersonation?.(client)
    }
  }

  const actionItemsForClient = (client) => ([
    { id: 'view-profile', label: 'View Client Profile', disabled: !canViewBusinesses, disabledMessage: 'Insufficient Permissions' },
    { id: 'view-documents', label: 'View Documents', disabled: !canViewDocuments, disabledMessage: 'Insufficient Permissions' },
    { id: 'view-upload-history', label: 'View Upload History', disabled: !canViewDocuments, disabledMessage: 'Insufficient Permissions' },
    { id: 'reset-password', label: 'Reset Password', disabled: !canManageUsers, disabledMessage: 'Insufficient Permissions' },
    { id: 'toggle-status', label: client.clientStatus === 'Suspended' ? 'Activate Account' : 'Suspend Account', disabled: !canManageUsers, disabledMessage: 'Insufficient Permissions' },
    { id: 'send-notification', label: 'Send Notification', disabled: !canSendNotifications, disabledMessage: 'Insufficient Permissions' },
    {
      id: 'impersonate',
      label: 'Impersonate Client (View As Client)',
      disabled: !canImpersonateClients || !impersonationEnabled,
      disabledMessage: !impersonationEnabled ? 'Impersonation system is currently disabled.' : 'Insufficient Permissions',
    },
  ])

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Client Management</h2>
          <p className="text-sm text-text-muted mt-1">View, manage, and assist client accounts.</p>
        </div>
        <div className="w-80 relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search business, CRI, contact, email..."
            className="w-full h-10 pl-9 pr-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {!impersonationEnabled && (
        <div className="mb-4 h-10 px-3 rounded-md bg-warning-bg border border-warning/30 text-warning text-sm inline-flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          Impersonation is currently disabled by system policy.
        </div>
      )}

      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F9FAFB]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Business Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">CRI</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Primary Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Country</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Verification Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Onboarding Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Subscription Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Date Created</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-text-muted">
                  No client accounts found.
                </td>
              </tr>
            )}
            {filteredClients.map((client) => (
              <tr key={client.id} className="border-t border-border-light hover:bg-[#F9FAFB]">
                <td className="px-4 py-3.5 text-sm font-medium text-text-primary">{client.businessName}</td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{client.cri}</td>
                <td className="px-4 py-3.5 text-sm text-text-primary">{client.primaryContact}</td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{client.email}</td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{client.country}</td>
                <td className="px-4 py-3.5 text-sm">
                  <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${getStatusBadge(client.verificationStatus)}`}>
                    {client.verificationStatus}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-sm">
                  <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${getStatusBadge(client.onboardingStatus)}`}>
                    {client.onboardingStatus}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-sm">
                  <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${getStatusBadge(client.subscriptionStatus)}`}>
                    {client.subscriptionStatus}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{client.dateCreated}</td>
                <td className="px-4 py-3.5 text-sm">
                  <div className="relative inline-block" ref={openActionMenuId === client.id ? actionMenuRef : null}>
                    <button
                      type="button"
                      onClick={() => setOpenActionMenuId((prev) => (prev === client.id ? null : client.id))}
                      className="h-8 w-8 border border-border rounded-md inline-flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-background"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {openActionMenuId === client.id && (
                      <div className="absolute right-0 top-10 w-64 bg-white border border-border-light rounded-md shadow-card z-40 py-1">
                        {actionItemsForClient(client).map((item) => {
                          const isImpersonateAction = item.id === 'impersonate'
                          const isRestricted = Boolean(item.disabled)
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                if (item.disabled) {
                                  safeToast('error', item.disabledMessage || 'Insufficient Permissions')
                                  return
                                }
                                handleClientAction(item.id, client)
                              }}
                              className={`w-full px-3 py-2 text-left text-sm transition-colors inline-flex items-center gap-2 ${isImpersonateAction ? 'text-primary font-medium' : 'text-text-primary'} ${isRestricted ? 'opacity-70 cursor-not-allowed' : 'hover:bg-background'}`}
                            >
                              {isImpersonateAction && <ShieldCheck className="w-4 h-4" />}
                              {item.label}
                              {isRestricted && <span className="ml-auto text-[10px] text-warning uppercase tracking-wide">Restricted</span>}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminClientPageHeader({ client, title, subtitle, setActivePage }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <button
          type="button"
          onClick={() => setActivePage?.('admin-clients')}
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Client Management
        </button>
        <h2 className="text-2xl font-semibold text-text-primary">{title}</h2>
        <p className="text-sm text-text-muted mt-1">{subtitle}</p>
      </div>
      <div className="bg-white border border-border-light rounded-lg px-4 py-3 min-w-[260px]">
        <p className="text-xs uppercase tracking-wide text-text-muted">Client Account</p>
        <p className="text-sm font-semibold text-text-primary mt-1">{client?.businessName || '--'}</p>
        <p className="text-xs text-text-muted mt-1">{client?.email || '--'}</p>
      </div>
    </div>
  )
}

function AdminClientProfilePage({ client, setActivePage, showToast, onAdminActionLog }) {
  const [clientSnapshot, setClientSnapshot] = useState(client)

  useEffect(() => {
    setClientSnapshot(client)
  }, [client])
  const safeClient = clientSnapshot || client || null
  const normalizedEmail = (safeClient?.email || '').trim().toLowerCase()
  const settings = getScopedStorageObject('settingsFormData', normalizedEmail)
  const onboarding = getScopedStorageObject('kiaminaOnboardingState', normalizedEmail)
  const statusControl = getScopedStorageObject(CLIENT_STATUS_CONTROL_STORAGE_KEY, normalizedEmail)
  const verificationDocs = getScopedStorageObject('verificationDocs', normalizedEmail)
  const notificationSettings = getScopedStorageObject('notificationSettings', normalizedEmail)
  const profilePhoto = getScopedStorageString('profilePhoto', normalizedEmail)
  const companyLogo = getScopedStorageString('companyLogo', normalizedEmail)
  const onboardingData = onboarding?.data || {}
  const clientLogs = readClientActivityLogs({ ...clientSnapshot, settings, onboarding })

  const [verificationStatusDraft, setVerificationStatusDraft] = useState(
    statusControl?.verificationStatus || safeClient?.verificationStatus || 'Pending',
  )
  const [suspensionMessage, setSuspensionMessage] = useState(
    statusControl?.suspensionMessage || safeClient?.suspensionMessage || '',
  )
  const [isSavingVerificationStatus, setIsSavingVerificationStatus] = useState(false)

  useEffect(() => {
    setVerificationStatusDraft(statusControl?.verificationStatus || safeClient?.verificationStatus || 'Pending')
    setSuspensionMessage(statusControl?.suspensionMessage || safeClient?.suspensionMessage || '')
  }, [statusControl?.verificationStatus, statusControl?.suspensionMessage, safeClient?.verificationStatus, safeClient?.suspensionMessage])

  if (!safeClient) {
    return (
      <div className="bg-white rounded-lg shadow-card border border-border-light p-8">
        <p className="text-sm text-text-secondary">Select a client from Client Management to view profile details.</p>
        <button
          type="button"
          onClick={() => setActivePage?.('admin-clients')}
          className="mt-4 h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light"
        >
          Return to Client Management
        </button>
      </div>
    )
  }

  const saveVerificationStatus = () => {
    if (!normalizedEmail) return
    if (verificationStatusDraft === 'Suspended' && !suspensionMessage.trim()) {
      showToast?.('error', 'Please include a reason message before suspending this client.')
      return
    }

    setIsSavingVerificationStatus(true)
    try {
      const accounts = safeParseJson(localStorage.getItem(ACCOUNTS_STORAGE_KEY), [])
      const nextAccounts = Array.isArray(accounts) ? [...accounts] : []
      const accountIndex = nextAccounts.findIndex((account) => (
        (account?.email || '').trim().toLowerCase() === normalizedEmail
      ))
      if (accountIndex !== -1) {
        nextAccounts[accountIndex] = {
          ...nextAccounts[accountIndex],
          status: verificationStatusDraft === 'Suspended' ? 'suspended' : 'active',
        }
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(nextAccounts))
      }

      const onboardingState = getScopedStorageObject('kiaminaOnboardingState', normalizedEmail)
      writeScopedStorageObject('kiaminaOnboardingState', normalizedEmail, {
        ...onboardingState,
        verificationPending: verificationStatusDraft !== 'Verified',
      })

      writeScopedStorageObject(CLIENT_STATUS_CONTROL_STORAGE_KEY, normalizedEmail, {
        verificationStatus: verificationStatusDraft,
        suspensionMessage: verificationStatusDraft === 'Suspended' ? suspensionMessage.trim() : '',
        updatedAt: new Date().toISOString(),
      })

      appendScopedClientActivityLog(normalizedEmail, {
        actorName: 'Admin User',
        actorRole: 'admin',
        action: 'Updated verification status',
        details: `Verification status changed to ${verificationStatusDraft}.${verificationStatusDraft === 'Suspended' ? ` Reason: ${suspensionMessage.trim()}` : ''}`,
      })

      onAdminActionLog?.({
        action: 'Updated client verification status',
        affectedUser: safeClient.businessName || normalizedEmail,
        details: `Set verification status to ${verificationStatusDraft}.${verificationStatusDraft === 'Suspended' ? ` Reason: ${suspensionMessage.trim()}` : ''}`,
      })

      const refreshed = readClientRows().find((row) => row.email === normalizedEmail)
      if (refreshed) setClientSnapshot(refreshed)
      showToast?.('success', 'Client verification status updated.')
    } finally {
      setIsSavingVerificationStatus(false)
    }
  }

  const profileFields = [
    ['Primary Contact', safeClient.primaryContact || settings.fullName],
    ['Work Email', safeClient.email || settings.email],
    ['Phone', settings.phone],
    ['Role in Company', settings.roleInCompany],
    ['Business Type', settings.businessType || onboardingData.businessType],
    ['Business Name', safeClient.businessName || settings.businessName || onboardingData.businessName],
    ['Country', safeClient.country || settings.country || onboardingData.country],
    ['Industry', settings.industry || onboardingData.industry],
    ['TIN', settings.tin || onboardingData.tin],
    ['Reporting Cycle', settings.reportingCycle || onboardingData.reportingCycle],
    ['Start Month', settings.startMonth || onboardingData.startMonth],
    ['Currency', settings.currency || onboardingData.currency],
    ['Language', settings.language || onboardingData.language],
    ['Business Reg / CAC', settings.cacNumber || settings.businessReg || onboardingData.cacNumber || onboardingData.businessReg],
    ['Address Line 1', settings.address1],
    ['Address Line 2', settings.address2],
    ['City', settings.city],
    ['Postal Code', settings.postalCode],
    ['Address Country', settings.addressCountry],
  ]

  return (
    <div className="animate-fade-in">
      <AdminClientPageHeader
        client={safeClient}
        title="Client Profile"
        subtitle="Complete profile, onboarding, and compliance details for this client account."
        setActivePage={setActivePage}
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-card border border-border-light p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Verification Status</p>
          <p className="text-lg font-semibold text-text-primary mt-1">{safeClient.verificationStatus || '--'}</p>
        </div>
        <div className="bg-white rounded-lg shadow-card border border-border-light p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Onboarding Status</p>
          <p className="text-lg font-semibold text-text-primary mt-1">{safeClient.onboardingStatus || '--'}</p>
        </div>
        <div className="bg-white rounded-lg shadow-card border border-border-light p-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Subscription Status</p>
          <p className="text-lg font-semibold text-text-primary mt-1">{safeClient.subscriptionStatus || '--'}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-border-light p-6 mb-6">
        <h3 className="text-base font-semibold text-text-primary">Verification Control</h3>
        <p className="text-sm text-text-muted mt-1">Set this client to Verified, Suspended, or Pending.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Verification Status</label>
            <select
              value={verificationStatusDraft}
              onChange={(event) => setVerificationStatusDraft(event.target.value)}
              className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            >
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-primary mb-1.5">Suspension Message</label>
            <textarea
              value={suspensionMessage}
              onChange={(event) => setSuspensionMessage(event.target.value)}
              placeholder="Write the message the client should receive when suspended."
              className="w-full h-20 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-primary resize-none"
              disabled={verificationStatusDraft !== 'Suspended'}
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={saveVerificationStatus}
            disabled={isSavingVerificationStatus}
            className="h-10 px-4 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-60"
          >
            {isSavingVerificationStatus ? 'Saving...' : 'Save Verification State'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-border-light p-6 mb-6">
        <h3 className="text-base font-semibold text-text-primary">Profile & Identity Assets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="rounded-md border border-border-light bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-text-muted">Profile Picture</p>
            <div className="mt-3 w-24 h-24 rounded-full overflow-hidden border border-border-light bg-white flex items-center justify-center">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Client Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-text-muted" />
              )}
            </div>
          </div>
          <div className="rounded-md border border-border-light bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-text-muted">Company Logo</p>
            <div className="mt-3 w-28 h-20 rounded border border-border-light bg-white p-2 flex items-center justify-center">
              {companyLogo ? (
                <img src={companyLogo} alt="Company Logo" className="w-full h-full object-contain" />
              ) : (
                <Building2 className="w-8 h-8 text-text-muted" />
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {[
            ['Government-issued ID', verificationDocs.govId],
            ['Proof of Address', verificationDocs.proofOfAddress],
            ['Business Registration Document', verificationDocs.businessReg],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-border-light bg-background px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-text-muted">{label}</p>
              <p className="text-sm text-text-primary mt-1">{value || '--'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-border-light p-6 mb-6">
        <h3 className="text-base font-semibold text-text-primary">Client Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
          {profileFields.map(([label, value]) => (
            <div key={label} className="rounded-md border border-border-light bg-background px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-text-muted">{label}</p>
              <p className="text-sm text-text-primary mt-1">{value || '--'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-border-light p-6 mb-6">
        <h3 className="text-base font-semibold text-text-primary">Notification Preferences</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
          {[
            ['New Upload Alerts', notificationSettings.newUploads],
            ['Approval Alerts', notificationSettings.approvals],
            ['Weekly Summary', notificationSettings.weeklySummary],
            ['Compliance Alerts', notificationSettings.compliance],
            ['Security Alerts', notificationSettings.security],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-border-light bg-background px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-text-muted">{label}</p>
              <p className={`text-sm font-medium mt-1 ${value ? 'text-success' : 'text-text-secondary'}`}>
                {value ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-border-light p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-text-primary">Client Activity Logs</h3>
          <p className="text-xs text-text-muted">Auditable timeline of this client&apos;s activity.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Details</th>
              </tr>
            </thead>
            <tbody>
              {clientLogs.map((log) => (
                <tr key={log.id} className="border-t border-border-light hover:bg-[#F9FAFB]">
                  <td className="px-4 py-3.5 text-sm text-text-secondary">{log.timestamp}</td>
                  <td className="px-4 py-3.5 text-sm text-text-primary">{log.actorName}</td>
                  <td className="px-4 py-3.5 text-sm text-text-secondary uppercase">{log.actorRole}</td>
                  <td className="px-4 py-3.5 text-sm font-medium text-text-primary">{log.action}</td>
                  <td className="px-4 py-3.5 text-sm text-text-secondary">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AdminClientDocumentsPage({ client, setActivePage, showToast, onAdminActionLog }) {
  const [activeCategory, setActiveCategory] = useState('expenses')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [documentBundle, setDocumentBundle] = useState(() => readClientDocumentBundle(client))
  const safeClient = client || null

  useEffect(() => {
    if (!safeClient) return
    setDocumentBundle(readClientDocumentBundle(safeClient))
  }, [safeClient?.email, safeClient?.id])

  if (!safeClient) {
    return (
      <div className="bg-white rounded-lg shadow-card border border-border-light p-8">
        <p className="text-sm text-text-secondary">Select a client from Client Management to view client documents.</p>
        <button
          type="button"
          onClick={() => setActivePage?.('admin-clients')}
          className="mt-4 h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light"
        >
          Return to Client Management
        </button>
      </div>
    )
  }

  const documents = documentBundle
  const recordsByCategory = {
    expenses: documents.expenses || [],
    sales: documents.sales || [],
    'bank-statements': documents.bankStatements || [],
  }
  const activeRows = recordsByCategory[activeCategory] || []

  const filteredRows = activeRows
    .filter((row) => {
      const filename = row.filename || ''
      const fileId = row.fileId || ''
      const user = row.user || ''
      const extension = (row.extension || row.type || filename.split('.').pop() || '').toUpperCase()
      const matchesSearch = [filename, fileId, user].join(' ').toLowerCase().includes(searchTerm.trim().toLowerCase())
      const matchesStatus = !filterStatus || row.status === filterStatus
      const matchesType = !filterType || extension === filterType
      return matchesSearch && matchesStatus && matchesType
    })
    .sort((left, right) => {
      if (sortBy === 'alphabetical') {
        const compareValue = (left.filename || '').localeCompare(right.filename || '')
        return sortOrder === 'asc' ? compareValue : -compareValue
      }
      const compareValue = toTimestamp(left.date) - toTimestamp(right.date)
      return sortOrder === 'asc' ? compareValue : -compareValue
    })

  const categoryTabs = [
    { id: 'expenses', label: 'Expenses', count: recordsByCategory.expenses.length },
    { id: 'sales', label: 'Sales', count: recordsByCategory.sales.length },
    { id: 'bank-statements', label: 'Bank Statements', count: recordsByCategory['bank-statements'].length },
  ]
  const statusOptions = [...new Set(activeRows.map((row) => row.status).filter(Boolean))]
  const typeOptions = [...new Set(activeRows.map((row) => (row.extension || row.type || row.filename?.split('.').pop() || '').toUpperCase()).filter(Boolean))]

  const clearFilters = () => {
    setSearchTerm('')
    setFilterStatus('')
    setFilterType('')
  }

  const handleDocumentStatusChange = (row, nextStatus) => {
    const currentStatus = row.status || 'Pending'
    if (nextStatus === currentStatus) return

    let notes = row.notes || ''
    if (nextStatus === 'Rejected' || nextStatus === 'Info Requested') {
      const promptMessage = nextStatus === 'Rejected'
        ? 'Provide rejection reason'
        : 'Provide information request message'
      const input = window.prompt(promptMessage, notes || '')
      if (input === null) return
      if (!input.trim()) {
        showToast?.('error', 'Please provide a message for this status change.')
        return
      }
      notes = input.trim()
    }

    const bucket = CATEGORY_BUCKET_CONFIG[activeCategory]?.bundleKey || 'expenses'
    const reviewDocument = normalizeReviewDocumentRow(safeClient, bucket, row, 0)
    const updatedBundle = updateClientDocumentReviewStatus(reviewDocument, nextStatus, notes)
    if (!updatedBundle) {
      showToast?.('error', 'Unable to update document status.')
      return
    }

    setDocumentBundle(updatedBundle)
    onAdminActionLog?.({
      action: 'Reviewed client document',
      affectedUser: safeClient.businessName,
      details: `${row.filename} set to ${nextStatus}.`,
    })
    showToast?.('success', `Document status updated to ${nextStatus}.`)
  }

  return (
    <div className="animate-fade-in">
      <AdminClientPageHeader
        client={safeClient}
        title="Client Documents"
        subtitle="Client-specific documents grouped by expense, sales, and bank statements."
        setActivePage={setActivePage}
      />

      <div className="bg-white rounded-lg shadow-card border border-border-light p-4 mb-6">
        <div className="flex items-center gap-3">
          {categoryTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              className={`h-10 px-4 rounded-md text-sm font-medium transition-colors ${activeCategory === tab.id ? 'bg-primary text-white' : 'bg-background text-text-secondary hover:text-text-primary'}`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-border-light p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by file name, file ID, or uploader..."
              className="w-full h-10 pl-9 pr-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            className="h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
          >
            <option value="">All Status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(event) => setFilterType(event.target.value)}
            className="h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
          >
            <option value="">All Types</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
          >
            <option value="date">Sort by Date</option>
            <option value="alphabetical">Sort Alphabetical</option>
          </select>
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className="h-10 px-3 border border-border rounded-md text-sm text-text-primary hover:bg-background"
          >
            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </button>
          {(searchTerm || filterStatus || filterType) && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-10 px-3 text-sm text-error hover:bg-error-bg rounded-md"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-border-light overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F9FAFB]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">File Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">File ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Uploaded By</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Review State</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-text-muted">
                  No documents found for this category.
                </td>
              </tr>
            )}
            {filteredRows.map((row) => (
              <tr key={row.id} className="border-t border-border-light hover:bg-[#F9FAFB]">
                <td className="px-4 py-3.5 text-sm text-text-primary font-medium">{row.filename || '--'}</td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{row.fileId || '--'}</td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{(row.extension || row.type || row.filename?.split('.').pop() || '--').toUpperCase()}</td>
                <td className="px-4 py-3.5 text-sm text-text-primary">{row.user || '--'}</td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{row.date || '--'}</td>
                <td className="px-4 py-3.5 text-sm">
                  <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${
                    row.status === 'Approved'
                      ? 'bg-success-bg text-success'
                      : row.status === 'Rejected'
                        ? 'bg-error-bg text-error'
                        : 'bg-warning-bg text-warning'
                  }`}>
                    {row.status || 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-sm">
                  <select
                    value={row.status || 'Pending'}
                    onChange={(event) => handleDocumentStatusChange(row, event.target.value)}
                    className="h-8 px-2.5 border border-border rounded-md text-xs focus:outline-none focus:border-primary"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Info Requested">Info Requested</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminClientUploadHistoryPage({ client, setActivePage }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')

  if (!client) {
    return (
      <div className="bg-white rounded-lg shadow-card border border-border-light p-8">
        <p className="text-sm text-text-secondary">Select a client from Client Management to view upload history.</p>
        <button
          type="button"
          onClick={() => setActivePage?.('admin-clients')}
          className="mt-4 h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light"
        >
          Return to Client Management
        </button>
      </div>
    )
  }

  const documents = readClientDocumentBundle(client)
  const records = documents.uploadHistory || []
  const typeOptions = [...new Set(records.map((row) => (row.type || row.extension || row.filename?.split('.').pop() || '').toUpperCase()).filter(Boolean))]

  const filteredRows = records
    .filter((row) => {
      const dateText = row.date || ''
      const typeText = (row.type || row.extension || row.filename?.split('.').pop() || '').toUpperCase()
      const matchesSearch = `${row.filename || ''} ${row.user || ''}`.toLowerCase().includes(searchTerm.trim().toLowerCase())
      const matchesDate = !filterDate || dateText.includes(filterDate)
      const matchesType = !filterType || typeText === filterType
      const matchesCategory = !filterCategory || row.category === filterCategory
      return matchesSearch && matchesDate && matchesType && matchesCategory
    })
    .sort((left, right) => {
      if (sortBy === 'name') {
        const compareValue = (left.filename || '').localeCompare(right.filename || '')
        return sortOrder === 'asc' ? compareValue : -compareValue
      }
      const compareValue = toTimestamp(left.date) - toTimestamp(right.date)
      return sortOrder === 'asc' ? compareValue : -compareValue
    })

  const clearFilters = () => {
    setSearchTerm('')
    setFilterDate('')
    setFilterType('')
    setFilterCategory('')
  }

  return (
    <div className="animate-fade-in">
      <AdminClientPageHeader
        client={client}
        title="Client Upload History"
        subtitle="Historical upload timeline for this client account."
        setActivePage={setActivePage}
      />

      <div className="bg-white rounded-lg shadow-card border border-border-light p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by file name or uploader..."
              className="w-full h-10 pl-9 pr-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <input
            type="date"
            value={filterDate}
            onChange={(event) => setFilterDate(event.target.value)}
            className="h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
          />
          <select
            value={filterType}
            onChange={(event) => setFilterType(event.target.value)}
            className="h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
          >
            <option value="">All Types</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
            className="h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
          >
            <option value="">All Categories</option>
            <option value="Expense">Expenses</option>
            <option value="Sales">Sales</option>
            <option value="Bank Statement">Bank Statement</option>
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
          </select>
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className="h-10 px-3 border border-border rounded-md text-sm text-text-primary hover:bg-background"
          >
            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </button>
          {(searchTerm || filterDate || filterType || filterCategory) && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-10 px-3 text-sm text-error hover:bg-error-bg rounded-md"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-border-light overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F9FAFB]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">File Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Upload Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Uploaded By</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">
                  No upload history found.
                </td>
              </tr>
            )}
            {filteredRows.map((row) => (
              <tr key={row.id} className="border-t border-border-light hover:bg-[#F9FAFB]">
                <td className="px-4 py-3.5 text-sm text-text-primary font-medium">{row.filename || '--'}</td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{(row.type || row.extension || row.filename?.split('.').pop() || '--').toUpperCase()}</td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{row.category || '--'}</td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{row.date || '--'}</td>
                <td className="px-4 py-3.5 text-sm text-text-primary">{row.user || '--'}</td>
                <td className="px-4 py-3.5 text-sm">
                  <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${
                    row.status === 'Approved'
                      ? 'bg-success-bg text-success'
                      : row.status === 'Rejected'
                        ? 'bg-error-bg text-error'
                        : 'bg-warning-bg text-warning'
                  }`}>
                    {row.status || 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Document Review Center with Preview Panel
function AdminDocumentReviewCenter({ showToast }) {
  const [documents, setDocuments] = useState(() => readAllDocumentsForReview())
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterCategory, setFilterCategory] = useState('All')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [zoom, setZoom] = useState(100)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [comments, setComments] = useState(initialComments)
  const [newComment, setNewComment] = useState('')
  const [editingComment, setEditingComment] = useState(null)
  const [editedCommentText, setEditedCommentText] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectionModal, setShowRejectionModal] = useState(false)

  useEffect(() => {
    const syncFromStorage = () => {
      const nextRows = readAllDocumentsForReview()
      setDocuments(nextRows)
      setSelectedDocument((prev) => {
        if (!prev) return prev
        return nextRows.find((item) => item.id === prev.id) || null
      })
    }
    syncFromStorage()
    window.addEventListener('storage', syncFromStorage)
    const intervalId = window.setInterval(syncFromStorage, 4000)
    return () => {
      window.removeEventListener('storage', syncFromStorage)
      window.clearInterval(intervalId)
    }
  }, [])

  const filteredDocuments = documents
    .filter((doc) => {
      const matchesSearch = (doc.filename || '').toLowerCase().includes(searchTerm.toLowerCase())
        || (doc.user || '').toLowerCase().includes(searchTerm.toLowerCase())
        || (doc.businessName || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = filterStatus === 'All' || doc.status === filterStatus
      const matchesCategory = filterCategory === 'All' || doc.category === filterCategory
      return matchesSearch && matchesStatus && matchesCategory
    })
    .sort((left, right) => {
      if (sortBy === 'business') {
        const compareValue = (left.businessName || '').localeCompare(right.businessName || '')
        return sortOrder === 'asc' ? compareValue : -compareValue
      }
      if (sortBy === 'name') {
        const compareValue = (left.filename || '').localeCompare(right.filename || '')
        return sortOrder === 'asc' ? compareValue : -compareValue
      }
      const compareValue = toTimestamp(left.date) - toTimestamp(right.date)
      return sortOrder === 'asc' ? compareValue : -compareValue
    })

  const handleSelectDocument = (doc) => {
    setSelectedDocument(doc)
    setZoom(100)
  }

  const handleClosePreview = () => {
    setSelectedDocument(null)
    setNewComment('')
    setEditingComment(null)
    setRejectionReason('')
  }

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedDocument) return

    const comment = {
      id: `CMT-${Date.now()}`,
      adminId: mockAdmin.id,
      adminName: mockAdmin.fullName,
      adminRole: mockAdmin.role,
      text: newComment.trim(),
      timestamp: new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
      isEdited: false,
    }

    setComments(prev => ({
      ...prev,
      [selectedDocument.id]: [...(prev[selectedDocument.id] || []), comment]
    }))
    setNewComment('')
    showToast('success', 'Comment posted successfully.')
  }

  const handleEditComment = (commentId) => {
    const docComments = comments[selectedDocument.id] || []
    const comment = docComments.find(c => c.id === commentId)
    if (comment && comment.adminId === mockAdmin.id) {
      setEditingComment(commentId)
      setEditedCommentText(comment.text)
    }
  }

  const handleSaveEdit = () => {
    if (!editingComment || !editedCommentText.trim()) return

    setComments(prev => ({
      ...prev,
      [selectedDocument.id]: prev[selectedDocument.id].map(c => 
        c.id === editingComment ? { ...c, text: editedCommentText.trim(), isEdited: true } : c
      )
    }))
    setEditingComment(null)
    setEditedCommentText('')
    showToast('success', 'Comment updated successfully.')
  }

  const handleDeleteComment = (commentId) => {
    const docComments = comments[selectedDocument.id] || []
    const comment = docComments.find(c => c.id === commentId)
    if (comment && comment.adminId === mockAdmin.id) {
      setComments(prev => ({
        ...prev,
        [selectedDocument.id]: prev[selectedDocument.id].filter(c => c.id !== commentId)
      }))
      showToast('success', 'Comment deleted successfully.')
    }
  }

  const applyReviewStatus = (nextStatus, notes = '') => {
    if (!selectedDocument) return
    const updatedNote = notes || selectedDocument.notes || ''

    if (selectedDocument.source) {
      updateClientDocumentReviewStatus(selectedDocument, nextStatus, updatedNote)
      const nextRows = readAllDocumentsForReview()
      setDocuments(nextRows)
      const nextSelected = nextRows.find((row) => row.id === selectedDocument.id)
      setSelectedDocument(nextSelected || null)
      return
    }

    setDocuments((prev) => prev.map((row) => (
      row.id === selectedDocument.id ? { ...row, status: nextStatus, notes: updatedNote } : row
    )))
    setSelectedDocument((prev) => (prev ? { ...prev, status: nextStatus, notes: updatedNote } : prev))
  }

  const handleApprove = () => {
    if (!selectedDocument) return
    applyReviewStatus('Approved')
    showToast('success', 'Document approved successfully.')
  }

  const handleMarkPending = () => {
    if (!selectedDocument) return
    applyReviewStatus('Pending')
    showToast('success', 'Document moved back to pending.')
  }

  const handleReject = () => {
    if (!selectedDocument || !rejectionReason.trim()) return
    applyReviewStatus('Rejected', rejectionReason.trim())
    setShowRejectionModal(false)
    setRejectionReason('')
    showToast('success', 'Document rejected. User has been notified.')
  }

  const handleRequestInfo = () => {
    if (!selectedDocument) return
    const message = window.prompt('Provide an information request message', selectedDocument.notes || '')
    if (message === null) return
    if (!message.trim()) {
      showToast('error', 'Please provide a message for information request.')
      return
    }
    applyReviewStatus('Info Requested', message.trim())
    showToast('success', 'Information request sent to user.')
  }

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50))

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Approved': return 'bg-success-bg text-success'
      case 'Pending': return 'bg-warning-bg text-warning'
      case 'Rejected': return 'bg-error-bg text-error'
      case 'Info Requested': return 'bg-info-bg text-primary'
      default: return 'bg-border text-text-secondary'
    }
  }

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'High': return 'text-error'
      case 'Low': return 'text-text-muted'
      default: return 'text-text-secondary'
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-text-primary">Document Review Center</h2>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-card p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-muted" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Info Requested">Info Requested</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            >
              <option value="All">All Categories</option>
              <option value="Expense">Expense</option>
              <option value="Sales">Sales</option>
              <option value="Bank Statement">Bank Statement</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            >
              <option value="date">Sort by Date</option>
              <option value="business">Sort by Business</option>
              <option value="name">Sort by Document Name</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="h-10 px-3 border border-border rounded-md text-sm text-text-primary hover:bg-background"
            >
              {sortOrder === 'desc' ? 'Desc' : 'Asc'}
            </button>
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F9FAFB]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Document</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Uploaded By</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Business</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-text-muted">
                  No documents found.
                </td>
              </tr>
            )}
            {filteredDocuments.map((doc) => (
              <tr 
                key={doc.id} 
                className={`border-b border-border-light hover:bg-[#F9FAFB] cursor-pointer ${selectedDocument?.id === doc.id ? 'bg-primary-tint' : ''}`}
                onClick={() => handleSelectDocument(doc)}
              >
                <td className="px-4 py-3.5 text-sm font-medium text-primary">{doc.filename}</td>
                <td className="px-4 py-3.5 text-sm">{doc.category}</td>
                <td className="px-4 py-3.5 text-sm">{doc.user}</td>
                <td className="px-4 py-3.5 text-sm">{doc.businessName}</td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{doc.date}</td>
                <td className="px-4 py-3.5 text-sm font-medium">{doc.priority}</td>
                <td className="px-4 py-3.5 text-sm">
                  <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${getStatusStyle(doc.status)}`}>
                    {doc.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Document Preview Panel */}
      {selectedDocument && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-light">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Document Preview</h3>
                <p className="text-sm text-text-secondary">{selectedDocument.filename}</p>
              </div>
              <button onClick={handleClosePreview} className="p-2 hover:bg-background rounded-md transition-colors">
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left: Document Viewer */}
              <div className="flex-1 bg-[#F9FAFB] p-6 overflow-auto">
                <div className="bg-white rounded-lg shadow-card p-8 min-h-[500px] flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-text-muted mx-auto mb-4" />
                    <p className="text-text-secondary">Preview not available. Please download to view.</p>
                    <button className="mt-4 h-10 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors inline-flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Download Document
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Metadata Panel */}
              <div className="w-80 border-l border-border-light p-4 overflow-y-auto">
                <h4 className="text-sm font-semibold text-text-primary mb-4">Document Metadata</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-text-muted uppercase tracking-wide">Document Name</label>
                    <p className="text-sm text-text-primary mt-1">{selectedDocument.filename}</p>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted uppercase tracking-wide">Category</label>
                    <p className="text-sm text-text-primary mt-1">{selectedDocument.category}</p>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted uppercase tracking-wide">Uploaded By</label>
                    <p className="text-sm text-text-primary mt-1">{selectedDocument.user}</p>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted uppercase tracking-wide">Business Name</label>
                    <p className="text-sm text-text-primary mt-1">{selectedDocument.businessName}</p>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted uppercase tracking-wide">Upload Date</label>
                    <p className="text-sm text-text-primary mt-1">{selectedDocument.date}</p>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted uppercase tracking-wide">Priority</label>
                    <p className={`text-sm font-medium mt-1 ${getPriorityStyle(selectedDocument.priority)}`}>{selectedDocument.priority}</p>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted uppercase tracking-wide">Status</label>
                    <p className="text-sm mt-1">
                      <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${getStatusStyle(selectedDocument.status)}`}>
                        {selectedDocument.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted uppercase tracking-wide">Confidentiality Level</label>
                    <p className="text-sm text-text-primary mt-1">{selectedDocument.confidentiality}</p>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted uppercase tracking-wide">Internal Notes</label>
                    <p className="text-sm text-text-secondary mt-1">{selectedDocument.notes || 'No notes'}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 pt-4 border-t border-border-light space-y-2">
                  <div className="flex items-center gap-2 mb-4">
                    <button onClick={handleZoomOut} className="p-2 hover:bg-background rounded-md transition-colors" title="Zoom Out">
                      <ZoomOut className="w-4 h-4 text-text-secondary" />
                    </button>
                    <span className="text-sm text-text-secondary">{zoom}%</span>
                    <button onClick={handleZoomIn} className="p-2 hover:bg-background rounded-md transition-colors" title="Zoom In">
                      <ZoomIn className="w-4 h-4 text-text-secondary" />
                    </button>
                    <div className="flex-1"></div>
                    <button className="p-2 hover:bg-background rounded-md transition-colors" title="Download">
                      <Download className="w-4 h-4 text-text-secondary" />
                    </button>
                    <button onClick={() => setShowFullscreen(true)} className="p-2 hover:bg-background rounded-md transition-colors" title="Fullscreen">
                      <Maximize2 className="w-4 h-4 text-text-secondary" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleApprove}
                      className="h-9 bg-success text-white rounded-md text-sm font-medium hover:bg-success/90 transition-colors flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => setShowRejectionModal(true)}
                      className="h-9 bg-error text-white rounded-md text-sm font-medium hover:bg-error/90 transition-colors flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={handleRequestInfo}
                      className="h-9 bg-warning text-white rounded-md text-sm font-medium hover:bg-warning/90 transition-colors flex items-center justify-center gap-1"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Request Info
                    </button>
                    <button
                      onClick={handleMarkPending}
                      className="h-9 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors flex items-center justify-center gap-1"
                    >
                      <Clock className="w-4 h-4" />
                      Mark Pending
                    </button>
                  </div>
                </div>

                {/* Admin Comments Section */}
                <div className="mt-6 pt-4 border-t border-border-light">
                  <h4 className="text-sm font-semibold text-text-primary mb-4">Admin Comments</h4>
                  
                  <div className="space-y-3 mb-4">
                    {(comments[selectedDocument.id] || []).map(comment => (
                      <div key={comment.id} className="bg-background rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-text-muted" />
                            <span className="text-sm font-medium text-text-primary">{comment.adminName}</span>
                            <span className="text-xs text-text-muted">({comment.adminRole})</span>
                          </div>
                          {comment.adminId === mockAdmin.id && (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleEditComment(comment.id)}
                                className="p-1 hover:bg-border rounded transition-colors"
                              >
                                <Edit2 className="w-3 h-3 text-text-muted" />
                              </button>
                              <button 
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1 hover:bg-border rounded transition-colors"
                              >
                                <Trash2 className="w-3 h-3 text-text-muted" />
                              </button>
                            </div>
                          )}
                        </div>
                        {editingComment === comment.id ? (
                          <div>
                            <textarea
                              value={editedCommentText}
                              onChange={(e) => setEditedCommentText(e.target.value)}
                              className="w-full h-20 p-2 border border-border rounded-md text-sm focus:outline-none focus:border-primary resize-none"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button 
                                onClick={() => setEditingComment(null)}
                                className="h-7 px-3 border border-border rounded text-xs font-medium text-text-secondary hover:bg-background"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={handleSaveEdit}
                                className="h-7 px-3 bg-primary text-white rounded text-xs font-medium hover:bg-primary-light"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-text-secondary">{comment.text}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-3 h-3 text-text-muted" />
                          <span className="text-xs text-text-muted">{comment.timestamp}</span>
                          {comment.isEdited && <span className="text-xs text-text-muted">(edited)</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full h-20 p-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary resize-none"
                    />
                    <button 
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="mt-2 h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Post Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-border-light">
              <h3 className="text-lg font-semibold text-text-primary">Reject Document</h3>
              <p className="text-sm text-text-secondary mt-1">Please provide a reason for rejection.</p>
            </div>
            <div className="p-4">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full h-32 p-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>
            <div className="p-4 border-t border-border-light flex justify-end gap-3">
              <button 
                onClick={() => { setShowRejectionModal(false); setRejectionReason('') }}
                className="h-10 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background"
              >
                Cancel
              </button>
              <button 
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                className="h-10 px-4 bg-error text-white rounded-md text-sm font-medium hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Preview */}
      {showFullscreen && (
        <div className="fixed inset-0 z-[120] bg-black flex items-center justify-center">
          <button 
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-md text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="text-white text-center">
            <FileText className="w-24 h-24 mx-auto mb-4 opacity-50" />
            <p>Fullscreen preview mode</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Communications Center (Message Center)
function AdminCommunicationsCenter({ showToast }) {
  const [activeTab, setActiveTab] = useState('sent')
  const [notifications, setNotifications] = useState(mockSentNotifications)
  const [drafts, setDrafts] = useState([
    { id: 'DRF-001', title: 'Quarterly Report Reminder', message: 'Please submit your Q1 reports by April 15th.', audience: 'All Businesses', status: 'Draft' },
  ])

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-text-primary">Communications Center</h2>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-card mb-6">
        <div className="flex border-b border-border-light">
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 h-12 px-4 text-sm font-medium transition-colors ${activeTab === 'sent' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Sent Notifications
          </button>
          <button
            onClick={() => setActiveTab('drafts')}
            className={`flex-1 h-12 px-4 text-sm font-medium transition-colors ${activeTab === 'drafts' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Drafts
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`flex-1 h-12 px-4 text-sm font-medium transition-colors ${activeTab === 'scheduled' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Scheduled
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'sent' && (
            <div className="space-y-4">
              {notifications.map(notification => (
                <div key={notification.id} className="border border-border-light rounded-lg p-4 hover:shadow-card transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-text-primary">{notification.title}</h4>
                      <p className="text-sm text-text-secondary mt-1">{notification.message}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-text-muted" />
                          <span className="text-xs text-text-muted">{notification.audience}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-text-muted" />
                          <span className="text-xs text-text-muted">{notification.dateSent}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4 text-text-muted" />
                          <span className="text-xs text-text-muted">Open Rate: {notification.openRate}</span>
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center h-6 px-2.5 rounded text-xs font-medium bg-success-bg text-success">
                      {notification.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'drafts' && (
            <div className="space-y-4">
              {drafts.map(draft => (
                <div key={draft.id} className="border border-border-light rounded-lg p-4 hover:shadow-card transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-text-primary">{draft.title}</h4>
                      <p className="text-sm text-text-secondary mt-1">{draft.message}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-text-muted" />
                          <span className="text-xs text-text-muted">{draft.audience}</span>
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center h-6 px-2.5 rounded text-xs font-medium bg-warning-bg text-warning">
                      {draft.status}
                    </span>
                  </div>
                </div>
              ))}
              {drafts.length === 0 && (
                <div className="text-center py-8 text-text-muted">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No drafts</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'scheduled' && (
            <div className="text-center py-8 text-text-muted">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No scheduled notifications</p>
              <p className="text-xs mt-1">This feature is future-ready</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Send Notification Page
function AdminSendNotificationPage({ showToast }) {
  const [mode, setMode] = useState('bulk') // 'bulk' or 'targeted'
  const [bulkAudience, setBulkAudience] = useState('all-users')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [priority, setPriority] = useState('normal')
  const [showPreview, setShowPreview] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  
  // Targeted notification filters
  const [searchUser, setSearchUser] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [filters, setFilters] = useState({
    business: '',
    country: '',
    role: '',
    verificationStatus: '',
    registrationStage: '',
  })

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = searchUser === '' || 
      user.fullName.toLowerCase().includes(searchUser.toLowerCase()) ||
      user.email.toLowerCase().includes(searchUser.toLowerCase()) ||
      user.businessName.toLowerCase().includes(searchUser.toLowerCase())
    
    const matchesBusiness = !filters.business || user.businessName === filters.business
    const matchesCountry = !filters.country || user.country === filters.country
    const matchesRole = !filters.role || user.role === filters.role
    const matchesVerification = !filters.verificationStatus || user.verificationStatus === filters.verificationStatus
    const matchesRegistration = !filters.registrationStage || user.registrationStage === filters.registrationStage

    return matchesSearch && matchesBusiness && matchesCountry && matchesRole && matchesVerification && matchesRegistration
  })

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSend = () => {
    setShowConfirm(true)
  }

  const confirmSend = () => {
    // In a real app, this would send notifications
    showToast('success', mode === 'bulk' 
      ? `Notification sent successfully to ${getAudienceCount()} users.` 
      : `Notification sent successfully to ${selectedUsers.length} users.`)
    setShowConfirm(false)
    setTitle('')
    setMessage('')
    setLink('')
    setSelectedUsers([])
  }

  const getAudienceCount = () => {
    switch (bulkAudience) {
      case 'all-users': return '324'
      case 'all-businesses': return '42'
      case 'all-accountants': return '18'
      case 'pending-verification': return '8'
      default: return '0'
    }
  }

  const getPriorityStyle = (p) => {
    switch (p) {
      case 'important': return 'border-warning text-warning'
      case 'critical': return 'border-error text-error'
      default: return 'border-border text-text-secondary'
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-text-primary">Send Notification</h2>
      </div>

      {/* Mode Selection */}
      <div className="bg-white rounded-lg shadow-card p-4 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setMode('bulk')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${mode === 'bulk' ? 'border-primary bg-primary-tint' : 'border-border-light hover:border-border'}`}
          >
            <div className="flex items-center gap-3">
              <UsersRound className={`w-6 h-6 ${mode === 'bulk' ? 'text-primary' : 'text-text-muted'}`} />
              <div className="text-left">
                <p className="text-sm font-semibold text-text-primary">Bulk Notification</p>
                <p className="text-xs text-text-secondary">Send to all users or user groups</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setMode('targeted')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${mode === 'targeted' ? 'border-primary bg-primary-tint' : 'border-border-light hover:border-border'}`}
          >
            <div className="flex items-center gap-3">
              <User className={`w-6 h-6 ${mode === 'targeted' ? 'text-primary' : 'text-text-muted'}`} />
              <div className="text-left">
                <p className="text-sm font-semibold text-text-primary">Custom Targeted Notification</p>
                <p className="text-xs text-text-secondary">Select specific users or filter</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Bulk Notification Form */}
      {mode === 'bulk' && (
        <div className="bg-white rounded-lg shadow-card p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Select Audience</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'all-users', label: 'All Users', icon: Users, count: 324 },
                  { id: 'all-businesses', label: 'All Businesses', icon: Building, count: 42 },
                  { id: 'all-accountants', label: 'All Accountants', icon: UsersRound, count: 18 },
                  { id: 'pending-verification', label: 'Pending Verification Users', icon: AlertTriangle, count: 8 },
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setBulkAudience(option.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${bulkAudience === option.id ? 'border-primary bg-primary-tint' : 'border-border-light hover:border-border'}`}
                  >
                    <div className="flex items-center gap-3">
                      <option.icon className={`w-5 h-5 ${bulkAudience === option.id ? 'text-primary' : 'text-text-muted'}`} />
                      <div>
                        <p className="text-sm font-medium text-text-primary">{option.label}</p>
                        <p className="text-xs text-text-muted">{option.count} users</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Message Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter notification title..."
                className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Message Body</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message..."
                rows={4}
                className="w-full p-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Optional Link</label>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://example.com/policy"
                className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-border-light">
              <button
                onClick={() => setShowPreview(true)}
                disabled={!title || !message}
                className="h-10 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Preview
              </button>
              <button
                onClick={handleSend}
                disabled={!title || !message}
                className="h-10 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Notification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Targeted Notification Form */}
      {mode === 'targeted' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-text-muted" />
              <h3 className="text-sm font-semibold text-text-primary">Filter Users</h3>
            </div>
            <div className="grid grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Business</label>
                <select
                  value={filters.business}
                  onChange={(e) => setFilters(prev => ({ ...prev, business: e.target.value }))}
                  className="w-full h-9 px-2 border border-border rounded text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">All</option>
                  {[...new Set(mockUsers.map(u => u.businessName))].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Country</label>
                <select
                  value={filters.country}
                  onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full h-9 px-2 border border-border rounded text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">All</option>
                  {[...new Set(mockUsers.map(u => u.country))].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Role</label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full h-9 px-2 border border-border rounded text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">All</option>
                  {[...new Set(mockUsers.map(u => u.role))].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Verification</label>
                <select
                  value={filters.verificationStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, verificationStatus: e.target.value }))}
                  className="w-full h-9 px-2 border border-border rounded text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">All</option>
                  <option value="Verified">Verified</option>
                  <option value="Pending">Pending</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Registration Stage</label>
                <select
                  value={filters.registrationStage}
                  onChange={(e) => setFilters(prev => ({ ...prev, registrationStage: e.target.value }))}
                  className="w-full h-9 px-2 border border-border rounded text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">All</option>
                  <option value="Completed">Completed</option>
                  <option value="Onboarding">Onboarding</option>
                </select>
              </div>
            </div>
          </div>

          {/* User Selection */}
          <div className="bg-white rounded-lg shadow-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">Select Users</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">{selectedUsers.length} selected</span>
                <button
                  onClick={() => setSelectedUsers(filteredUsers.map(u => u.id))}
                  className="text-xs text-primary hover:underline"
                >
                  Select All
                </button>
                <button
                  onClick={() => setSelectedUsers([])}
                  className="text-xs text-text-muted hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="mb-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Search by name, email, or business..."
                  className="w-full h-10 pl-10 pr-4 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto border border-border-light rounded-lg">
              <table className="w-full">
                <thead className="bg-[#F9FAFB] sticky top-0">
                  <tr>
                    <th className="w-10 px-3 py-2 text-left"></th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">Business</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary">Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-t border-border-light hover:bg-background cursor-pointer" onClick={() => toggleUserSelection(user.id)}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="w-4 h-4 accent-primary"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">{user.fullName}</td>
                      <td className="px-3 py-2 text-sm text-text-secondary">{user.email}</td>
                      <td className="px-3 py-2 text-sm">{user.businessName}</td>
                      <td className="px-3 py-2 text-sm">
                        <span className={`inline-flex items-center h-5 px-2 rounded text-xs font-medium ${
                          user.verificationStatus === 'Verified' ? 'bg-success-bg text-success' :
                          user.verificationStatus === 'Pending' ? 'bg-warning-bg text-warning' :
                          'bg-error-bg text-error'
                        }`}>
                          {user.verificationStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Message Composition */}
          <div className="bg-white rounded-lg shadow-card p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Message Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter notification title..."
                  className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Message Body</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your message..."
                  rows={4}
                  className="w-full p-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Priority Level</label>
                <div className="flex gap-3">
                  {[
                    { id: 'normal', label: 'Normal' },
                    { id: 'important', label: 'Important' },
                    { id: 'critical', label: 'Critical' },
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPriority(p.id)}
                      className={`flex-1 h-10 px-4 rounded-md text-sm font-medium border-2 transition-all ${priority === p.id ? getPriorityStyle(p.id) : 'border-border text-text-secondary hover:border-border-light'}`}
                    >
                      {p.id === 'critical' && <Flag className="w-4 h-4 inline mr-1" />}
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border-light">
                <button
                  onClick={() => setShowPreview(true)}
                  disabled={!title || !message || selectedUsers.length === 0}
                  className="h-10 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Preview
                </button>
                <button
                  onClick={handleSend}
                  disabled={!title || !message || selectedUsers.length === 0}
                  className="h-10 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send to {selectedUsers.length} Users
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-border-light">
              <h3 className="text-lg font-semibold text-text-primary">Notification Preview</h3>
            </div>
            <div className="p-4">
              <div className={`rounded-lg border-2 p-4 ${getPriorityStyle(priority)}`}>
                {priority === 'critical' && (
                  <div className="flex items-center gap-1 text-error mb-2">
                    <Flag className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase">Critical</span>
                  </div>
                )}
                {priority === 'important' && (
                  <div className="flex items-center gap-1 text-warning mb-2">
                    <Flag className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase">Important</span>
                  </div>
                )}
                <h4 className="text-base font-semibold text-text-primary">{title}</h4>
                <p className="text-sm text-text-secondary mt-2">{message}</p>
                {link && (
                  <a href={link} className="text-sm text-primary mt-2 inline-block hover:underline">
                    {link}
                  </a>
                )}
              </div>
              <p className="text-xs text-text-muted mt-3">
                This notification will be sent to {mode === 'bulk' ? getAudienceCount() : selectedUsers.length} recipient(s).
              </p>
            </div>
            <div className="p-4 border-t border-border-light flex justify-end">
              <button 
                onClick={() => setShowPreview(false)}
                className="h-10 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-border-light">
              <h3 className="text-lg font-semibold text-text-primary">Confirm Notification</h3>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-primary">
                    Are you sure you want to send this notification to {mode === 'bulk' ? `${getAudienceCount()} users` : `${selectedUsers.length} users`}?
                  </p>
                  <p className="text-xs text-text-muted mt-2">This action cannot be undone.</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border-light flex justify-end gap-3">
              <button 
                onClick={() => setShowConfirm(false)}
                className="h-10 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background"
              >
                Cancel
              </button>
              <button 
                onClick={confirmSend}
                className="h-10 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Activity Log Page
function AdminActivityLogPage() {
  const [logs, setLogs] = useState(() => {
    const storedLogs = getActivityLogsFromStorage()
    return storedLogs.length > 0 ? [...storedLogs, ...mockActivityLog] : mockActivityLog
  })

  useEffect(() => {
    const syncLogs = () => {
      const storedLogs = getActivityLogsFromStorage()
      setLogs(storedLogs.length > 0 ? [...storedLogs, ...mockActivityLog] : mockActivityLog)
    }
    syncLogs()
    window.addEventListener('storage', syncLogs)
    const intervalId = window.setInterval(syncLogs, 4000)
    return () => {
      window.removeEventListener('storage', syncLogs)
      window.clearInterval(intervalId)
    }
  }, [])

  const getActionStyle = (action) => {
    if (action.includes('Approved')) return 'bg-success-bg text-success'
    if (action.includes('Rejected')) return 'bg-error-bg text-error'
    if (action.includes('Commented')) return 'bg-info-bg text-primary'
    if (action.includes('Sent bulk')) return 'bg-warning-bg text-warning'
    if (action.includes('Sent targeted')) return 'bg-primary-tint text-primary'
    return 'bg-background text-text-secondary'
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-text-primary">System Activity Log</h2>
        <p className="text-sm text-text-muted">Audit trail for all admin actions</p>
      </div>

      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F9FAFB]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Admin</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Affected User(s)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border-light hover:bg-[#F9FAFB]">
                <td className="px-4 py-3.5 text-sm text-text-secondary">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-text-muted" />
                    {log.timestamp}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm font-medium">{log.adminName}</td>
                <td className="px-4 py-3.5 text-sm">
                  <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${getActionStyle(log.action)}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-sm">{log.affectedUser}</td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export {
  canAccessAdminPage,
  AdminSidebar,
  AdminTopBar,
  AdminDashboardPage,
  AdminClientsPage,
  AdminClientProfilePage,
  AdminClientDocumentsPage,
  AdminClientUploadHistoryPage,
  AdminDocumentReviewCenter,
  AdminCommunicationsCenter,
  AdminSendNotificationPage,
  AdminActivityLogPage,
}
