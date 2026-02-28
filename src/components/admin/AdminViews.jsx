import { useState, useEffect, useMemo, useRef } from 'react'
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
  Menu,
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
import KiaminaLogo from '../common/KiaminaLogo'
import DotLottiePreloader from '../common/DotLottiePreloader'
import { getNetworkAwareDurationMs } from '../../utils/networkRuntime'
import { playSupportNotificationSound, SUPPORT_NOTIFICATION_INITIAL_DELAY_MS } from '../../utils/supportNotificationSound'
import AdminSupportInboxPanel from './support/AdminSupportInboxPanel'
import {
  deleteSupportLead,
  getSupportCenterSnapshot,
  restoreSupportLead,
  subscribeSupportCenter,
  SUPPORT_TICKET_STATUS,
} from '../../utils/supportCenter'

// Mock admin data
const mockAdmin = {
  id: 'ADM-001',
  fullName: 'System Administrator',
  email: 'admin@kiamina.local',
  role: 'Super Admin',
}

// Mock documents for document review
const mockDocuments = [
  { id: 'DOC-001', filename: 'Expense_Report_Feb2026.pdf', category: 'Expense', user: 'John Doe', businessName: 'Acme Corporation', date: 'Feb 24, 2026 10:30 AM', status: 'Pending Review', priority: 'Normal', confidentiality: 'Internal', notes: '' },
  { id: 'DOC-002', filename: 'Sales_Data_Jan2026.xlsx', category: 'Sales', user: 'Sarah Smith', businessName: 'Delta Ventures', date: 'Feb 23, 2026 2:15 PM', status: 'Approved', priority: 'High', confidentiality: 'Confidential', notes: '' },
  { id: 'DOC-003', filename: 'Bank_Statement_GTB_Feb2026.pdf', category: 'Bank Statement', user: 'Mike Johnson', businessName: 'Prime Logistics', date: 'Feb 22, 2026 9:45 AM', status: 'Pending Review', priority: 'Normal', confidentiality: 'Internal', notes: '' },
  { id: 'DOC-004', filename: 'Transactions_Export.csv', category: 'Bank Statement', user: 'John Doe', businessName: 'Acme Corporation', date: 'Feb 21, 2026 4:20 PM', status: 'Rejected', priority: 'Low', confidentiality: 'Internal', notes: 'Missing required signatures' },
  { id: 'DOC-005', filename: 'Invoice_Template.docx', category: 'Sales', user: 'Sarah Smith', businessName: 'Delta Ventures', date: 'Feb 20, 2026 11:00 AM', status: 'Approved', priority: 'Normal', confidentiality: 'Public', notes: '' },
  { id: 'DOC-006', filename: 'Receipt_Scanned_0042.pdf', category: 'Expense', user: 'Mike Johnson', businessName: 'Prime Logistics', date: 'Feb 19, 2026 3:30 PM', status: 'Pending Review', priority: 'High', confidentiality: 'Internal', notes: '' },
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
const ADMIN_SENT_NOTIFICATIONS_STORAGE_KEY = 'kiaminaAdminSentNotifications'
const ADMIN_NOTIFICATION_DRAFTS_STORAGE_KEY = 'kiaminaAdminNotificationDrafts'
const ADMIN_NOTIFICATION_EDIT_DRAFT_STORAGE_KEY = 'kiaminaAdminNotificationEditDraftId'
const ADMIN_SCHEDULED_NOTIFICATIONS_STORAGE_KEY = 'kiaminaAdminScheduledNotifications'
const CLIENT_BRIEF_NOTIFICATIONS_STORAGE_KEY = 'kiaminaClientBriefNotifications'
const ADMIN_TRASH_STORAGE_KEY = 'kiaminaAdminTrash'
const CLIENT_DOCUMENTS_STORAGE_KEY = 'kiaminaClientDocuments'
const CLIENT_ACTIVITY_STORAGE_KEY = 'kiaminaClientActivityLog'
const CLIENT_STATUS_CONTROL_STORAGE_KEY = 'kiaminaClientStatusControl'
const ADMIN_NOTIFICATIONS_SYNC_EVENT = 'kiamina:admin-notifications-sync'
const COMPLIANCE_STATUS = {
  FULL: '?? Fully Compliant',
  ACTION: '?? Action Required',
  PENDING: '?? Verification Pending',
}
const COMPLIANCE_STATUS_OPTIONS = [
  COMPLIANCE_STATUS.FULL,
  COMPLIANCE_STATUS.ACTION,
  COMPLIANCE_STATUS.PENDING,
]
const waitForNetworkAwareDelay = (context = 'search') => new Promise((resolve) => {
  if (typeof window === 'undefined') {
    resolve()
    return
  }
  window.setTimeout(resolve, getNetworkAwareDurationMs(context))
})
const ADMIN_PAGE_PERMISSION_RULES = {
  'admin-documents': ['view_documents'],
  'admin-leads': ['client_assistance'],
  'admin-communications': ['send_notifications', 'client_assistance'],
  'admin-notifications': ['send_notifications'],
  'admin-clients': ['view_businesses'],
  'admin-activity': ['view_activity_logs'],
  'admin-trash': ['client_assistance'],
  'admin-client-profile': ['view_businesses'],
  'admin-client-documents': ['view_documents'],
  'admin-client-upload-history': ['view_documents'],
}

const CATEGORY_BUCKET_CONFIG = {
  expenses: { bundleKey: 'expenses', label: 'Expense' },
  sales: { bundleKey: 'sales', label: 'Sales' },
  'bank-statements': { bundleKey: 'bankStatements', label: 'Bank Statement' },
}

const DOCUMENT_REVIEW_STATUS = {
  PENDING_REVIEW: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  INFO_REQUESTED: 'Info Requested',
  DELETED: 'Deleted',
}

const normalizeDocumentReviewStatus = (value, fallback = DOCUMENT_REVIEW_STATUS.PENDING_REVIEW) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return fallback
  if (normalized === 'pending' || normalized === 'pending review') return DOCUMENT_REVIEW_STATUS.PENDING_REVIEW
  if (normalized === 'approved') return DOCUMENT_REVIEW_STATUS.APPROVED
  if (normalized === 'rejected') return DOCUMENT_REVIEW_STATUS.REJECTED
  if (normalized === 'info requested' || normalized === 'needs clarification') return DOCUMENT_REVIEW_STATUS.INFO_REQUESTED
  if (normalized === 'draft') return DOCUMENT_REVIEW_STATUS.PENDING_REVIEW
  if (normalized === 'deleted') return DOCUMENT_REVIEW_STATUS.DELETED
  return fallback
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

const toDateTimeLocalValue = (value = '') => {
  const parsedDate = Date.parse(value || '')
  if (!Number.isFinite(parsedDate)) return ''
  const sourceDate = new Date(parsedDate)
  const timezoneOffsetMs = sourceDate.getTimezoneOffset() * 60000
  return new Date(parsedDate - timezoneOffsetMs).toISOString().slice(0, 16)
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

const toTrimmedValue = (value) => String(value || '').trim()

const toIsoOrFallback = (value, fallback = new Date().toISOString()) => {
  const parsed = Date.parse(value || '')
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback
}

const emitAdminNotificationsSync = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_SYNC_EVENT))
}

const createNotificationDraftId = () => (
  `DRF-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`
)

const createScheduledNotificationId = () => (
  `SCH-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`
)

const normalizeSentNotification = (notification = {}, index = 0) => ({
  id: toTrimmedValue(notification.id) || `SN-${index + 1}`,
  title: toTrimmedValue(notification.title) || 'Untitled Notification',
  message: String(notification.message || ''),
  audience: toTrimmedValue(notification.audience) || 'Users',
  dateSent: toTrimmedValue(notification.dateSent) || formatTimestamp(notification.sentAtIso || new Date().toISOString()),
  openRate: toTrimmedValue(notification.openRate) || '--',
  status: toTrimmedValue(notification.status) || 'Delivered',
  sentAtIso: toTrimmedValue(notification.sentAtIso) || new Date().toISOString(),
})

const readAdminSentNotificationsFromStorage = () => {
  const stored = safeParseJson(localStorage.getItem(ADMIN_SENT_NOTIFICATIONS_STORAGE_KEY), null)
  const source = Array.isArray(stored) ? stored : mockSentNotifications
  return source.map((notification, index) => normalizeSentNotification(notification, index))
}

const persistAdminSentNotificationsToStorage = (notifications = []) => {
  const normalized = (Array.isArray(notifications) ? notifications : [])
    .map((notification, index) => normalizeSentNotification(notification, index))
  localStorage.setItem(ADMIN_SENT_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(normalized))
  emitAdminNotificationsSync()
}

const normalizeNotificationDraft = (draft = {}) => ({
  id: toTrimmedValue(draft.id) || createNotificationDraftId(),
  mode: toTrimmedValue(draft.mode) === 'targeted' ? 'targeted' : 'bulk',
  bulkAudience: toTrimmedValue(draft.bulkAudience) || 'all-users',
  deliveryMode: toTrimmedValue(draft.deliveryMode) === 'scheduled' ? 'scheduled' : 'now',
  title: String(draft.title || ''),
  message: String(draft.message || ''),
  link: String(draft.link || ''),
  priority: toTrimmedValue(draft.priority) || 'normal',
  scheduledForIso: toTrimmedValue(draft.scheduledForIso) ? toIsoOrFallback(draft.scheduledForIso, '') : '',
  searchUser: String(draft.searchUser || ''),
  selectedUsers: Array.isArray(draft.selectedUsers) ? [...draft.selectedUsers] : [],
  filters: {
    business: toTrimmedValue(draft.filters?.business),
    country: toTrimmedValue(draft.filters?.country),
    role: toTrimmedValue(draft.filters?.role),
    verificationStatus: toTrimmedValue(draft.filters?.verificationStatus),
    registrationStage: toTrimmedValue(draft.filters?.registrationStage),
  },
  status: 'Draft',
  createdAtIso: toTrimmedValue(draft.createdAtIso) || new Date().toISOString(),
  updatedAtIso: toTrimmedValue(draft.updatedAtIso) || new Date().toISOString(),
})

const readAdminNotificationDraftsFromStorage = () => {
  const stored = safeParseJson(localStorage.getItem(ADMIN_NOTIFICATION_DRAFTS_STORAGE_KEY), [])
  if (!Array.isArray(stored)) return []
  return stored
    .map((draft) => normalizeNotificationDraft(draft))
    .sort((left, right) => (Date.parse(right.updatedAtIso || '') || 0) - (Date.parse(left.updatedAtIso || '') || 0))
}

const persistAdminNotificationDraftsToStorage = (drafts = []) => {
  const normalized = (Array.isArray(drafts) ? drafts : [])
    .map((draft) => normalizeNotificationDraft(draft))
    .sort((left, right) => (Date.parse(right.updatedAtIso || '') || 0) - (Date.parse(left.updatedAtIso || '') || 0))
  localStorage.setItem(ADMIN_NOTIFICATION_DRAFTS_STORAGE_KEY, JSON.stringify(normalized))
  emitAdminNotificationsSync()
}

const upsertAdminNotificationDraftInStorage = (draft = {}) => {
  const normalizedDraft = normalizeNotificationDraft(draft)
  const existingDrafts = readAdminNotificationDraftsFromStorage()
  const hasMatch = existingDrafts.some((item) => item.id === normalizedDraft.id)
  const nextDrafts = hasMatch
    ? existingDrafts.map((item) => (item.id === normalizedDraft.id ? normalizedDraft : item))
    : [normalizedDraft, ...existingDrafts]
  persistAdminNotificationDraftsToStorage(nextDrafts)
  return normalizedDraft
}

const removeAdminNotificationDraftFromStorage = (draftId = '') => {
  const normalizedDraftId = toTrimmedValue(draftId)
  if (!normalizedDraftId) return
  const nextDrafts = readAdminNotificationDraftsFromStorage().filter((draft) => draft.id !== normalizedDraftId)
  persistAdminNotificationDraftsToStorage(nextDrafts)
}

const normalizeScheduledNotificationStatus = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'sent') return 'Sent'
  if (normalized === 'cancelled') return 'Cancelled'
  if (normalized === 'failed') return 'Failed'
  if (normalized === 'sending') return 'Sending'
  return 'Scheduled'
}

const normalizeScheduledNotification = (entry = {}, index = 0) => {
  const createdAtIso = toIsoOrFallback(entry.createdAtIso)
  const scheduledForIso = toIsoOrFallback(entry.scheduledForIso, createdAtIso)
  return {
    id: toTrimmedValue(entry.id) || createScheduledNotificationId(),
    mode: toTrimmedValue(entry.mode) === 'targeted' ? 'targeted' : 'bulk',
    bulkAudience: toTrimmedValue(entry.bulkAudience) || 'all-users',
    title: toTrimmedValue(entry.title) || `Scheduled Notification ${index + 1}`,
    message: String(entry.message || ''),
    link: toTrimmedValue(entry.link),
    priority: toTrimmedValue(entry.priority) || 'normal',
    selectedUsers: Array.isArray(entry.selectedUsers) ? [...entry.selectedUsers] : [],
    status: normalizeScheduledNotificationStatus(entry.status),
    createdAtIso,
    updatedAtIso: toIsoOrFallback(entry.updatedAtIso, createdAtIso),
    scheduledForIso,
    sentAtIso: toTrimmedValue(entry.sentAtIso) ? toIsoOrFallback(entry.sentAtIso, '') : '',
    lastAttemptAtIso: toTrimmedValue(entry.lastAttemptAtIso) ? toIsoOrFallback(entry.lastAttemptAtIso, '') : '',
    recipientCount: Number(entry.recipientCount || 0),
    emailSuccessCount: Number(entry.emailSuccessCount || 0),
    emailFailureCount: Number(entry.emailFailureCount || 0),
    sentNotificationId: toTrimmedValue(entry.sentNotificationId),
    deliveryOrigin: toTrimmedValue(entry.deliveryOrigin) || 'scheduled',
  }
}

const readAdminScheduledNotificationsFromStorage = () => {
  const stored = safeParseJson(localStorage.getItem(ADMIN_SCHEDULED_NOTIFICATIONS_STORAGE_KEY), [])
  if (!Array.isArray(stored)) return []
  return stored
    .map((entry, index) => normalizeScheduledNotification(entry, index))
    .sort((left, right) => (Date.parse(left.scheduledForIso || '') || 0) - (Date.parse(right.scheduledForIso || '') || 0))
}

const persistAdminScheduledNotificationsToStorage = (entries = []) => {
  const normalized = (Array.isArray(entries) ? entries : [])
    .map((entry, index) => normalizeScheduledNotification(entry, index))
    .sort((left, right) => (Date.parse(left.scheduledForIso || '') || 0) - (Date.parse(right.scheduledForIso || '') || 0))
  localStorage.setItem(ADMIN_SCHEDULED_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(normalized))
  emitAdminNotificationsSync()
}

const upsertAdminScheduledNotificationInStorage = (entry = {}) => {
  const normalizedEntry = normalizeScheduledNotification(entry)
  const existingEntries = readAdminScheduledNotificationsFromStorage()
  const hasMatch = existingEntries.some((item) => item.id === normalizedEntry.id)
  const nextEntries = hasMatch
    ? existingEntries.map((item) => (item.id === normalizedEntry.id ? normalizedEntry : item))
    : [...existingEntries, normalizedEntry]
  persistAdminScheduledNotificationsToStorage(nextEntries)
  return normalizedEntry
}

const removeAdminScheduledNotificationFromStorage = (scheduledId = '') => {
  const normalizedId = toTrimmedValue(scheduledId)
  if (!normalizedId) return
  const nextEntries = readAdminScheduledNotificationsFromStorage().filter((entry) => entry.id !== normalizedId)
  persistAdminScheduledNotificationsToStorage(nextEntries)
}

const normalizeNotificationRecipient = (recipient = {}, index = 0) => {
  const normalizedEmail = String(recipient.email || '').trim().toLowerCase()
  return {
    id: toTrimmedValue(recipient.id) || `REC-${index + 1}`,
    fullName: toTrimmedValue(recipient.fullName) || normalizedEmail || `User ${index + 1}`,
    email: normalizedEmail,
    businessName: toTrimmedValue(recipient.businessName) || 'Unknown Business',
    role: toTrimmedValue(recipient.role) || 'Client',
    country: toTrimmedValue(recipient.country) || '--',
    verificationStatus: toTrimmedValue(recipient.verificationStatus) || 'Pending',
    registrationStage: toTrimmedValue(recipient.registrationStage) || 'Onboarding',
  }
}

