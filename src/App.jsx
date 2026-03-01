import { useState, useEffect, useMemo, useRef } from 'react'
import { CheckCircle, AlertCircle, X, ShieldAlert, ArrowLeftRight } from 'lucide-react'
import {
  Sidebar as ClientSidebar,
  TopBar as ClientTopBar,
  DashboardPage as ClientDashboardPage,
  HomePage,
  UploadHistoryPage as ClientUploadHistoryPage,
  RecentActivitiesPage as ClientRecentActivitiesPage,
  SupportPage as ClientSupportPage,
  ClientSupportWidget,
} from './components/client/dashboard/ClientDashboardViews'
import {
  DocumentFoldersPage as ClientDocumentFoldersPage,
  FolderFilesPage as ClientFolderFilesPage,
} from './components/client/dashboard/ClientDocumentsWorkspace'
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
  getAdminLevelLabel,
  canImpersonateForAdminLevel,
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
import { buildFileCacheKey, putCachedFileBlob } from './utils/fileCache'
import DotLottiePreloader from './components/common/DotLottiePreloader'
import { getNetworkAwareDurationMs, isPageReloadNavigation } from './utils/networkRuntime'

const CLIENT_PAGE_IDS = ['dashboard', 'expenses', 'sales', 'bank-statements', 'upload-history', 'recent-activities', 'support', 'settings']
const APP_PAGE_IDS = [...CLIENT_PAGE_IDS, ...ADMIN_PAGE_IDS]
const ADMIN_INVITES_STORAGE_KEY = 'kiaminaAdminInvites'
const ADMIN_ACTIVITY_STORAGE_KEY = 'kiaminaAdminActivityLog'
const ADMIN_SETTINGS_STORAGE_KEY = 'kiaminaAdminSettings'
const IMPERSONATION_SESSION_STORAGE_KEY = 'kiaminaImpersonationSession'
const ADMIN_IMPERSONATION_SESSION_STORAGE_KEY = 'kiaminaAdminImpersonationSession'
const OTP_PREVIEW_STORAGE_KEY = 'kiaminaOtpPreview'
const CLIENT_DOCUMENTS_STORAGE_KEY = 'kiaminaClientDocuments'
const CLIENT_ACTIVITY_STORAGE_KEY = 'kiaminaClientActivityLog'
const CLIENT_STATUS_CONTROL_STORAGE_KEY = 'kiaminaClientStatusControl'
const CLIENT_SESSION_CONTROL_STORAGE_KEY = 'kiaminaClientSessionControl'
const CLIENT_BRIEF_NOTIFICATIONS_STORAGE_KEY = 'kiaminaClientBriefNotifications'
const CLIENT_SETTINGS_REDIRECT_SECTION_KEY = 'kiaminaClientSettingsRedirectSection'
const CLIENT_ASSIGNMENTS_STORAGE_KEY = 'kiaminaClientAssignments'
const IMPERSONATION_IDLE_TIMEOUT_MS = 10 * 60 * 1000
const DEFAULT_DEV_ADMIN_ACCOUNT = {
  fullName: 'Super Admin',
  email: 'admin@kiamina.local',
  password: 'Admin@123!',
  role: 'admin',
  adminLevel: ADMIN_LEVELS.SUPER,
  adminPermissions: FULL_ADMIN_PERMISSION_IDS,
  status: 'active',
}
const ADMIN_GOV_ID_TYPES_NIGERIA = ['International Passport', 'NIN', "Voter's Card", "Driver's Licence"]
const ADMIN_GOV_ID_TYPE_INTERNATIONAL = 'Government Issued ID'

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

const normalizeAdminVerificationCountry = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized || normalized === 'nigeria') return 'Nigeria'
  return 'International'
}

const getAdminGovIdTypeOptions = (country = 'Nigeria') => (
  country === 'Nigeria'
    ? ADMIN_GOV_ID_TYPES_NIGERIA
    : [ADMIN_GOV_ID_TYPE_INTERNATIONAL]
)

const normalizeAdminGovernmentIdType = (value = '', country = 'Nigeria') => {
  const normalizedValue = String(value || '').trim().toLowerCase()
  if (!normalizedValue) return ''
  const options = getAdminGovIdTypeOptions(country)
  return options.find((option) => option.toLowerCase() === normalizedValue) || ''
}

const normalizeAccount = (account = {}) => {
  const createdAtIso = [
    account.createdAt,
    account.createdAtIso,
    account.dateCreated,
    account.registeredAt,
  ].find((value) => Number.isFinite(Date.parse(value || '')))
    || new Date().toISOString()
  const normalizedRole = normalizeRole(account.role, account.email || '')
  if (normalizedRole !== 'admin') {
    return {
      ...account,
      role: normalizedRole,
      createdAt: account.createdAt || createdAtIso,
    }
  }
  return normalizeAdminAccount({
    ...account,
    role: 'admin',
    createdAt: account.createdAt || createdAtIso,
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

const buildKeywordSuggestions = (values = [], limit = 20) => {
  const seen = new Set()
  const keywords = []
  ;(Array.isArray(values) ? values : []).forEach((value) => {
    String(value || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
      .forEach((token) => {
        if (seen.has(token)) return
        seen.add(token)
        keywords.push(token)
      })
  })
  return keywords.slice(0, Math.max(1, limit))
}

const getCategoryLabelFromPageId = (pageId = '') => {
  if (pageId === 'sales') return 'Sales'
  if (pageId === 'bank-statements') return 'Bank Statements'
  return 'Expenses'
}

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
    adminEmail: String(entry.adminEmail || '').trim().toLowerCase(),
    adminLevel: entry.adminLevel || ADMIN_LEVELS.SUPER,
    impersonatedBy: String(entry.impersonatedBy || '').trim().toLowerCase(),
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

const formatClientDocumentTimestamp = (value) => {
  const parsed = Date.parse(value || '')
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

const readClientSessionControl = () => {
  if (typeof localStorage === 'undefined') {
    return {
      globalLogoutAtIso: '',
      byEmail: {},
    }
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(CLIENT_SESSION_CONTROL_STORAGE_KEY) || '{}')
    const byEmail = parsed?.byEmail && typeof parsed.byEmail === 'object' ? parsed.byEmail : {}
    return {
      globalLogoutAtIso: parsed?.globalLogoutAtIso || '',
      byEmail,
    }
  } catch {
    return {
      globalLogoutAtIso: '',
      byEmail: {},
    }
  }
}

const readClientBriefNotifications = (email = '') => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail || typeof localStorage === 'undefined') return []
  const scopedKey = getScopedStorageKey(CLIENT_BRIEF_NOTIFICATIONS_STORAGE_KEY, normalizedEmail)
  try {
    const parsed = JSON.parse(localStorage.getItem(scopedKey) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const toIsoDate = (value) => {
  const parsed = Date.parse(value || '')
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString()
}

const buildFileSnapshot = (file = {}) => ({
  filename: file.filename || 'Document',
  extension: file.extension || (file.filename?.split('.').pop()?.toUpperCase() || 'FILE'),
  status: file.status || 'Pending Review',
  class: file.class || file.expenseClass || file.salesClass || '',
  classId: file.classId || '',
  className: file.className || file.class || file.expenseClass || file.salesClass || '',
  paymentMethod: file.paymentMethod || '',
  invoice: file.invoice || '',
  invoiceNumber: file.invoiceNumber || '',
  fileCacheKey: file.fileCacheKey || '',
  folderId: file.folderId || '',
  folderName: file.folderName || '',
  previewUrl: file.previewUrl || null,
})

const normalizeDocumentWorkflowStatus = (value, fallback = 'Pending Review') => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return fallback
  if (normalized === 'pending' || normalized === 'pending review') return 'Pending Review'
  if (normalized === 'approved') return 'Approved'
  if (normalized === 'rejected') return 'Rejected'
  if (normalized === 'info requested' || normalized === 'needs clarification') return 'Info Requested'
  if (normalized === 'draft') return 'Pending Review'
  if (normalized === 'deleted') return 'Deleted'
  return fallback
}

const readScopedClientStatusControl = (email = '') => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) return {}
  const scopedKey = getScopedStorageKey(CLIENT_STATUS_CONTROL_STORAGE_KEY, normalizedEmail)
  try {
    const scopedValue = JSON.parse(localStorage.getItem(scopedKey) || 'null')
    if (scopedValue && typeof scopedValue === 'object') return scopedValue
  } catch {
    // ignore malformed scoped status control payload
  }
  try {
    const fallbackValue = JSON.parse(localStorage.getItem(CLIENT_STATUS_CONTROL_STORAGE_KEY) || 'null')
    return fallbackValue && typeof fallbackValue === 'object' ? fallbackValue : {}
  } catch {
    return {}
  }
}

const resolveClientVerificationState = ({
  email = '',
  verificationPending = true,
  accountStatus = '',
  verificationStepsCompleted = 0,
} = {}) => {
  const normalizedAccountStatus = String(accountStatus || '').trim().toLowerCase()
  if (normalizedAccountStatus === 'suspended') return 'suspended'

  const statusControl = readScopedClientStatusControl(email)
  const normalizedCompliance = String(statusControl?.verificationStatus || '').trim().toLowerCase()

  if (
    normalizedCompliance === 'suspended'
    || normalizedCompliance.includes('suspended')
  ) {
    return 'suspended'
  }

  if (Number(verificationStepsCompleted) < 1) {
    return 'unverified'
  }

  if (
    normalizedCompliance.includes('fully compliant')
    || normalizedCompliance === 'verified'
    || normalizedCompliance === 'approved'
    || normalizedCompliance === 'compliant'
  ) {
    return 'verified'
  }

  if (
    normalizedCompliance.includes('action required')
    || normalizedCompliance === 'rejected'
    || normalizedCompliance.includes('clarification')
    || normalizedCompliance.includes('info requested')
  ) {
    return 'rejected'
  }

  if (
    normalizedCompliance.includes('verification pending')
    || normalizedCompliance === 'pending'
    || normalizedCompliance.includes('awaiting')
  ) {
    return 'pending'
  }

  return verificationPending ? 'pending' : 'verified'
}

const createVersionEntry = ({
  versionNumber = 1,
  action = 'Uploaded',
  performedBy = 'Client User',
  timestamp,
  notes = '',
  fileSnapshot = {},
}) => ({
  versionNumber,
  action,
  performedBy,
  timestamp,
  notes,
  fileSnapshot: buildFileSnapshot(fileSnapshot),
})

const createFileActivityEntry = ({
  actionType = 'upload',
  description = 'File activity',
  performedBy = 'Client User',
  timestamp,
}) => ({
  id: `FACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  actionType,
  description,
  performedBy,
  timestamp,
})

const ensureFolderStructuredRecords = (rows = [], categoryKey = 'expenses') => {
  const safeRows = Array.isArray(rows) ? rows.filter((row) => row && typeof row === 'object') : []
  const categoryPrefix = categoryKey === 'sales'
    ? 'SAL'
    : categoryKey === 'bankStatements'
      ? 'BNK'
      : 'EXP'
  const categoryLabel = categoryKey === 'sales'
    ? 'Sales'
    : categoryKey === 'bankStatements'
      ? 'Bank Statements'
      : 'Expenses'

  const createFileId = (folderId, index) => {
    const serialPart = String(index + 1).padStart(3, '0')
    const token = folderId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-8)
    return `${categoryPrefix}-${token}-${serialPart}`
  }

  const normalizeFile = (sourceFile = {}, folderId, index, folderName = 'Folder') => {
    const file = sourceFile && typeof sourceFile === 'object' ? sourceFile : {}
    const classValue = file.class || file.className || file.expenseClass || file.salesClass || ''
    const classId = file.classId || (classValue ? buildClassId(classValue) : '')
    const timestamp = file.date || formatClientDocumentTimestamp()
    const timestampIso = file.updatedAtIso || file.createdAtIso || toIsoDate(file.date)
    const fileId = file.fileId || createFileId(folderId, index)
    const normalizePreviewUrl = (value = '') => {
      const normalized = String(value || '').trim()
      if (!normalized) return ''
      return normalized.toLowerCase().startsWith('blob:') ? '' : normalized
    }
    const normalizedPreviewUrl = normalizePreviewUrl(file.previewUrl || '')
    const actorName = file.user || 'Client User'
    const normalizedIsDeleted = Boolean(file.isDeleted || file.status === 'Deleted')
    const normalizedStatus = normalizedIsDeleted
      ? 'Deleted'
      : normalizeDocumentWorkflowStatus(file.status || 'Pending Review')
    const normalizedIsLocked = normalizedStatus === 'Approved' || Boolean(file.isLocked)
    const rawVersions = Array.isArray(file.versions) ? file.versions : []
    const normalizedVersions = rawVersions.length > 0
      ? rawVersions.map((entry, entryIndex) => ({
        versionNumber: entry.versionNumber || entry.version || entryIndex + 1,
        action: entry.action || 'Updated',
        performedBy: entry.performedBy || actorName,
        timestamp: entry.timestamp || toIsoDate(entry.date || timestamp),
        notes: entry.notes || '',
        fileSnapshot: buildFileSnapshot(entry.fileSnapshot || {
          ...file,
          filename: entry.filename || file.filename,
          extension: file.extension,
          previewUrl: normalizePreviewUrl(entry.previewUrl || file.previewUrl || ''),
          folderId,
          folderName,
        }),
      }))
      : [createVersionEntry({
        versionNumber: 1,
        action: 'Uploaded',
        performedBy: actorName,
        timestamp: timestampIso,
        notes: 'Initial upload.',
        fileSnapshot: {
          ...file,
          folderId,
          folderName,
          status: normalizedStatus,
          class: classValue,
          classId,
          className: classValue,
        },
      })]
    const rawActivityLog = Array.isArray(file.activityLog) ? file.activityLog : []
    const normalizedActivityLog = rawActivityLog.length > 0
      ? rawActivityLog.map((entry) => ({
        id: entry.id || `FACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        actionType: entry.actionType || 'info',
        description: entry.description || entry.action || 'File activity',
        performedBy: entry.performedBy || actorName,
        timestamp: entry.timestamp || timestampIso,
      }))
      : [createFileActivityEntry({
        actionType: 'upload',
        description: 'File uploaded.',
        performedBy: actorName,
        timestamp: timestampIso,
      })]
    const rawUploadInfo = file.uploadInfo || {}
    const normalizedUploadInfo = {
      originalUploadedAtIso: rawUploadInfo.originalUploadedAtIso || file.createdAtIso || timestampIso,
      originalUploadSource: rawUploadInfo.originalUploadSource || file.uploadSource || 'browse-file',
      originalUploadedBy: rawUploadInfo.originalUploadedBy || actorName,
      device: rawUploadInfo.device || 'Web Browser',
      ipAddress: rawUploadInfo.ipAddress || '--',
      lastModifiedAtIso: rawUploadInfo.lastModifiedAtIso || file.updatedAtIso || timestampIso,
      replacements: Array.isArray(rawUploadInfo.replacements) ? rawUploadInfo.replacements : [],
      totalVersions: rawUploadInfo.totalVersions || normalizedVersions.length,
    }
    return {
      ...file,
      id: file.id || `${folderId}-FILE-${String(index + 1).padStart(3, '0')}`,
      folderId,
      fileId,
      filename: file.filename || `Document ${index + 1}`,
      extension: file.extension || (file.filename?.split('.').pop()?.toUpperCase() || 'FILE'),
      previewUrl: normalizedPreviewUrl,
      status: normalizedStatus,
      isLocked: normalizedIsLocked,
      lockedAtIso: file.lockedAtIso || (normalizedIsLocked ? timestampIso : null),
      approvedBy: file.approvedBy || '',
      approvedAtIso: file.approvedAtIso || null,
      rejectedBy: file.rejectedBy || '',
      rejectedAtIso: file.rejectedAtIso || null,
      rejectionReason: file.rejectionReason || '',
      unlockedBy: file.unlockedBy || '',
      unlockedAtIso: file.unlockedAtIso || null,
      unlockReason: file.unlockReason || '',
      user: file.user || 'Client User',
      date: timestamp,
      createdAtIso: file.createdAtIso || timestampIso,
      updatedAtIso: file.updatedAtIso || timestampIso,
      deletedAtIso: file.deletedAtIso || null,
      isDeleted: normalizedIsDeleted,
      class: classValue,
      classId,
      className: classValue,
      expenseClass: file.expenseClass || classValue,
      salesClass: file.salesClass || classValue,
      vendorName: file.vendorName || '',
      confidentialityLevel: file.confidentialityLevel || 'Standard',
      processingPriority: file.processingPriority || 'Normal',
      internalNotes: file.internalNotes || '',
      ...(categoryKey === 'expenses' ? { paymentMethod: file.paymentMethod || '' } : {}),
      ...(categoryKey === 'sales' ? {
        invoice: file.invoice || '',
        invoiceNumber: file.invoiceNumber || '',
      } : {}),
      folderName,
      versions: normalizedVersions,
      activityLog: normalizedActivityLog,
      uploadInfo: normalizedUploadInfo,
    }
  }

  const normalizeFolder = (sourceFolder = {}, folderIndex = 0) => {
    const folder = sourceFolder && typeof sourceFolder === 'object' ? sourceFolder : {}
    const folderId = folder.id || `F-${Date.now().toString(36).toUpperCase()}-${String(folderIndex + 1).padStart(2, '0')}`
    const folderName = folder.folderName || `${categoryLabel} Folder ${folderIndex + 1}`
    const createdAtIso = folder.createdAtIso || toIsoDate(folder.createdAtDisplay || folder.date)
    const sourceFiles = Array.isArray(folder.files) ? folder.files : []
    return {
      id: folderId,
      isFolder: true,
      folderName,
      category: folder.category || categoryLabel,
      user: folder.user || 'Client User',
      createdAtIso,
      createdAtDisplay: folder.createdAtDisplay || formatClientDocumentTimestamp(createdAtIso),
      date: folder.date || formatClientDocumentTimestamp(createdAtIso),
      files: sourceFiles.map((file, fileIndex) => normalizeFile(file, folderId, fileIndex, folderName)),
    }
  }

  const folderRows = safeRows.filter((row) => row?.isFolder).map((folder, index) => normalizeFolder(folder, index))
  const legacyRows = safeRows.filter((row) => !row?.isFolder)

  if (legacyRows.length === 0) return folderRows

  const migrationFolderId = `F-MIG-${categoryPrefix}-${Date.now().toString(36).toUpperCase()}`
  const migrationCreatedAt = new Date().toISOString()
  const migrationFolderName = `Migrated ${categoryLabel} Files`
  const migrationFolder = {
    id: migrationFolderId,
    isFolder: true,
    folderName: migrationFolderName,
    category: categoryLabel,
    user: legacyRows[0]?.user || 'Client User',
    createdAtIso: migrationCreatedAt,
    createdAtDisplay: formatClientDocumentTimestamp(migrationCreatedAt),
    date: formatClientDocumentTimestamp(migrationCreatedAt),
    files: legacyRows.map((row, index) => normalizeFile(row, migrationFolderId, index, migrationFolderName)),
  }

  return [migrationFolder, ...folderRows]
}

