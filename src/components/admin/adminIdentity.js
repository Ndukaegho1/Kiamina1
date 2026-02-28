export const ADMIN_LEVELS = {
  SUPER: 'super',
  AREA_ACCOUNTANT: 'area_accountant',
  CUSTOMER_SERVICE: 'customer_service',
  TECHNICAL_SUPPORT: 'technical_support',
  // Legacy aliases kept for backward compatibility in stored data / older code paths.
  SENIOR: 'super',
  OPERATIONAL: 'area_accountant',
  AREA: 'area_accountant',
  CONTENT: 'customer_service',
}

export const ADMIN_LEVEL_LABELS = {
  [ADMIN_LEVELS.SUPER]: 'Super Admin',
  [ADMIN_LEVELS.AREA_ACCOUNTANT]: 'Area Accountant',
  [ADMIN_LEVELS.CUSTOMER_SERVICE]: 'Customer Service Admin',
  [ADMIN_LEVELS.TECHNICAL_SUPPORT]: 'Technical Support Admin',
}

export const ADMIN_PERMISSION_DEFINITIONS = [
  { id: 'view_documents', label: 'View Documents' },
  { id: 'download_documents', label: 'Download Documents' },
  { id: 'approve_documents', label: 'Approve Documents' },
  { id: 'reject_documents', label: 'Reject Documents' },
  { id: 'request_info_documents', label: 'Request Additional Information' },
  { id: 'comment_documents', label: 'Comment on Documents' },
  { id: 'add_internal_notes', label: 'Add Internal Notes' },
  { id: 'view_assigned_clients', label: 'View Assigned Clients' },
  { id: 'view_businesses', label: 'View All Clients' },
  { id: 'view_upload_history', label: 'View Upload History' },
  { id: 'view_activity_logs', label: 'View Activity Logs' },
  { id: 'client_assistance', label: 'Client Assistance' },
  { id: 'impersonate_clients', label: 'Impersonate Client Session' },
  { id: 'view_client_settings', label: 'View Client Settings' },
  { id: 'edit_client_settings', label: 'Edit Client Settings' },
  { id: 'manage_technical_client_config', label: 'Manage Technical Client Config' },
  { id: 'send_notifications', label: 'Send Notifications' },
  { id: 'approve_verification', label: 'Approve Verification' },
  { id: 'manage_users', label: 'Manage Users' },
  { id: 'manage_admin_roles', label: 'Manage Admin Roles' },
  { id: 'assign_clients_to_area', label: 'Assign Clients to Area Accountant' },
  { id: 'reset_admin_password', label: 'Reset Admin Password' },
  { id: 'manage_system_config', label: 'Manage System Configuration' },
  { id: 'view_system_audit_reports', label: 'View System Audit Reports' },
  { id: 'delete_data', label: 'Delete Data' },
]

export const FULL_ADMIN_PERMISSION_IDS = ADMIN_PERMISSION_DEFINITIONS.map((permission) => permission.id)
const PERMISSION_ID_SET = new Set(FULL_ADMIN_PERMISSION_IDS)

export const isLegacyAdminEmail = (email = '') => {
  const normalizedEmail = email.trim().toLowerCase()
  return normalizedEmail.startsWith('admin@') || normalizedEmail.endsWith('@admin.kiamina.local')
}

export const normalizeRoleWithLegacyFallback = (role, email = '') => {
  if (role === 'admin' || role === 'client') return role
  return isLegacyAdminEmail(email) ? 'admin' : 'client'
}

const AREA_ACCOUNTANT_PERMISSION_IDS = [
  'view_documents',
  'download_documents',
  'approve_documents',
  'reject_documents',
  'request_info_documents',
  'comment_documents',
  'add_internal_notes',
  'view_assigned_clients',
  'view_upload_history',
  'view_activity_logs',
]

const CUSTOMER_SERVICE_PERMISSION_IDS = [
  'view_documents',
  'download_documents',
  'comment_documents',
  'add_internal_notes',
  'view_businesses',
  'view_upload_history',
  'view_client_settings',
  'client_assistance',
  'impersonate_clients',
  'send_notifications',
]

const TECHNICAL_SUPPORT_PERMISSION_IDS = [
  'view_documents',
  'download_documents',
  'comment_documents',
  'add_internal_notes',
  'view_businesses',
  'view_upload_history',
  'view_client_settings',
  'edit_client_settings',
  'manage_technical_client_config',
  'client_assistance',
  'impersonate_clients',
  'send_notifications',
  'view_activity_logs',
]

