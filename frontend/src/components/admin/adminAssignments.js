import { ADMIN_LEVELS, normalizeAdminLevel } from './adminIdentity'

export const CLIENT_ASSIGNMENTS_STORAGE_KEY = 'kiaminaClientAssignments'

const safeParseJson = (rawValue, fallback) => {
  try {
    const parsed = rawValue ? JSON.parse(rawValue) : fallback
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

const toNormalizedEmail = (value = '') => String(value || '').trim().toLowerCase()

const normalizeAssignment = (entry = {}) => {
  const clientEmail = toNormalizedEmail(entry.clientEmail || entry.clientId)
  const assignedAccountantEmail = toNormalizedEmail(
    entry.assignedAccountantEmail
    || entry.assignedAdminEmail
    || entry.assignedTo,
  )
  return {
    id: entry.id || `ASN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    clientEmail,
    assignedAccountantEmail,
    assignedAt: entry.assignedAt || new Date().toISOString(),
    assignedBy: toNormalizedEmail(entry.assignedBy || entry.assignedByEmail),
  }
}

export const readClientAssignmentsFromStorage = () => {
  if (typeof localStorage === 'undefined') return []
  const parsed = safeParseJson(localStorage.getItem(CLIENT_ASSIGNMENTS_STORAGE_KEY), [])
  if (!Array.isArray(parsed)) return []
  const dedupeByClientAndAssignee = new Map()
  parsed.forEach((entry) => {
    const normalized = normalizeAssignment(entry)
    if (!normalized.clientEmail || !normalized.assignedAccountantEmail) return
    const dedupeKey = `${normalized.clientEmail}::${normalized.assignedAccountantEmail}`
    dedupeByClientAndAssignee.set(dedupeKey, normalized)
  })
  return [...dedupeByClientAndAssignee.values()]
}

export const writeClientAssignmentsToStorage = (assignments = []) => {
  if (typeof localStorage === 'undefined') return
  const normalized = (Array.isArray(assignments) ? assignments : [])
    .map((entry) => normalizeAssignment(entry))
    .filter((entry) => entry.clientEmail && entry.assignedAccountantEmail)
  localStorage.setItem(CLIENT_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(normalized))
}

export const getClientAssignmentForClientEmail = (clientEmail = '', assignments = readClientAssignmentsFromStorage()) => {
  const matches = getClientAssignmentsForClientEmail(clientEmail, assignments)
  return matches[0] || null
}

export const getClientAssignmentsForClientEmail = (clientEmail = '', assignments = readClientAssignmentsFromStorage()) => {
  const normalizedClientEmail = toNormalizedEmail(clientEmail)
  if (!normalizedClientEmail) return []
  const source = Array.isArray(assignments) ? assignments : []
  return source
    .filter((entry) => toNormalizedEmail(entry?.clientEmail) === normalizedClientEmail)
    .map((entry) => normalizeAssignment(entry))
    .sort((left, right) => (Date.parse(right.assignedAt || '') || 0) - (Date.parse(left.assignedAt || '') || 0))
}

export const setClientAssignmentsForClient = ({
  clientEmail = '',
  assignedAccountantEmails = [],
  assignedBy = '',
}) => {
  const normalizedClientEmail = toNormalizedEmail(clientEmail)
  if (!normalizedClientEmail) {
    return {
      ok: false,
      message: 'Client email is required.',
      assignments: readClientAssignmentsFromStorage(),
    }
  }

  const existingAssignments = readClientAssignmentsFromStorage()
  const nextAssignments = existingAssignments.filter((entry) => (
    toNormalizedEmail(entry.clientEmail) !== normalizedClientEmail
  ))
  const normalizedAssigneeEmails = [...new Set(
    (Array.isArray(assignedAccountantEmails) ? assignedAccountantEmails : [])
      .map((email) => toNormalizedEmail(email))
      .filter(Boolean),
  )]
  const nowIso = new Date().toISOString()
  const merged = [
    ...nextAssignments,
    ...normalizedAssigneeEmails.map((assignedAccountantEmail) => normalizeAssignment({
      clientEmail: normalizedClientEmail,
      assignedAccountantEmail,
      assignedAt: nowIso,
      assignedBy,
    })),
  ]
  writeClientAssignmentsToStorage(merged)
  return {
    ok: true,
    message: normalizedAssigneeEmails.length > 0
      ? 'Client assignments updated.'
      : 'Client assignments cleared.',
    assignments: merged,
  }
}

export const setClientAssignment = ({
  clientEmail = '',
  assignedAccountantEmail = '',
  assignedBy = '',
}) => {
  const normalizedClientEmail = toNormalizedEmail(clientEmail)
  const normalizedAssignedEmail = toNormalizedEmail(assignedAccountantEmail)
  if (!normalizedClientEmail) {
    return {
      ok: false,
      message: 'Client email is required.',
      assignment: null,
      assignments: readClientAssignmentsFromStorage(),
    }
  }

  return setClientAssignmentsForClient({
    clientEmail: normalizedClientEmail,
    assignedAccountantEmails: normalizedAssignedEmail ? [normalizedAssignedEmail] : [],
    assignedBy,
  })
}

export const getAssignedClientEmailSetForAdmin = (adminAccount = {}, assignments = readClientAssignmentsFromStorage()) => {
  const normalizedAdminLevel = normalizeAdminLevel(adminAccount?.adminLevel)
  if (normalizedAdminLevel !== ADMIN_LEVELS.AREA_ACCOUNTANT) return null
  const adminEmail = toNormalizedEmail(adminAccount?.email)
  if (!adminEmail) return new Set()
  const source = Array.isArray(assignments) ? assignments : []
  const emails = source
    .filter((entry) => toNormalizedEmail(entry?.assignedAccountantEmail) === adminEmail)
    .map((entry) => toNormalizedEmail(entry?.clientEmail))
    .filter(Boolean)
  return new Set(emails)
}

export const canAdminAccessClientScope = (adminAccount = {}, clientEmail = '', assignments = readClientAssignmentsFromStorage()) => {
  const normalizedClientEmail = toNormalizedEmail(clientEmail)
  if (!normalizedClientEmail) return false
  const allowedClientSet = getAssignedClientEmailSetForAdmin(adminAccount, assignments)
  if (allowedClientSet === null) return true
  return allowedClientSet.has(normalizedClientEmail)
}

export const filterClientsForAdminScope = (clients = [], adminAccount = {}, assignments = readClientAssignmentsFromStorage()) => {
  const list = Array.isArray(clients) ? clients : []
  const allowedClientSet = getAssignedClientEmailSetForAdmin(adminAccount, assignments)
  if (allowedClientSet === null) return list
  return list.filter((client) => allowedClientSet.has(toNormalizedEmail(client?.email)))
}