const flattenFolderFilesForDashboard = (records = [], categoryId = 'expenses') => {
  const categoryLabel = categoryId === 'sales'
    ? 'Sales'
    : categoryId === 'bank-statements'
      ? 'Bank Statement'
      : 'Expense'

  const safeRecords = Array.isArray(records) ? records : []
  return safeRecords.flatMap((record) => {
    if (record?.isFolder) {
      if (record.archived) return []
      return (record.files || [])
        .filter((file) => !file?.isDeleted)
        .map((file) => ({
        ...file,
        categoryId,
        category: categoryLabel,
      }))
    }
    if (record?.isDeleted) return []
    return [{
      ...record,
      categoryId,
      category: record?.category || categoryLabel,
    }]
  })
}

const updateFirstPendingFileStatus = (records = [], nextStatus = 'Approved') => {
  let updated = false
  const nextRecords = records.map((record) => {
    if (updated || !record?.isFolder) return record
    const files = Array.isArray(record.files) ? record.files : []
    const pendingIndex = files.findIndex((file) => (
      !file?.isDeleted
      && normalizeDocumentWorkflowStatus(file.status || 'Pending Review') === 'Pending Review'
    ))
    if (pendingIndex === -1) return record
    const nextFiles = [...files]
    nextFiles[pendingIndex] = { ...nextFiles[pendingIndex], status: nextStatus }
    updated = true
    return {
      ...record,
      files: nextFiles,
    }
  })
  return { updated, records: nextRecords }
}

const resolveCategoryIdFromHistoryLabel = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized.includes('sales')) return 'sales'
  if (normalized.includes('bank')) return 'bank-statements'
  return 'expenses'
}

const normalizeClassOptions = (values = []) => {
  const byKey = new Map()
  ;(Array.isArray(values) ? values : []).forEach((value) => {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim()
    if (!normalized) return
    const key = normalized.toLowerCase()
    if (byKey.has(key)) return
    byKey.set(key, normalized)
  })
  return Array.from(byKey.values())
}

const buildClassId = (name = '') => {
  const normalized = String(name || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const token = normalized.slice(0, 16)
  return token ? `CLS-${token}` : `CLS-${Date.now().toString(36).toUpperCase()}`
}

const createDefaultClientDocuments = (ownerName = '') => {
  const normalizedOwner = ownerName?.trim() || 'Client User'
  return {
    expenses: expenseDocumentSeed.map((item) => ({ ...item, user: normalizedOwner })),
    sales: salesDocumentSeed.map((item) => ({ ...item, user: normalizedOwner })),
    bankStatements: bankStatementDocumentSeed.map((item) => ({ ...item, user: normalizedOwner })),
    uploadHistory: [],
    expenseClassOptions: [],
    salesClassOptions: [],
  }
}

const normalizeUploadHistoryRows = (rows = [], ownerEmail = '') => (
  (Array.isArray(rows) ? rows : [])
    .filter((row) => row && typeof row === 'object' && !row.isFolder)
    .map((row) => ({
      ...row,
      isFolder: false,
      ownerEmail: String(row?.ownerEmail || ownerEmail || '').trim().toLowerCase(),
      categoryId: row?.categoryId || resolveCategoryIdFromHistoryLabel(row?.category || ''),
      status: normalizeDocumentWorkflowStatus(row?.status || 'Pending Review'),
    }))
)

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
      uploadHistory: normalizeUploadHistoryRows(
        Array.isArray(parsed.uploadHistory) ? cloneDocumentRows(parsed.uploadHistory) : fallback.uploadHistory,
        email,
      ),
      expenseClassOptions: normalizeClassOptions(parsed.expenseClassOptions || fallback.expenseClassOptions),
      salesClassOptions: normalizeClassOptions(parsed.salesClassOptions || fallback.salesClassOptions),
    }
  } catch {
    return fallback
  }
}

const persistClientDocuments = (email, documents) => {
  if (!email || !documents) return
  const sanitizePreviewUrl = (value = '') => {
    const normalized = String(value || '').trim()
    if (!normalized) return ''
    return /^blob:/i.test(normalized) ? '' : normalized
  }
  const sanitizeFile = (file = {}) => {
    const safeVersions = Array.isArray(file.versions)
      ? file.versions.map((version = {}, index) => {
        const safeSnapshot = version.fileSnapshot && typeof version.fileSnapshot === 'object'
          ? {
            ...version.fileSnapshot,
            previewUrl: sanitizePreviewUrl(version.fileSnapshot.previewUrl || ''),
          }
          : version.fileSnapshot
        return {
          ...version,
          versionNumber: version.versionNumber || version.version || index + 1,
          previewUrl: sanitizePreviewUrl(version.previewUrl || ''),
          fileSnapshot: safeSnapshot,
        }
      })
      : file.versions
    const nextFile = {
      ...file,
      previewUrl: sanitizePreviewUrl(file.previewUrl || ''),
      versions: safeVersions,
    }
    if ('rawFile' in nextFile) {
      delete nextFile.rawFile
    }
    return nextFile
  }
  const sanitizeCategoryRows = (rows = []) => (
    (Array.isArray(rows) ? rows : []).map((row) => {
      if (!row?.isFolder) return sanitizeFile(row)
      return {
        ...row,
        files: (Array.isArray(row.files) ? row.files : []).map((file) => sanitizeFile(file)),
      }
    })
  )
  const scopedKey = getScopedStorageKey(CLIENT_DOCUMENTS_STORAGE_KEY, email)
  const payload = {
    ...documents,
    expenses: sanitizeCategoryRows(documents.expenses),
    sales: sanitizeCategoryRows(documents.sales),
    bankStatements: sanitizeCategoryRows(documents.bankStatements),
    uploadHistory: normalizeUploadHistoryRows(documents.uploadHistory, email),
    expenseClassOptions: normalizeClassOptions(documents.expenseClassOptions),
    salesClassOptions: normalizeClassOptions(documents.salesClassOptions),
  }
  try {
    localStorage.setItem(scopedKey, JSON.stringify(payload))
  } catch {
    // Ignore storage quota failures so the UI remains usable for uploaded-file actions.
  }
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

const readClientActivityLogEntries = (email) => {
  const normalizedEmail = email?.trim()?.toLowerCase()
  if (!normalizedEmail) return []
  const key = getScopedStorageKey(CLIENT_ACTIVITY_STORAGE_KEY, normalizedEmail)
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const normalizeVerificationDocs = (payload = {}) => ({
  govId: String(payload?.govId || '').trim(),
  govIdType: String(payload?.govIdType || '').trim(),
  govIdNumber: String(payload?.govIdNumber || payload?.governmentIdNumber || '').trim(),
  govIdVerifiedAt: String(payload?.govIdVerifiedAt || '').trim(),
  govIdVerificationStatus: String(payload?.govIdVerificationStatus || '').trim(),
  govIdClarityStatus: String(payload?.govIdClarityStatus || '').trim(),
  businessReg: String(payload?.businessReg || '').trim(),
})

const normalizeSettingsProfile = (payload = {}) => ({
  fullName: String(payload?.fullName || '').trim(),
  email: String(payload?.email || '').trim().toLowerCase(),
  phone: String(payload?.phone || '').trim(),
  address: String(payload?.address1 || payload?.address || '').trim(),
  businessType: String(payload?.businessType || '').trim(),
})

const readScopedSettingsProfile = (email = '') => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const scopedKey = getScopedStorageKey('settingsFormData', normalizedEmail)
  const keysToCheck = scopedKey === 'settingsFormData'
    ? ['settingsFormData']
    : [scopedKey, 'settingsFormData']
  for (const key of keysToCheck) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null')
      if (!parsed || typeof parsed !== 'object') continue
      return normalizeSettingsProfile(parsed)
    } catch {
      // continue fallback keys
    }
  }
  return normalizeSettingsProfile({})
}

const readScopedVerificationDocs = (email = '') => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const scopedKey = getScopedStorageKey('verificationDocs', normalizedEmail)
  const keysToCheck = scopedKey === 'verificationDocs'
    ? ['verificationDocs']
    : [scopedKey, 'verificationDocs']
  for (const key of keysToCheck) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null')
      if (!parsed || typeof parsed !== 'object') continue
      return normalizeVerificationDocs(parsed)
    } catch {
      // continue fallback keys
    }
  }
  return normalizeVerificationDocs({})
}

const persistScopedVerificationDocs = (email = '', docs = {}) => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) return
  const key = getScopedStorageKey('verificationDocs', normalizedEmail)
  const normalizedDocs = normalizeVerificationDocs(docs)
  localStorage.setItem(key, JSON.stringify(normalizedDocs))
}

const removeScopedClientArtifacts = (email = '') => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) return

  const scopedBaseKeys = [
    'settingsFormData',
    'kiaminaOnboardingState',
    'notificationSettings',
    'verificationDocs',
    'profilePhoto',
    'companyLogo',
    CLIENT_DOCUMENTS_STORAGE_KEY,
    CLIENT_ACTIVITY_STORAGE_KEY,
    CLIENT_STATUS_CONTROL_STORAGE_KEY,
    CLIENT_BRIEF_NOTIFICATIONS_STORAGE_KEY,
    'kiaminaClientTeamMembers',
    'kiaminaClientTeamInvites',
  ]
  scopedBaseKeys.forEach((baseKey) => {
    localStorage.removeItem(getScopedStorageKey(baseKey, normalizedEmail))
  })

  try {
    const keysToRemove = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key) continue
      if (key.toLowerCase().endsWith(`:${normalizedEmail}`)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch {
    // no-op
  }

  try {
    const control = JSON.parse(localStorage.getItem(CLIENT_SESSION_CONTROL_STORAGE_KEY) || 'null')
    if (control && typeof control === 'object' && control.byEmail && typeof control.byEmail === 'object') {
      const nextByEmail = { ...control.byEmail }
      if (nextByEmail[normalizedEmail]) {
        delete nextByEmail[normalizedEmail]
        localStorage.setItem(CLIENT_SESSION_CONTROL_STORAGE_KEY, JSON.stringify({
          ...control,
          byEmail: nextByEmail,
        }))
      }
    }
  } catch {
    // no-op
  }

  try {
    const assignments = JSON.parse(localStorage.getItem(CLIENT_ASSIGNMENTS_STORAGE_KEY) || '[]')
    if (Array.isArray(assignments)) {
      const filteredAssignments = assignments.filter((entry) => (
        String(entry?.clientEmail || '').trim().toLowerCase() !== normalizedEmail
      ))
      localStorage.setItem(CLIENT_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(filteredAssignments))
    }
  } catch {
    // no-op
  }
}

