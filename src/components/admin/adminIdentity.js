export const ADMIN_LEVELS = {
  SENIOR: 'senior',
  OPERATIONAL: 'operational',
}

export const ADMIN_LEVEL_LABELS = {
  [ADMIN_LEVELS.SENIOR]: 'Senior Admin',
  [ADMIN_LEVELS.OPERATIONAL]: 'Operational Admin',
}

export const ADMIN_PERMISSION_DEFINITIONS = [
  { id: 'view_documents', label: 'View Documents' },
  { id: 'approve_documents', label: 'Approve Documents' },
  { id: 'reject_documents', label: 'Reject Documents' },
  { id: 'comment_documents', label: 'Comment on Documents' },
  { id: 'view_businesses', label: 'View Businesses' },
  { id: 'client_assistance', label: 'Client Assistance' },
  { id: 'approve_verification', label: 'Approve Verification' },
  { id: 'send_notifications', label: 'Send Notifications' },
  { id: 'view_activity_logs', label: 'View Activity Logs' },
  { id: 'manage_users', label: 'Manage Users' },
]

export const FULL_ADMIN_PERMISSION_IDS = ADMIN_PERMISSION_DEFINITIONS.map((permission) => permission.id)

export const isLegacyAdminEmail = (email = '') => {
  const normalizedEmail = email.trim().toLowerCase()
  return normalizedEmail.startsWith('admin@') || normalizedEmail.endsWith('@admin.kiamina.local')
}

export const normalizeRoleWithLegacyFallback = (role, email = '') => {
  if (role === 'admin' || role === 'client') return role
  return isLegacyAdminEmail(email) ? 'admin' : 'client'
}

const normalizePermissionList = (permissionIds) => {
  if (!Array.isArray(permissionIds)) return []
  return permissionIds.filter((permissionId) => FULL_ADMIN_PERMISSION_IDS.includes(permissionId))
}

export const normalizeAdminLevel = (adminLevel) => (
  adminLevel === ADMIN_LEVELS.OPERATIONAL ? ADMIN_LEVELS.OPERATIONAL : ADMIN_LEVELS.SENIOR
)

export const getAdminLevelLabel = (adminLevel) => (
  ADMIN_LEVEL_LABELS[normalizeAdminLevel(adminLevel)] || ADMIN_LEVEL_LABELS[ADMIN_LEVELS.SENIOR]
)

export const isAdminAccount = (account = {}) => (
  normalizeRoleWithLegacyFallback(account.role, account.email || '') === 'admin'
)

export const getEffectiveAdminPermissions = (account = {}) => {
  if (!isAdminAccount(account)) return []
  const normalizedAdminLevel = normalizeAdminLevel(account.adminLevel)
  if (normalizedAdminLevel === ADMIN_LEVELS.SENIOR) return [...FULL_ADMIN_PERMISSION_IDS]
  return normalizePermissionList(account.adminPermissions)
}

export const hasAdminPermission = (account, permissionId) => (
  getEffectiveAdminPermissions(account).includes(permissionId)
)

export const normalizeAdminAccount = (account = {}) => {
  const normalizedRole = normalizeRoleWithLegacyFallback(account.role, account.email || '')
  if (normalizedRole !== 'admin') {
    return {
      ...account,
      role: normalizedRole,
    }
  }

  const normalizedAdminLevel = normalizeAdminLevel(account.adminLevel)
  return {
    ...account,
    role: 'admin',
    adminLevel: normalizedAdminLevel,
    adminPermissions: normalizedAdminLevel === ADMIN_LEVELS.SENIOR
      ? [...FULL_ADMIN_PERMISSION_IDS]
      : normalizePermissionList(account.adminPermissions),
    status: account.status === 'suspended' ? 'suspended' : 'active',
  }
}

export const normalizeAdminInvite = (invite = {}) => {
  const normalizedAdminLevel = normalizeAdminLevel(invite.adminLevel)
  const defaultCreatedAt = new Date().toISOString()
  const defaultExpiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString()
  return {
    ...invite,
    email: invite.email?.trim()?.toLowerCase() || '',
    role: 'admin',
    adminLevel: normalizedAdminLevel,
    adminPermissions: normalizedAdminLevel === ADMIN_LEVELS.SENIOR
      ? [...FULL_ADMIN_PERMISSION_IDS]
      : normalizePermissionList(invite.adminPermissions),
    status: invite.status === 'accepted' || invite.status === 'revoked' ? invite.status : 'pending',
    createdAt: invite.createdAt || defaultCreatedAt,
    expiresAt: invite.expiresAt || defaultExpiresAt,
  }
}

export const isAdminInviteExpired = (invite) => {
  if (!invite?.expiresAt) return true
  const expiryMs = Date.parse(invite.expiresAt)
  if (!Number.isFinite(expiryMs)) return true
  return Date.now() > expiryMs
}

export const isAdminInvitePending = (invite) => (
  Boolean(invite) && invite.status === 'pending' && !isAdminInviteExpired(invite)
)