const getNotificationRecipientsDirectory = () => {
  const byEmail = new Map()
  const pushRecipient = (recipient = {}) => {
    const normalized = normalizeNotificationRecipient(recipient)
    if (!normalized.email) return
    byEmail.set(normalized.email, normalized)
  }

  mockUsers.forEach((user) => pushRecipient(user))

  const rawAccounts = safeParseJson(localStorage.getItem(ACCOUNTS_STORAGE_KEY), [])
  if (Array.isArray(rawAccounts)) {
    rawAccounts.forEach((account, index) => {
      const normalizedEmail = String(account?.email || '').trim().toLowerCase()
      if (!normalizedEmail) return
      const normalizedRole = normalizeRoleWithLegacyFallback(account?.role, normalizedEmail)
      if (normalizedRole === 'admin') return
      pushRecipient({
        id: account?.id || `ACC-${index + 1}`,
        fullName: account?.fullName || normalizedEmail,
        email: normalizedEmail,
        businessName: account?.businessName || account?.companyName || '',
        role: account?.role || (normalizedRole === 'client' ? 'Client' : 'User'),
      })
    })
  }

  const clientRows = readClientRows()
  clientRows.forEach((client, index) => {
    pushRecipient({
      id: client.id || `CLI-${index + 1}`,
      fullName: client.primaryContact || client.businessName || client.email,
      email: client.email,
      businessName: client.businessName,
      role: 'Client',
      country: client.country,
      verificationStatus: String(client.verificationStatus || '').includes('Fully')
        ? 'Verified'
        : String(client.verificationStatus || '').includes('Action')
          ? 'Rejected'
          : 'Pending',
      registrationStage: client.onboardingStatus === 'Completed' ? 'Completed' : 'Onboarding',
    })
  })

  return Array.from(byEmail.values())
    .filter((recipient) => recipient.email)
    .sort((left, right) => left.fullName.localeCompare(right.fullName))
}

const resolveNotificationRecipients = ({
  mode = 'bulk',
  bulkAudience = 'all-users',
  selectedUsers = [],
} = {}) => {
  const directory = getNotificationRecipientsDirectory()
  if (mode === 'targeted') {
    const selectedIdSet = new Set((Array.isArray(selectedUsers) ? selectedUsers : []).map((id) => String(id)))
    return directory.filter((recipient) => selectedIdSet.has(String(recipient.id)))
  }
  if (bulkAudience === 'pending-verification') {
    return directory.filter((recipient) => recipient.verificationStatus === 'Pending')
  }
  if (bulkAudience === 'all-accountants') {
    return directory.filter((recipient) => recipient.role.toLowerCase() === 'accountant')
  }
  if (bulkAudience === 'all-businesses') {
    return directory.filter((recipient) => recipient.businessName && recipient.businessName !== 'Unknown Business')
  }
  return directory
}

const getNotificationAudienceLabel = ({
  mode = 'bulk',
  bulkAudience = 'all-users',
  selectedUsers = [],
} = {}) => {
  if (mode === 'targeted') return `${selectedUsers.length} Selected Users`
  return bulkAudience
    .split('-')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

const readClientBriefNotificationsFromStorage = (email = '') => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail) return []
  const scopedKey = `${CLIENT_BRIEF_NOTIFICATIONS_STORAGE_KEY}:${normalizedEmail}`
  const stored = safeParseJson(localStorage.getItem(scopedKey), [])
  if (!Array.isArray(stored)) return []
  return stored
}

const appendClientBriefNotificationsToStorage = (email = '', entries = []) => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const additions = Array.isArray(entries) ? entries : []
  if (!normalizedEmail || additions.length === 0) return
  const scopedKey = `${CLIENT_BRIEF_NOTIFICATIONS_STORAGE_KEY}:${normalizedEmail}`
  const existingEntries = readClientBriefNotificationsFromStorage(normalizedEmail)
  localStorage.setItem(scopedKey, JSON.stringify([...additions, ...existingEntries].slice(0, 100)))
}

const deliverNotificationEmail = async ({
  recipient,
  notification,
  sentAtIso,
  deliveryOrigin = 'manual',
}) => {
  if (!recipient?.email) return false
  try {
    const response = await fetch('/api/notifications/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipient.email,
        subject: notification.title,
        message: notification.message,
        link: notification.link || '',
        priority: notification.priority || 'normal',
        sentAtIso,
        deliveryOrigin,
      }),
    })
    return response.ok
  } catch {
    // Fallback to local demo flow when backend email endpoint is unavailable.
    return false
  }
}