export const normalizeAdminLevel = (adminLevel) => {
  const normalizedLevel = String(adminLevel || '').trim().toLowerCase()
  if (!normalizedLevel) return ADMIN_LEVELS.SUPER
  if (
    normalizedLevel === 'super'
    || normalizedLevel === 'senior'
    || normalizedLevel === 'head'
    || normalizedLevel === 'super-admin'
  ) {
    return ADMIN_LEVELS.SUPER
  }
  if (
    normalizedLevel === 'area'
    || normalizedLevel === 'area_accountant'
    || normalizedLevel === 'area accountant'
    || normalizedLevel === 'accountant'
    || normalizedLevel === 'site'
    || normalizedLevel === 'site/area'
    || normalizedLevel === 'site-area'
    || normalizedLevel === 'operational'
  ) {
    return ADMIN_LEVELS.AREA_ACCOUNTANT
  }
  if (
    normalizedLevel === 'customer_service'
    || normalizedLevel === 'customer-service'
    || normalizedLevel === 'customer service'
    || normalizedLevel === 'support'
    || normalizedLevel === 'agent'
    || normalizedLevel === 'content'
  ) {
    return ADMIN_LEVELS.CUSTOMER_SERVICE
  }
  if (
    normalizedLevel === 'technical_support'
    || normalizedLevel === 'technical-support'
    || normalizedLevel === 'technical support'
    || normalizedLevel === 'technical'
    || normalizedLevel === 'tech'
  ) {
    return ADMIN_LEVELS.TECHNICAL_SUPPORT
  }
  return ADMIN_LEVELS.SUPER
}

export const isSuperAdminLevel = (adminLevel) => normalizeAdminLevel(adminLevel) === ADMIN_LEVELS.SUPER
export const isAreaAccountantLevel = (adminLevel) => normalizeAdminLevel(adminLevel) === ADMIN_LEVELS.AREA_ACCOUNTANT
export const isCustomerServiceLevel = (adminLevel) => normalizeAdminLevel(adminLevel) === ADMIN_LEVELS.CUSTOMER_SERVICE
export const isTechnicalSupportLevel = (adminLevel) => normalizeAdminLevel(adminLevel) === ADMIN_LEVELS.TECHNICAL_SUPPORT
export const isOperationsAdminLevel = (adminLevel) => (
  isSuperAdminLevel(adminLevel) || isAreaAccountantLevel(adminLevel)
)
export const isTechnicalAdminLevel = (adminLevel) => (
  isSuperAdminLevel(adminLevel)
  || isCustomerServiceLevel(adminLevel)
  || isTechnicalSupportLevel(adminLevel)
)
export const canImpersonateForAdminLevel = (adminLevel) => (
  isSuperAdminLevel(adminLevel)
  || isCustomerServiceLevel(adminLevel)
  || isTechnicalSupportLevel(adminLevel)
)

export const getAdminLevelLabel = (adminLevel) => (
  ADMIN_LEVEL_LABELS[normalizeAdminLevel(adminLevel)] || ADMIN_LEVEL_LABELS[ADMIN_LEVELS.SUPER]
)

export const isAdminAccount = (account = {}) => (
  normalizeRoleWithLegacyFallback(account.role, account.email || '') === 'admin'
)

export const getDefaultPermissionsForAdminLevel = (adminLevel) => {
  const normalizedLevel = normalizeAdminLevel(adminLevel)
  if (normalizedLevel === ADMIN_LEVELS.SUPER) return [...FULL_ADMIN_PERMISSION_IDS]
  if (normalizedLevel === ADMIN_LEVELS.AREA_ACCOUNTANT) return [...AREA_ACCOUNTANT_PERMISSION_IDS]
  if (normalizedLevel === ADMIN_LEVELS.CUSTOMER_SERVICE) return [...CUSTOMER_SERVICE_PERMISSION_IDS]
  return [...TECHNICAL_SUPPORT_PERMISSION_IDS]
}

export const sanitizeAdminPermissions = (permissions = []) => (
  (Array.isArray(permissions) ? permissions : [])
    .map((permissionId) => String(permissionId || '').trim())
    .filter((permissionId) => PERMISSION_ID_SET.has(permissionId))
)

export const getEffectiveAdminPermissions = (account = {}) => {
  if (!isAdminAccount(account)) return []
  const explicitPermissions = sanitizeAdminPermissions(account.adminPermissions)
  if (explicitPermissions.length > 0) return explicitPermissions
  return getDefaultPermissionsForAdminLevel(account.adminLevel)
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
  const explicitPermissions = sanitizeAdminPermissions(account.adminPermissions)
  return {
    ...account,
    role: 'admin',
    adminLevel: normalizedAdminLevel,
    adminPermissions: explicitPermissions.length > 0
      ? explicitPermissions
      : getDefaultPermissionsForAdminLevel(normalizedAdminLevel),
    status: account.status === 'suspended' ? 'suspended' : 'active',
  }
}

export const normalizeAdminInvite = (invite = {}) => {
  const normalizedAdminLevel = normalizeAdminLevel(invite.adminLevel)
  const explicitPermissions = sanitizeAdminPermissions(invite.adminPermissions)
  const defaultCreatedAt = new Date().toISOString()
  const defaultExpiresAt = new Date(Date.now() + (48 * 60 * 60 * 1000)).toISOString()
  return {
    ...invite,
    email: invite.email?.trim()?.toLowerCase() || '',
    role: 'admin',
    adminLevel: normalizedAdminLevel,
    adminPermissions: explicitPermissions.length > 0
      ? explicitPermissions
      : getDefaultPermissionsForAdminLevel(normalizedAdminLevel),
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