const resolveVerificationProgress = ({
  onboardingData = {},
  settingsDocs = {},
  settingsProfile = {},
} = {}) => {
  const normalizedOnboardingDocs = normalizeVerificationDocs(onboardingData || {})
  const normalizedSettingsDocs = normalizeVerificationDocs(settingsDocs || {})
  const normalizedSettingsProfile = normalizeSettingsProfile(settingsProfile || {})
  const mergedDocs = {
    govId: normalizedSettingsDocs.govId || normalizedOnboardingDocs.govId,
    govIdType: normalizedSettingsDocs.govIdType || normalizedOnboardingDocs.govIdType,
    govIdNumber: normalizedSettingsDocs.govIdNumber || normalizedOnboardingDocs.govIdNumber,
    govIdVerifiedAt: normalizedSettingsDocs.govIdVerifiedAt || normalizedOnboardingDocs.govIdVerifiedAt,
    govIdVerificationStatus: normalizedSettingsDocs.govIdVerificationStatus || normalizedOnboardingDocs.govIdVerificationStatus,
    govIdClarityStatus: normalizedSettingsDocs.govIdClarityStatus || normalizedOnboardingDocs.govIdClarityStatus,
    businessReg: normalizedSettingsDocs.businessReg || normalizedOnboardingDocs.businessReg,
  }
  const profileStepCompleted = Boolean(
    normalizedSettingsProfile.fullName
    && normalizedSettingsProfile.email
    && normalizedSettingsProfile.phone
    && normalizedSettingsProfile.address,
  )
  const normalizedBusinessType = String(
    normalizedSettingsProfile.businessType || onboardingData?.businessType || '',
  ).trim().toLowerCase()
  const isIndividualBusinessType = normalizedBusinessType === 'individual'
  const identityStepCompleted = Boolean(mergedDocs.govId && mergedDocs.govIdType && mergedDocs.govIdNumber && mergedDocs.govIdVerifiedAt)
  const businessStepCompleted = isIndividualBusinessType || Boolean(mergedDocs.businessReg)
  return {
    profile: normalizedSettingsProfile,
    docs: mergedDocs,
    hasAnyDocs: Boolean(
      mergedDocs.govId
      || mergedDocs.businessReg
      || profileStepCompleted,
    ),
    profileStepCompleted,
    identityStepCompleted,
    businessStepCompleted,
    stepsCompleted: Number(profileStepCompleted) + Number(identityStepCompleted) + Number(businessStepCompleted),
  }
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
    govIdType: '',
    govIdNumber: '',
    govIdVerifiedAt: '',
    govIdVerificationStatus: '',
    govIdClarityStatus: '',
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
  const detectAuthStorageType = () => {
    if (localStorage.getItem('kiaminaAuthUser')) return 'local'
    if (sessionStorage.getItem('kiaminaAuthUser')) return 'session'
    return 'session'
  }
  const getStoredAdminImpersonationSession = () => {
    const candidates = [
      sessionStorage.getItem(ADMIN_IMPERSONATION_SESSION_STORAGE_KEY),
      localStorage.getItem(ADMIN_IMPERSONATION_SESSION_STORAGE_KEY),
    ]
    for (const raw of candidates) {
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw)
        const originalAdminEmail = String(parsed?.originalAdminEmail || '').trim().toLowerCase()
        const impersonatedAdminEmail = String(parsed?.impersonatedAdminEmail || '').trim().toLowerCase()
        if (!originalAdminEmail || !impersonatedAdminEmail) continue
        return {
          originalAdminEmail,
          originalAdminName: parsed?.originalAdminName || 'Super Admin',
          originalAdminLevel: parsed?.originalAdminLevel || ADMIN_LEVELS.SUPER,
          impersonatedAdminEmail,
          impersonatedAdminName: parsed?.impersonatedAdminName || 'Admin User',
          impersonatedAdminLevel: parsed?.impersonatedAdminLevel || ADMIN_LEVELS.AREA_ACCOUNTANT,
          startedAt: Number(parsed?.startedAt || Date.now()),
        }
      } catch {
        // continue
      }
    }
    return null
  }
  const persistAdminImpersonationSession = (session, storageType = 'session') => {
    sessionStorage.removeItem(ADMIN_IMPERSONATION_SESSION_STORAGE_KEY)
    localStorage.removeItem(ADMIN_IMPERSONATION_SESSION_STORAGE_KEY)
    if (!session) return
    const nextRaw = JSON.stringify(session)
    if (storageType === 'local') {
      localStorage.setItem(ADMIN_IMPERSONATION_SESSION_STORAGE_KEY, nextRaw)
      return
    }
    sessionStorage.setItem(ADMIN_IMPERSONATION_SESSION_STORAGE_KEY, nextRaw)
  }

  const initialAuthUser = getStoredAuthUser()
  const initialImpersonationSession = getStoredImpersonationSession()
  const initialAdminImpersonationSession = getStoredAdminImpersonationSession()
  const initialScopedClientEmail = initialImpersonationSession?.clientEmail || initialAuthUser?.email
  const initialDocumentOwner = initialImpersonationSession?.clientName
    || initialAuthUser?.fullName
    || 'Client User'
  const initialClientDocuments = readClientDocuments(initialScopedClientEmail, initialDocumentOwner)
  const initialClientActivityRecords = readClientActivityLogEntries(initialScopedClientEmail)
  const [authMode, setAuthMode] = useState('login')
  const [authUser, setAuthUser] = useState(initialAuthUser)
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialAuthUser))
  const [showAuth, setShowAuth] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [adminSetupToken, setAdminSetupToken] = useState('')
  const [impersonationSession, setImpersonationSession] = useState(initialImpersonationSession)
  const [adminImpersonationSession, setAdminImpersonationSession] = useState(initialAdminImpersonationSession)
  const [pendingImpersonationClient, setPendingImpersonationClient] = useState(null)
  const [onboardingState, setOnboardingState] = useState(() => getSavedOnboardingState(initialScopedClientEmail))
  const [settingsProfileSnapshot, setSettingsProfileSnapshot] = useState(() => {
    const onboardingProgress = resolveVerificationProgress({
      onboardingData: getSavedOnboardingState(initialScopedClientEmail).data,
      settingsDocs: readScopedVerificationDocs(initialScopedClientEmail),
      settingsProfile: readScopedSettingsProfile(initialScopedClientEmail),
    })
    return onboardingProgress.profile
  })
  const [verificationDocsSnapshot, setVerificationDocsSnapshot] = useState(() => {
    const onboardingProgress = resolveVerificationProgress({
      onboardingData: getSavedOnboardingState(initialScopedClientEmail).data,
      settingsDocs: readScopedVerificationDocs(initialScopedClientEmail),
      settingsProfile: readScopedSettingsProfile(initialScopedClientEmail),
    })
    return onboardingProgress.docs
  })
  const [otpStore, setOtpStore] = useState(getOtpStore)
  const [otpChallenge, setOtpChallenge] = useState(null)
  const [passwordResetEmail, setPasswordResetEmail] = useState('')
  const [activePage, setActivePage] = useState(() => getDefaultPageForRole(initialAuthUser?.role))
  const [activeFolderRoute, setActiveFolderRoute] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [modalInitialCategory, setModalInitialCategory] = useState('expenses')
  const [expenseDocuments, setExpenseDocuments] = useState(() => ensureFolderStructuredRecords(initialClientDocuments.expenses, 'expenses'))
  const [salesDocuments, setSalesDocuments] = useState(() => ensureFolderStructuredRecords(initialClientDocuments.sales, 'sales'))
  const [bankStatementDocuments, setBankStatementDocuments] = useState(() => ensureFolderStructuredRecords(initialClientDocuments.bankStatements, 'bankStatements'))
  const [expenseClassOptions, setExpenseClassOptions] = useState(() => normalizeClassOptions(initialClientDocuments.expenseClassOptions))
  const [salesClassOptions, setSalesClassOptions] = useState(() => normalizeClassOptions(initialClientDocuments.salesClassOptions))
  const [uploadHistoryRecords, setUploadHistoryRecords] = useState(initialClientDocuments.uploadHistory)
  const [clientActivityRecords, setClientActivityRecords] = useState(initialClientActivityRecords)
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
  
  const [userNotifications, setUserNotifications] = useState([])
  const [dashboardSearchTerm, setDashboardSearchTerm] = useState('')
  const [dashboardSearchResults, setDashboardSearchResults] = useState([])
  const [dashboardSearchState, setDashboardSearchState] = useState('idle')
  const [isDashboardBootstrapLoading, setIsDashboardBootstrapLoading] = useState(
    () => Boolean(initialAuthUser && isPageReloadNavigation()),
  )
  const [isSlowRuntimeOverlayVisible, setIsSlowRuntimeOverlayVisible] = useState(false)
  const [slowRuntimeOverlayMessage, setSlowRuntimeOverlayMessage] = useState('Please wait...')
  const dashboardSearchRequestRef = useRef(0)
  const dashboardSearchTimeoutRef = useRef(null)
  const dashboardBootstrapTimerRef = useRef(null)
  const deliveredBriefNotificationIdsRef = useRef(new Set())
  const verificationLockToastAtRef = useRef(0)
  const slowRuntimeRevealTimerRef = useRef(null)
  const slowRuntimeHideTimerRef = useRef(null)
  const slowRuntimeOperationCountRef = useRef(0)
  const slowRuntimeMinVisibleUntilRef = useRef(0)
  const slowRuntimeMessageRef = useRef('Please wait...')
  const slowRuntimeVisibleRef = useRef(false)
  
  const currentUserRole = normalizeRole(authUser?.role, authUser?.email || '')
  const isAdminView = currentUserRole === 'admin'
  const isAdminImpersonationActive = Boolean(
    adminImpersonationSession
    && String(authUser?.email || '').trim().toLowerCase() === String(adminImpersonationSession.impersonatedAdminEmail || '').trim().toLowerCase(),
  )
  useEffect(() => {
    if (!adminImpersonationSession) return
    const currentEmail = String(authUser?.email || '').trim().toLowerCase()
    const impersonatedEmail = String(adminImpersonationSession.impersonatedAdminEmail || '').trim().toLowerCase()
    if (!currentEmail || currentEmail !== impersonatedEmail) {
      setAdminImpersonationSession(null)
      persistAdminImpersonationSession(null)
    }
  }, [adminImpersonationSession, authUser?.email])
  const dashboardRecords = useMemo(() => ([
    ...flattenFolderFilesForDashboard(expenseDocuments, 'expenses'),
    ...flattenFolderFilesForDashboard(salesDocuments, 'sales'),
    ...flattenFolderFilesForDashboard(bankStatementDocuments, 'bank-statements'),
  ]), [expenseDocuments, salesDocuments, bankStatementDocuments])
  const dashboardSearchEntries = useMemo(() => {
    const entries = []
    const seen = new Set()
    const pushEntry = ({
      id,
      label,
      description = '',
      keywords = [],
      pageId = 'dashboard',
      categoryId = '',
      folderId = '',
    }) => {
      const normalizedLabel = String(label || '').trim()
      if (!normalizedLabel) return
      const normalizedDescription = String(description || '').trim()
      const normalizedCategoryId = String(categoryId || '').trim()
      const normalizedFolderId = String(folderId || '').trim()
      const dedupeKey = String(id || `${pageId}:${normalizedCategoryId}:${normalizedFolderId}:${normalizedLabel}`).toLowerCase()
      if (seen.has(dedupeKey)) return
      seen.add(dedupeKey)
      const searchValues = [
        normalizedLabel,
        normalizedDescription,
        ...(Array.isArray(keywords) ? keywords : []),
      ]
      entries.push({
        id: dedupeKey,
        label: normalizedLabel,
        description: normalizedDescription,
        pageId: APP_PAGE_IDS.includes(pageId) ? pageId : 'dashboard',
        categoryId: normalizedCategoryId,
        folderId: normalizedFolderId,
        searchText: searchValues
          .map((value) => String(value || '').trim().toLowerCase())
          .filter(Boolean)
          .join(' '),
      })
    }

    const appendFolderEntries = (rows = [], categoryId = 'expenses') => {
      const categoryLabel = getCategoryLabelFromPageId(categoryId)
      ;(Array.isArray(rows) ? rows : [])
        .filter((row) => row?.isFolder)
        .forEach((folder) => {
          pushEntry({
            id: `folder-${categoryId}-${folder.id || folder.folderName || ''}`,
            label: folder.folderName || folder.id || `${categoryLabel} Folder`,
            description: `${categoryLabel} folder`,
            keywords: [folder.id, folder.user, categoryLabel, 'folder'],
            pageId: categoryId,
            categoryId,
            folderId: folder.id || '',
          })
        })
    }

    appendFolderEntries(expenseDocuments, 'expenses')
    appendFolderEntries(salesDocuments, 'sales')
    appendFolderEntries(bankStatementDocuments, 'bank-statements')

    dashboardRecords.forEach((record, index) => {
      const categoryId = record.categoryId || resolveCategoryIdFromHistoryLabel(record.category || '')
      const categoryLabel = getCategoryLabelFromPageId(categoryId)
      pushEntry({
        id: `file-${categoryId}-${record.fileId || record.id || index}`,
        label: record.filename || record.fileId || `Document ${index + 1}`,
        description: `${categoryLabel}${record.folderName ? ` / ${record.folderName}` : ''}`,
        keywords: [
          record.fileId,
          record.folderName,
          record.folderId,
          record.category,
          record.class,
          record.status,
          record.extension || record.type,
          record.user,
          categoryLabel,
          'file',
        ],
        pageId: categoryId,
        categoryId,
        folderId: record.folderId || '',
      })
    })

    ;(Array.isArray(uploadHistoryRecords) ? uploadHistoryRecords : []).forEach((item, index) => {
      if (!item || item.isFolder) return
      const categoryId = item.categoryId || resolveCategoryIdFromHistoryLabel(item.category || '')
      const categoryLabel = getCategoryLabelFromPageId(categoryId)
      const shouldOpenFolder = Boolean(categoryId && item.folderId)
      pushEntry({
        id: `upload-${item.id || `${categoryId}-${index}`}`,
        label: item.filename || item.fileId || `Upload ${index + 1}`,
        description: shouldOpenFolder ? `Upload History / ${categoryLabel}` : 'Upload History',
        keywords: [
          item.fileId,
          item.category,
          item.type,
          item.status,
          item.user,
          categoryLabel,
          'upload',
          'history',
        ],
        pageId: shouldOpenFolder ? categoryId : 'upload-history',
        categoryId: shouldOpenFolder ? categoryId : '',
        folderId: shouldOpenFolder ? item.folderId : '',
      })
    })

    ;(Array.isArray(clientActivityRecords) ? clientActivityRecords : []).forEach((item, index) => {
      pushEntry({
        id: `activity-${item.id || index}`,
        label: item.action || item.details || `Activity ${index + 1}`,
        description: 'Recent Activities',
        keywords: [
          item.details,
          item.actorName,
          item.actorRole,
          item.timestamp,
          'activity',
          'recent',
        ],
        pageId: 'recent-activities',
      })
    })

    return entries
  }, [
    dashboardRecords,
    expenseDocuments,
    salesDocuments,
    bankStatementDocuments,
    uploadHistoryRecords,
    clientActivityRecords,
  ])
  const dashboardSearchSuggestions = useMemo(() => {
    return buildKeywordSuggestions([
      ...dashboardSearchEntries.flatMap((entry) => [entry.label, entry.description, entry.searchText]),
      'Expenses',
      'Sales',
      'Bank Statements',
      'Upload History',
      'Recent Activities',
      'Folders',
      'Files',
      'Approved',
      'Rejected',
      'Pending',
    ], 26)
  }, [dashboardSearchEntries])
  const previousDashboardFilesRef = useRef(null)

  const isImpersonatingClient = Boolean(
    isAuthenticated
      && isAdminView
      && impersonationSession?.clientEmail
      && impersonationSession?.adminEmail?.toLowerCase() === (authUser?.email || '').toLowerCase(),
  )
  const scopedClientEmail = isImpersonatingClient
    ? impersonationSession.clientEmail
    : authUser?.email
  const normalizedScopedClientEmail = (scopedClientEmail || '').trim().toLowerCase()
  const verificationProgress = useMemo(() => (
    resolveVerificationProgress({
      onboardingData: onboardingState.data,
      settingsDocs: verificationDocsSnapshot,
      settingsProfile: settingsProfileSnapshot,
    })
  ), [onboardingState.data, settingsProfileSnapshot, verificationDocsSnapshot])
  const verificationStepsCompleted = verificationProgress.stepsCompleted
  const onboardingHasBeenDismissed = Boolean(onboardingState.completed || onboardingState.skipped)
  const scopedClientAccountStatus = normalizedScopedClientEmail
    ? (
      getSavedAccounts().find((account) => (
        account.email?.trim()?.toLowerCase() === normalizedScopedClientEmail
      ))?.status || ''
    )
    : ''
  const dashboardVerificationState = resolveClientVerificationState({
    email: normalizedScopedClientEmail,
    verificationPending: Boolean(onboardingState.verificationPending),
    accountStatus: isImpersonatingClient
      ? scopedClientAccountStatus
      : (authUser?.status || scopedClientAccountStatus),
    verificationStepsCompleted,
  })
  const scopedClientStatusControl = readScopedClientStatusControl(normalizedScopedClientEmail)
  const normalizeBooleanFlag = (value) => {
    if (value === true) return true
    const normalized = String(value || '').trim().toLowerCase()
    return normalized === 'true' || normalized === 'yes' || normalized === '1'
  }
  const hasIsoTimestamp = (value) => Number.isFinite(Date.parse(value || ''))
  const identityVerificationApprovedByAdmin = Boolean(
    normalizeBooleanFlag(scopedClientStatusControl?.identityVerificationApproved)
    || hasIsoTimestamp(scopedClientStatusControl?.identityVerificationApprovedAt)
    || (
      String(dashboardVerificationState || '').toLowerCase() === 'verified'
      && verificationProgress.identityStepCompleted
    ),
  )
  const businessVerificationApprovedByAdmin = Boolean(
    normalizeBooleanFlag(scopedClientStatusControl?.businessVerificationApproved)
    || hasIsoTimestamp(scopedClientStatusControl?.businessVerificationApprovedAt)
    || String(dashboardVerificationState || '').toLowerCase() === 'verified',
  )
  const isIndividualBusinessType = String(
    verificationProgress.profile.businessType || onboardingState.data?.businessType || '',
  ).trim().toLowerCase() === 'individual'
  const isIdentityVerificationComplete = Boolean(
    verificationProgress.identityStepCompleted && identityVerificationApprovedByAdmin,
  )
  const isBusinessVerificationComplete = Boolean(
    verificationProgress.businessStepCompleted
    && (isIndividualBusinessType || businessVerificationApprovedByAdmin),
  )
  const isClientVerificationLocked = Boolean(
    isAuthenticated
    && !isAdminView
    && !isImpersonatingClient
    && onboardingHasBeenDismissed
    && verificationStepsCompleted < 1,
  )

  const getNotificationPageFromRecord = (record = {}) => {
    if (record.categoryId) return record.categoryId
    const normalizedCategory = (record.category || '').toLowerCase()
    if (normalizedCategory.includes('sales')) return 'sales'
    if (normalizedCategory.includes('bank')) return 'bank-statements'
    return 'expenses'
  }

  useEffect(() => {
    if (!isAuthenticated || isAdminView) {
      previousDashboardFilesRef.current = null
      return
    }

    const buildRecordKey = (record = {}) => record.fileId || record.id || `${record.folderId || ''}-${record.filename || ''}`
    const currentMap = new Map(dashboardRecords.map((record) => [buildRecordKey(record), record]))
    const previousMap = previousDashboardFilesRef.current
    if (!previousMap) {
      previousDashboardFilesRef.current = currentMap
      return
    }

    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    const nextNotifications = []

    currentMap.forEach((record, key) => {
      const previous = previousMap.get(key)
      if (!previous) return

      const linkPage = getNotificationPageFromRecord(record)
      const fileName = record.filename || 'document'
      const currentStatus = normalizeDocumentWorkflowStatus(record.status || 'Pending Review')
      const previousStatus = normalizeDocumentWorkflowStatus(previous.status || 'Pending Review')

      if (currentStatus !== previousStatus) {
        const statusType = currentStatus === 'Approved'
          ? 'approved'
          : currentStatus === 'Rejected'
            ? 'rejected'
            : currentStatus === 'Info Requested' || currentStatus === 'Needs Clarification'
              ? 'info'
              : 'comment'
        const priority = currentStatus === 'Rejected'
          ? 'critical'
          : currentStatus === 'Info Requested' || currentStatus === 'Needs Clarification'
            ? 'important'
            : 'info'
        const statusMessage = currentStatus === 'Approved'
          ? `Admin approved ${fileName}.`
          : currentStatus === 'Rejected'
            ? `Admin rejected ${fileName}.`
            : currentStatus === 'Info Requested' || currentStatus === 'Needs Clarification'
              ? `Admin requested more information for ${fileName}.`
              : `Status updated for ${fileName}: ${currentStatus}.`
        nextNotifications.push({
          id: `N-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: statusType,
          message: statusMessage,
          timestamp,
          read: false,
          priority,
          linkPage,
          fileId: record.fileId || record.id,
        })
      }

      const currentComment = (record.adminComment || '').trim()
      const previousComment = (previous.adminComment || '').trim()
      if (currentComment && currentComment !== previousComment) {
        nextNotifications.push({
          id: `N-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'comment',
          message: `Admin comment on ${fileName}: ${currentComment}`,
          timestamp,
          read: false,
          priority: 'important',
          linkPage,
          fileId: record.fileId || record.id,
        })
      }

      const currentRequestDetails = (
        record.requiredAction
        || record.infoRequestDetails
        || record.adminNotes
        || ''
      ).trim()
      const previousRequestDetails = (
        previous.requiredAction
        || previous.infoRequestDetails
        || previous.adminNotes
        || ''
      ).trim()
      if (currentRequestDetails && currentRequestDetails !== previousRequestDetails) {
        nextNotifications.push({
          id: `N-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'info',
          message: `Admin request details for ${fileName}: ${currentRequestDetails}`,
          timestamp,
          read: false,
          priority: 'important',
          linkPage,
          fileId: record.fileId || record.id,
        })
      }
    })

    if (nextNotifications.length > 0) {
      setUserNotifications((prev) => [...nextNotifications, ...prev].slice(0, 80))
    }

    previousDashboardFilesRef.current = currentMap
  }, [dashboardRecords, isAuthenticated, isAdminView])

  const getResolvedCurrentAdminAccount = () => {
    if (!isAuthenticated || !isAdminView || !authUser?.email) return null
    const accounts = getSavedAccounts()
    const match = accounts.find((account) => account.email.toLowerCase() === authUser.email.toLowerCase())
    if (match) return normalizeAdminAccount(match)
    return normalizeAdminAccount({
      fullName: authUser.fullName,
      email: authUser.email,
      role: 'admin',
      adminLevel: ADMIN_LEVELS.SUPER,
      adminPermissions: FULL_ADMIN_PERMISSION_IDS,
      status: 'active',
    })
  }
  const currentAdminAccount = getResolvedCurrentAdminAccount()
  const adminSystemSettings = getAdminSystemSettings()
  const impersonationEnabled = adminSystemSettings.impersonationEnabled !== false
  const canImpersonateClients = Boolean(
    currentAdminAccount && (
      canImpersonateForAdminLevel(currentAdminAccount.adminLevel)
      || hasAdminPermission(currentAdminAccount, 'impersonate_clients')
    ),
  )
  const getCurrentAdminLogContext = () => ({
    adminName: authUser?.fullName || currentAdminAccount?.fullName || 'Admin User',
    adminEmail: String(authUser?.email || currentAdminAccount?.email || '').trim().toLowerCase(),
    adminLevel: currentAdminAccount?.adminLevel || ADMIN_LEVELS.SUPER,
    impersonatedBy: isAdminImpersonationActive
      ? String(adminImpersonationSession?.originalAdminEmail || '').trim().toLowerCase()
      : '',
  })
  const logAdminActivity = (entry = {}) => {
    appendAdminActivityLog({
      ...getCurrentAdminLogContext(),
      ...entry,
    })
  }

  const touchImpersonationActivity = () => {
    if (isImpersonatingClient) {
      setImpersonationSession((prev) => {
        if (!prev) return prev
        const next = { ...prev, lastActivityAt: Date.now() }
        persistImpersonationSession(next)
        return next
      })
    }
  }

  const showVerificationGateToast = (message = 'Verify your account to continue. Redirecting to profile settings.') => {
    const now = Date.now()
    if (now - verificationLockToastAtRef.current < 1400) return
    verificationLockToastAtRef.current = now
    showToast('error', message)
  }

  const routeClientToVerificationSettings = ({
    replace = false,
    section = 'user-profile',
    toastMessage = 'Verify your account to continue. Redirecting to profile settings.',
  } = {}) => {
    try {
      sessionStorage.setItem(CLIENT_SETTINGS_REDIRECT_SECTION_KEY, section || 'user-profile')
    } catch {
      // no-op
    }
    setActivePage('settings')
    setActiveFolderRoute(null)
    setIsMobileSidebarOpen(false)
    try {
      if (replace) history.replaceState({}, '', '/settings')
      else history.pushState({}, '', '/settings')
    } catch {
      // ignore
    }
    showVerificationGateToast(toastMessage)
  }

  const shouldBlockClientNavigationByVerification = (targetPage = '') => (
    isClientVerificationLocked && String(targetPage || '').trim() !== 'settings'
  )

  // Navigation helpers: keep `activePage` and URL in sync without adding a router
  const handleSetActivePage = (page, { replace = false } = {}) => {
    if (shouldBlockClientNavigationByVerification(page)) {
      routeClientToVerificationSettings({ replace })
      return
    }
    touchImpersonationActivity()
    setActivePage(page)
    setActiveFolderRoute(null)
    setIsMobileSidebarOpen(false)
    const path = page === 'dashboard' ? '/dashboard' : `/${page}`
    try {
      if (replace) history.replaceState({}, '', path)
      else history.pushState({}, '', path)
    } catch {
      // ignore
    }
  }

  const handleOpenFolderRoute = (category, folderId, { replace = false } = {}) => {
    if (!category || !folderId) return
    if (shouldBlockClientNavigationByVerification(category)) {
      routeClientToVerificationSettings({ replace })
      return
    }
    touchImpersonationActivity()
    setActivePage(category)
    setActiveFolderRoute({ category, folderId })
    setIsMobileSidebarOpen(false)
    const encodedId = encodeURIComponent(folderId)
    const path = `/${category}/folder/${encodedId}`
    try {
      if (replace) history.replaceState({}, '', path)
      else history.pushState({}, '', path)
    } catch {
      // ignore
    }
  }

  const beginSlowRuntimeWatch = (message = 'Please wait...') => {
    const resolvedMessage = String(message || '').trim() || 'Please wait...'
    slowRuntimeMessageRef.current = resolvedMessage
    setSlowRuntimeOverlayMessage(resolvedMessage)

    slowRuntimeOperationCountRef.current += 1
    if (slowRuntimeHideTimerRef.current) {
      window.clearTimeout(slowRuntimeHideTimerRef.current)
      slowRuntimeHideTimerRef.current = null
    }

    if (!slowRuntimeVisibleRef.current && !slowRuntimeRevealTimerRef.current) {
      const revealDelayMs = getNetworkAwareDurationMs('slow-threshold')
      slowRuntimeRevealTimerRef.current = window.setTimeout(() => {
        slowRuntimeRevealTimerRef.current = null
        if (slowRuntimeOperationCountRef.current <= 0) return
        slowRuntimeMinVisibleUntilRef.current = Date.now() + getNetworkAwareDurationMs('runtime-min-visible')
        setSlowRuntimeOverlayMessage(slowRuntimeMessageRef.current)
        setIsSlowRuntimeOverlayVisible(true)
      }, revealDelayMs)
    }

    return () => {
      slowRuntimeOperationCountRef.current = Math.max(0, slowRuntimeOperationCountRef.current - 1)
      if (slowRuntimeOperationCountRef.current > 0) return

      if (slowRuntimeRevealTimerRef.current) {
        window.clearTimeout(slowRuntimeRevealTimerRef.current)
        slowRuntimeRevealTimerRef.current = null
      }

      const hideOverlay = () => {
        slowRuntimeMinVisibleUntilRef.current = 0
        setIsSlowRuntimeOverlayVisible(false)
      }

      if (!slowRuntimeVisibleRef.current) {
        hideOverlay()
        return
      }

      const remainingVisibleMs = slowRuntimeMinVisibleUntilRef.current - Date.now()
      if (remainingVisibleMs <= 0) {
        hideOverlay()
        return
      }

      slowRuntimeHideTimerRef.current = window.setTimeout(() => {
        slowRuntimeHideTimerRef.current = null
        hideOverlay()
      }, remainingVisibleMs)
    }
  }

  const runWithSlowRuntimeWatch = async (work, message = 'Please wait...') => {
    const stopWatching = beginSlowRuntimeWatch(message)
    try {
      return await work()
    } finally {
      stopWatching()
    }
  }

  const dismissDashboardSearchFeedback = () => {
    if (dashboardSearchTimeoutRef.current) {
      window.clearTimeout(dashboardSearchTimeoutRef.current)
      dashboardSearchTimeoutRef.current = null
    }
    setDashboardSearchState('idle')
    setDashboardSearchResults([])
  }

  const handleDashboardSearchTermChange = (value = '') => {
    setDashboardSearchTerm(String(value || ''))
    dismissDashboardSearchFeedback()
  }

  const handleDashboardSearchSubmit = (value = dashboardSearchTerm) => {
    const nextTerm = String(value || '')
    const normalizedQuery = nextTerm.trim().toLowerCase()
    setDashboardSearchTerm(nextTerm)

    if (!normalizedQuery) {
      dismissDashboardSearchFeedback()
      return
    }

    if (dashboardSearchTimeoutRef.current) {
      window.clearTimeout(dashboardSearchTimeoutRef.current)
      dashboardSearchTimeoutRef.current = null
    }

    const requestId = dashboardSearchRequestRef.current + 1
    dashboardSearchRequestRef.current = requestId
    setDashboardSearchState('loading')
    setDashboardSearchResults([])
    const searchDelayMs = getNetworkAwareDurationMs('search')

    dashboardSearchTimeoutRef.current = window.setTimeout(() => {
      if (dashboardSearchRequestRef.current !== requestId) return

      const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean)
      const matches = dashboardSearchEntries
        .map((entry) => {
          const label = entry.label.toLowerCase()
          const matchesAllTokens = queryTokens.every((token) => entry.searchText.includes(token))
          if (!matchesAllTokens) return null

          let score = 0
          if (label === normalizedQuery) score += 260
          if (label.startsWith(normalizedQuery)) score += 160
          if (label.includes(normalizedQuery)) score += 90
          queryTokens.forEach((token) => {
            if (label.startsWith(token)) score += 30
            else if (label.includes(token)) score += 12
          })
          score -= Math.min(36, Math.floor(label.length / 5))
          return {
            ...entry,
            score,
          }
        })
        .filter(Boolean)
        .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
        .slice(0, 8)
        .map(({ score, ...entry }) => entry)

      if (matches.length === 0) {
        setDashboardSearchResults([])
        setDashboardSearchState('empty')
        return
      }

      setDashboardSearchResults(matches)
      setDashboardSearchState('ready')
    }, searchDelayMs)
  }

  const handleDashboardSearchResultSelect = (result) => {
    if (!result || typeof result !== 'object') return

    dismissDashboardSearchFeedback()
    setDashboardSearchTerm(String(result.label || dashboardSearchTerm || '').trim())

    const categoryId = String(result.categoryId || '').trim()
    const folderId = String(result.folderId || '').trim()
    if (categoryId && folderId) {
      handleOpenFolderRoute(categoryId, folderId)
      return
    }

    const targetPage = APP_PAGE_IDS.includes(result.pageId) ? result.pageId : 'dashboard'
    handleSetActivePage(targetPage)
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
    slowRuntimeVisibleRef.current = isSlowRuntimeOverlayVisible
  }, [isSlowRuntimeOverlayVisible])

  useEffect(() => {
    if (dashboardBootstrapTimerRef.current) {
      window.clearTimeout(dashboardBootstrapTimerRef.current)
      dashboardBootstrapTimerRef.current = null
    }

    const shouldShowBootstrapLoader = Boolean(
      isAuthenticated
      && !showAuth
      && !showAdminLogin
      && !adminSetupToken
      && isPageReloadNavigation(),
    )

    if (!shouldShowBootstrapLoader) {
      setIsDashboardBootstrapLoading(false)
      return
    }

    setIsDashboardBootstrapLoading(true)
    dashboardBootstrapTimerRef.current = window.setTimeout(() => {
      dashboardBootstrapTimerRef.current = null
      setIsDashboardBootstrapLoading(false)
    }, getNetworkAwareDurationMs('dashboard-refresh'))
  }, [isAuthenticated, showAuth, showAdminLogin, adminSetupToken])

  useEffect(() => () => {
    if (dashboardSearchTimeoutRef.current) {
      window.clearTimeout(dashboardSearchTimeoutRef.current)
      dashboardSearchTimeoutRef.current = null
    }
    if (dashboardBootstrapTimerRef.current) {
      window.clearTimeout(dashboardBootstrapTimerRef.current)
      dashboardBootstrapTimerRef.current = null
    }
    if (slowRuntimeRevealTimerRef.current) {
      window.clearTimeout(slowRuntimeRevealTimerRef.current)
      slowRuntimeRevealTimerRef.current = null
    }
    if (slowRuntimeHideTimerRef.current) {
      window.clearTimeout(slowRuntimeHideTimerRef.current)
      slowRuntimeHideTimerRef.current = null
    }
    slowRuntimeOperationCountRef.current = 0
    slowRuntimeMinVisibleUntilRef.current = 0
    slowRuntimeVisibleRef.current = false
  }, [])

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
        setActiveFolderRoute(null)
        setActivePage(getDefaultPageForRole(initialAuthUser?.role))
        return
      }
      if (path === '/login' || path === '/signup' || path === '/auth') {
        setShowAuth(true)
        setShowAdminLogin(false)
        setAdminSetupToken('')
        setActiveFolderRoute(null)
        setAuthMode(path === '/signup' ? 'signup' : 'login')
        return
      }
      if (path === '/admin/login') {
        setShowAuth(false)
        setShowAdminLogin(true)
        setAdminSetupToken('')
        setActiveFolderRoute(null)
        setAuthMode('login')
        return
      }
      if (path === '/admin/setup') {
        const inviteToken = new URLSearchParams(window.location.search).get('invite') || ''
        setShowAuth(false)
        setShowAdminLogin(false)
        setAdminSetupToken(inviteToken)
        setActiveFolderRoute(null)
        setAuthMode('login')
        return
      }
      const folderRouteMatch = path.match(/^\/(expenses|sales|bank-statements)\/folder\/([^/]+)$/)
      if (folderRouteMatch) {
        const folderCategory = folderRouteMatch[1]
        const folderId = decodeURIComponent(folderRouteMatch[2] || '')
        setShowAuth(false)
        setShowAdminLogin(false)
        setAdminSetupToken('')
        setActivePage(folderCategory)
        setActiveFolderRoute({ category: folderCategory, folderId })
        return
      }
      const candidate = path.replace(/^\//, '')
      if (candidate === 'chat') {
        setShowAuth(false)
        setShowAdminLogin(false)
        setAdminSetupToken('')
        setActiveFolderRoute(null)
        setActivePage('support')
        return
      }
      if (APP_PAGE_IDS.includes(candidate)) {
        setShowAuth(false)
        setShowAdminLogin(false)
        setAdminSetupToken('')
        setActiveFolderRoute(null)
        setActivePage(candidate)
        return
      }
      setShowAuth(false)
      setShowAdminLogin(false)
      setAdminSetupToken('')
      setActiveFolderRoute(null)
      setActivePage(getDefaultPageForRole(initialAuthUser?.role))
    }

    syncFromLocation()

    const onPop = () => syncFromLocation()
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    if (!isClientVerificationLocked) return
    if (activePage === 'settings' || activePage === 'dashboard') return
    routeClientToVerificationSettings({ replace: true })
  }, [activePage, isClientVerificationLocked])

  useEffect(() => {
    if (isAuthenticated && isAdminView) return
    if (!impersonationSession) return
    setImpersonationSession(null)
    persistImpersonationSession(null)
  }, [isAuthenticated, isAdminView, impersonationSession])

  useEffect(() => {
    if (!scopedClientEmail) {
      setClientActivityRecords([])
      setSettingsProfileSnapshot(normalizeSettingsProfile({}))
      setVerificationDocsSnapshot(normalizeVerificationDocs({}))
      return
    }
    const savedOnboardingState = getSavedOnboardingState(scopedClientEmail)
    setOnboardingState(savedOnboardingState)
    const savedSettingsProfile = readScopedSettingsProfile(scopedClientEmail)
    const savedVerificationProgress = resolveVerificationProgress({
      onboardingData: savedOnboardingState.data,
      settingsDocs: readScopedVerificationDocs(scopedClientEmail),
      settingsProfile: savedSettingsProfile,
    })
    setSettingsProfileSnapshot(savedVerificationProgress.profile)
    setVerificationDocsSnapshot(savedVerificationProgress.docs)
    persistScopedVerificationDocs(scopedClientEmail, savedVerificationProgress.docs)
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
    setExpenseDocuments(ensureFolderStructuredRecords(scopedDocuments.expenses, 'expenses'))
    setSalesDocuments(ensureFolderStructuredRecords(scopedDocuments.sales, 'sales'))
    setBankStatementDocuments(ensureFolderStructuredRecords(scopedDocuments.bankStatements, 'bankStatements'))
    setExpenseClassOptions(normalizeClassOptions(scopedDocuments.expenseClassOptions))
    setSalesClassOptions(normalizeClassOptions(scopedDocuments.salesClassOptions))
    setUploadHistoryRecords(scopedDocuments.uploadHistory)
    setClientActivityRecords(readClientActivityLogEntries(scopedClientEmail))
  }, [scopedClientEmail, impersonationSession?.businessName, impersonationSession?.clientName, authUser?.fullName])

  useEffect(() => {
    if (!isImpersonatingClient || !impersonationSession) return
    const timeoutId = window.setInterval(() => {
      const lastActivityAt = impersonationSession.lastActivityAt || impersonationSession.startedAt || 0
      if (Date.now() - lastActivityAt <= IMPERSONATION_IDLE_TIMEOUT_MS) return
      logAdminActivity({
        adminName: impersonationSession.adminName || authUser?.fullName || 'Admin User',
        action: 'Impersonation session expired',
        affectedUser: impersonationSession.businessName || impersonationSession.clientEmail || '--',
        details: `Impersonation session expired due to inactivity for ${impersonationSession.businessName || impersonationSession.clientEmail}.`,
      })
      setImpersonationSession(null)
      persistImpersonationSession(null)
      setPendingImpersonationClient(null)
      setActivePage(ADMIN_DEFAULT_PAGE)
      setActiveFolderRoute(null)
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
      expenseClassOptions,
      salesClassOptions,
    })
  }, [
    scopedClientEmail,
    expenseDocuments,
    salesDocuments,
    bankStatementDocuments,
    uploadHistoryRecords,
    expenseClassOptions,
    salesClassOptions,
  ])

  useEffect(() => {
    const extractClasses = (records = []) => (
      records.flatMap((record) => (
        record?.isFolder
          ? (record.files || []).map((file) => (file.class || file.className || file.expenseClass || file.salesClass || '').trim())
          : [(record.class || record.className || record.expenseClass || record.salesClass || '').trim()]
      ))
        .filter(Boolean)
    )

    const extractedExpense = normalizeClassOptions(extractClasses(expenseDocuments))
    const extractedSales = normalizeClassOptions(extractClasses(salesDocuments))
    setExpenseClassOptions((prev) => normalizeClassOptions([...prev, ...extractedExpense]))
    setSalesClassOptions((prev) => normalizeClassOptions([...prev, ...extractedSales]))
  }, [expenseDocuments, salesDocuments])

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
    const nextVerificationProgress = resolveVerificationProgress({
      onboardingData: nextData,
      settingsDocs: readScopedVerificationDocs(targetEmail),
      settingsProfile: readScopedSettingsProfile(targetEmail),
    })
    setSettingsProfileSnapshot(nextVerificationProgress.profile)
    setVerificationDocsSnapshot(nextVerificationProgress.docs)
    persistScopedVerificationDocs(targetEmail, nextVerificationProgress.docs)
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
      setSettingsProfileSnapshot(normalizeSettingsProfile(merged))
      setCompanyName(merged.businessName?.trim() || 'Acme Corporation')
      setClientFirstName(merged.fullName?.trim()?.split(/\s+/)?.[0] || 'Client')
      if (isImpersonatingClient) {
        logAdminActivity({
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
      if (String(scopedClientEmail || '').trim().toLowerCase() === String(email || '').trim().toLowerCase()) {
        setSettingsProfileSnapshot(normalizeSettingsProfile(next))
      }
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
    const logEntry = appendClientActivityLog(scopedClientEmail, {
      actorName,
      actorRole,
      action,
      details,
    })
    if (logEntry) {
      setClientActivityRecords((prev) => [logEntry, ...prev])
    }
  }

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const persistAuthenticatedUserRecord = (user, storageType = 'local') => {
    const normalizedUser = normalizeUser({
      ...user,
      sessionIssuedAtIso: new Date().toISOString(),
    })
    if (!normalizedUser) return null
    if (storageType === 'local') {
      localStorage.setItem('kiaminaAuthUser', JSON.stringify(normalizedUser))
      sessionStorage.removeItem('kiaminaAuthUser')
    } else {
      sessionStorage.setItem('kiaminaAuthUser', JSON.stringify(normalizedUser))
      localStorage.removeItem('kiaminaAuthUser')
    }
    return normalizedUser
  }

  const persistAuthUser = (user, remember = true) => {
    const normalizedUser = persistAuthenticatedUserRecord(user, remember ? 'local' : 'session')
    if (!normalizedUser) return

    setAuthUser(normalizedUser)
    setIsAuthenticated(true)
    setShowAuth(false)
    setShowAdminLogin(false)
    setAdminSetupToken('')
    setImpersonationSession(null)
    setAdminImpersonationSession(null)
    setPendingImpersonationClient(null)
    persistImpersonationSession(null)
    persistAdminImpersonationSession(null)
    setOnboardingState(getSavedOnboardingState(normalizedUser.email))
    setCompanyName(getSavedCompanyName(normalizedUser.email))
    setClientFirstName(getSavedClientFirstName(normalizedUser.email, normalizedUser.fullName?.trim()?.split(/\s+/)?.[0] || 'Client'))

    const defaultPage = getDefaultPageForRole(normalizedUser.role)
    setActivePage(defaultPage)
    setActiveFolderRoute(null)
    try {
      history.replaceState({}, '', defaultPage === 'dashboard' ? '/dashboard' : `/${defaultPage}`)
    } catch {
      // ignore
    }
  }

  const issueEmailOtp = async (email, purpose = 'login') => {
    const normalizedEmail = email?.trim()?.toLowerCase()
    if (!normalizedEmail) return false
    const startedAt = Date.now()

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

    const minimumDelayMs = getNetworkAwareDurationMs('search')
    const elapsedMs = Date.now() - startedAt
    const remainingMs = Math.max(0, minimumDelayMs - elapsedMs)
    if (remainingMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, remainingMs))
    }

    return true
  }

  const issuePasswordResetLink = async (email) => {
    const normalizedEmail = email?.trim()?.toLowerCase()
    if (!normalizedEmail) return false
    const startedAt = Date.now()

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

    const minimumDelayMs = getNetworkAwareDurationMs('search')
    const elapsedMs = Date.now() - startedAt
    const remainingMs = Math.max(0, minimumDelayMs - elapsedMs)
    if (remainingMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, remainingMs))
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
      const nextAccounts = [...accounts, {
        fullName,
        email: selected.email,
        password: `oauth-${provider}`,
        role: socialRole,
        createdAt: new Date().toISOString(),
      }]
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
    await new Promise((resolve) => setTimeout(resolve, getNetworkAwareDurationMs('search')))
    setIsLogoutConfirmOpen(false)
    setIsModalOpen(false)
    setIsAuthenticated(false)
    setAuthUser(null)
    setImpersonationSession(null)
    setAdminImpersonationSession(null)
    setPendingImpersonationClient(null)
    persistImpersonationSession(null)
    persistAdminImpersonationSession(null)
    setAuthMode('login')
    setActivePage(getDefaultPageForRole('client'))
    setActiveFolderRoute(null)
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

  const handleDeleteClientAccount = async ({
    reason = '',
    reasonOther = '',
    retentionIntent = '',
    acknowledgedPermanentDeletion = false,
  } = {}) => {
    const normalizedEmail = String(authUser?.email || '').trim().toLowerCase()
    if (!normalizedEmail || currentUserRole !== 'client') {
      return { ok: false, message: 'Unable to delete this account.' }
    }
    if (!acknowledgedPermanentDeletion) {
      return { ok: false, message: 'You must acknowledge permanent deletion to continue.' }
    }

    const accounts = getSavedAccounts()
    const targetAccount = accounts.find((account) => (
      String(account?.email || '').trim().toLowerCase() === normalizedEmail
    ))
    if (!targetAccount) {
      return { ok: false, message: 'Account not found.' }
    }

    const nextAccounts = accounts.filter((account) => (
      String(account?.email || '').trim().toLowerCase() !== normalizedEmail
    ))
    localStorage.setItem('kiaminaAccounts', JSON.stringify(nextAccounts))
    removeScopedClientArtifacts(normalizedEmail)

    const deletionReason = String(reason || '').trim() || 'Not provided'
    const deletionReasonDetail = String(reasonOther || '').trim()
    const retentionResponse = String(retentionIntent || '').trim() || 'Not provided'
    appendAdminActivityLog({
      adminName: 'Client Self-Service',
      adminEmail: normalizedEmail,
      adminLevel: ADMIN_LEVELS.SUPER,
      action: 'Client account deleted',
      affectedUser: targetAccount.businessName || targetAccount.fullName || normalizedEmail,
      details: [
        `Reason: ${deletionReason}${deletionReasonDetail ? ` (${deletionReasonDetail})` : ''}`,
        `Retention response: ${retentionResponse}`,
        'Client confirmed permanent account deletion.',
      ].join(' '),
    })

    setIsLogoutConfirmOpen(false)
    setIsModalOpen(false)
    setIsAuthenticated(false)
    setAuthUser(null)
    setImpersonationSession(null)
    setAdminImpersonationSession(null)
    setPendingImpersonationClient(null)
    persistImpersonationSession(null)
    persistAdminImpersonationSession(null)
    setAuthMode('login')
    setActivePage(getDefaultPageForRole('client'))
    setActiveFolderRoute(null)
    sessionStorage.removeItem('kiaminaAuthUser')
    localStorage.removeItem('kiaminaAuthUser')
    navigateToAuth('login', { replace: true })
    showToast('success', 'Your account was deleted permanently.')
    return { ok: true }
  }

  useEffect(() => {
    if (!isAuthenticated || currentUserRole === 'admin' || !authUser?.email) return undefined

    const normalizedEmail = String(authUser.email || '').trim().toLowerCase()
    if (!normalizedEmail) return undefined

    const sessionIssuedAtMs = Date.parse(authUser.sessionIssuedAtIso || '') || 0
    const shouldForceLogout = () => {
      const control = readClientSessionControl()
      const globalLogoutAtMs = Date.parse(control.globalLogoutAtIso || '') || 0
      const userLogoutAtMs = Date.parse(control.byEmail?.[normalizedEmail] || '') || 0
      return Math.max(globalLogoutAtMs, userLogoutAtMs) > sessionIssuedAtMs
    }

    const forceClientLogout = () => {
      setIsLogoutConfirmOpen(false)
      setIsModalOpen(false)
      setIsAuthenticated(false)
      setAuthUser(null)
      setImpersonationSession(null)
      setAdminImpersonationSession(null)
      setPendingImpersonationClient(null)
      persistImpersonationSession(null)
      persistAdminImpersonationSession(null)
      setAuthMode('login')
      setActivePage(getDefaultPageForRole('client'))
      setActiveFolderRoute(null)
      sessionStorage.removeItem('kiaminaAuthUser')
      localStorage.removeItem('kiaminaAuthUser')
      navigateToAuth('login', { replace: true })
      showToast('error', 'Your session was ended by an administrator. Please log in again.')
    }

    if (shouldForceLogout()) {
      forceClientLogout()
      return undefined
    }

    const handleStorage = (event) => {
      if (event.key !== CLIENT_SESSION_CONTROL_STORAGE_KEY) return
      if (shouldForceLogout()) forceClientLogout()
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [isAuthenticated, currentUserRole, authUser?.email, authUser?.sessionIssuedAtIso])

  useEffect(() => {
    deliveredBriefNotificationIdsRef.current = new Set()
  }, [normalizedScopedClientEmail, isAuthenticated, currentUserRole])

  useEffect(() => {
    if (!isAuthenticated || currentUserRole === 'admin') return undefined
    const normalizedEmail = String(normalizedScopedClientEmail || '').trim().toLowerCase()
    if (!normalizedEmail) return undefined

    const briefStorageKey = getScopedStorageKey(CLIENT_BRIEF_NOTIFICATIONS_STORAGE_KEY, normalizedEmail)
    const syncBriefNotifications = () => {
      const queued = readClientBriefNotifications(normalizedEmail)
      if (!queued.length) return
      const unseen = queued.filter((item, index) => {
        const id = String(item?.id || `CBN-FALLBACK-${index}`).trim()
        if (!id || deliveredBriefNotificationIdsRef.current.has(id)) return false
        deliveredBriefNotificationIdsRef.current.add(id)
        return true
      })
      if (unseen.length === 0) return

      const mapped = unseen.map((item, index) => {
        const notificationId = String(item?.id || `CBN-FALLBACK-${Date.now()}-${index}`).trim()
        const title = String(item?.title || 'New Update').trim()
        const body = String(item?.message || '').trim()
        const composedMessage = body ? `${title}: ${body}` : title
        const sentAtIso = String(item?.sentAtIso || new Date().toISOString()).trim()
        return {
          id: notificationId,
          type: 'info',
          message: composedMessage,
          timestamp: formatClientDocumentTimestamp(sentAtIso),
          read: false,
          priority: String(item?.priority || 'normal').trim().toLowerCase(),
          linkPage: 'dashboard',
        }
      })

      setUserNotifications((previous) => [...mapped, ...previous].slice(0, 80))
      const previewMessage = mapped[0]?.message || 'You have a new notification.'
      showToast('info', previewMessage.length > 140 ? `${previewMessage.slice(0, 137)}...` : previewMessage)
    }

    syncBriefNotifications()
    const intervalId = window.setInterval(syncBriefNotifications, 4000)
    const handleStorage = (event) => {
      if (!event.key || event.key === briefStorageKey) {
        syncBriefNotifications()
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.clearInterval(intervalId)
    }
  }, [isAuthenticated, currentUserRole, normalizedScopedClientEmail])

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
        createdAt: new Date().toISOString(),
      },
    })
    return { ok: true, requiresOtp: true }
  }

  const handleAdminSetupCreateAccount = async ({
    inviteToken,
    fullName,
    email,
    roleInCompany,
    department,
    phoneNumber,
    workCountry,
    governmentIdType,
    governmentIdNumber,
    identityVerificationPassed,
    residentialAddress,
    password,
    confirmPassword,
  }) => {
    const normalizedToken = inviteToken?.trim() || ''
    const invite = getAdminInviteByToken(normalizedToken)
    if (!isAdminInvitePending(invite)) {
      return { ok: false, message: 'Invitation link is invalid or has expired.' }
    }

    const normalizedEmail = email?.trim()?.toLowerCase() || ''
    const normalizedRoleInCompany = String(roleInCompany || '').trim()
    const normalizedDepartment = String(department || '').trim()
    const normalizedPhoneNumber = String(phoneNumber || '').trim()
    const normalizedWorkCountry = normalizeAdminVerificationCountry(workCountry)
    const normalizedGovernmentIdType = normalizeAdminGovernmentIdType(governmentIdType, normalizedWorkCountry)
    const normalizedGovernmentIdNumber = String(governmentIdNumber || '').trim()
    const normalizedResidentialAddress = String(residentialAddress || '').trim()
    if (
      !fullName?.trim()
      || !normalizedEmail
      || !normalizedRoleInCompany
      || !normalizedDepartment
      || !normalizedPhoneNumber
      || !normalizedWorkCountry
      || !normalizedGovernmentIdType
      || !normalizedGovernmentIdNumber
      || !identityVerificationPassed
      || !password
      || !confirmPassword
    ) {
      return { ok: false, message: 'Please complete all required fields.' }
    }
    if (normalizedEmail !== invite.email) {
      return { ok: false, message: 'Work email must match your invitation email.' }
    }
    if (normalizedPhoneNumber.replace(/\D/g, '').length < 7) {
      return { ok: false, message: 'Enter a valid phone number.' }
    }
    if (normalizedGovernmentIdNumber.length < 4) {
      return { ok: false, message: 'Enter a valid government ID number.' }
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
        roleInCompany: normalizedRoleInCompany,
        department: normalizedDepartment,
        phoneNumber: normalizedPhoneNumber,
        workCountry: normalizedWorkCountry,
        governmentIdType: normalizedGovernmentIdType,
        governmentIdNumber: normalizedGovernmentIdNumber,
        governmentIdVerifiedAt: new Date().toISOString(),
        residentialAddress: normalizedResidentialAddress,
        password,
        role: 'admin',
        adminLevel: invite.adminLevel || ADMIN_LEVELS.AREA_ACCOUNTANT,
        adminPermissions: Array.isArray(invite.adminPermissions) ? invite.adminPermissions : [],
        status: 'active',
        createdAt: new Date().toISOString(),
      },
    })
    return { ok: true, requiresOtp: true }
  }

  const handleVerifyOtp = async (code) => {
    if (!otpChallenge?.email) return { ok: false, message: 'Incorrect verification code.' }
    await new Promise((resolve) => window.setTimeout(resolve, getNetworkAwareDurationMs('search')))

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
      if (otpChallenge.purpose === 'admin-setup') {
        const hasProfileFields = Boolean(
          String(pendingSignup?.roleInCompany || '').trim()
          && String(pendingSignup?.department || '').trim()
          && String(pendingSignup?.phoneNumber || '').trim()
          && String(pendingSignup?.workCountry || '').trim()
          && String(pendingSignup?.governmentIdType || '').trim()
          && String(pendingSignup?.governmentIdNumber || '').trim(),
        )
        if (!hasProfileFields) {
          return { ok: false, message: 'Please complete all required profile fields.' }
        }
      }

      const accounts = getSavedAccounts()
      const alreadyExists = accounts.some((account) => account.email.toLowerCase() === pendingSignup.email.toLowerCase())
      if (alreadyExists) {
        return { ok: false, message: 'Invalid credentials. Please try again.' }
      }

      const nextAccount = normalizeAccount({
        fullName: pendingSignup.fullName,
        email: pendingSignup.email,
        roleInCompany: pendingSignup.roleInCompany,
        department: pendingSignup.department,
        phoneNumber: pendingSignup.phoneNumber,
        workCountry: pendingSignup.workCountry,
        governmentIdType: pendingSignup.governmentIdType,
        governmentIdNumber: pendingSignup.governmentIdNumber,
        governmentIdVerifiedAt: pendingSignup.governmentIdVerifiedAt || new Date().toISOString(),
        residentialAddress: pendingSignup.residentialAddress,
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
        roleInCompany: pendingSignup.roleInCompany,
        department: pendingSignup.department,
        phoneNumber: pendingSignup.phoneNumber,
        workCountry: pendingSignup.workCountry,
        governmentIdType: pendingSignup.governmentIdType,
        governmentIdNumber: pendingSignup.governmentIdNumber,
        governmentIdVerifiedAt: pendingSignup.governmentIdVerifiedAt || new Date().toISOString(),
        residentialAddress: pendingSignup.residentialAddress,
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
        try {
          const profileStorageKey = `kiaminaAdminProfile:${pendingSignup.email?.trim()?.toLowerCase()}`
          localStorage.setItem(profileStorageKey, JSON.stringify({
            fullName: pendingSignup.fullName || '',
            roleInCompany: pendingSignup.roleInCompany || '',
            department: pendingSignup.department || '',
            phoneNumber: pendingSignup.phoneNumber || '',
            workCountry: pendingSignup.workCountry || 'Nigeria',
            governmentIdType: pendingSignup.governmentIdType || '',
            governmentIdNumber: pendingSignup.governmentIdNumber || '',
            governmentIdVerifiedAt: pendingSignup.governmentIdVerifiedAt || new Date().toISOString(),
            residentialAddress: pendingSignup.residentialAddress || '',
          }))
        } catch {
          // no-op
        }
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
      if (normalizeRole(match.role, match.email) === 'admin' && match.mustChangePassword) {
        window.setTimeout(() => {
          showToast('info', 'Temporary password detected. Open Admin Settings to create a permanent password.')
        }, 220)
      }
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
    await new Promise((resolve) => window.setTimeout(resolve, getNetworkAwareDurationMs('search')))
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
    nextAccounts[matchIndex] = {
      ...nextAccounts[matchIndex],
      password,
      mustChangePassword: false,
    }
    localStorage.setItem('kiaminaAccounts', JSON.stringify(nextAccounts))
    showToast('success', 'Password updated successfully.')
    return { ok: true }
  }

  const handleAdminActionLog = ({ action, affectedUser, details }) => {
    logAdminActivity({
      adminName: authUser?.fullName || 'Admin User',
      action,
      affectedUser,
      details,
    })
  }

  const handleCurrentAdminEmailUpdated = (payload = {}) => {
    const {
      previousEmail = '',
      nextEmail = '',
      nextFullName = '',
      nextRoleInCompany = '',
      nextDepartment = '',
      nextPhoneNumber = '',
      nextAdminLevel = '',
      nextAdminPermissions = [],
      nextStatus = '',
    } = payload
    const normalizedNextEmail = String(nextEmail || '').trim().toLowerCase()
    if (!normalizedNextEmail) return
    const normalizedPreviousEmail = String(previousEmail || authUser?.email || '').trim().toLowerCase()
    const currentAuthEmail = String(authUser?.email || '').trim().toLowerCase()
    if (currentAuthEmail && normalizedPreviousEmail && currentAuthEmail !== normalizedPreviousEmail) return

    const hasNextFullName = Object.prototype.hasOwnProperty.call(payload, 'nextFullName')
    const hasNextRoleInCompany = Object.prototype.hasOwnProperty.call(payload, 'nextRoleInCompany')
    const hasNextDepartment = Object.prototype.hasOwnProperty.call(payload, 'nextDepartment')
    const hasNextPhoneNumber = Object.prototype.hasOwnProperty.call(payload, 'nextPhoneNumber')
    const hasNextAdminLevel = Object.prototype.hasOwnProperty.call(payload, 'nextAdminLevel')
    const hasNextAdminPermissions = Object.prototype.hasOwnProperty.call(payload, 'nextAdminPermissions')
    const hasNextStatus = Object.prototype.hasOwnProperty.call(payload, 'nextStatus')

    const trimmedNextFullName = String(nextFullName || '').trim()
    const trimmedNextRoleInCompany = String(nextRoleInCompany || '').trim()
    const trimmedNextDepartment = String(nextDepartment || '').trim()
    const trimmedNextPhoneNumber = String(nextPhoneNumber || '').trim()
    const normalizedNextAdminLevel = String(nextAdminLevel || '').trim()
    const normalizedNextStatus = String(nextStatus || '').trim()
    const normalizedNextAdminPermissions = Array.isArray(nextAdminPermissions)
      ? nextAdminPermissions
      : []

    const nextAuthUser = normalizeUser({
      ...(authUser || {}),
      email: normalizedNextEmail,
      fullName: hasNextFullName ? trimmedNextFullName : (authUser?.fullName || ''),
      roleInCompany: hasNextRoleInCompany ? trimmedNextRoleInCompany : (authUser?.roleInCompany || ''),
      department: hasNextDepartment ? trimmedNextDepartment : (authUser?.department || ''),
      phoneNumber: hasNextPhoneNumber ? trimmedNextPhoneNumber : (authUser?.phoneNumber || ''),
      adminLevel: hasNextAdminLevel ? normalizedNextAdminLevel : (authUser?.adminLevel || ''),
      adminPermissions: hasNextAdminPermissions
        ? normalizedNextAdminPermissions
        : (authUser?.adminPermissions || []),
      status: hasNextStatus ? normalizedNextStatus : (authUser?.status || 'active'),
      sessionIssuedAtIso: new Date().toISOString(),
    })
    if (!nextAuthUser) return

    setAuthUser(nextAuthUser)
    setIsAuthenticated(true)

    const authStorageType = detectAuthStorageType()
    persistAuthenticatedUserRecord(nextAuthUser, authStorageType === 'local' ? 'local' : 'session')

    setImpersonationSession((previousSession) => {
      if (!previousSession) return previousSession
      const sessionAdminEmail = String(previousSession.adminEmail || '').trim().toLowerCase()
      if (sessionAdminEmail && sessionAdminEmail !== normalizedPreviousEmail) return previousSession
      const nextSession = {
        ...previousSession,
        adminEmail: normalizedNextEmail,
      }
      persistImpersonationSession(nextSession)
      return nextSession
    })
    setAdminImpersonationSession((previousSession) => {
      if (!previousSession) return previousSession
      let didChange = false
      const nextSession = { ...previousSession }
      if (nextSession.originalAdminEmail === normalizedPreviousEmail) {
        nextSession.originalAdminEmail = normalizedNextEmail
        didChange = true
      }
      if (nextSession.impersonatedAdminEmail === normalizedPreviousEmail) {
        nextSession.impersonatedAdminEmail = normalizedNextEmail
        didChange = true
      }
      if (!didChange) return previousSession
      persistAdminImpersonationSession(nextSession, authStorageType === 'local' ? 'local' : 'session')
      return nextSession
    })
  }

  const exitAdminImpersonationMode = ({ silent = false } = {}) => {
    const activeSession = adminImpersonationSession
    if (!activeSession) return { ok: false, message: 'No active admin impersonation session.' }
    const originalEmail = String(activeSession.originalAdminEmail || '').trim().toLowerCase()
    if (!originalEmail) {
      setAdminImpersonationSession(null)
      persistAdminImpersonationSession(null)
      return { ok: false, message: 'Original admin session is unavailable.' }
    }

    const accounts = getSavedAccounts()
    const originalAccount = accounts.find((account) => account.email?.trim()?.toLowerCase() === originalEmail)
    if (!originalAccount || normalizeRole(originalAccount.role, originalAccount.email) !== 'admin') {
      setAdminImpersonationSession(null)
      persistAdminImpersonationSession(null)
      return { ok: false, message: 'Original admin account was not found.' }
    }

    const storageType = detectAuthStorageType()
    const restoredUser = persistAuthenticatedUserRecord(originalAccount, storageType === 'local' ? 'local' : 'session')
    if (!restoredUser) {
      return { ok: false, message: 'Unable to restore original admin session.' }
    }

    const previousImpersonatedName = activeSession.impersonatedAdminName || activeSession.impersonatedAdminEmail || 'Admin User'
    setAuthUser(restoredUser)
    setIsAuthenticated(true)
    setShowAuth(false)
    setShowAdminLogin(false)
    setAdminSetupToken('')
    setImpersonationSession(null)
    setPendingImpersonationClient(null)
    persistImpersonationSession(null)
    setAdminImpersonationSession(null)
    persistAdminImpersonationSession(null)
    setActivePage(ADMIN_DEFAULT_PAGE)
    setActiveFolderRoute(null)
    try {
      history.replaceState({}, '', `/${ADMIN_DEFAULT_PAGE}`)
    } catch {
      // ignore
    }
    appendAdminActivityLog({
      adminName: activeSession.originalAdminName || restoredUser.fullName || 'Super Admin',
      adminEmail: originalEmail,
      adminLevel: activeSession.originalAdminLevel || ADMIN_LEVELS.SUPER,
      action: 'Admin impersonation ended',
      affectedUser: previousImpersonatedName,
      details: `Super Admin exited impersonation for ${previousImpersonatedName}.`,
    })
    if (!silent) {
      showToast('success', 'Returned to Super Admin session.')
    }
    return { ok: true }
  }

  const handleRequestAdminImpersonation = async (targetAdminEmail = '') => {
    const targetEmail = String(targetAdminEmail || '').trim().toLowerCase()
    if (!targetEmail) return { ok: false, message: 'Admin account not found.' }
    if (!currentAdminAccount || currentAdminAccount.adminLevel !== ADMIN_LEVELS.SUPER) {
      return { ok: false, message: 'Only Super Admin can impersonate admin accounts.' }
    }
    if (isImpersonatingClient) {
      return { ok: false, message: 'Exit client impersonation mode before impersonating an admin.' }
    }

    const currentEmail = String(authUser?.email || '').trim().toLowerCase()
    if (!currentEmail) return { ok: false, message: 'Current admin session is unavailable.' }
    if (targetEmail === currentEmail) return { ok: false, message: 'Cannot impersonate your own account.' }

    const accounts = getSavedAccounts()
    const targetAccount = accounts.find((account) => account.email?.trim()?.toLowerCase() === targetEmail)
    if (!targetAccount || normalizeRole(targetAccount.role, targetAccount.email) !== 'admin') {
      return { ok: false, message: 'Admin account not found.' }
    }
    if (targetAccount.status === 'suspended') {
      return { ok: false, message: 'Cannot impersonate a suspended admin account.' }
    }

    if (adminImpersonationSession) {
      const cleanup = exitAdminImpersonationMode({ silent: true })
      if (!cleanup.ok) return cleanup
    }

    const storageType = detectAuthStorageType()
    const sessionPayload = {
      originalAdminEmail: currentEmail,
      originalAdminName: authUser?.fullName || currentAdminAccount.fullName || 'Super Admin',
      originalAdminLevel: currentAdminAccount.adminLevel || ADMIN_LEVELS.SUPER,
      impersonatedAdminEmail: targetEmail,
      impersonatedAdminName: targetAccount.fullName || targetAccount.email || 'Admin User',
      impersonatedAdminLevel: targetAccount.adminLevel || ADMIN_LEVELS.AREA_ACCOUNTANT,
      startedAt: Date.now(),
    }
    persistAdminImpersonationSession(sessionPayload, storageType === 'local' ? 'local' : 'session')
    setAdminImpersonationSession(sessionPayload)

    const impersonatedUser = persistAuthenticatedUserRecord(targetAccount, storageType === 'local' ? 'local' : 'session')
    if (!impersonatedUser) {
      setAdminImpersonationSession(null)
      persistAdminImpersonationSession(null)
      return { ok: false, message: 'Unable to start impersonation session.' }
    }

    setAuthUser(impersonatedUser)
    setIsAuthenticated(true)
    setShowAuth(false)
    setShowAdminLogin(false)
    setAdminSetupToken('')
    setImpersonationSession(null)
    setPendingImpersonationClient(null)
    persistImpersonationSession(null)
    setActivePage(ADMIN_DEFAULT_PAGE)
    setActiveFolderRoute(null)
    try {
      history.replaceState({}, '', `/${ADMIN_DEFAULT_PAGE}`)
    } catch {
      // ignore
    }

    appendAdminActivityLog({
      adminName: sessionPayload.originalAdminName,
      adminEmail: sessionPayload.originalAdminEmail,
      adminLevel: sessionPayload.originalAdminLevel,
      action: 'Admin impersonation started',
      affectedUser: `${sessionPayload.impersonatedAdminName} (${getAdminLevelLabel(sessionPayload.impersonatedAdminLevel)})`,
      details: `Super Admin started impersonation for ${sessionPayload.impersonatedAdminEmail}.`,
    })
    return { ok: true }
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
    setActiveFolderRoute(null)
    try {
      history.replaceState({}, '', '/dashboard')
    } catch {
      // ignore
    }

    logAdminActivity({
      adminName: nextSession.adminName,
      action: 'Client impersonation started',
      affectedUser: nextSession.businessName,
      details: `Admin (${nextSession.adminName}) impersonated Business (${nextSession.businessName}).`,
    })
    showToast('success', 'Entered client view mode.')
  }

  const exitImpersonationMode = ({ expired = false } = {}) => {
    if (!impersonationSession) return
    logAdminActivity({
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
    setActiveFolderRoute(null)
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
    logAdminActivity({
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
    logAdminActivity({
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
      const result = updateFirstPendingFileStatus(prev, 'Approved')
      updated = result.updated
      return result.records
    })
    if (!updated) {
      setSalesDocuments((prev) => {
        if (updated) return prev
        const result = updateFirstPendingFileStatus(prev, 'Approved')
        updated = result.updated
        return result.records
      })
    }
    if (!updated) {
      setBankStatementDocuments((prev) => {
        if (updated) return prev
        const result = updateFirstPendingFileStatus(prev, 'Approved')
        updated = result.updated
        return result.records
      })
    }

    if (updated) {
      logAdminActivity({
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
    logAdminActivity({
      adminName: impersonationSession?.adminName || authUser?.fullName || 'Admin User',
      action: type === 'success' ? 'Impersonation action' : 'Impersonation warning',
      affectedUser: impersonationSession?.businessName || scopedClientEmail || '--',
      details,
    })
  }

  const handleSettingsVerificationDocsChange = (nextDocs = {}) => {
    const normalizedDocs = normalizeVerificationDocs(nextDocs)
    setVerificationDocsSnapshot((previous) => {
      if (
        previous.govId === normalizedDocs.govId
        && previous.govIdType === normalizedDocs.govIdType
        && previous.govIdNumber === normalizedDocs.govIdNumber
        && previous.govIdVerifiedAt === normalizedDocs.govIdVerifiedAt
        && previous.govIdVerificationStatus === normalizedDocs.govIdVerificationStatus
        && previous.govIdClarityStatus === normalizedDocs.govIdClarityStatus
        && previous.businessReg === normalizedDocs.businessReg
      ) {
        return previous
      }
      return normalizedDocs
    })
    if (scopedClientEmail) {
      persistScopedVerificationDocs(scopedClientEmail, normalizedDocs)
    }
  }

  const handleSettingsProfileChange = (nextProfile = {}) => {
    const normalizedProfile = normalizeSettingsProfile(nextProfile)
    setSettingsProfileSnapshot((previous) => {
      if (
        previous.fullName === normalizedProfile.fullName
        && previous.email === normalizedProfile.email
        && previous.phone === normalizedProfile.phone
        && previous.address === normalizedProfile.address
        && previous.businessType === normalizedProfile.businessType
      ) {
        return previous
      }
      return normalizedProfile
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
      logAdminActivity({
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
    const finalVerificationProgress = resolveVerificationProgress({
      onboardingData: finalData,
      settingsDocs: readScopedVerificationDocs(scopedClientEmail),
      settingsProfile: readScopedSettingsProfile(scopedClientEmail),
    })
    const verificationPending = finalVerificationProgress.stepsCompleted < 3

    persistOnboardingState({
      currentStep: 5,
      completed: true,
      skipped: false,
      verificationPending,
      data: finalData,
    }, scopedClientEmail)
    setSettingsProfileSnapshot(finalVerificationProgress.profile)
    setVerificationDocsSnapshot(finalVerificationProgress.docs)
    persistScopedVerificationDocs(scopedClientEmail, finalVerificationProgress.docs)

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
      logAdminActivity({
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
    if (isClientVerificationLocked) {
      routeClientToVerificationSettings({ replace: true })
      return
    }
    if (!isIdentityVerificationComplete) {
      routeClientToVerificationSettings({
        replace: true,
        section: 'identity',
        toastMessage: 'Complete identity verification and wait for admin approval before uploading documents.',
      })
      return
    }

    const fallbackCategory = activePage === 'bank-statements'
      ? 'bank-statements'
      : activePage === 'sales'
        ? 'sales'
        : 'expenses'
    setModalInitialCategory(categoryOverride || fallbackCategory)
    setIsModalOpen(true)
  }

  const handleCreateClassOption = (categoryId, className) => {
    const normalized = normalizeClassOptions([className])[0]
    if (!normalized) return
    if (categoryId === 'sales') {
      setSalesClassOptions((prev) => normalizeClassOptions([...prev, normalized]))
      return
    }
    if (categoryId === 'expenses') {
      setExpenseClassOptions((prev) => normalizeClassOptions([...prev, normalized]))
      return
    }
    setExpenseClassOptions((prev) => normalizeClassOptions([...prev, normalized]))
    setSalesClassOptions((prev) => normalizeClassOptions([...prev, normalized]))
  }

  const handleUpload = async ({
    category,
    folderName,
    documentOwner,
    uploadedItems,
    metadataMode = 'single',
    sharedDetails = {},
    individualDetails = {},
  }) => {
    if (!isIdentityVerificationComplete) {
      return { ok: false, message: 'Complete identity verification and wait for admin approval before uploading documents.' }
    }
    if (!category) return { ok: false, message: 'Please select a document category.' }
    if (!folderName?.trim()) return { ok: false, message: 'Please provide a folder name.' }
    if (!documentOwner?.trim()) return { ok: false, message: 'Please provide the document owner.' }
    if (!Array.isArray(uploadedItems) || uploadedItems.length === 0) {
      return { ok: false, message: 'Please upload at least one file.' }
    }

    return runWithSlowRuntimeWatch(async () => {
    const categoryConfig = {
      expenses: { prefix: 'EXP', label: 'Expense', setter: setExpenseDocuments },
      sales: { prefix: 'SAL', label: 'Sales', setter: setSalesDocuments },
      'bank-statements': { prefix: 'BNK', label: 'Bank Statement', setter: setBankStatementDocuments },
    }

    const selectedConfig = categoryConfig[category]
    if (!selectedConfig) return { ok: false, message: 'Please select a document category.' }

    const resolveFileDetails = (item) => {
      if (metadataMode === 'individual') return individualDetails?.[item.key] || {}
      return sharedDetails || {}
    }

    const missingClass = uploadedItems.some((item) => !(resolveFileDetails(item)?.class || '').trim())
    if (missingClass) return { ok: false, message: 'Class is required before uploading.' }

    const ownerName = documentOwner?.trim() || 'Client User'
    const ownerEmail = (
      normalizedScopedClientEmail
      || scopedClientEmail
      || authUser?.email
      || ''
    ).trim().toLowerCase()

    const createdAtIso = new Date().toISOString()
    const createdAtDisplay = formatClientDocumentTimestamp(createdAtIso)
    const folderId = `F-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    const folderToken = folderId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-8)
    const buildFileReference = (index) => `${selectedConfig.prefix}-${folderToken}-${String(index + 1).padStart(3, '0')}`

    const files = await Promise.all(uploadedItems.map(async (item, index) => {
      const metadata = resolveFileDetails(item)
      const classValue = String(metadata?.class || '').replace(/\s+/g, ' ').trim()
      const classId = buildClassId(classValue)
      const confidentialityLevel = metadata?.confidentialityLevel || 'Standard'
      const processingPriority = metadata?.processingPriority || 'Normal'
      const internalNotes = (metadata?.internalNotes || '').trim()
      const vendorName = (metadata?.vendorName || '').trim()
      const paymentMethod = (metadata?.paymentMethod || '').trim()
      const invoice = (metadata?.invoice || '').trim()
      const invoiceNumber = (metadata?.invoiceNumber || '').trim()
      const fileCreatedAtIso = new Date().toISOString()
      const fileId = buildFileReference(index)
      const fileCacheKey = buildFileCacheKey({ ownerEmail, fileId })
      if (item.rawFile instanceof Blob && fileCacheKey) {
        await putCachedFileBlob(fileCacheKey, item.rawFile, { filename: item.name })
      }
      const previewUrl = item.previewUrl || (item.rawFile ? URL.createObjectURL(item.rawFile) : null)
      const uploadSource = item.uploadSource || 'browse-file'
      const uploadSourceLabel = uploadSource === 'drag-drop'
        ? 'Drag & Drop'
        : uploadSource === 'browse-folder'
          ? 'Browse Folder'
          : 'Browse Files'
      const baseFile = {
        folderId,
        folderName: folderName.trim(),
        filename: item.name,
        extension: item.extension || (item.name?.split('.').pop()?.toUpperCase() || 'FILE'),
        status: 'Pending Review',
        class: classValue,
        classId,
        className: classValue,
        expenseClass: category === 'expenses' ? classValue : '',
        salesClass: category === 'sales' ? classValue : '',
        fileCacheKey,
        previewUrl,
        ...(category === 'expenses' ? { paymentMethod } : {}),
        ...(category === 'sales' ? { invoice, invoiceNumber } : {}),
      }

      return {
        id: `${folderId}-FILE-${String(index + 1).padStart(3, '0')}`,
        folderId,
        folderName: folderName.trim(),
        fileId,
        fileCacheKey,
        filename: item.name,
        extension: baseFile.extension,
        status: 'Pending Review',
        user: ownerName,
        date: createdAtDisplay,
        createdAtIso: fileCreatedAtIso,
        updatedAtIso: fileCreatedAtIso,
        deletedAtIso: null,
        isDeleted: false,
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
        class: classValue,
        classId,
        className: classValue,
        expenseClass: category === 'expenses' ? classValue : '',
        salesClass: category === 'sales' ? classValue : '',
        vendorName,
        confidentialityLevel,
        processingPriority,
        internalNotes,
        ...(category === 'expenses' ? { paymentMethod } : {}),
        ...(category === 'sales' ? { invoice, invoiceNumber } : {}),
        previewUrl,
        rawFile: item.rawFile || null,
        uploadSource,
        uploadInfo: {
          originalUploadedAtIso: fileCreatedAtIso,
          originalUploadSource: uploadSource,
          originalUploadedBy: ownerName,
          device: 'Web Browser',
          ipAddress: '--',
          lastModifiedAtIso: fileCreatedAtIso,
          replacements: [],
          totalVersions: 1,
        },
        versions: [
          createVersionEntry({
            versionNumber: 1,
            action: 'Uploaded',
            performedBy: ownerName,
            timestamp: fileCreatedAtIso,
            notes: `Initial upload via ${uploadSourceLabel}.`,
            fileSnapshot: baseFile,
          }),
        ],
        activityLog: [
          createFileActivityEntry({
            actionType: 'upload',
            description: `File uploaded via ${uploadSourceLabel}.`,
            performedBy: ownerName,
            timestamp: fileCreatedAtIso,
          }),
        ],
      }
    }))

    if (category === 'expenses') {
      const classValues = files.map((file) => file.class).filter(Boolean)
      if (classValues.length > 0) {
        setExpenseClassOptions((prev) => normalizeClassOptions([...prev, ...classValues]))
      }
    }
    if (category === 'sales') {
      const classValues = files.map((file) => file.class).filter(Boolean)
      if (classValues.length > 0) {
        setSalesClassOptions((prev) => normalizeClassOptions([...prev, ...classValues]))
      }
    }

    const folderRecord = {
      id: folderId,
      isFolder: true,
      folderName: folderName.trim(),
      category: selectedConfig.label,
      user: ownerName,
      createdAtIso,
      createdAtDisplay,
      date: createdAtDisplay,
      files,
    }

    selectedConfig.setter((prev) => [folderRecord, ...prev])
    setUploadHistoryRecords((prev) => [
      ...files.map((file, index) => ({
        id: `UP-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
        filename: file.filename,
        type: file.extension || 'FILE',
        categoryId: category,
        category: selectedConfig.label,
        date: file.date || createdAtDisplay,
        user: ownerName,
        ownerEmail,
        status: file.status || 'Pending Review',
        isFolder: false,
        folderId: folderRecord.id,
        fileId: file.fileId,
        uploadSource: file.uploadSource || 'browse-file',
      })),
      ...(Array.isArray(prev) ? prev.filter((row) => !row?.isFolder) : []),
    ])

    appendScopedClientLog(
      'Uploaded files',
      `[${selectedConfig.label}] Uploaded ${files.length} file(s) to folder "${folderRecord.folderName}" (${folderRecord.id}).`,
    )

    setIsModalOpen(false)
    showClientToast('success', 'Documents uploaded successfully.')
    return { ok: true }
    }, 'Uploading files...')
  }

  const supportClientEmail = String(
    normalizedScopedClientEmail
    || scopedClientEmail
    || authUser?.email
    || '',
  ).trim().toLowerCase()
  const supportClientName = String(
    isImpersonatingClient
      ? (impersonationSession?.clientName || clientFirstName || 'Client User')
      : (authUser?.fullName || clientFirstName || 'Client User'),
  ).trim() || 'Client User'
  const supportBusinessName = String(
    impersonationSession?.businessName
    || companyName
    || '',
  ).trim()

  const renderClientPage = () => {
    const logDocumentWorkspaceActivity = (categoryId, action, details) => {
      const categoryLabel = categoryId === 'sales'
        ? 'Sales'
        : categoryId === 'bank-statements'
          ? 'Bank Statements'
          : 'Expenses'
      appendScopedClientLog(action, `[${categoryLabel}] ${details}`)
    }

    const downloadBusinessName = String(impersonationSession?.businessName || companyName || '').trim()

    const renderDocumentWorkspace = ({ categoryId, title, records, setRecords }) => {
      const impersonationBusinessName = impersonationSession?.businessName || companyName || 'Client Account'
      const appendFileUploadHistory = ({
        filename,
        extension,
        fileId,
        folderId,
        uploadedBy,
        ownerEmail,
        uploadSource,
        timestampIso,
        status = 'Pending Review',
      } = {}) => {
        const timestamp = timestampIso || new Date().toISOString()
        setUploadHistoryRecords((prev) => [{
          id: `UP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          filename: filename || '--',
          type: extension || 'FILE',
          categoryId,
          category: title,
          date: formatClientDocumentTimestamp(timestamp),
          user: uploadedBy || authUser?.fullName || clientFirstName || 'Client User',
          ownerEmail: String(ownerEmail || normalizedScopedClientEmail || scopedClientEmail || authUser?.email || '').trim().toLowerCase(),
          status,
          isFolder: false,
          folderId: folderId || '',
          fileId: fileId || '',
          uploadSource: uploadSource || 'browse-file',
        }, ...(Array.isArray(prev) ? prev.filter((row) => !row?.isFolder) : [])])
      }
      const isFolderRoute = activeFolderRoute?.category === categoryId && Boolean(activeFolderRoute?.folderId)
      if (isFolderRoute) {
        const folder = records.find((row) => row?.isFolder && row.id === activeFolderRoute.folderId) || null
        return (
          <ClientFolderFilesPage
            categoryId={categoryId}
            categoryTitle={title}
            records={records}
            folder={folder}
            setRecords={setRecords}
            onLogActivity={(action, details) => logDocumentWorkspaceActivity(categoryId, action, details)}
            onBack={() => handleSetActivePage(categoryId, { replace: true })}
            onOpenFolder={(folderId) => handleOpenFolderRoute(categoryId, folderId)}
            onNavigateDashboard={() => handleSetActivePage('dashboard')}
            isImpersonatingClient={isImpersonatingClient}
            impersonationBusinessName={impersonationBusinessName}
            downloadBusinessName={downloadBusinessName}
            showToast={showClientToast}
            onRecordUploadHistory={appendFileUploadHistory}
            globalSearchTerm={dashboardSearchTerm}
            onGlobalSearchTermChange={setDashboardSearchTerm}
          />
        )
      }

      return (
        <ClientDocumentFoldersPage
          categoryId={categoryId}
          title={title}
          records={records}
          setRecords={setRecords}
          onLogActivity={(action, details) => logDocumentWorkspaceActivity(categoryId, action, details)}
          onAddDocument={handleAddDocument}
          onOpenFolder={(folderId) => handleOpenFolderRoute(categoryId, folderId)}
          onNavigateDashboard={() => handleSetActivePage('dashboard')}
          isImpersonatingClient={isImpersonatingClient}
          impersonationBusinessName={impersonationBusinessName}
          showToast={showClientToast}
          globalSearchTerm={dashboardSearchTerm}
          onGlobalSearchTermChange={setDashboardSearchTerm}
        />
      )
    }

    switch (activePage) {
      case 'dashboard':
        return (
          <ClientDashboardPage
            onAddDocument={handleAddDocument}
            setActivePage={handleSetActivePage}
            clientFirstName={clientFirstName}
            verificationState={dashboardVerificationState}
            records={dashboardRecords}
            activityLogs={clientActivityRecords}
          />
        )
      case 'expenses':
        return renderDocumentWorkspace({
          categoryId: 'expenses',
          title: 'Expenses',
          records: expenseDocuments,
          setRecords: setExpenseDocuments,
        })
      case 'sales':
        return renderDocumentWorkspace({
          categoryId: 'sales',
          title: 'Sales',
          records: salesDocuments,
          setRecords: setSalesDocuments,
        })
      case 'bank-statements':
        return renderDocumentWorkspace({
          categoryId: 'bank-statements',
          title: 'Bank Statements',
          records: bankStatementDocuments,
          setRecords: setBankStatementDocuments,
        })
      case 'upload-history':
        return (
          <ClientUploadHistoryPage
            records={uploadHistoryRecords}
            expenseRecords={expenseDocuments}
            salesRecords={salesDocuments}
            bankStatementRecords={bankStatementDocuments}
            ownerEmail={normalizedScopedClientEmail}
            downloadBusinessName={downloadBusinessName}
            onOpenFileLocation={(categoryId, folderId) => handleOpenFolderRoute(categoryId, folderId)}
            showToast={showClientToast}
            globalSearchTerm={dashboardSearchTerm}
            onGlobalSearchTermChange={setDashboardSearchTerm}
          />
        )
      case 'recent-activities':
        return (
          <ClientRecentActivitiesPage
            records={dashboardRecords}
            activityLogs={clientActivityRecords}
            globalSearchTerm={dashboardSearchTerm}
            onGlobalSearchTermChange={setDashboardSearchTerm}
          />
        )
      case 'support':
        return (
          <ClientSupportPage
            clientEmail={supportClientEmail}
            clientName={supportClientName}
            businessName={supportBusinessName}
          />
        )
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
            clientEmail={normalizedScopedClientEmail}
            clientName={isImpersonatingClient ? (impersonationSession?.clientName || authUser?.fullName || '') : (authUser?.fullName || '')}
            verificationState={dashboardVerificationState}
            identityApprovedByAdmin={identityVerificationApprovedByAdmin}
            businessApprovedByAdmin={businessVerificationApprovedByAdmin}
            clientTeamRole={isImpersonatingClient ? 'owner' : (authUser?.clientTeamRole || 'owner')}
            onSettingsProfileChange={handleSettingsProfileChange}
            onVerificationDocsChange={handleSettingsVerificationDocsChange}
            verificationLockEnforced={isClientVerificationLocked}
            canDeleteAccount={!isImpersonatingClient && !isAdminView}
            onDeleteAccount={handleDeleteClientAccount}
          />
        )
      default:
        return (
          <ClientDashboardPage
            onAddDocument={handleAddDocument}
            setActivePage={handleSetActivePage}
            clientFirstName={clientFirstName}
            verificationState={dashboardVerificationState}
            records={dashboardRecords}
            activityLogs={clientActivityRecords}
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
  const shouldShowDashboardBootstrapLoader = Boolean(
    isDashboardBootstrapLoading
    && isAuthenticated
    && !showAuth
    && !showAdminLogin
    && !adminSetupToken,
  )

  return (
    <div className="min-h-screen w-full bg-background">
      {shouldShowDashboardBootstrapLoader && (
        <div className="fixed inset-0 z-[230] bg-white/95 backdrop-blur-[1px] flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border border-border-light bg-white shadow-card px-6 py-10 text-center">
            <DotLottiePreloader size={230} className="w-full justify-center" />
          </div>
        </div>
      )}
      {isSlowRuntimeOverlayVisible && (
        <div className="fixed inset-0 z-[225] bg-black/25 flex items-center justify-center p-6">
          <div className="w-full max-w-lg rounded-2xl border border-border-light bg-white shadow-card px-6 py-10 text-center">
            <DotLottiePreloader size={220} className="w-full justify-center" />
            <p className="mt-3 text-sm font-medium text-text-primary">{slowRuntimeOverlayMessage}</p>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-3 sm:top-6 sm:right-6 z-[200] rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-[280px] max-w-[calc(100vw-1.5rem)] sm:max-w-[420px] ${toast.type === 'success' ? 'bg-success-bg border-l-4 border-success' : 'bg-error-bg border-l-4 border-error'}`}>
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
                {isLoggingOut ? (
                  <>
                    <DotLottiePreloader size={20} />
                    <span>Processing...</span>
                  </>
                ) : 'Logout'}
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

      {adminSetupToken ? (
        <AdminAccountSetup
          invite={activeAdminInvite}
          otpChallenge={adminSetupOtpChallenge}
          onCreateAccount={handleAdminSetupCreateAccount}
          onVerifyOtp={handleVerifyOtp}
          onResendOtp={handleResendOtp}
          onCancelOtp={handleCancelOtp}
          onReturnToAdminLogin={() => navigateToAdminLogin({ replace: true })}
        />
      ) : !isAuthenticated ? (
        showAdminLogin ? (
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
            <ClientSupportWidget
              clientEmail=""
              clientName="Lead"
              businessName=""
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
        <>
          {isAdminImpersonationActive && (
            <div className="fixed top-0 left-0 right-0 z-[215] bg-warning-bg border-b border-warning/30">
              <div className="min-h-12 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-warning">
                  <ShieldAlert className="w-4 h-4" />
                  <span className="font-medium">
                    You are impersonating {adminImpersonationSession?.impersonatedAdminName || 'an admin'}.
                  </span>
                  <span className="text-xs text-text-secondary">All actions are logged with admin level.</span>
                </div>
                <button
                  type="button"
                  onClick={() => exitAdminImpersonationMode({ silent: false })}
                  className="h-8 px-3 rounded bg-success text-white text-xs font-semibold hover:bg-[#0a6a41] transition-colors inline-flex items-center gap-1.5"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  Exit Admin Impersonation
                </button>
              </div>
            </div>
          )}
          <div className={isAdminImpersonationActive ? 'pt-12' : ''}>
            <AdminWorkspace
              activePage={activePage}
              setActivePage={handleSetActivePage}
              onLogout={handleLogout}
              showToast={showToast}
              adminFirstName={authUser?.fullName?.trim()?.split(/\s+/)?.[0] || clientFirstName}
              currentAdminAccount={currentAdminAccount}
              onRequestImpersonation={handleRequestImpersonation}
              onRequestAdminImpersonation={handleRequestAdminImpersonation}
              impersonationEnabled={impersonationEnabled}
              onAdminActionLog={handleAdminActionLog}
              onCurrentAdminEmailUpdated={handleCurrentAdminEmailUpdated}
            />
          </div>
        </>
      ) : (
        <>
          {isImpersonatingClient && (
            <div className="fixed top-0 left-0 right-0 z-[215] bg-error-bg border-b border-error/30">
              <div className="min-h-12 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2">
                <div className="hidden md:flex items-center gap-2 text-sm text-error">
                  <ShieldAlert className="w-4 h-4" />
                  <span className="font-medium">You are viewing this account as Admin.</span>
                  <span className="text-xs text-text-secondary">All actions are logged.</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:ml-auto">
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

          <div className={`flex min-h-screen w-full bg-background ${isImpersonatingClient ? 'pt-16 md:pt-12' : ''}`}>
            <ClientSidebar
              activePage={activePage}
              setActivePage={handleSetActivePage}
              companyLogo={companyLogo}
              companyName={companyName}
              isBusinessVerified={isBusinessVerificationComplete}
              onLogout={handleLogout}
              isMobileOpen={isMobileSidebarOpen}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
            />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
              <ClientTopBar
                profilePhoto={isImpersonatingClient ? null : profilePhoto}
                clientFirstName={clientFirstName}
                isIdentityVerified={isIdentityVerificationComplete}
                notifications={userNotifications}
                onOpenSidebar={() => setIsMobileSidebarOpen(true)}
                onOpenProfile={() => handleSetActivePage('settings')}
                onNotificationClick={(notification) => {
                  setUserNotifications((prev) => prev.map((item) => (
                    item.id === notification.id ? { ...item, read: true } : item
                  )))
                  if (notification.linkPage) {
                    handleSetActivePage(notification.linkPage, { replace: true })
                    return
                  }
                  if (notification.documentId || notification.fileId) {
                    handleSetActivePage('upload-history', { replace: true })
                  }
                }}
                onMarkAllRead={() => {
                  setUserNotifications(prev => prev.map(n => ({ ...n, read: true })))
                }}
                isImpersonationMode={isImpersonatingClient}
                roleLabel={isImpersonatingClient ? 'Client (Admin View)' : 'Client'}
                forceClientIcon={isImpersonatingClient}
                searchTerm={dashboardSearchTerm}
                onSearchTermChange={handleDashboardSearchTermChange}
                onSearchSubmit={handleDashboardSearchSubmit}
                searchPlaceholder="Search folders, files, upload history, and activities..."
                searchSuggestions={dashboardSearchSuggestions}
                searchState={dashboardSearchState}
                searchResults={dashboardSearchResults}
                onSearchResultSelect={handleDashboardSearchResultSelect}
                onSearchResultsDismiss={dismissDashboardSearchFeedback}
              />
              <main className="p-4 sm:p-6 flex-1 overflow-auto">
                {renderClientPage()}
              </main>
            </div>
            {!isImpersonatingClient && activePage !== 'support' && (
              <ClientSupportWidget
                clientEmail={supportClientEmail}
                clientName={supportClientName}
                businessName={supportBusinessName}
              />
            )}
            {isModalOpen && <ClientAddDocumentModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              initialCategory={modalInitialCategory}
              onUpload={handleUpload}
              showToast={showClientToast}
              expenseClassOptions={expenseClassOptions}
              salesClassOptions={salesClassOptions}
              onCreateClassOption={handleCreateClassOption}
            />}
          </div>
        </>
      )}
    </div>
  )
}

export default App