const dispatchAdminNotification = async ({
  mode = 'bulk',
  bulkAudience = 'all-users',
  selectedUsers = [],
  title = '',
  message = '',
  link = '',
  priority = 'normal',
  deliveryOrigin = 'manual',
}) => {
  const recipients = resolveNotificationRecipients({ mode, bulkAudience, selectedUsers })
  const sentAtIso = new Date().toISOString()
  const normalizedTitle = toTrimmedValue(title) || 'Untitled Notification'
  const normalizedMessage = String(message || '')
  const normalizedLink = toTrimmedValue(link)
  const normalizedPriority = toTrimmedValue(priority) || 'normal'
  const normalizedAudience = getNotificationAudienceLabel({ mode, bulkAudience, selectedUsers })

  if (recipients.length === 0) {
    return {
      ok: false,
      reason: 'empty-recipients',
      recipients: [],
      recipientCount: 0,
      sentNotification: null,
      emailSuccessCount: 0,
      emailFailureCount: 0,
    }
  }

  const emailResults = await Promise.all(
    recipients.map((recipient) => deliverNotificationEmail({
      recipient,
      notification: {
        title: normalizedTitle,
        message: normalizedMessage,
        link: normalizedLink,
        priority: normalizedPriority,
      },
      sentAtIso,
      deliveryOrigin,
    })),
  )
  const emailSuccessCount = emailResults.filter(Boolean).length
  const emailFailureCount = Math.max(0, recipients.length - emailSuccessCount)

  recipients.forEach((recipient, index) => {
    const briefEntry = {
      id: `CBN-${Date.now().toString(36).toUpperCase()}-${index}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
      type: 'admin-notification',
      title: normalizedTitle,
      message: normalizedMessage,
      link: normalizedLink,
      priority: normalizedPriority,
      sentAtIso,
      read: false,
    }
    appendClientBriefNotificationsToStorage(recipient.email, [briefEntry])
    appendScopedClientActivityLog(recipient.email, {
      actorName: 'Kiamina Notifications',
      actorRole: 'system',
      action: normalizedTitle,
      details: normalizedMessage,
    })
  })

  const sentNotification = normalizeSentNotification({
    id: `SN-${Date.now().toString(36).toUpperCase()}`,
    title: normalizedTitle,
    message: normalizedMessage,
    audience: normalizedAudience,
    dateSent: formatTimestamp(sentAtIso),
    openRate: '--',
    status: emailFailureCount > 0 ? 'Partially Delivered' : 'Delivered',
    sentAtIso,
  })
  persistAdminSentNotificationsToStorage([
    sentNotification,
    ...readAdminSentNotificationsFromStorage(),
  ])

  return {
    ok: true,
    recipients,
    recipientCount: recipients.length,
    sentNotification,
    emailSuccessCount,
    emailFailureCount,
  }
}

let scheduledNotificationProcessorPromise = null

const runScheduledNotificationProcessor = async () => {
  if (scheduledNotificationProcessorPromise) return scheduledNotificationProcessorPromise
  scheduledNotificationProcessorPromise = (async () => {
    const nowMs = Date.now()
    const scheduledEntries = readAdminScheduledNotificationsFromStorage()
    const dueEntries = scheduledEntries.filter((entry) => (
      entry.status === 'Scheduled'
      && Number.isFinite(Date.parse(entry.scheduledForIso || ''))
      && Date.parse(entry.scheduledForIso) <= nowMs
    ))

    if (dueEntries.length === 0) {
      return { processedCount: 0, deliveredCount: 0, failedCount: 0 }
    }

    const processingById = new Map(dueEntries.map((entry) => [
      entry.id,
      {
        ...entry,
        status: 'Sending',
        updatedAtIso: new Date().toISOString(),
        lastAttemptAtIso: new Date().toISOString(),
      },
    ]))
    const sendingSnapshot = scheduledEntries.map((entry) => processingById.get(entry.id) || entry)
    persistAdminScheduledNotificationsToStorage(sendingSnapshot)

    let deliveredCount = 0
    let failedCount = 0
    let updatedEntries = [...sendingSnapshot]
    for (const entry of dueEntries) {
      const result = await dispatchAdminNotification({
        mode: entry.mode,
        bulkAudience: entry.bulkAudience,
        selectedUsers: entry.selectedUsers,
        title: entry.title,
        message: entry.message,
        link: entry.link,
        priority: entry.priority,
        deliveryOrigin: 'scheduled',
      })

      const nowIso = new Date().toISOString()
      const nextStatus = result.ok ? 'Sent' : 'Failed'
      if (result.ok) deliveredCount += 1
      else failedCount += 1
      updatedEntries = updatedEntries.map((candidate) => (
        candidate.id === entry.id
          ? normalizeScheduledNotification({
            ...candidate,
            status: nextStatus,
            sentAtIso: result.sentNotification?.sentAtIso || candidate.sentAtIso || '',
            updatedAtIso: nowIso,
            lastAttemptAtIso: nowIso,
            recipientCount: result.recipientCount || 0,
            emailSuccessCount: result.emailSuccessCount || 0,
            emailFailureCount: result.emailFailureCount || 0,
            sentNotificationId: result.sentNotification?.id || '',
          })
          : candidate
      ))
    }

    persistAdminScheduledNotificationsToStorage(updatedEntries)
    return {
      processedCount: dueEntries.length,
      deliveredCount,
      failedCount,
    }
  })()

  try {
    return await scheduledNotificationProcessorPromise
  } finally {
    scheduledNotificationProcessorPromise = null
  }
}

const createAdminTrashEntryId = () => (
  `TRASH-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`
)

const normalizeAdminTrashEntry = (entry = {}, index = 0) => ({
  id: toTrimmedValue(entry.id) || `TRASH-${index + 1}`,
  entityType: toTrimmedValue(entry.entityType) || 'unknown',
  entityLabel: toTrimmedValue(entry.entityLabel) || 'Deleted Item',
  description: String(entry.description || ''),
  deletedByName: toTrimmedValue(entry.deletedByName) || 'Admin User',
  deletedAtIso: toTrimmedValue(entry.deletedAtIso) || new Date().toISOString(),
  payload: entry.payload && typeof entry.payload === 'object' ? entry.payload : {},
})

const readAdminTrashEntriesFromStorage = () => {
  const stored = safeParseJson(localStorage.getItem(ADMIN_TRASH_STORAGE_KEY), [])
  if (!Array.isArray(stored)) return []
  return stored
    .map((entry, index) => normalizeAdminTrashEntry(entry, index))
    .sort((left, right) => (Date.parse(right.deletedAtIso || '') || 0) - (Date.parse(left.deletedAtIso || '') || 0))
}

const persistAdminTrashEntriesToStorage = (entries = []) => {
  const normalizedEntries = (Array.isArray(entries) ? entries : [])
    .map((entry, index) => normalizeAdminTrashEntry(entry, index))
    .sort((left, right) => (Date.parse(right.deletedAtIso || '') || 0) - (Date.parse(left.deletedAtIso || '') || 0))
  localStorage.setItem(ADMIN_TRASH_STORAGE_KEY, JSON.stringify(normalizedEntries))
}

const appendAdminTrashEntryToStorage = (entry = {}) => {
  const normalizedEntry = normalizeAdminTrashEntry({
    ...entry,
    id: toTrimmedValue(entry.id) || createAdminTrashEntryId(),
    deletedAtIso: toTrimmedValue(entry.deletedAtIso) || new Date().toISOString(),
  })
  const existingEntries = readAdminTrashEntriesFromStorage()
  persistAdminTrashEntriesToStorage([normalizedEntry, ...existingEntries])
  return normalizedEntry
}

const removeAdminTrashEntryFromStorage = (entryId = '') => {
  const normalizedEntryId = toTrimmedValue(entryId)
  if (!normalizedEntryId) return
  const nextEntries = readAdminTrashEntriesFromStorage().filter((entry) => entry.id !== normalizedEntryId)
  persistAdminTrashEntriesToStorage(nextEntries)
}

const clearAdminTrashEntriesFromStorage = () => {
  localStorage.removeItem(ADMIN_TRASH_STORAGE_KEY)
}

const normalizeComplianceStatus = (value, fallback = COMPLIANCE_STATUS.PENDING) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return fallback

  if (
    normalized.includes('fully compliant')
    || normalized === 'verified'
    || normalized === 'approved'
    || normalized === 'compliant'
  ) {
    return COMPLIANCE_STATUS.FULL
  }

  if (
    normalized.includes('action required')
    || normalized === 'suspended'
    || normalized === 'rejected'
    || normalized.includes('clarification')
    || normalized.includes('info requested')
  ) {
    return COMPLIANCE_STATUS.ACTION
  }

  if (
    normalized.includes('verification pending')
    || normalized === 'pending'
    || normalized.includes('awaiting')
  ) {
    return COMPLIANCE_STATUS.PENDING
  }

  return fallback
}

const isActionRequiredStatus = (status) => (
  normalizeComplianceStatus(status, '') === COMPLIANCE_STATUS.ACTION
)

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
      status: normalizeDocumentReviewStatus(item.status || DOCUMENT_REVIEW_STATUS.PENDING_REVIEW),
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
      action: 'Compliance status',
      details: `Current compliance state: ${client?.verificationStatus || COMPLIANCE_STATUS.PENDING}.`,
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

const flattenDocumentRows = (rows = []) => {
  const safeRows = Array.isArray(rows) ? rows : []
  return safeRows.flatMap((row, rowIndex) => {
    if (!row?.isFolder) {
      return [{ ...row, __rowIndex: rowIndex }]
    }
    const files = Array.isArray(row.files) ? row.files : []
    return files.map((file, fileIndex) => ({
      ...file,
      folderId: file.folderId || row.id,
      folderName: file.folderName || row.folderName || '',
      __rowIndex: `${rowIndex}-${fileIndex}`,
    }))
  })
}

const buildReviewFileSnapshot = (row = {}, nextStatus = DOCUMENT_REVIEW_STATUS.PENDING_REVIEW) => ({
  filename: row.filename || 'Document',
  extension: normalizeDocumentType(row),
  status: normalizeDocumentReviewStatus(nextStatus),
  class: row.class || row.expenseClass || row.salesClass || '',
  folderId: row.folderId || '',
  folderName: row.folderName || '',
  previewUrl: row.previewUrl || null,
})

const normalizeReviewDocumentRow = (client, bucketKey, row, index) => ({
  id: `${client.email || 'client'}:${bucketKey}:${row.id || row.fileId || index}`,
  filename: row.filename || 'Document',
  category: row.category || (bucketKey === 'bankStatements' ? 'Bank Statement' : bucketKey === 'sales' ? 'Sales' : 'Expense'),
  user: row.user || client.primaryContact || 'Client User',
  businessName: client.businessName || '--',
  date: row.date || '--',
  status: normalizeDocumentReviewStatus(row.status || DOCUMENT_REVIEW_STATUS.PENDING_REVIEW),
  priority: row.priority || row.processingPriority || 'Normal',
  confidentiality: row.confidentiality || row.confidentialityLevel || 'Internal',
  notes: row.notes || row.internalNotes || '',
  isLocked: Boolean(row.isLocked) || normalizeDocumentReviewStatus(row.status) === DOCUMENT_REVIEW_STATUS.APPROVED,
  approvedBy: row.approvedBy || '',
  approvedAtIso: row.approvedAtIso || null,
  rejectedBy: row.rejectedBy || '',
  rejectedAtIso: row.rejectedAtIso || null,
  rejectionReason: row.rejectionReason || '',
  extension: normalizeDocumentType(row),
  source: {
    clientEmail: client.email,
    bucketKey,
    rowId: row.id,
    fileId: row.fileId || '',
    folderId: row.folderId || '',
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
      flattenDocumentRows(rows).forEach((row, index) => {
        documents.push(normalizeReviewDocumentRow(client, bucketKey, row, index))
      })
    })
  })
  if (documents.length > 0) return documents
  return mockDocuments.map((row, index) => ({
    ...row,
    status: normalizeDocumentReviewStatus(row.status || DOCUMENT_REVIEW_STATUS.PENDING_REVIEW),
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

const updateClientDocumentReviewStatus = (document, nextStatus, notes = '', options = {}) => {
  if (!document?.source?.clientEmail || !document?.source?.bucketKey) return null
  const clientEmail = document.source.clientEmail.trim().toLowerCase()
  if (!clientEmail) return null

  const normalizedNextStatus = normalizeDocumentReviewStatus(nextStatus, DOCUMENT_REVIEW_STATUS.PENDING_REVIEW)
  const performedBy = toTrimmedValue(options?.performedBy) || 'Admin User'
  const unlockReason = toTrimmedValue(options?.unlockReason)
  const timestampIso = new Date().toISOString()

  const key = `${CLIENT_DOCUMENTS_STORAGE_KEY}:${clientEmail}`
  const client = readClientRows().find((item) => item.email === clientEmail)
  const bundle = readClientDocumentBundle(client || { email: clientEmail })
  const targetBucket = document.source.bucketKey
  const targetRows = Array.isArray(bundle[targetBucket]) ? bundle[targetBucket] : []

  let updatedTarget = false
  const applyStatusToFile = (row = {}) => {
    if (!matchDocumentRow(row, document.source)) return row
    const previousStatus = normalizeDocumentReviewStatus(row.status || DOCUMENT_REVIEW_STATUS.PENDING_REVIEW)
    const isUnlockingApproved = (
      previousStatus === DOCUMENT_REVIEW_STATUS.APPROVED
      && normalizedNextStatus === DOCUMENT_REVIEW_STATUS.PENDING_REVIEW
    )
    if (isUnlockingApproved && !unlockReason) return row

    updatedTarget = true
    let nextNotes = notes || row.notes || ''
    let versionAction = `Status changed to ${normalizedNextStatus}`
    let activityType = 'status-change'
    let activityDescription = `${row.filename || document.filename || 'Document'} status changed to ${normalizedNextStatus}.`
    const nextPatch = {
      status: normalizedNextStatus,
      notes: nextNotes,
      updatedAtIso: timestampIso,
    }

    if (normalizedNextStatus === DOCUMENT_REVIEW_STATUS.APPROVED) {
      versionAction = 'Approved'
      activityDescription = `File approved by ${performedBy}.`
      nextPatch.isLocked = true
      nextPatch.lockedAtIso = timestampIso
      nextPatch.approvedBy = performedBy
      nextPatch.approvedAtIso = timestampIso
      nextPatch.unlockedBy = ''
      nextPatch.unlockedAtIso = null
      nextPatch.unlockReason = ''
    } else if (normalizedNextStatus === DOCUMENT_REVIEW_STATUS.REJECTED) {
      versionAction = 'Rejected'
      activityDescription = `File rejected by ${performedBy}${nextNotes ? ` - Reason: ${nextNotes}.` : '.'}`
      nextPatch.isLocked = false
      nextPatch.lockedAtIso = null
      nextPatch.rejectedBy = performedBy
      nextPatch.rejectedAtIso = timestampIso
      nextPatch.rejectionReason = nextNotes || row.rejectionReason || ''
    } else if (normalizedNextStatus === DOCUMENT_REVIEW_STATUS.INFO_REQUESTED) {
      versionAction = 'Info Requested'
      activityDescription = `Information requested by ${performedBy}${nextNotes ? ` - ${nextNotes}.` : '.'}`
      nextPatch.isLocked = false
      nextPatch.lockedAtIso = null
      nextPatch.requiredAction = nextNotes || row.requiredAction || ''
      nextPatch.infoRequestDetails = nextNotes || row.infoRequestDetails || ''
      nextPatch.adminComment = nextNotes || row.adminComment || ''
      nextPatch.adminNotes = nextNotes || row.adminNotes || ''
    } else if (normalizedNextStatus === DOCUMENT_REVIEW_STATUS.PENDING_REVIEW) {
      nextPatch.isLocked = false
      nextPatch.lockedAtIso = null
      if (isUnlockingApproved) {
        versionAction = 'Unlocked'
        activityType = 'unlock'
        activityDescription = `File unlocked by ${performedBy} - Reason: ${unlockReason}.`
        nextPatch.unlockedBy = performedBy
        nextPatch.unlockedAtIso = timestampIso
        nextPatch.unlockReason = unlockReason
      }
    }

    const nextRow = {
      ...row,
      ...nextPatch,
    }
    const previousVersions = Array.isArray(nextRow.versions) ? nextRow.versions : []
    const previousActivityLog = Array.isArray(nextRow.activityLog) ? nextRow.activityLog : []
    const versionNumber = previousVersions.length + 1
    const versionEntry = {
      versionNumber,
      action: versionAction,
      performedBy,
      timestamp: timestampIso,
      notes: nextNotes || '',
      fileSnapshot: buildReviewFileSnapshot(nextRow, normalizedNextStatus),
    }
    const activityEntry = {
      id: `FACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actionType: activityType,
      description: activityDescription,
      performedBy,
      timestamp: timestampIso,
    }
    return {
      ...nextRow,
      versions: [...previousVersions, versionEntry],
      activityLog: [...previousActivityLog, activityEntry],
      uploadInfo: {
        ...(nextRow.uploadInfo || {}),
        lastModifiedAtIso: timestampIso,
        totalVersions: versionNumber,
      },
    }
  }

  const nextTargetRows = targetRows.map((row) => {
    if (!row?.isFolder) return applyStatusToFile(row)
    const sourceFiles = Array.isArray(row.files) ? row.files : []
    return {
      ...row,
      files: sourceFiles.map((file) => applyStatusToFile(file)),
    }
  })

  if (!updatedTarget) return null

  const nextUploadHistory = (Array.isArray(bundle.uploadHistory) ? bundle.uploadHistory : []).map((row) => {
    const matchesFileId = (
      document.source.fileId
      && row.fileId
      && String(row.fileId) === String(document.source.fileId)
    )
    const matchesFileName = String(row.filename || '').toLowerCase() === String(document.source.filename || '').toLowerCase()
    if (!matchesFileId && !matchesFileName) return row
    return {
      ...row,
      status: normalizedNextStatus,
    }
  })

  const nextBundle = {
    ...bundle,
    [targetBucket]: nextTargetRows,
    uploadHistory: nextUploadHistory,
  }
  localStorage.setItem(key, JSON.stringify(nextBundle))

  const activityAction = normalizedNextStatus === DOCUMENT_REVIEW_STATUS.APPROVED
    ? 'File approved by Admin.'
    : normalizedNextStatus === DOCUMENT_REVIEW_STATUS.REJECTED
      ? `File rejected by Admin${notes ? ` - Reason: ${notes}.` : '.'}`
      : normalizedNextStatus === DOCUMENT_REVIEW_STATUS.INFO_REQUESTED
        ? `Info requested by Admin${notes ? ` - ${notes}.` : '.'}`
        : normalizedNextStatus === DOCUMENT_REVIEW_STATUS.PENDING_REVIEW && unlockReason
          ? `File unlocked by Super Admin - Reason: ${unlockReason}.`
          : `Document review updated to ${normalizedNextStatus}.`

  appendScopedClientActivityLog(clientEmail, {
    actorName: performedBy,
    actorRole: 'admin',
    action: activityAction,
    details: `${document.filename || 'Document'} status changed to ${normalizedNextStatus}.`,
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
    const statusVerification = normalizeComplianceStatus(statusControl?.verificationStatus, '')
    let verificationStatus = statusVerification || (verificationPending ? COMPLIANCE_STATUS.PENDING : COMPLIANCE_STATUS.FULL)
    if (accountSuspended && verificationStatus === COMPLIANCE_STATUS.FULL) {
      verificationStatus = COMPLIANCE_STATUS.ACTION
    }

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
function AdminSidebar({
  activePage,
  setActivePage,
  onLogout,
  currentAdminAccount,
  isMobileOpen = false,
  onCloseMobile,
}) {
  const [leadCount, setLeadCount] = useState(() => {
    const snapshot = getSupportCenterSnapshot()
    return Array.isArray(snapshot?.leads) ? snapshot.leads.length : 0
  })
  const [supportUnreadCount, setSupportUnreadCount] = useState(() => {
    const snapshot = getSupportCenterSnapshot()
    const tickets = Array.isArray(snapshot?.tickets) ? snapshot.tickets : []
    return tickets.reduce((total, ticket) => total + Number(ticket?.unreadByAdmin || 0), 0)
  })
  const [trashCount, setTrashCount] = useState(() => readAdminTrashEntriesFromStorage().length)

  const navItems = [
    { id: 'admin-dashboard', label: 'Admin Dashboard', icon: LayoutDashboard, badgeCount: 0, badgeTone: 'neutral' },
    { id: 'admin-documents', label: 'Document Review', icon: FileText, badgeCount: 0, badgeTone: 'neutral' },
    { id: 'admin-leads', label: 'Leads', icon: UsersRound, badgeCount: leadCount, badgeTone: 'neutral' },
    { id: 'admin-communications', label: 'Communications', icon: Mail, badgeCount: supportUnreadCount, badgeTone: 'alert' },
    { id: 'admin-notifications', label: 'Send Notification', icon: Send, badgeCount: 0, badgeTone: 'neutral' },
    { id: 'admin-clients', label: 'Client Management', icon: Users, badgeCount: 0, badgeTone: 'neutral' },
  ]

  const footerNavItems = [
    { id: 'admin-activity', label: 'Activity Log', icon: Activity, badgeCount: 0, badgeTone: 'neutral' },
    { id: 'admin-trash', label: 'Trash', icon: Trash2, badgeCount: trashCount, badgeTone: 'neutral' },
    { id: 'admin-settings', label: 'Admin Settings', icon: Settings, badgeCount: 0, badgeTone: 'neutral' },
  ]

  const displayAdmin = normalizeAdminAccount({
    ...mockAdmin,
    role: 'admin',
    ...currentAdminAccount,
  })
  const displayRoleLabel = getAdminLevelLabel(displayAdmin.adminLevel)
  const visibleNavItems = navItems.filter((item) => canAccessAdminPage(item.id, displayAdmin))
  const visibleFooterNavItems = footerNavItems.filter((item) => canAccessAdminPage(item.id, displayAdmin))
  const handleNavSelect = (pageId) => {
    setActivePage(pageId)
    onCloseMobile?.()
  }

  useEffect(() => {
    const syncSupportStats = (snapshot) => {
      const leads = Array.isArray(snapshot?.leads) ? snapshot.leads : []
      const tickets = Array.isArray(snapshot?.tickets) ? snapshot.tickets : []
      setLeadCount(leads.length)
      setSupportUnreadCount(tickets.reduce((total, ticket) => total + Number(ticket?.unreadByAdmin || 0), 0))
    }
    syncSupportStats(getSupportCenterSnapshot())
    const unsubscribe = subscribeSupportCenter((snapshot) => syncSupportStats(snapshot))

    const syncTrashStats = () => setTrashCount(readAdminTrashEntriesFromStorage().length)
    syncTrashStats()
    const handleStorage = (event) => {
      if (!event.key || event.key === ADMIN_TRASH_STORAGE_KEY) {
        syncTrashStats()
      }
    }
    const runProcessor = () => {
      void runScheduledNotificationProcessor()
    }
    runProcessor()
    const processorIntervalId = window.setInterval(runProcessor, 15000)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') runProcessor()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener(ADMIN_NOTIFICATIONS_SYNC_EVENT, runProcessor)
    window.addEventListener('storage', handleStorage)
    return () => {
      unsubscribe()
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(ADMIN_NOTIFICATIONS_SYNC_EVENT, runProcessor)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.clearInterval(processorIntervalId)
    }
  }, [])

  const getBadgeClasses = (badgeTone = 'neutral') => (
    badgeTone === 'alert'
      ? 'bg-error text-white'
      : 'bg-background border border-border-light text-text-secondary'
  )

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          onClick={() => onCloseMobile?.()}
          aria-label="Close admin navigation"
          className="fixed inset-0 bg-black/35 z-40 lg:hidden"
        />
      )}
      <aside className={`w-64 bg-white border-r border-border fixed left-0 top-0 h-screen flex flex-col z-50 transform transition-transform duration-200 ease-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-4 border-b border-border-light">
          <KiaminaLogo className="h-11 w-auto" />
          <div className="text-[11px] text-text-muted uppercase tracking-wide mt-2">Admin Control</div>
        </div>

        <div className="p-4 border-b border-border-light">
          <div className="text-sm font-medium text-text-primary">{displayAdmin.fullName}</div>
          <div className="text-xs text-text-muted mt-1">Role: {displayRoleLabel}</div>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavSelect(item.id)}
              className={"w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all " + (activePage === item.id ? 'bg-primary-tint text-primary border-l-[3px] border-primary' : 'text-text-secondary hover:bg-background hover:text-text-primary border-l-[3px] border-transparent')}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {(item.id === 'admin-leads' || Number(item.badgeCount || 0) > 0) && (
                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold ${getBadgeClasses(item.badgeTone)}`}>
                  {Number(item.badgeCount) > 99 ? '99+' : Number(item.badgeCount)}
                </span>
              )}
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
              onClick={() => handleNavSelect(item.id)}
              className={"w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all " + (activePage === item.id ? 'bg-primary-tint text-primary border-l-[3px] border-primary' : 'text-text-secondary hover:bg-background hover:text-text-primary border-l-[3px] border-transparent')}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {(item.id === 'admin-trash' || Number(item.badgeCount || 0) > 0) && (
                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold ${getBadgeClasses(item.badgeTone)}`}>
                  {Number(item.badgeCount) > 99 ? '99+' : Number(item.badgeCount)}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="py-3 border-t border-border-light">
          <button
            onClick={() => {
              onCloseMobile?.()
              onLogout()
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-text-secondary hover:bg-background hover:text-text-primary transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}

// Admin Top Bar with notifications dropdown
function AdminTopBar({
  adminFirstName,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  currentAdminAccount,
  onOpenSidebar,
  searchTerm = '',
  onSearchTermChange,
  onSearchSubmit,
  searchSuggestions = [],
  searchState = 'idle',
  searchResults = [],
  onSearchResultSelect,
  onSearchResultsDismiss,
}) {
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef(null)
  const searchRef = useRef(null)
  const unreadCount = notifications.filter(n => !n.read).length
  const topBarSearchListId = 'admin-topbar-search-suggestions'
  const resolvedSearchTerm = String(searchTerm || '')
  const resolvedSuggestions = Array.isArray(searchSuggestions) ? searchSuggestions : []
  const resolvedSearchState = String(searchState || 'idle')
  const resolvedSearchResults = Array.isArray(searchResults) ? searchResults : []
  const shouldShowSearchPanel = resolvedSearchState !== 'idle'
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
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        onSearchResultsDismiss?.()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onSearchResultsDismiss])

  return (
    <header className="h-14 bg-white border-b border-border flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-40 gap-2">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onOpenSidebar?.()}
          className="w-9 h-9 border border-border rounded-md text-text-secondary hover:text-text-primary hover:border-primary lg:hidden inline-flex items-center justify-center flex-shrink-0"
          aria-label="Open admin navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3">
          <h1 className="hidden sm:block text-sm font-semibold text-text-primary uppercase tracking-wide truncate">Admin Console</h1>
          <div className="relative w-full sm:max-w-[18rem] lg:max-w-[22rem]" ref={searchRef}>
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={resolvedSearchTerm}
              onChange={(event) => onSearchTermChange?.(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  onSearchSubmit?.(resolvedSearchTerm)
                  return
                }
                if (event.key === 'Escape') {
                  onSearchResultsDismiss?.()
                }
              }}
              placeholder="Search admin workspace..."
              list={resolvedSuggestions.length > 0 ? topBarSearchListId : undefined}
              className="w-full h-9 pl-9 pr-10 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            />
            {resolvedSearchState === 'loading' && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <DotLottiePreloader size={18} />
              </div>
            )}
            {resolvedSuggestions.length > 0 && (
              <datalist id={topBarSearchListId}>
                {resolvedSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            )}
            {shouldShowSearchPanel && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-card z-[55] max-h-72 overflow-y-auto">
                {resolvedSearchState === 'loading' ? (
                  <div className="px-3 py-3 text-sm text-text-secondary">
                    <DotLottiePreloader size={22} label="Searching..." className="w-full justify-start" />
                  </div>
                ) : resolvedSearchState === 'empty' ? (
                  <div className="px-3 py-3 text-sm text-text-muted">No item found</div>
                ) : (
                  resolvedSearchResults.map((result) => (
                    <button
                      key={result.id || `${result.pageId || 'page'}-${result.label || ''}`}
                      type="button"
                      onClick={() => onSearchResultSelect?.(result)}
                      className="w-full px-3 py-2.5 text-left hover:bg-background border-b last:border-b-0 border-border-light"
                    >
                      <p className="text-sm font-medium text-text-primary truncate">{result.label}</p>
                      {result.description && (
                        <p className="text-xs text-text-muted mt-0.5 truncate">{result.description}</p>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
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
            <div className="absolute right-0 top-12 w-[min(24rem,calc(100vw-1rem))] bg-white border border-border rounded-lg shadow-card z-50">
              <div className="p-3 border-b border-border-light flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onMarkAllNotificationsRead?.()}
                    className="text-xs text-primary hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-2xl font-semibold text-text-primary">Admin Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
    const normalizedCompliance = normalizeComplianceStatus(status, '')
    if (normalizedCompliance === COMPLIANCE_STATUS.FULL) return 'bg-success-bg text-success'
    if (normalizedCompliance === COMPLIANCE_STATUS.ACTION) return 'bg-warning-bg text-warning'
    if (normalizedCompliance === COMPLIANCE_STATUS.PENDING) return 'bg-error-bg text-error'

    if (status === 'Completed' || status === 'Active') return 'bg-success-bg text-success'
    if (status === 'In Progress') return 'bg-warning-bg text-warning'
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
    { id: 'view-profile', label: 'View / Edit Client Profile', disabled: !canViewBusinesses, disabledMessage: 'Insufficient Permissions' },
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
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Client Management</h2>
          <p className="text-sm text-text-muted mt-1">View, manage, and assist client accounts.</p>
        </div>
        <div className="w-full lg:w-80 relative">
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

      <div className="md:hidden space-y-3">
        {filteredClients.length === 0 && (
          <div className="bg-white rounded-lg shadow-card border border-border-light px-4 py-8 text-center text-sm text-text-muted">
            No client accounts found.
          </div>
        )}
        {filteredClients.map((client) => (
          <div key={client.id} className="bg-white rounded-lg shadow-card border border-border-light p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">{client.businessName}</p>
                <p className="text-xs text-text-muted mt-1">{client.cri}</p>
              </div>
              <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${getStatusBadge(client.verificationStatus)}`}>
                {client.verificationStatus}
              </span>
            </div>
            <div className="mt-3 space-y-1.5 text-xs text-text-secondary">
              <p><span className="text-text-muted">Contact:</span> {client.primaryContact}</p>
              <p><span className="text-text-muted">Email:</span> {client.email}</p>
              <p><span className="text-text-muted">Country:</span> {client.country}</p>
              <p><span className="text-text-muted">Created:</span> {client.dateCreated}</p>
            </div>
            <details className="mt-3">
              <summary className="h-8 px-3 border border-border rounded-md text-xs font-medium text-text-primary inline-flex items-center cursor-pointer select-none">
                Actions
              </summary>
              <div className="mt-2 space-y-1">
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
                      className={`w-full px-3 py-2 rounded-md border border-border-light text-left text-sm transition-colors inline-flex items-center gap-2 ${isImpersonateAction ? 'text-primary font-medium' : 'text-text-primary'} ${isRestricted ? 'opacity-70 cursor-not-allowed' : 'hover:bg-background'}`}
                    >
                      {isImpersonateAction && <ShieldCheck className="w-4 h-4" />}
                      {item.label}
                      {isRestricted && <span className="ml-auto text-[10px] text-warning uppercase tracking-wide">Restricted</span>}
                    </button>
                  )
                })}
              </div>
            </details>
          </div>
        ))}
      </div>

      <div className="hidden md:block bg-white rounded-lg shadow-card border border-border-light">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px]">
          <thead>
            <tr className="bg-[#F9FAFB]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Business Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">CRI</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Primary Contact</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Country</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Compliance State</th>
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
    normalizeComplianceStatus(statusControl?.verificationStatus || safeClient?.verificationStatus || '', COMPLIANCE_STATUS.PENDING),
  )
  const [suspensionMessage, setSuspensionMessage] = useState(
    statusControl?.suspensionMessage || safeClient?.suspensionMessage || '',
  )
  const [isSavingVerificationStatus, setIsSavingVerificationStatus] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isEditingIdentityAssets, setIsEditingIdentityAssets] = useState(false)
  const [isSavingIdentityAssets, setIsSavingIdentityAssets] = useState(false)
  const [identityDraft, setIdentityDraft] = useState(() => ({
    profilePhoto: profilePhoto || '',
    companyLogo: companyLogo || '',
    govId: verificationDocs.govId || '',
    proofOfAddress: verificationDocs.proofOfAddress || '',
    businessReg: verificationDocs.businessReg || '',
  }))
  const [profileDraft, setProfileDraft] = useState(() => ({
    primaryContact: safeClient?.primaryContact || settings.fullName || '',
    businessName: safeClient?.businessName || settings.businessName || onboardingData.businessName || '',
    phone: settings.phone || '',
    roleInCompany: settings.roleInCompany || '',
    country: safeClient?.country || settings.country || onboardingData.country || '',
    industry: settings.industry || onboardingData.industry || '',
    tin: settings.tin || onboardingData.tin || '',
    reportingCycle: settings.reportingCycle || onboardingData.reportingCycle || '',
    startMonth: settings.startMonth || onboardingData.startMonth || '',
    currency: settings.currency || onboardingData.currency || 'NGN',
    language: settings.language || onboardingData.language || 'English',
    businessReg: settings.cacNumber || settings.businessReg || onboardingData.cacNumber || onboardingData.businessReg || '',
    address1: settings.address1 || '',
    address2: settings.address2 || '',
    city: settings.city || '',
    postalCode: settings.postalCode || '',
    addressCountry: settings.addressCountry || settings.country || onboardingData.country || '',
  }))

  useEffect(() => {
    setVerificationStatusDraft(normalizeComplianceStatus(statusControl?.verificationStatus || safeClient?.verificationStatus || '', COMPLIANCE_STATUS.PENDING))
    setSuspensionMessage(statusControl?.suspensionMessage || safeClient?.suspensionMessage || '')
  }, [statusControl?.verificationStatus, statusControl?.suspensionMessage, safeClient?.verificationStatus, safeClient?.suspensionMessage])

  useEffect(() => {
    setIdentityDraft({
      profilePhoto: profilePhoto || '',
      companyLogo: companyLogo || '',
      govId: verificationDocs.govId || '',
      proofOfAddress: verificationDocs.proofOfAddress || '',
      businessReg: verificationDocs.businessReg || '',
    })
    setIsEditingIdentityAssets(false)
  }, [safeClient?.id, safeClient?.email, profilePhoto, companyLogo, verificationDocs.govId, verificationDocs.proofOfAddress, verificationDocs.businessReg])

  useEffect(() => {
    setProfileDraft({
      primaryContact: safeClient?.primaryContact || settings.fullName || '',
      businessName: safeClient?.businessName || settings.businessName || onboardingData.businessName || '',
      phone: settings.phone || '',
      roleInCompany: settings.roleInCompany || '',
      country: safeClient?.country || settings.country || onboardingData.country || '',
      industry: settings.industry || onboardingData.industry || '',
      tin: settings.tin || onboardingData.tin || '',
      reportingCycle: settings.reportingCycle || onboardingData.reportingCycle || '',
      startMonth: settings.startMonth || onboardingData.startMonth || '',
      currency: settings.currency || onboardingData.currency || 'NGN',
      language: settings.language || onboardingData.language || 'English',
      businessReg: settings.cacNumber || settings.businessReg || onboardingData.cacNumber || onboardingData.businessReg || '',
      address1: settings.address1 || '',
      address2: settings.address2 || '',
      city: settings.city || '',
      postalCode: settings.postalCode || '',
      addressCountry: settings.addressCountry || settings.country || onboardingData.country || '',
    })
    setIsEditingProfile(false)
  }, [safeClient?.id, safeClient?.email])

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

  const saveVerificationStatus = (forcedStatus) => {
    if (!normalizedEmail) return
    const nextVerificationStatus = normalizeComplianceStatus(forcedStatus || verificationStatusDraft, COMPLIANCE_STATUS.PENDING)
    const nextSuspensionMessage = isActionRequiredStatus(nextVerificationStatus) ? suspensionMessage.trim() : ''

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
          status: 'active',
        }
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(nextAccounts))
      }

      const onboardingState = getScopedStorageObject('kiaminaOnboardingState', normalizedEmail)
      writeScopedStorageObject('kiaminaOnboardingState', normalizedEmail, {
        ...onboardingState,
        verificationPending: nextVerificationStatus !== COMPLIANCE_STATUS.FULL,
      })

      writeScopedStorageObject(CLIENT_STATUS_CONTROL_STORAGE_KEY, normalizedEmail, {
        verificationStatus: nextVerificationStatus,
        suspensionMessage: nextSuspensionMessage,
        updatedAt: new Date().toISOString(),
      })

      appendScopedClientActivityLog(normalizedEmail, {
        actorName: 'Admin User',
        actorRole: 'admin',
        action: 'Updated compliance status',
        details: `Compliance state changed to ${nextVerificationStatus}.${nextSuspensionMessage ? ` Note: ${nextSuspensionMessage}` : ''}`,
      })

      onAdminActionLog?.({
        action: 'Updated client compliance state',
        affectedUser: safeClient.businessName || normalizedEmail,
        details: `Set compliance state to ${nextVerificationStatus}.${nextSuspensionMessage ? ` Note: ${nextSuspensionMessage}` : ''}`,
      })

      const refreshed = readClientRows().find((row) => row.email === normalizedEmail)
      if (refreshed) setClientSnapshot(refreshed)
      setVerificationStatusDraft(nextVerificationStatus)
      if (!isActionRequiredStatus(nextVerificationStatus)) setSuspensionMessage('')
      showToast?.('success', 'Client compliance state updated.')
    } finally {
      setIsSavingVerificationStatus(false)
    }
  }

  const saveProfileChanges = () => {
    if (!normalizedEmail) return
    const nextPrimaryContact = toTrimmedValue(profileDraft.primaryContact)
    const nextBusinessName = toTrimmedValue(profileDraft.businessName)
    if (!nextPrimaryContact || !nextBusinessName) {
      showToast?.('error', 'Primary contact and business name are required.')
      return
    }

    setIsSavingProfile(true)
    try {
      const nextSettings = {
        ...getScopedStorageObject('settingsFormData', normalizedEmail),
        fullName: nextPrimaryContact,
        businessName: nextBusinessName,
        phone: toTrimmedValue(profileDraft.phone),
        roleInCompany: toTrimmedValue(profileDraft.roleInCompany),
        country: toTrimmedValue(profileDraft.country),
        industry: toTrimmedValue(profileDraft.industry),
        tin: toTrimmedValue(profileDraft.tin),
        reportingCycle: toTrimmedValue(profileDraft.reportingCycle),
        startMonth: toTrimmedValue(profileDraft.startMonth),
        currency: toTrimmedValue(profileDraft.currency) || 'NGN',
        language: toTrimmedValue(profileDraft.language) || 'English',
        cacNumber: toTrimmedValue(profileDraft.businessReg),
        businessReg: toTrimmedValue(profileDraft.businessReg),
        address1: toTrimmedValue(profileDraft.address1),
        address2: toTrimmedValue(profileDraft.address2),
        city: toTrimmedValue(profileDraft.city),
        postalCode: toTrimmedValue(profileDraft.postalCode),
        addressCountry: toTrimmedValue(profileDraft.addressCountry),
      }
      writeScopedStorageObject('settingsFormData', normalizedEmail, nextSettings)

      const onboardingState = getScopedStorageObject('kiaminaOnboardingState', normalizedEmail)
      writeScopedStorageObject('kiaminaOnboardingState', normalizedEmail, {
        ...onboardingState,
        data: {
          ...(onboardingState?.data || {}),
          businessName: nextBusinessName,
          country: toTrimmedValue(profileDraft.country),
          industry: toTrimmedValue(profileDraft.industry),
          tin: toTrimmedValue(profileDraft.tin),
          reportingCycle: toTrimmedValue(profileDraft.reportingCycle),
          startMonth: toTrimmedValue(profileDraft.startMonth),
          currency: toTrimmedValue(profileDraft.currency) || 'NGN',
          language: toTrimmedValue(profileDraft.language) || 'English',
          cacNumber: toTrimmedValue(profileDraft.businessReg),
          businessReg: toTrimmedValue(profileDraft.businessReg),
        },
      })

      const accounts = safeParseJson(localStorage.getItem(ACCOUNTS_STORAGE_KEY), [])
      if (Array.isArray(accounts)) {
        const nextAccounts = [...accounts]
        const accountIndex = nextAccounts.findIndex((account) => (
          (account?.email || '').trim().toLowerCase() === normalizedEmail
        ))
        if (accountIndex !== -1) {
          nextAccounts[accountIndex] = {
            ...nextAccounts[accountIndex],
            fullName: nextPrimaryContact,
            businessName: nextBusinessName,
            companyName: nextBusinessName,
          }
          localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(nextAccounts))
        }
      }

      appendScopedClientActivityLog(normalizedEmail, {
        actorName: 'Admin User',
        actorRole: 'admin',
        action: 'Updated client profile',
        details: 'Client profile fields were edited in Admin Client Profile.',
      })

      onAdminActionLog?.({
        action: 'Edited client profile',
        affectedUser: nextBusinessName,
        details: 'Updated profile fields (contact, business, address, and compliance metadata).',
      })

      const refreshed = readClientRows().find((row) => row.email === normalizedEmail)
      if (refreshed) setClientSnapshot(refreshed)
      setIsEditingProfile(false)
      showToast?.('success', 'Client profile updated.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleIdentityImageUpload = (field, file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setIdentityDraft((prev) => ({ ...prev, [field]: String(reader.result || '') }))
    }
    reader.onerror = () => {
      showToast?.('error', 'Unable to read selected image file.')
    }
    reader.readAsDataURL(file)
  }

  const saveIdentityAssets = () => {
    if (!normalizedEmail) return
    setIsSavingIdentityAssets(true)
    try {
      const nextProfilePhoto = toTrimmedValue(identityDraft.profilePhoto)
      const nextCompanyLogo = toTrimmedValue(identityDraft.companyLogo)
      if (nextProfilePhoto) writeScopedStorageString('profilePhoto', normalizedEmail, nextProfilePhoto)
      else removeScopedStorageValue('profilePhoto', normalizedEmail)
      if (nextCompanyLogo) writeScopedStorageString('companyLogo', normalizedEmail, nextCompanyLogo)
      else removeScopedStorageValue('companyLogo', normalizedEmail)

      const nextVerificationDocs = {
        ...getScopedStorageObject('verificationDocs', normalizedEmail),
        govId: toTrimmedValue(identityDraft.govId),
        proofOfAddress: toTrimmedValue(identityDraft.proofOfAddress),
        businessReg: toTrimmedValue(identityDraft.businessReg),
      }
      writeScopedStorageObject('verificationDocs', normalizedEmail, nextVerificationDocs)

      appendScopedClientActivityLog(normalizedEmail, {
        actorName: 'Admin User',
        actorRole: 'admin',
        action: 'Updated identity assets',
        details: 'Updated profile photo, company logo, or verification document references.',
      })

      onAdminActionLog?.({
        action: 'Edited client identity assets',
        affectedUser: safeClient.businessName || normalizedEmail,
        details: 'Updated profile picture, company logo, and identity asset metadata.',
      })

      const refreshed = readClientRows().find((row) => row.email === normalizedEmail)
      if (refreshed) setClientSnapshot(refreshed)
      setIsEditingIdentityAssets(false)
      showToast?.('success', 'Identity assets updated.')
    } finally {
      setIsSavingIdentityAssets(false)
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
          <p className="text-xs uppercase tracking-wide text-text-muted">Compliance Status</p>
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
        <h3 className="text-base font-semibold text-text-primary">Compliance Control</h3>
        <p className="text-sm text-text-muted mt-1">Set this client to a compliance state.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Compliance State</label>
            <select
              value={verificationStatusDraft}
              onChange={(event) => setVerificationStatusDraft(event.target.value)}
              className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            >
              {COMPLIANCE_STATUS_OPTIONS.map((statusLabel) => (
                <option key={statusLabel} value={statusLabel}>{statusLabel}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-primary mb-1.5">Action Required Note (Optional)</label>
            <textarea
              value={suspensionMessage}
              onChange={(event) => setSuspensionMessage(event.target.value)}
              placeholder="Document the required action for this client."
              className="w-full h-20 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-primary resize-none"
              disabled={!isActionRequiredStatus(verificationStatusDraft)}
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => saveVerificationStatus(COMPLIANCE_STATUS.FULL)}
            disabled={isSavingVerificationStatus}
            className="h-10 px-4 mr-2 border border-success text-success rounded-md text-sm font-semibold hover:bg-success-bg transition-colors disabled:opacity-60"
          >
            Mark Full Compliance
          </button>
          <button
            type="button"
            onClick={saveVerificationStatus}
            disabled={isSavingVerificationStatus}
            className="h-10 px-4 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-60"
          >
            {isSavingVerificationStatus ? 'Saving...' : 'Save Compliance State'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-border-light p-6 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Profile & Identity Assets</h3>
            <p className="text-sm text-text-muted mt-1">Manage client images and verification document references.</p>
          </div>
          {!isEditingIdentityAssets ? (
            <button
              type="button"
              onClick={() => setIsEditingIdentityAssets(true)}
              className="h-10 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background inline-flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit Assets
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIdentityDraft({
                    profilePhoto: profilePhoto || '',
                    companyLogo: companyLogo || '',
                    govId: verificationDocs.govId || '',
                    proofOfAddress: verificationDocs.proofOfAddress || '',
                    businessReg: verificationDocs.businessReg || '',
                  })
                  setIsEditingIdentityAssets(false)
                }}
                className="h-10 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveIdentityAssets}
                disabled={isSavingIdentityAssets}
                className="h-10 px-4 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-60"
              >
                {isSavingIdentityAssets ? 'Saving...' : 'Save Assets'}
              </button>
            </div>
          )}
        </div>

        {isEditingIdentityAssets ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="rounded-md border border-border-light bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-text-muted">Profile Picture</p>
                <div className="mt-3 w-24 h-24 rounded-full overflow-hidden border border-border-light bg-white flex items-center justify-center">
                  {identityDraft.profilePhoto ? (
                    <img src={identityDraft.profilePhoto} alt="Client Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-text-muted" />
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleIdentityImageUpload('profilePhoto', event.target.files?.[0])}
                    className="block w-full text-xs text-text-secondary"
                  />
                  <button
                    type="button"
                    onClick={() => setIdentityDraft((prev) => ({ ...prev, profilePhoto: '' }))}
                    className="h-8 px-2.5 border border-border rounded-md text-xs text-text-primary hover:bg-white"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="rounded-md border border-border-light bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-text-muted">Company Logo</p>
                <div className="mt-3 w-28 h-20 rounded border border-border-light bg-white p-2 flex items-center justify-center">
                  {identityDraft.companyLogo ? (
                    <img src={identityDraft.companyLogo} alt="Company Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-8 h-8 text-text-muted" />
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleIdentityImageUpload('companyLogo', event.target.files?.[0])}
                    className="block w-full text-xs text-text-secondary"
                  />
                  <button
                    type="button"
                    onClick={() => setIdentityDraft((prev) => ({ ...prev, companyLogo: '' }))}
                    className="h-8 px-2.5 border border-border rounded-md text-xs text-text-primary hover:bg-white"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Government-issued ID</label>
                <input value={identityDraft.govId} onChange={(event) => setIdentityDraft((prev) => ({ ...prev, govId: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Proof of Address</label>
                <input value={identityDraft.proofOfAddress} onChange={(event) => setIdentityDraft((prev) => ({ ...prev, proofOfAddress: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Business Registration Document</label>
                <input value={identityDraft.businessReg} onChange={(event) => setIdentityDraft((prev) => ({ ...prev, businessReg: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
              </div>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-card border border-border-light p-6 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Client Information</h3>
            <p className="text-sm text-text-muted mt-1">Edit client identity and business metadata from here.</p>
          </div>
          {!isEditingProfile ? (
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="h-10 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background inline-flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setProfileDraft({
                    primaryContact: safeClient?.primaryContact || settings.fullName || '',
                    businessName: safeClient?.businessName || settings.businessName || onboardingData.businessName || '',
                    phone: settings.phone || '',
                    roleInCompany: settings.roleInCompany || '',
                    country: safeClient?.country || settings.country || onboardingData.country || '',
                    industry: settings.industry || onboardingData.industry || '',
                    tin: settings.tin || onboardingData.tin || '',
                    reportingCycle: settings.reportingCycle || onboardingData.reportingCycle || '',
                    startMonth: settings.startMonth || onboardingData.startMonth || '',
                    currency: settings.currency || onboardingData.currency || 'NGN',
                    language: settings.language || onboardingData.language || 'English',
                    businessReg: settings.cacNumber || settings.businessReg || onboardingData.cacNumber || onboardingData.businessReg || '',
                    address1: settings.address1 || '',
                    address2: settings.address2 || '',
                    city: settings.city || '',
                    postalCode: settings.postalCode || '',
                    addressCountry: settings.addressCountry || settings.country || onboardingData.country || '',
                  })
                  setIsEditingProfile(false)
                }}
                className="h-10 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveProfileChanges}
                disabled={isSavingProfile}
                className="h-10 px-4 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-60"
              >
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {isEditingProfile ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Primary Contact</label>
              <input value={profileDraft.primaryContact} onChange={(event) => setProfileDraft((prev) => ({ ...prev, primaryContact: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Business Name</label>
              <input value={profileDraft.businessName} onChange={(event) => setProfileDraft((prev) => ({ ...prev, businessName: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Work Email</label>
              <input value={safeClient.email || ''} disabled className="w-full h-10 px-3 border border-border rounded-md text-sm bg-background text-text-muted" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Phone</label>
              <input value={profileDraft.phone} onChange={(event) => setProfileDraft((prev) => ({ ...prev, phone: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Role in Company</label>
              <input value={profileDraft.roleInCompany} onChange={(event) => setProfileDraft((prev) => ({ ...prev, roleInCompany: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Country</label>
              <input value={profileDraft.country} onChange={(event) => setProfileDraft((prev) => ({ ...prev, country: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Industry</label>
              <input value={profileDraft.industry} onChange={(event) => setProfileDraft((prev) => ({ ...prev, industry: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">TIN</label>
              <input value={profileDraft.tin} onChange={(event) => setProfileDraft((prev) => ({ ...prev, tin: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Business Reg / CAC</label>
              <input value={profileDraft.businessReg} onChange={(event) => setProfileDraft((prev) => ({ ...prev, businessReg: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Reporting Cycle</label>
              <input value={profileDraft.reportingCycle} onChange={(event) => setProfileDraft((prev) => ({ ...prev, reportingCycle: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Start Month</label>
              <input value={profileDraft.startMonth} onChange={(event) => setProfileDraft((prev) => ({ ...prev, startMonth: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Currency</label>
              <input value={profileDraft.currency} onChange={(event) => setProfileDraft((prev) => ({ ...prev, currency: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Language</label>
              <input value={profileDraft.language} onChange={(event) => setProfileDraft((prev) => ({ ...prev, language: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Address Line 1</label>
              <input value={profileDraft.address1} onChange={(event) => setProfileDraft((prev) => ({ ...prev, address1: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Address Line 2</label>
              <input value={profileDraft.address2} onChange={(event) => setProfileDraft((prev) => ({ ...prev, address2: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">City</label>
              <input value={profileDraft.city} onChange={(event) => setProfileDraft((prev) => ({ ...prev, city: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Postal Code</label>
              <input value={profileDraft.postalCode} onChange={(event) => setProfileDraft((prev) => ({ ...prev, postalCode: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-text-muted mb-1">Address Country</label>
              <input value={profileDraft.addressCountry} onChange={(event) => setProfileDraft((prev) => ({ ...prev, addressCountry: event.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {profileFields.map(([label, value]) => (
              <div key={label} className="rounded-md border border-border-light bg-background px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-wide text-text-muted">{label}</p>
                <p className="text-sm text-text-primary mt-1">{value || '--'}</p>
              </div>
            ))}
          </div>
        )}
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

function AdminClientDocumentsPage({ client, setActivePage, showToast, onAdminActionLog, currentAdminAccount }) {
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

  const canUnlockApproved = currentAdminAccount?.adminLevel === 'senior'
  const adminActorName = currentAdminAccount?.fullName || 'Admin User'
  const documents = documentBundle
  const recordsByCategory = {
    expenses: flattenDocumentRows(documents.expenses || []),
    sales: flattenDocumentRows(documents.sales || []),
    'bank-statements': flattenDocumentRows(documents.bankStatements || []),
  }
  const activeRows = recordsByCategory[activeCategory] || []

  const filteredRows = activeRows
    .filter((row) => {
      const filename = row.filename || ''
      const fileId = row.fileId || ''
      const user = row.user || ''
      const extension = (row.extension || row.type || filename.split('.').pop() || '').toUpperCase()
      const matchesSearch = [filename, fileId, user].join(' ').toLowerCase().includes(searchTerm.trim().toLowerCase())
      const matchesStatus = !filterStatus || normalizeDocumentReviewStatus(row.status || DOCUMENT_REVIEW_STATUS.PENDING_REVIEW) === filterStatus
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
  const statusOptions = [
    DOCUMENT_REVIEW_STATUS.PENDING_REVIEW,
    DOCUMENT_REVIEW_STATUS.APPROVED,
    DOCUMENT_REVIEW_STATUS.REJECTED,
    DOCUMENT_REVIEW_STATUS.INFO_REQUESTED,
  ]
  const typeOptions = [...new Set(activeRows.map((row) => (row.extension || row.type || row.filename?.split('.').pop() || '').toUpperCase()).filter(Boolean))]

  const clearFilters = () => {
    setSearchTerm('')
    setFilterStatus('')
    setFilterType('')
  }

  const handleDocumentStatusChange = (row, nextStatus) => {
    const currentStatus = normalizeDocumentReviewStatus(row.status || DOCUMENT_REVIEW_STATUS.PENDING_REVIEW)
    const normalizedNextStatus = normalizeDocumentReviewStatus(nextStatus, DOCUMENT_REVIEW_STATUS.PENDING_REVIEW)
    if (normalizedNextStatus === currentStatus) return

    let notes = row.notes || ''
    let unlockReason = ''
    if (
      currentStatus === DOCUMENT_REVIEW_STATUS.APPROVED
      && normalizedNextStatus === DOCUMENT_REVIEW_STATUS.PENDING_REVIEW
    ) {
      if (!canUnlockApproved) {
        showToast?.('error', 'Only a senior admin can unlock an approved file.')
        return
      }
      const input = window.prompt('Provide unlock reason (required)', '')
      if (input === null) return
      if (!input.trim()) {
        showToast?.('error', 'Unlock reason is required.')
        return
      }
      unlockReason = input.trim()
    }
    if (normalizedNextStatus === DOCUMENT_REVIEW_STATUS.REJECTED || normalizedNextStatus === DOCUMENT_REVIEW_STATUS.INFO_REQUESTED) {
      const promptMessage = normalizedNextStatus === DOCUMENT_REVIEW_STATUS.REJECTED
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
    const updatedBundle = updateClientDocumentReviewStatus(reviewDocument, normalizedNextStatus, notes, {
      performedBy: adminActorName,
      unlockReason,
    })
    if (!updatedBundle) {
      showToast?.('error', 'Unable to update document status.')
      return
    }

    setDocumentBundle(updatedBundle)
    onAdminActionLog?.({
      action: 'Reviewed client document',
      affectedUser: safeClient.businessName,
      details: `${row.filename} set to ${normalizedNextStatus}.${unlockReason ? ` Unlock reason: ${unlockReason}.` : ''}`,
    })
    showToast?.('success', `Document status updated to ${normalizedNextStatus}.`)
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
            {filteredRows.map((row) => {
              const normalizedStatus = normalizeDocumentReviewStatus(row.status || DOCUMENT_REVIEW_STATUS.PENDING_REVIEW)
              return (
              <tr key={row.id} className="border-t border-border-light hover:bg-[#F9FAFB]">
                <td className="px-4 py-3.5 text-sm text-text-primary font-medium">{row.filename || '--'}</td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{row.fileId || '--'}</td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{(row.extension || row.type || row.filename?.split('.').pop() || '--').toUpperCase()}</td>
                <td className="px-4 py-3.5 text-sm text-text-primary">{row.user || '--'}</td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{row.date || '--'}</td>
                <td className="px-4 py-3.5 text-sm">
                  <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${
                    normalizedStatus === DOCUMENT_REVIEW_STATUS.APPROVED
                      ? 'bg-success-bg text-success'
                      : normalizedStatus === DOCUMENT_REVIEW_STATUS.REJECTED
                        ? 'bg-error-bg text-error'
                        : normalizedStatus === DOCUMENT_REVIEW_STATUS.INFO_REQUESTED
                          ? 'bg-info-bg text-primary'
                        : 'bg-warning-bg text-warning'
                  }`}>
                    {normalizedStatus}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-sm">
                  <select
                    value={normalizedStatus}
                    onChange={(event) => handleDocumentStatusChange(row, event.target.value)}
                    className="h-8 px-2.5 border border-border rounded-md text-xs focus:outline-none focus:border-primary"
                  >
                    <option value={DOCUMENT_REVIEW_STATUS.PENDING_REVIEW}>Pending Review</option>
                    <option value={DOCUMENT_REVIEW_STATUS.APPROVED}>Approved</option>
                    <option value={DOCUMENT_REVIEW_STATUS.REJECTED}>Rejected</option>
                    <option value={DOCUMENT_REVIEW_STATUS.INFO_REQUESTED}>Info Requested</option>
                  </select>
                </td>
              </tr>
              )
            })}
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
            {filteredRows.map((row) => {
              const normalizedStatus = normalizeDocumentReviewStatus(row.status || DOCUMENT_REVIEW_STATUS.PENDING_REVIEW)
              return (
              <tr key={row.id} className="border-t border-border-light hover:bg-[#F9FAFB]">
                <td className="px-4 py-3.5 text-sm text-text-primary font-medium">{row.filename || '--'}</td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{(row.type || row.extension || row.filename?.split('.').pop() || '--').toUpperCase()}</td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{row.category || '--'}</td>
                <td className="px-4 py-3.5 text-sm text-text-secondary">{row.date || '--'}</td>
                <td className="px-4 py-3.5 text-sm text-text-primary">{row.user || '--'}</td>
                <td className="px-4 py-3.5 text-sm">
                  <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${
                    normalizedStatus === DOCUMENT_REVIEW_STATUS.APPROVED
                      ? 'bg-success-bg text-success'
                      : normalizedStatus === DOCUMENT_REVIEW_STATUS.REJECTED
                        ? 'bg-error-bg text-error'
                        : normalizedStatus === DOCUMENT_REVIEW_STATUS.INFO_REQUESTED
                          ? 'bg-info-bg text-primary'
                        : 'bg-warning-bg text-warning'
                  }`}>
                    {normalizedStatus}
                  </span>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Document Review Center with Preview Panel
function AdminDocumentReviewCenter({ showToast, currentAdminAccount, runWithSlowRuntimeWatch }) {
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
  const [isProcessingReviewAction, setIsProcessingReviewAction] = useState(false)
  const canUnlockApproved = currentAdminAccount?.adminLevel === 'senior'
  const adminActorName = currentAdminAccount?.fullName || 'Admin User'

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
      const matchesStatus = filterStatus === 'All'
        || normalizeDocumentReviewStatus(doc.status || DOCUMENT_REVIEW_STATUS.PENDING_REVIEW) === filterStatus
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

  const runReviewAction = async (work, message = 'Updating document status...') => {
    if (isProcessingReviewAction) return
    setIsProcessingReviewAction(true)
    const execute = async () => {
      await waitForNetworkAwareDelay('search')
      work()
    }
    try {
      if (typeof runWithSlowRuntimeWatch === 'function') {
        await runWithSlowRuntimeWatch(execute, message)
      } else {
        await execute()
      }
    } finally {
      setIsProcessingReviewAction(false)
    }
  }

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

  const applyReviewStatus = (nextStatus, notes = '', options = {}) => {
    if (!selectedDocument) return
    const normalizedNextStatus = normalizeDocumentReviewStatus(nextStatus, DOCUMENT_REVIEW_STATUS.PENDING_REVIEW)
    const updatedNote = notes || selectedDocument.notes || ''
    const unlockReason = toTrimmedValue(options?.unlockReason)

    if (selectedDocument.source) {
      const updatedBundle = updateClientDocumentReviewStatus(selectedDocument, normalizedNextStatus, updatedNote, {
        performedBy: adminActorName,
        unlockReason,
      })
      if (!updatedBundle) {
        showToast('error', 'Unable to update document status.')
        return
      }
      const nextRows = readAllDocumentsForReview()
      setDocuments(nextRows)
      const nextSelected = nextRows.find((row) => row.id === selectedDocument.id)
      setSelectedDocument(nextSelected || null)
      return
    }

    setDocuments((prev) => prev.map((row) => (
      row.id === selectedDocument.id ? { ...row, status: normalizedNextStatus, notes: updatedNote } : row
    )))
    setSelectedDocument((prev) => (prev ? { ...prev, status: normalizedNextStatus, notes: updatedNote } : prev))
  }

  const handleApprove = () => {
    if (!selectedDocument) return
    void runReviewAction(() => {
      applyReviewStatus(DOCUMENT_REVIEW_STATUS.APPROVED)
      showToast('success', 'Document approved successfully.')
    }, 'Approving document...')
  }

  const handleMarkPending = () => {
    if (!selectedDocument) return
    const currentStatus = normalizeDocumentReviewStatus(selectedDocument.status || DOCUMENT_REVIEW_STATUS.PENDING_REVIEW)
    let unlockReason = ''
    if (currentStatus === DOCUMENT_REVIEW_STATUS.APPROVED) {
      if (!canUnlockApproved) {
        showToast('error', 'Only a senior admin can unlock an approved file.')
        return
      }
      const input = window.prompt('Provide unlock reason (required)', '')
      if (input === null) return
      if (!input.trim()) {
        showToast('error', 'Unlock reason is required.')
        return
      }
      unlockReason = input.trim()
    }
    void runReviewAction(() => {
      applyReviewStatus(DOCUMENT_REVIEW_STATUS.PENDING_REVIEW, selectedDocument.notes || '', { unlockReason })
      showToast('success', 'Document moved to pending review.')
    }, 'Moving file to pending review...')
  }

  const handleReject = () => {
    if (!selectedDocument || !rejectionReason.trim()) return
    void runReviewAction(() => {
      applyReviewStatus(DOCUMENT_REVIEW_STATUS.REJECTED, rejectionReason.trim())
      setShowRejectionModal(false)
      setRejectionReason('')
      showToast('success', 'Document rejected. User has been notified.')
    }, 'Rejecting document...')
  }

  const handleRequestInfo = () => {
    if (!selectedDocument) return
    const message = window.prompt('Provide an information request message', selectedDocument.notes || '')
    if (message === null) return
    if (!message.trim()) {
      showToast('error', 'Please provide a message for information request.')
      return
    }
    void runReviewAction(() => {
      applyReviewStatus(DOCUMENT_REVIEW_STATUS.INFO_REQUESTED, message.trim())
      showToast('success', 'Information request sent to user.')
    }, 'Sending information request...')
  }

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50))

  const getStatusStyle = (status) => {
    switch (normalizeDocumentReviewStatus(status, DOCUMENT_REVIEW_STATUS.PENDING_REVIEW)) {
      case DOCUMENT_REVIEW_STATUS.APPROVED: return 'bg-success-bg text-success'
      case DOCUMENT_REVIEW_STATUS.PENDING_REVIEW: return 'bg-warning-bg text-warning'
      case DOCUMENT_REVIEW_STATUS.REJECTED: return 'bg-error-bg text-error'
      case DOCUMENT_REVIEW_STATUS.INFO_REQUESTED: return 'bg-info-bg text-primary'
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
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
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
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <Filter className="hidden sm:block w-4 h-4 text-text-muted" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 w-full sm:w-auto px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            >
              <option value="All">All Status</option>
              <option value={DOCUMENT_REVIEW_STATUS.PENDING_REVIEW}>Pending Review</option>
              <option value={DOCUMENT_REVIEW_STATUS.APPROVED}>Approved</option>
              <option value={DOCUMENT_REVIEW_STATUS.REJECTED}>Rejected</option>
              <option value={DOCUMENT_REVIEW_STATUS.INFO_REQUESTED}>Info Requested</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-10 w-full sm:w-auto px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            >
              <option value="All">All Categories</option>
              <option value="Expense">Expense</option>
              <option value="Sales">Sales</option>
              <option value="Bank Statement">Bank Statement</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-10 w-full sm:w-auto px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            >
              <option value="date">Sort by Date</option>
              <option value="business">Sort by Business</option>
              <option value="name">Sort by Document Name</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="h-10 w-full sm:w-auto px-3 border border-border rounded-md text-sm text-text-primary hover:bg-background"
            >
              {sortOrder === 'desc' ? 'Desc' : 'Asc'}
            </button>
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
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
                    {normalizeDocumentReviewStatus(doc.status || DOCUMENT_REVIEW_STATUS.PENDING_REVIEW)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
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
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
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
              <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border-light p-4 overflow-y-auto">
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
                        {normalizeDocumentReviewStatus(selectedDocument.status || DOCUMENT_REVIEW_STATUS.PENDING_REVIEW)}
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
                      disabled={isProcessingReviewAction}
                      className="h-9 bg-success text-white rounded-md text-sm font-medium hover:bg-success/90 transition-colors flex items-center justify-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => setShowRejectionModal(true)}
                      disabled={isProcessingReviewAction}
                      className="h-9 bg-error text-white rounded-md text-sm font-medium hover:bg-error/90 transition-colors flex items-center justify-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={handleRequestInfo}
                      disabled={isProcessingReviewAction}
                      className="h-9 bg-warning text-white rounded-md text-sm font-medium hover:bg-warning/90 transition-colors flex items-center justify-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Request Info
                    </button>
                    <button
                      onClick={handleMarkPending}
                      disabled={isProcessingReviewAction}
                      className="h-9 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors flex items-center justify-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Clock className="w-4 h-4" />
                      Pending Review
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
                disabled={isProcessingReviewAction}
                className="h-10 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background"
              >
                Cancel
              </button>
              <button 
                onClick={handleReject}
                disabled={!rejectionReason.trim() || isProcessingReviewAction}
                className="h-10 px-4 bg-error text-white rounded-md text-sm font-medium hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isProcessingReviewAction ? (
                  <>
                    <DotLottiePreloader size={18} />
                    <span>Processing...</span>
                  </>
                ) : 'Reject Document'}
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

const SUPPORT_INBOX_FOCUS_EMAIL_KEY = 'kiaminaSupportInboxFocusEmail'

function AdminSupportLeadsPage({ setActivePage, showToast, currentAdminAccount, onAdminActionLog }) {
  const [supportSnapshot, setSupportSnapshot] = useState(() => getSupportCenterSnapshot())
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [ticketFilter, setTicketFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updated-desc')
  const adminActorName = toTrimmedValue(currentAdminAccount?.fullName)
    || toTrimmedValue(currentAdminAccount?.firstName)
    || 'Admin User'

  useEffect(() => {
    const unsubscribe = subscribeSupportCenter((snapshot) => setSupportSnapshot(snapshot))
    return unsubscribe
  }, [])

  const tickets = Array.isArray(supportSnapshot?.tickets) ? supportSnapshot.tickets : []
  const leads = useMemo(() => {
    const rawLeads = Array.isArray(supportSnapshot?.leads) ? supportSnapshot.leads : []
    const rows = rawLeads
      .filter((lead) => lead && typeof lead === 'object')
      .map((lead) => {
        const normalizedLeadId = toTrimmedValue(lead.id)
        const normalizedClientEmail = toTrimmedValue(lead.clientEmail).toLowerCase()
        const linkedTickets = tickets.filter((ticket) => {
          const ticketLeadId = toTrimmedValue(ticket?.leadId)
          const ticketClientEmail = toTrimmedValue(ticket?.clientEmail).toLowerCase()
          return (
            (normalizedLeadId && ticketLeadId === normalizedLeadId)
            || (normalizedClientEmail && ticketClientEmail === normalizedClientEmail)
          )
        })
        const latestTicket = [...linkedTickets]
          .sort((left, right) => (Date.parse(right.updatedAtIso || '') || 0) - (Date.parse(left.updatedAtIso || '') || 0))[0] || null
        const latestUpdatedAtIso = (
          (Date.parse(lead.updatedAtIso || '') || 0) > (Date.parse(latestTicket?.updatedAtIso || '') || 0)
            ? lead.updatedAtIso
            : (latestTicket?.updatedAtIso || lead.updatedAtIso)
        )
        return {
          ...lead,
          ticketCount: linkedTickets.length,
          openTicketCount: linkedTickets.filter((ticket) => ticket.status !== SUPPORT_TICKET_STATUS.RESOLVED).length,
          latestUpdatedAtIso,
        }
      })
    return rows.sort((left, right) => (Date.parse(right.latestUpdatedAtIso || '') || 0) - (Date.parse(left.latestUpdatedAtIso || '') || 0))
  }, [supportSnapshot, tickets])

  const getLeadCategoryList = (lead = {}) => {
    const categories = []
    const pushCategory = (value = '') => {
      const normalized = toTrimmedValue(value)
      if (!normalized || categories.includes(normalized)) return
      categories.push(normalized)
    }
    ;(Array.isArray(lead.leadCategories) ? lead.leadCategories : []).forEach((entry) => pushCategory(entry))
    pushCategory(lead.leadCategory)
    return categories
  }

  const filteredLeads = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    const toCategorySearchText = (lead = {}) => (
      getLeadCategoryList(lead)
        .map((value) => String(value || '').toLowerCase())
        .join(' ')
    )

    const scopedLeads = leads
      .filter((lead) => (
        !query
          || [
            lead.leadLabel,
            toCategorySearchText(lead),
            lead.fullName,
            lead.contactEmail,
            lead.organizationType,
            lead.ipAddress,
            lead.location,
            lead.clientEmail,
          ].some((value) => String(value || '').toLowerCase().includes(query))
      ))
      .filter((lead) => {
        if (categoryFilter === 'all') return true
        const categories = getLeadCategoryList(lead)
        const hasInquiry = categories.includes('Inquiry_FollowUP')
        const hasNewsletter = categories.includes('Newsletter_Subscriber')
        if (categoryFilter === 'inquiry') return hasInquiry
        if (categoryFilter === 'newsletter') return hasNewsletter
        if (categoryFilter === 'mixed') return hasInquiry && hasNewsletter
        return true
      })
      .filter((lead) => {
        if (typeFilter === 'all') return true
        const normalizedType = toTrimmedValue(lead.organizationType).toLowerCase()
        if (typeFilter === 'unknown') return !normalizedType
        return normalizedType === typeFilter
      })
      .filter((lead) => {
        if (ticketFilter === 'all') return true
        const openCount = Number(lead.openTicketCount || 0)
        if (ticketFilter === 'open') return openCount > 0
        if (ticketFilter === 'closed') return openCount === 0
        return true
      })

    return [...scopedLeads].sort((left, right) => {
      if (sortBy === 'updated-asc') {
        return (Date.parse(left.latestUpdatedAtIso || '') || 0) - (Date.parse(right.latestUpdatedAtIso || '') || 0)
      }
      if (sortBy === 'label-asc') {
        return String(left.leadLabel || '').localeCompare(String(right.leadLabel || ''))
      }
      if (sortBy === 'label-desc') {
        return String(right.leadLabel || '').localeCompare(String(left.leadLabel || ''))
      }
      if (sortBy === 'email-asc') {
        return String(left.contactEmail || '').localeCompare(String(right.contactEmail || ''))
      }
      if (sortBy === 'email-desc') {
        return String(right.contactEmail || '').localeCompare(String(left.contactEmail || ''))
      }
      if (sortBy === 'open-desc') {
        return Number(right.openTicketCount || 0) - Number(left.openTicketCount || 0)
      }
      if (sortBy === 'open-asc') {
        return Number(left.openTicketCount || 0) - Number(right.openTicketCount || 0)
      }
      return (Date.parse(right.latestUpdatedAtIso || '') || 0) - (Date.parse(left.latestUpdatedAtIso || '') || 0)
    })
  }, [leads, searchTerm, categoryFilter, typeFilter, ticketFilter, sortBy])

  const formatLeadType = (value = '') => {
    const normalized = toTrimmedValue(value).toLowerCase()
    if (normalized === 'business') return 'Business'
    if (normalized === 'non-profit') return 'Non-profit'
    if (normalized === 'individual') return 'Individual'
    return '--'
  }

  const formatLeadCategory = (value = '', list = []) => {
    const resolved = []
    const pushCategory = (entry = '') => {
      const normalized = toTrimmedValue(entry)
      if (!normalized || resolved.includes(normalized)) return
      resolved.push(normalized)
    }
    ;(Array.isArray(list) ? list : []).forEach((entry) => pushCategory(entry))
    pushCategory(value)
    if (resolved.length === 0) return '--'
    return resolved
      .map((entry) => {
        if (entry === 'Inquiry_FollowUP') return 'Inquiry Follow-up'
        if (entry === 'Newsletter_Subscriber') return 'Newsletter Subscriber'
        return entry
      })
      .join(', ')
  }

  const handleOpenInbox = (leadClientEmail = '') => {
    const normalizedEmail = toTrimmedValue(leadClientEmail).toLowerCase()
    if (normalizedEmail) {
      try {
        localStorage.setItem(SUPPORT_INBOX_FOCUS_EMAIL_KEY, normalizedEmail)
      } catch {
        // Ignore storage write failure.
      }
    }
    setActivePage?.('admin-communications')
  }

  const handleDeleteLead = (lead = null) => {
    if (!lead || typeof lead !== 'object') return
    const leadLabel = toTrimmedValue(lead.leadLabel) || toTrimmedValue(lead.fullName) || toTrimmedValue(lead.contactEmail) || 'this lead'
    const confirmed = window.confirm(`Move ${leadLabel} to trash? You can restore later from Admin Trash.`)
    if (!confirmed) return

    const deleteResult = deleteSupportLead({
      leadId: lead.id,
      clientEmail: lead.clientEmail,
    })
    if (!deleteResult.ok) {
      showToast?.('error', deleteResult.message || 'Unable to delete lead.')
      return
    }

    appendAdminTrashEntryToStorage({
      entityType: 'lead',
      entityLabel: leadLabel,
      description: `Lead removed with ${deleteResult.removedTicketCount || 0} linked support ticket(s).`,
      deletedByName: adminActorName,
      payload: {
        lead: deleteResult.lead || lead,
        tickets: Array.isArray(deleteResult.tickets) ? deleteResult.tickets : [],
        removedAtIso: new Date().toISOString(),
      },
    })

    onAdminActionLog?.({
      adminName: adminActorName,
      action: 'Deleted lead',
      affectedUser: leadLabel,
      details: `Moved to trash (${deleteResult.removedTicketCount || 0} ticket(s) archived).`,
    })
    showToast?.('success', `${leadLabel} moved to trash.`)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Leads</h2>
          <p className="text-sm text-text-secondary mt-1">Track inquiry and newsletter leads with contact and routing details.</p>
        </div>
        <div className="text-sm text-text-muted">Showing {filteredLeads.length} of {leads.length} lead(s)</div>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-border-light">
        <div className="p-4 border-b border-border-light">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search lead name, category, email, type, IP, or location..."
              className="h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary md:col-span-2"
            />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-10 px-3 border border-border rounded-md text-sm bg-white focus:outline-none focus:border-primary"
            >
              <option value="all">All Categories</option>
              <option value="inquiry">Inquiry Follow-up</option>
              <option value="newsletter">Newsletter Subscriber</option>
              <option value="mixed">Mixed Categories</option>
            </select>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-10 px-3 border border-border rounded-md text-sm bg-white focus:outline-none focus:border-primary"
            >
              <option value="all">All Types</option>
              <option value="business">Business</option>
              <option value="non-profit">Non-profit</option>
              <option value="individual">Individual</option>
              <option value="unknown">Unknown</option>
            </select>
            <select
              value={ticketFilter}
              onChange={(event) => setTicketFilter(event.target.value)}
              className="h-10 px-3 border border-border rounded-md text-sm bg-white focus:outline-none focus:border-primary"
            >
              <option value="all">All Tickets</option>
              <option value="open">Open Tickets</option>
              <option value="closed">No Open Tickets</option>
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="h-10 px-3 border border-border rounded-md text-sm bg-white focus:outline-none focus:border-primary md:col-span-2 xl:col-span-2"
            >
              <option value="updated-desc">Sort: Updated (Newest)</option>
              <option value="updated-asc">Sort: Updated (Oldest)</option>
              <option value="label-asc">Sort: Lead Label (A-Z)</option>
              <option value="label-desc">Sort: Lead Label (Z-A)</option>
              <option value="email-asc">Sort: Email (A-Z)</option>
              <option value="email-desc">Sort: Email (Z-A)</option>
              <option value="open-desc">Sort: Open Tickets (High-Low)</option>
              <option value="open-asc">Sort: Open Tickets (Low-High)</option>
            </select>
          </div>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="px-4 py-10 text-sm text-text-muted text-center">
            No leads found yet.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[1200px] border-collapse">
              <thead className="bg-background border-b border-border-light">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">S/N</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Full Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Organization</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">IP Address</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Open Tickets</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">All Tickets</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Updated</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead, index) => (
                  <tr key={lead.id} className="border-b border-border-light hover:bg-background transition-colors">
                    <td className="px-4 py-3.5 text-sm font-semibold text-text-primary">{index + 1}</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">Lead</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{formatLeadCategory(lead.leadCategory, lead.leadCategories)}</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{lead.fullName || '--'}</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{lead.contactEmail || '--'}</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{formatLeadType(lead.organizationType)}</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{lead.ipAddress || '--'}</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{lead.location || '--'}</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{lead.openTicketCount || 0}</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{lead.ticketCount || 0}</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{formatTimestamp(lead.latestUpdatedAtIso || lead.updatedAtIso)}</td>
                    <td className="px-4 py-3.5 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenInbox(lead.clientEmail)}
                          className="h-8 px-3 rounded-md border border-border text-xs font-medium text-text-primary hover:bg-white"
                        >
                          Open Support Inbox
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLead(lead)}
                          className="h-8 px-3 rounded-md border border-error/50 text-xs font-medium text-error hover:bg-error/10"
                        >
                          Delete Lead
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function AdminTrashPage({ showToast, currentAdminAccount, onAdminActionLog }) {
  const [trashEntries, setTrashEntries] = useState(() => readAdminTrashEntriesFromStorage())
  const adminActorName = toTrimmedValue(currentAdminAccount?.fullName)
    || toTrimmedValue(currentAdminAccount?.firstName)
    || 'Admin User'

  useEffect(() => {
    const syncTrash = () => setTrashEntries(readAdminTrashEntriesFromStorage())
    syncTrash()
    const handleStorage = (event) => {
      if (!event.key || event.key === ADMIN_TRASH_STORAGE_KEY) {
        syncTrash()
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const formatEntityType = (value = '') => {
    const normalized = toTrimmedValue(value).toLowerCase()
    if (normalized === 'lead') return 'Lead'
    if (normalized === 'notification-draft') return 'Notification Draft'
    return normalized || 'Unknown'
  }

  const refreshTrash = () => setTrashEntries(readAdminTrashEntriesFromStorage())

  const handleRestoreEntry = (entry = null) => {
    if (!entry || typeof entry !== 'object') return
    if (entry.entityType === 'lead') {
      const restoreResult = restoreSupportLead({
        lead: entry.payload?.lead,
        tickets: entry.payload?.tickets,
      })
      if (!restoreResult.ok) {
        showToast?.('error', restoreResult.message || 'Unable to restore this lead.')
        return
      }
      removeAdminTrashEntryFromStorage(entry.id)
      refreshTrash()
      onAdminActionLog?.({
        adminName: adminActorName,
        action: 'Restored lead',
        affectedUser: entry.entityLabel || 'Lead',
        details: `Restored from trash with ${restoreResult.restoredTicketCount || 0} ticket(s).`,
      })
      showToast?.('success', `${entry.entityLabel || 'Lead'} restored from trash.`)
      return
    }
    if (entry.entityType === 'notification-draft') {
      const draft = entry.payload?.draft
      if (!draft || typeof draft !== 'object') {
        showToast?.('error', 'Draft payload is missing.')
        return
      }
      upsertAdminNotificationDraftInStorage(draft)
      removeAdminTrashEntryFromStorage(entry.id)
      refreshTrash()
      onAdminActionLog?.({
        adminName: adminActorName,
        action: 'Restored notification draft',
        affectedUser: entry.entityLabel || '(Untitled draft)',
        details: 'Notification draft restored from trash.',
      })
      showToast?.('success', 'Draft restored from trash.')
      return
    }
    showToast?.('error', 'Restore is not available for this item type yet.')
  }

  const handleDeletePermanently = (entry = null) => {
    if (!entry || typeof entry !== 'object') return
    const confirmed = window.confirm(`Delete ${entry.entityLabel || 'this item'} permanently from trash?`)
    if (!confirmed) return
    removeAdminTrashEntryFromStorage(entry.id)
    refreshTrash()
    onAdminActionLog?.({
      adminName: adminActorName,
      action: 'Emptied trash item',
      affectedUser: entry.entityLabel || 'Trash item',
      details: `Permanently removed ${formatEntityType(entry.entityType)} from trash.`,
    })
    showToast?.('success', 'Item removed permanently.')
  }

  const handleEmptyTrash = () => {
    if (trashEntries.length === 0) return
    const confirmed = window.confirm('Empty trash permanently? This cannot be undone.')
    if (!confirmed) return
    clearAdminTrashEntriesFromStorage()
    refreshTrash()
    onAdminActionLog?.({
      adminName: adminActorName,
      action: 'Emptied trash',
      affectedUser: `${trashEntries.length} item(s)`,
      details: 'All trash items were permanently removed.',
    })
    showToast?.('success', 'Trash emptied.')
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Trash</h2>
          <p className="text-sm text-text-secondary mt-1">Recover deleted admin records or remove them permanently.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-text-muted">Items: {trashEntries.length}</div>
          <button
            type="button"
            onClick={handleEmptyTrash}
            disabled={trashEntries.length === 0}
            className="h-9 px-3 rounded-md border border-error/50 text-xs font-semibold text-error hover:bg-error/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Empty Trash
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card border border-border-light overflow-hidden">
        {trashEntries.length === 0 ? (
          <div className="px-4 py-10 text-sm text-text-muted text-center">
            Trash is empty.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead className="bg-background border-b border-border-light">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">S/N</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Deleted By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Deleted At</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trashEntries.map((entry, index) => (
                  <tr key={entry.id} className="border-b border-border-light hover:bg-background transition-colors">
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{index + 1}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-text-primary">{entry.entityLabel || '--'}</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{formatEntityType(entry.entityType)}</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{entry.description || '--'}</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{entry.deletedByName || '--'}</td>
                    <td className="px-4 py-3.5 text-sm text-text-secondary">{formatTimestamp(entry.deletedAtIso)}</td>
                    <td className="px-4 py-3.5 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleRestoreEntry(entry)}
                          className="h-8 px-3 rounded-md border border-border text-xs font-medium text-text-primary hover:bg-white"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePermanently(entry)}
                          className="h-8 px-3 rounded-md border border-error/50 text-xs font-medium text-error hover:bg-error/10"
                        >
                          Delete Permanently
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Communications Center (Message Center)
function AdminCommunicationsCenter({ showToast, currentAdminAccount, onAdminActionLog, setActivePage }) {
  const [activeTab, setActiveTab] = useState('sent')
  const [notifications, setNotifications] = useState(() => readAdminSentNotificationsFromStorage())
  const [drafts, setDrafts] = useState(() => readAdminNotificationDraftsFromStorage())
  const [scheduledNotifications, setScheduledNotifications] = useState(() => readAdminScheduledNotificationsFromStorage())
  const [supportSnapshot, setSupportSnapshot] = useState(() => getSupportCenterSnapshot())
  const supportUnreadRef = useRef(-1)

  useEffect(() => {
    const refreshNotifications = () => {
      setNotifications(readAdminSentNotificationsFromStorage())
      setDrafts(readAdminNotificationDraftsFromStorage())
      setScheduledNotifications(readAdminScheduledNotificationsFromStorage())
    }
    refreshNotifications()
    const refreshIntervalId = window.setInterval(refreshNotifications, 4000)
    window.addEventListener(ADMIN_NOTIFICATIONS_SYNC_EVENT, refreshNotifications)
    window.addEventListener('storage', refreshNotifications)
    return () => {
      window.removeEventListener('storage', refreshNotifications)
      window.removeEventListener(ADMIN_NOTIFICATIONS_SYNC_EVENT, refreshNotifications)
      window.clearInterval(refreshIntervalId)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeSupportCenter((snapshot) => setSupportSnapshot(snapshot))
    return unsubscribe
  }, [])

  const supportUnreadCount = useMemo(() => {
    const tickets = Array.isArray(supportSnapshot?.tickets) ? supportSnapshot.tickets : []
    return tickets.reduce((total, ticket) => total + Number(ticket?.unreadByAdmin || 0), 0)
  }, [supportSnapshot])

  useEffect(() => {
    let delayedSoundTimer = null
    const nextUnreadCount = Number(supportUnreadCount || 0)
    if (supportUnreadRef.current < 0) {
      supportUnreadRef.current = nextUnreadCount
      const windowActive = typeof document !== 'undefined'
        ? (document.visibilityState === 'visible' && document.hasFocus())
        : true
      if (nextUnreadCount > 0 && (activeTab !== 'support' || !windowActive)) {
        delayedSoundTimer = window.setTimeout(() => {
          playSupportNotificationSound()
        }, SUPPORT_NOTIFICATION_INITIAL_DELAY_MS)
      }
      return () => {
        if (delayedSoundTimer) window.clearTimeout(delayedSoundTimer)
      }
    }
    const previousUnreadCount = supportUnreadRef.current
    supportUnreadRef.current = nextUnreadCount
    if (nextUnreadCount <= previousUnreadCount) return

    const windowActive = typeof document !== 'undefined'
      ? (document.visibilityState === 'visible' && document.hasFocus())
      : true
    if (activeTab !== 'support' || !windowActive) {
      playSupportNotificationSound()
    }

    return () => {
      if (delayedSoundTimer) window.clearTimeout(delayedSoundTimer)
    }
  }, [supportUnreadCount, activeTab])

  const handleEditDraft = (draftId = '') => {
    const normalizedDraftId = toTrimmedValue(draftId)
    if (!normalizedDraftId) return
    localStorage.setItem(ADMIN_NOTIFICATION_EDIT_DRAFT_STORAGE_KEY, normalizedDraftId)
    setActivePage?.('admin-notifications')
  }

  const handleDeleteDraft = (draftId = '') => {
    const normalizedDraftId = toTrimmedValue(draftId)
    if (!normalizedDraftId) return
    const draft = drafts.find((item) => item.id === normalizedDraftId)
    if (draft) {
      appendAdminTrashEntryToStorage({
        entityType: 'notification-draft',
        entityLabel: draft.title || '(Untitled draft)',
        description: draft.message || '',
        deletedByName: toTrimmedValue(currentAdminAccount?.fullName) || 'Admin User',
        payload: { draft },
      })
    }
    removeAdminNotificationDraftFromStorage(normalizedDraftId)
    setDrafts(readAdminNotificationDraftsFromStorage())
    showToast?.('success', 'Draft moved to trash.')
  }

  const handleCancelScheduled = (scheduledId = '') => {
    const normalizedId = toTrimmedValue(scheduledId)
    if (!normalizedId) return
    const existingEntries = readAdminScheduledNotificationsFromStorage()
    const target = existingEntries.find((entry) => entry.id === normalizedId)
    if (!target || target.status === 'Sent' || target.status === 'Cancelled') return
    const nowIso = new Date().toISOString()
    const nextEntries = existingEntries.map((entry) => (
      entry.id === normalizedId
        ? normalizeScheduledNotification({
          ...entry,
          status: 'Cancelled',
          updatedAtIso: nowIso,
        })
        : entry
    ))
    persistAdminScheduledNotificationsToStorage(nextEntries)
    setScheduledNotifications(nextEntries)
    showToast?.('success', 'Scheduled notification cancelled.')
  }

  const handleSendScheduledNow = async (scheduledId = '') => {
    const normalizedId = toTrimmedValue(scheduledId)
    if (!normalizedId) return
    const existingEntries = readAdminScheduledNotificationsFromStorage()
    const target = existingEntries.find((entry) => entry.id === normalizedId)
    if (!target || target.status === 'Sent' || target.status === 'Cancelled') return

    const nowIso = new Date().toISOString()
    const nextEntries = existingEntries.map((entry) => (
      entry.id === normalizedId
        ? normalizeScheduledNotification({
          ...entry,
          status: 'Scheduled',
          scheduledForIso: nowIso,
          updatedAtIso: nowIso,
        })
        : entry
    ))
    persistAdminScheduledNotificationsToStorage(nextEntries)
    setScheduledNotifications(nextEntries)
    const result = await runScheduledNotificationProcessor()
    if ((result?.processedCount || 0) > 0) {
      showToast?.('success', 'Scheduled notification sent.')
    } else {
      showToast?.('error', 'Unable to send scheduled notification now.')
    }
  }

  const getScheduledStatusStyle = (status = '') => {
    if (status === 'Sent') return 'bg-success-bg text-success'
    if (status === 'Cancelled') return 'bg-background text-text-muted'
    if (status === 'Failed') return 'bg-error-bg text-error'
    if (status === 'Sending') return 'bg-warning-bg text-warning'
    return 'bg-primary-tint text-primary'
  }

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
          <button
            onClick={() => setActiveTab('support')}
            className={`flex-1 h-12 px-4 text-sm font-medium transition-colors ${activeTab === 'support' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <span className="inline-flex items-center gap-2">
              <span>Support Inbox</span>
              {supportUnreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-error text-white text-[10px] font-semibold">
                  {supportUnreadCount > 99 ? '99+' : supportUnreadCount}
                </span>
              )}
            </span>
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
                      <h4 className="text-sm font-semibold text-text-primary">{draft.title || '(Untitled draft)'}</h4>
                      <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">{draft.message || 'No message body yet.'}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-text-muted" />
                          <span className="text-xs text-text-muted">
                            {draft.mode === 'targeted'
                              ? `Targeted (${Array.isArray(draft.selectedUsers) ? draft.selectedUsers.length : 0} users)`
                              : `Bulk (${draft.bulkAudience || 'all-users'})`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-text-muted" />
                          <span className="text-xs text-text-muted">{formatTimestamp(draft.updatedAtIso)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEditDraft(draft.id)}
                          className="text-xs text-primary hover:underline"
                        >
                          Edit Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDraft(draft.id)}
                          className="text-xs text-error hover:underline"
                        >
                          Delete
                        </button>
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
            <div className="space-y-4">
              {scheduledNotifications.map((item) => (
                <div key={item.id} className="border border-border-light rounded-lg p-4 hover:shadow-card transition-shadow">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-text-primary">{item.title}</h4>
                      <p className="text-sm text-text-secondary mt-1">{item.message || '--'}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                          <Users className="w-3.5 h-3.5" />
                          {getNotificationAudienceLabel({
                            mode: item.mode,
                            bulkAudience: item.bulkAudience,
                            selectedUsers: item.selectedUsers,
                          })}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                          <Calendar className="w-3.5 h-3.5" />
                          Scheduled {formatTimestamp(item.scheduledForIso)}
                        </span>
                        {item.sentAtIso && (
                          <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                            <Clock className="w-3.5 h-3.5" />
                            Sent {formatTimestamp(item.sentAtIso)}
                          </span>
                        )}
                        {item.emailSuccessCount > 0 && (
                          <span className="text-xs text-text-muted">
                            Email: {item.emailSuccessCount} delivered
                            {item.emailFailureCount > 0 ? `, ${item.emailFailureCount} failed` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${getScheduledStatusStyle(item.status)}`}>
                        {item.status}
                      </span>
                      {item.status === 'Scheduled' && (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleSendScheduledNow(item.id)}
                            className="h-8 px-3 rounded-md border border-border text-xs font-medium text-text-primary hover:bg-background"
                          >
                            Send Now
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelScheduled(item.id)}
                            className="h-8 px-3 rounded-md border border-error/40 text-xs font-medium text-error hover:bg-error/10"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {scheduledNotifications.length === 0 && (
                <div className="text-center py-8 text-text-muted">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No scheduled notifications</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'support' && (
            <AdminSupportInboxPanel
              showToast={showToast}
              currentAdminAccount={currentAdminAccount}
              onAdminActionLog={onAdminActionLog}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// Send Notification Page
function AdminSendNotificationPage({ showToast, runWithSlowRuntimeWatch }) {
  const [mode, setMode] = useState('bulk') // 'bulk' or 'targeted'
  const [bulkAudience, setBulkAudience] = useState('all-users')
  const [deliveryMode, setDeliveryMode] = useState('now')
  const [scheduledForLocal, setScheduledForLocal] = useState('')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [priority, setPriority] = useState('normal')
  const [showPreview, setShowPreview] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [activeDraftId, setActiveDraftId] = useState('')
  const [draftSavedAtIso, setDraftSavedAtIso] = useState('')
  const [recipientsDirectory, setRecipientsDirectory] = useState(() => getNotificationRecipientsDirectory())
  
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

  useEffect(() => {
    const refreshRecipients = () => setRecipientsDirectory(getNotificationRecipientsDirectory())
    refreshRecipients()
    window.addEventListener('storage', refreshRecipients)
    window.addEventListener(ADMIN_NOTIFICATIONS_SYNC_EVENT, refreshRecipients)
    return () => {
      window.removeEventListener('storage', refreshRecipients)
      window.removeEventListener(ADMIN_NOTIFICATIONS_SYNC_EVENT, refreshRecipients)
    }
  }, [])

  useEffect(() => {
    const draftIdToEdit = toTrimmedValue(localStorage.getItem(ADMIN_NOTIFICATION_EDIT_DRAFT_STORAGE_KEY))
    if (!draftIdToEdit) return
    const draft = readAdminNotificationDraftsFromStorage().find((item) => item.id === draftIdToEdit)
    localStorage.removeItem(ADMIN_NOTIFICATION_EDIT_DRAFT_STORAGE_KEY)
    if (!draft) return
    setMode(draft.mode || 'bulk')
    setBulkAudience(draft.bulkAudience || 'all-users')
    setDeliveryMode(draft.deliveryMode === 'scheduled' ? 'scheduled' : 'now')
    setScheduledForLocal(toDateTimeLocalValue(draft.scheduledForIso || ''))
    setTitle(draft.title || '')
    setMessage(draft.message || '')
    setLink(draft.link || '')
    setPriority(draft.priority || 'normal')
    setSearchUser(draft.searchUser || '')
    setSelectedUsers(Array.isArray(draft.selectedUsers) ? draft.selectedUsers : [])
    setFilters({
      business: draft.filters?.business || '',
      country: draft.filters?.country || '',
      role: draft.filters?.role || '',
      verificationStatus: draft.filters?.verificationStatus || '',
      registrationStage: draft.filters?.registrationStage || '',
    })
    setActiveDraftId(draft.id)
    setDraftSavedAtIso(draft.updatedAtIso || '')
    showToast?.('success', 'Draft loaded for editing.')
  }, [showToast])

  const scheduledForIso = Number.isFinite(Date.parse(scheduledForLocal || ''))
    ? new Date(scheduledForLocal).toISOString()
    : ''
  const isScheduledForFuture = deliveryMode !== 'scheduled'
    || (scheduledForIso && (Date.parse(scheduledForIso) > Date.now()))
  const hasAnyDraftContent = Boolean(
    scheduledForLocal
    || title.trim()
    || message.trim()
    || link.trim()
    || searchUser.trim()
    || selectedUsers.length > 0
    || Object.values(filters).some((value) => toTrimmedValue(value)),
  )
  const isMessageReadyToSend = Boolean(
    title.trim()
    && message.trim()
    && (mode === 'bulk' || selectedUsers.length > 0)
    && isScheduledForFuture,
  )

  const buildDraftPayload = (draftId = activeDraftId || createNotificationDraftId()) => ({
    id: draftId,
    mode,
    bulkAudience,
    deliveryMode,
    scheduledForIso: deliveryMode === 'scheduled' ? scheduledForIso : '',
    title,
    message,
    link,
    priority,
    searchUser,
    selectedUsers,
    filters,
    createdAtIso: draftSavedAtIso || new Date().toISOString(),
    updatedAtIso: new Date().toISOString(),
  })

  const saveDraft = ({ announce = false } = {}) => {
    if (!hasAnyDraftContent) {
      if (announce) showToast?.('error', 'Add content before saving a draft.')
      return null
    }
    const draft = upsertAdminNotificationDraftInStorage(buildDraftPayload())
    setActiveDraftId(draft.id)
    setDraftSavedAtIso(draft.updatedAtIso)
    if (announce) showToast?.('success', 'Draft saved.')
    return draft
  }

  useEffect(() => {
    if (!hasAnyDraftContent) {
      if (activeDraftId) {
        removeAdminNotificationDraftFromStorage(activeDraftId)
        setActiveDraftId('')
        setDraftSavedAtIso('')
      }
      return
    }
    if (isMessageReadyToSend) return
    const autosaveId = window.setTimeout(() => {
      saveDraft({ announce: false })
    }, 450)
    return () => window.clearTimeout(autosaveId)
  }, [
    hasAnyDraftContent,
    isMessageReadyToSend,
    activeDraftId,
    mode,
    bulkAudience,
    deliveryMode,
    scheduledForLocal,
    title,
    message,
    link,
    priority,
    searchUser,
    selectedUsers,
    filters,
  ])

  const filteredUsers = recipientsDirectory.filter(user => {
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
    if (isSending) return
    if (deliveryMode === 'scheduled' && !scheduledForIso) {
      saveDraft({ announce: true })
      showToast('error', 'Select a valid schedule date and time.')
      return
    }
    if (deliveryMode === 'scheduled' && !isScheduledForFuture) {
      saveDraft({ announce: true })
      showToast('error', 'Scheduled time must be in the future.')
      return
    }
    if (!isMessageReadyToSend) {
      saveDraft({ announce: true })
      showToast('error', 'Complete required fields before sending. Saved to drafts.')
      return
    }
    setShowConfirm(true)
  }

  const confirmSend = async () => {
    if (isSending) return
    setIsSending(true)
    const executeSend = async () => {
      await waitForNetworkAwareDelay('search')
      if (deliveryMode === 'scheduled') {
        const scheduledAtIso = Number.isFinite(Date.parse(scheduledForLocal || ''))
          ? new Date(scheduledForLocal).toISOString()
          : ''
        if (!scheduledAtIso || Date.parse(scheduledAtIso) <= Date.now()) {
          showToast('error', 'Scheduled time must be in the future.')
          return
        }

        const recipients = resolveNotificationRecipients({
          mode,
          bulkAudience,
          selectedUsers,
        })
        if (recipients.length === 0) {
          showToast('error', 'No recipients matched this notification.')
          return
        }

        upsertAdminScheduledNotificationInStorage({
          id: createScheduledNotificationId(),
          mode,
          bulkAudience,
          title,
          message,
          link,
          priority,
          selectedUsers,
          status: 'Scheduled',
          createdAtIso: new Date().toISOString(),
          updatedAtIso: new Date().toISOString(),
          scheduledForIso: scheduledAtIso,
          recipientCount: recipients.length,
          deliveryOrigin: 'scheduled',
        })
        showToast('success', `Notification scheduled for ${formatTimestamp(scheduledAtIso)}.`)
      } else {
        const sendResult = await dispatchAdminNotification({
          mode,
          bulkAudience,
          selectedUsers,
          title,
          message,
          link,
          priority,
          deliveryOrigin: 'manual',
        })
        if (!sendResult.ok) {
          showToast('error', 'No recipients matched this notification.')
          return
        }
        showToast('success', mode === 'bulk'
          ? `Notification sent successfully to ${sendResult.recipientCount} users.`
          : `Notification sent successfully to ${sendResult.recipientCount} users.`)
      }

      if (activeDraftId) {
        removeAdminNotificationDraftFromStorage(activeDraftId)
      }
      setShowConfirm(false)
      setActiveDraftId('')
      setDraftSavedAtIso('')
      setDeliveryMode('now')
      setScheduledForLocal('')
      setTitle('')
      setMessage('')
      setLink('')
      setSearchUser('')
      setFilters({
        business: '',
        country: '',
        role: '',
        verificationStatus: '',
        registrationStage: '',
      })
      setSelectedUsers([])
    }
    try {
      if (typeof runWithSlowRuntimeWatch === 'function') {
        await runWithSlowRuntimeWatch(
          executeSend,
          deliveryMode === 'scheduled' ? 'Scheduling notification...' : 'Sending notification...',
        )
      } else {
        await executeSend()
      }
    } finally {
      setIsSending(false)
    }
  }

  const getAudienceCount = () => {
    return resolveNotificationRecipients({
      mode: 'bulk',
      bulkAudience,
      selectedUsers: [],
    }).length
  }

  const bulkAudienceOptions = [
    { id: 'all-users', label: 'All Users', icon: Users },
    { id: 'all-businesses', label: 'All Businesses', icon: Building },
    { id: 'all-accountants', label: 'All Accountants', icon: UsersRound },
    { id: 'pending-verification', label: 'Pending Verification Users', icon: AlertTriangle },
  ].map((option) => ({
    ...option,
    count: resolveNotificationRecipients({
      mode: 'bulk',
      bulkAudience: option.id,
      selectedUsers: [],
    }).length,
  }))

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <button
            onClick={() => setMode('bulk')}
            className={`w-full p-4 rounded-lg border-2 transition-all ${mode === 'bulk' ? 'border-primary bg-primary-tint' : 'border-border-light hover:border-border'}`}
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
            className={`w-full p-4 rounded-lg border-2 transition-all ${mode === 'targeted' ? 'border-primary bg-primary-tint' : 'border-border-light hover:border-border'}`}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bulkAudienceOptions.map(option => (
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

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Delivery</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDeliveryMode('now')}
                  className={`h-10 px-3 rounded-md border-2 text-sm font-medium transition-colors ${deliveryMode === 'now' ? 'border-primary text-primary bg-primary-tint' : 'border-border text-text-secondary hover:border-border-light'}`}
                >
                  Send Now
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMode('scheduled')}
                  className={`h-10 px-3 rounded-md border-2 text-sm font-medium transition-colors ${deliveryMode === 'scheduled' ? 'border-primary text-primary bg-primary-tint' : 'border-border text-text-secondary hover:border-border-light'}`}
                >
                  Schedule
                </button>
              </div>
              {deliveryMode === 'scheduled' && (
                <div className="mt-3">
                  <input
                    type="datetime-local"
                    value={scheduledForLocal}
                    onChange={(event) => setScheduledForLocal(event.target.value)}
                    className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                  />
                  <p className="text-xs text-text-muted mt-1">Scheduled messages send automatically and trigger brief client notifications.</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-border-light">
              <button
                type="button"
                onClick={() => saveDraft({ announce: true })}
                className="h-10 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background"
              >
                Save Draft
              </button>
              <button
                onClick={() => setShowPreview(true)}
                disabled={!title || !message}
                className="h-10 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Preview
              </button>
              <button
                onClick={handleSend}
                disabled={!isMessageReadyToSend || isSending}
                className="h-10 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {deliveryMode === 'scheduled' ? 'Schedule Notification' : 'Send Notification'}
              </button>
              {draftSavedAtIso && (
                <span className="text-xs text-text-muted ml-auto">
                  Draft saved {formatTimestamp(draftSavedAtIso)}
                </span>
              )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Business</label>
                <select
                  value={filters.business}
                  onChange={(e) => setFilters(prev => ({ ...prev, business: e.target.value }))}
                  className="w-full h-9 px-2 border border-border rounded text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">All</option>
                  {[...new Set(recipientsDirectory.map(u => u.businessName))].filter(Boolean).map(b => (
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
                  {[...new Set(recipientsDirectory.map(u => u.country))].filter(Boolean).map(c => (
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
                  {[...new Set(recipientsDirectory.map(u => u.role))].filter(Boolean).map(r => (
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
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
              <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Delivery</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('now')}
                    className={`h-10 px-3 rounded-md border-2 text-sm font-medium transition-colors ${deliveryMode === 'now' ? 'border-primary text-primary bg-primary-tint' : 'border-border text-text-secondary hover:border-border-light'}`}
                  >
                    Send Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('scheduled')}
                    className={`h-10 px-3 rounded-md border-2 text-sm font-medium transition-colors ${deliveryMode === 'scheduled' ? 'border-primary text-primary bg-primary-tint' : 'border-border text-text-secondary hover:border-border-light'}`}
                  >
                    Schedule
                  </button>
                </div>
                {deliveryMode === 'scheduled' && (
                  <div className="mt-3">
                    <input
                      type="datetime-local"
                      value={scheduledForLocal}
                      onChange={(event) => setScheduledForLocal(event.target.value)}
                      className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                    />
                    <p className="text-xs text-text-muted mt-1">Scheduled messages send automatically and trigger brief client notifications.</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border-light">
                <button
                  type="button"
                  onClick={() => saveDraft({ announce: true })}
                  className="h-10 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => setShowPreview(true)}
                  disabled={!title || !message || selectedUsers.length === 0}
                  className="h-10 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Preview
                </button>
              <button
                onClick={handleSend}
                disabled={!isMessageReadyToSend || isSending}
                className="h-10 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {deliveryMode === 'scheduled'
                  ? `Schedule for ${selectedUsers.length} Users`
                  : `Send to ${selectedUsers.length} Users`}
              </button>
                {draftSavedAtIso && (
                  <span className="text-xs text-text-muted ml-auto">
                    Draft saved {formatTimestamp(draftSavedAtIso)}
                  </span>
                )}
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
                This notification will be sent to {mode === 'bulk' ? getAudienceCount() : selectedUsers.length} recipient(s)
                {deliveryMode === 'scheduled' && scheduledForIso ? ` on ${formatTimestamp(scheduledForIso)}` : ' immediately'}.
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
                    {deliveryMode === 'scheduled'
                      ? `Schedule this notification for ${mode === 'bulk' ? `${getAudienceCount()} users` : `${selectedUsers.length} users`}?`
                      : `Are you sure you want to send this notification to ${mode === 'bulk' ? `${getAudienceCount()} users` : `${selectedUsers.length} users`}?`}
                  </p>
                  <p className="text-xs text-text-muted mt-2">
                    {deliveryMode === 'scheduled' && scheduledForIso
                      ? `Scheduled time: ${formatTimestamp(scheduledForIso)}.`
                      : 'This action cannot be undone.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border-light flex justify-end gap-3">
              <button 
                onClick={() => setShowConfirm(false)}
                disabled={isSending}
                className="h-10 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background"
              >
                Cancel
              </button>
              <button 
                onClick={() => void confirmSend()}
                disabled={isSending}
                className="h-10 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <DotLottiePreloader size={18} />
                    <span>{deliveryMode === 'scheduled' ? 'Scheduling...' : 'Sending...'}</span>
                  </>
                ) : (deliveryMode === 'scheduled' ? 'Confirm & Schedule' : 'Confirm & Send')}
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h2 className="text-2xl font-semibold text-text-primary">System Activity Log</h2>
        <p className="text-sm text-text-muted">Audit trail for all admin actions</p>
      </div>

      <div className="md:hidden space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="bg-white rounded-lg shadow-card border border-border-light p-4">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Clock className="w-3.5 h-3.5" />
              {log.timestamp}
            </div>
            <p className="text-sm font-semibold text-text-primary mt-2">{log.adminName}</p>
            <div className="mt-2">
              <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${getActionStyle(log.action)}`}>
                {log.action}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-2"><span className="text-text-muted">Affected:</span> {log.affectedUser}</p>
            <p className="text-xs text-text-secondary mt-1"><span className="text-text-muted">Details:</span> {log.details}</p>
          </div>
        ))}
      </div>

      <div className="hidden md:block bg-white rounded-lg shadow-card border border-border-light">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
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
  AdminSupportLeadsPage,
  AdminTrashPage,
  AdminCommunicationsCenter,
  AdminSendNotificationPage,
  AdminActivityLogPage,
}
