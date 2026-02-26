import { useEffect, useMemo, useState } from 'react'
import {
  ShieldCheck,
  Users,
  UserPlus,
  Mail,
  AlertCircle,
  CheckCircle,
  Ban,
  Trash2,
  Loader2,
  KeyRound,
  Info,
} from 'lucide-react'
import {
  ADMIN_LEVELS,
  ADMIN_PERMISSION_DEFINITIONS,
  FULL_ADMIN_PERMISSION_IDS,
  getAdminLevelLabel,
  getEffectiveAdminPermissions,
  normalizeAdminAccount,
  normalizeAdminInvite,
  normalizeRoleWithLegacyFallback,
  isAdminAccount,
  isAdminInvitePending,
} from '../adminIdentity'

const ACCOUNTS_STORAGE_KEY = 'kiaminaAccounts'
const ADMIN_INVITES_STORAGE_KEY = 'kiaminaAdminInvites'
const ADMIN_ACTIVITY_STORAGE_KEY = 'kiaminaAdminActivityLog'
const ADMIN_SETTINGS_STORAGE_KEY = 'kiaminaAdminSettings'

const passwordStrengthRegex = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

const readArrayFromStorage = (key) => {
  try {
    const savedValue = localStorage.getItem(key)
    const parsedValue = savedValue ? JSON.parse(savedValue) : []
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

const writeArrayToStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}

const normalizeStoredAccounts = (accounts) => accounts.map((account) => {
  const normalizedRole = normalizeRoleWithLegacyFallback(account.role, account.email || '')
  if (normalizedRole !== 'admin') return { ...account, role: normalizedRole }
  return normalizeAdminAccount(account)
})

const readAccounts = () => normalizeStoredAccounts(readArrayFromStorage(ACCOUNTS_STORAGE_KEY))
const writeAccounts = (accounts) => writeArrayToStorage(ACCOUNTS_STORAGE_KEY, normalizeStoredAccounts(accounts))

const readInvites = () => readArrayFromStorage(ADMIN_INVITES_STORAGE_KEY).map(normalizeAdminInvite)
const writeInvites = (invites) => writeArrayToStorage(ADMIN_INVITES_STORAGE_KEY, invites.map(normalizeAdminInvite))

const getAdminAccounts = (accounts) => accounts.filter((account) => isAdminAccount(account))

const createInviteToken = () => (
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
)

const formatDateTime = (value) => {
  const parsedTime = Date.parse(value || '')
  if (!Number.isFinite(parsedTime)) return '--'
  return new Date(parsedTime).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const getProfileStorageKey = (email = '') => `kiaminaAdminProfile:${email.trim().toLowerCase()}`
const getSecurityStorageKey = (email = '') => `kiaminaAdminSecurity:${email.trim().toLowerCase()}`

const appendActivityLog = (entry) => {
  const existingLogs = readArrayFromStorage(ADMIN_ACTIVITY_STORAGE_KEY)
  const nextLogs = [
    {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...entry,
    },
    ...existingLogs,
  ]
  writeArrayToStorage(ADMIN_ACTIVITY_STORAGE_KEY, nextLogs)
}

const getAdminSettings = () => {
  try {
    const saved = localStorage.getItem(ADMIN_SETTINGS_STORAGE_KEY)
    if (!saved) {
      return {
        allowSelfSignup: false,
        enforceMfa: true,
        auditRetentionDays: '90',
        impersonationEnabled: true,
      }
    }
    const parsed = JSON.parse(saved)
    return {
      allowSelfSignup: Boolean(parsed.allowSelfSignup),
      enforceMfa: parsed.enforceMfa !== false,
      auditRetentionDays: `${parsed.auditRetentionDays || '90'}`,
      impersonationEnabled: parsed.impersonationEnabled !== false,
    }
  } catch {
    return {
      allowSelfSignup: false,
      enforceMfa: true,
      auditRetentionDays: '90',
      impersonationEnabled: true,
    }
  }
}

function AdminSettingsPage({ showToast, currentAdminAccount }) {
  const currentAdmin = useMemo(
    () => normalizeAdminAccount(currentAdminAccount || {}),
    [currentAdminAccount],
  )
  const currentAdminLevel = currentAdmin.adminLevel || ADMIN_LEVELS.SENIOR
  const isSeniorAdmin = currentAdminLevel === ADMIN_LEVELS.SENIOR

  const [adminAccounts, setAdminAccounts] = useState(() => getAdminAccounts(readAccounts()))
  const [adminInvites, setAdminInvites] = useState(readInvites)
  const [systemSettings, setSystemSettings] = useState(getAdminSettings)
  const [lockedFieldNotice, setLockedFieldNotice] = useState('')
  const [formError, setFormError] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [generatedInviteLink, setGeneratedInviteLink] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)

  const [profileForm, setProfileForm] = useState({
    fullName: currentAdmin.fullName || '',
    email: currentAdmin.email || '',
    roleInCompany: currentAdmin.roleInCompany || '',
    department: currentAdmin.department || '',
    phoneNumber: currentAdmin.phoneNumber || '',
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [securityForm, setSecurityForm] = useState({
    sessionTimeout: '30',
    emailNotificationPreference: true,
    activityAlertPreference: true,
    twoFactorEnabled: true,
  })

  const [createAdminForm, setCreateAdminForm] = useState({
    fullName: '',
    email: '',
    password: '',
    adminLevel: ADMIN_LEVELS.OPERATIONAL,
    permissions: ['view_documents', 'view_businesses'],
  })

  const [inviteForm, setInviteForm] = useState({
    email: '',
    adminLevel: ADMIN_LEVELS.OPERATIONAL,
    permissions: ['view_documents', 'view_businesses'],
  })

  const refreshAdminData = () => {
    setAdminAccounts(getAdminAccounts(readAccounts()))
    setAdminInvites(readInvites())
  }

  useEffect(() => {
    const normalizedEmail = currentAdmin.email?.trim()?.toLowerCase() || ''
    const fallbackProfile = {
      fullName: currentAdmin.fullName || '',
      email: currentAdmin.email || '',
      roleInCompany: currentAdmin.roleInCompany || '',
      department: currentAdmin.department || '',
      phoneNumber: currentAdmin.phoneNumber || '',
    }

    try {
      const savedProfile = localStorage.getItem(getProfileStorageKey(normalizedEmail))
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile)
        setProfileForm({
          fullName: parsedProfile.fullName || fallbackProfile.fullName,
          email: fallbackProfile.email,
          roleInCompany: parsedProfile.roleInCompany || fallbackProfile.roleInCompany,
          department: parsedProfile.department || fallbackProfile.department,
          phoneNumber: parsedProfile.phoneNumber || fallbackProfile.phoneNumber,
        })
      } else {
        setProfileForm(fallbackProfile)
      }
    } catch {
      setProfileForm(fallbackProfile)
    }

    try {
      const savedSecurity = localStorage.getItem(getSecurityStorageKey(normalizedEmail))
      if (savedSecurity) {
        const parsedSecurity = JSON.parse(savedSecurity)
        setSecurityForm({
          sessionTimeout: `${parsedSecurity.sessionTimeout || '30'}`,
          emailNotificationPreference: parsedSecurity.emailNotificationPreference !== false,
          activityAlertPreference: parsedSecurity.activityAlertPreference !== false,
          twoFactorEnabled: parsedSecurity.twoFactorEnabled !== false,
        })
      } else {
        setSecurityForm({
          sessionTimeout: '30',
          emailNotificationPreference: true,
          activityAlertPreference: true,
          twoFactorEnabled: true,
        })
      }
    } catch {
      setSecurityForm({
        sessionTimeout: '30',
        emailNotificationPreference: true,
        activityAlertPreference: true,
        twoFactorEnabled: true,
      })
    }
  }, [currentAdmin.email, currentAdmin.fullName, currentAdmin.roleInCompany, currentAdmin.department, currentAdmin.phoneNumber])

  const operationalPermissionOptions = ADMIN_PERMISSION_DEFINITIONS
  const currentAdminPermissions = getEffectiveAdminPermissions(currentAdmin)

  const latestPendingInvites = adminInvites
    .filter((invite) => isAdminInvitePending(invite))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 4)

  const notify = (type, message) => {
    if (typeof showToast === 'function') showToast(type, message)
  }

  const saveProfile = () => {
    const normalizedEmail = currentAdmin.email?.trim()?.toLowerCase()
    if (!normalizedEmail) return
    if (!profileForm.fullName.trim()) {
      setFormError('Full name is required.')
      return
    }

    setFormError('')
    const allAccounts = readAccounts()
    const matchIndex = allAccounts.findIndex((account) => account.email?.trim()?.toLowerCase() === normalizedEmail)
    if (matchIndex === -1) {
      setFormError('Unable to locate your admin account.')
      return
    }

    const nextAccounts = [...allAccounts]
    nextAccounts[matchIndex] = normalizeAdminAccount({
      ...nextAccounts[matchIndex],
      fullName: profileForm.fullName.trim(),
      roleInCompany: profileForm.roleInCompany.trim(),
      department: profileForm.department.trim(),
      phoneNumber: profileForm.phoneNumber.trim(),
    })
    writeAccounts(nextAccounts)
    localStorage.setItem(
      getProfileStorageKey(normalizedEmail),
      JSON.stringify({
        fullName: profileForm.fullName.trim(),
        roleInCompany: profileForm.roleInCompany.trim(),
        department: profileForm.department.trim(),
        phoneNumber: profileForm.phoneNumber.trim(),
      }),
    )

    appendActivityLog({
      adminName: currentAdmin.fullName || 'Admin User',
      action: 'Updated admin profile settings',
      details: normalizedEmail,
    })
    refreshAdminData()
    notify('success', 'Profile settings saved.')
  }

  const saveSystemSettings = () => {
    localStorage.setItem(ADMIN_SETTINGS_STORAGE_KEY, JSON.stringify(systemSettings))
    appendActivityLog({
      adminName: currentAdmin.fullName || 'Admin User',
      action: 'Updated system settings',
      details: `MFA: ${systemSettings.enforceMfa ? 'enabled' : 'disabled'}`,
    })
    notify('success', 'System settings saved.')
  }

  const saveSecuritySettings = () => {
    const normalizedEmail = currentAdmin.email?.trim()?.toLowerCase()
    if (!normalizedEmail) return
    localStorage.setItem(
      getSecurityStorageKey(normalizedEmail),
      JSON.stringify(securityForm),
    )
    appendActivityLog({
      adminName: currentAdmin.fullName || 'Admin User',
      action: 'Updated security preferences',
      details: normalizedEmail,
    })
    notify('success', 'Security preferences saved.')
  }

  const updatePassword = () => {
    const normalizedEmail = currentAdmin.email?.trim()?.toLowerCase()
    if (!normalizedEmail) return

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setFormError('Complete all password fields.')
      return
    }
    if (!passwordStrengthRegex.test(passwordForm.newPassword)) {
      setFormError('New password must include at least one number and one special character.')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setFormError('New password and confirm password must match.')
      return
    }

    const allAccounts = readAccounts()
    const matchIndex = allAccounts.findIndex((account) => account.email?.trim()?.toLowerCase() === normalizedEmail)
    if (matchIndex === -1) {
      setFormError('Unable to locate your admin account.')
      return
    }
    if (allAccounts[matchIndex].password !== passwordForm.currentPassword) {
      setFormError('Current password is incorrect.')
      return
    }

    setFormError('')
    const nextAccounts = [...allAccounts]
    nextAccounts[matchIndex] = {
      ...nextAccounts[matchIndex],
      password: passwordForm.newPassword,
    }
    writeAccounts(nextAccounts)
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    appendActivityLog({
      adminName: currentAdmin.fullName || 'Admin User',
      action: 'Changed admin password',
      details: normalizedEmail,
    })
    notify('success', 'Password updated.')
  }

  const queueCreateAdmin = () => {
    if (!createAdminForm.fullName.trim() || !createAdminForm.email.trim() || !createAdminForm.password) {
      setFormError('Complete all create-admin fields.')
      return
    }
    if (!passwordStrengthRegex.test(createAdminForm.password)) {
      setFormError('Admin password must include at least one number and one special character.')
      return
    }
    if (createAdminForm.adminLevel === ADMIN_LEVELS.OPERATIONAL && createAdminForm.permissions.length === 0) {
      setFormError('Select at least one permission for Operational Admin.')
      return
    }

    setFormError('')
    setConfirmAction({
      type: 'create-admin',
      payload: {
        ...createAdminForm,
        email: createAdminForm.email.trim().toLowerCase(),
        fullName: createAdminForm.fullName.trim(),
      },
    })
  }

  const queueInviteAdmin = () => {
    if (!inviteForm.email.trim()) {
      setFormError('Invite email is required.')
      return
    }
    if (inviteForm.adminLevel === ADMIN_LEVELS.OPERATIONAL && inviteForm.permissions.length === 0) {
      setFormError('Select at least one permission for Operational Admin invite.')
      return
    }
    setFormError('')
    setConfirmAction({
      type: 'invite-admin',
      payload: {
        ...inviteForm,
        email: inviteForm.email.trim().toLowerCase(),
      },
    })
  }

  const queueAccountStatusChange = (type, account) => {
    setConfirmAction({
      type,
      payload: {
        email: account.email,
        fullName: account.fullName,
      },
    })
  }

  const toggleCreatePermission = (permissionId) => {
    setCreateAdminForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((id) => id !== permissionId)
        : [...prev.permissions, permissionId],
    }))
  }

  const toggleInvitePermission = (permissionId) => {
    setInviteForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((id) => id !== permissionId)
        : [...prev.permissions, permissionId],
    }))
  }

  const confirmQueuedAction = async () => {
    if (!confirmAction?.type) return
    setIsBusy(true)
    try {
      if (confirmAction.type === 'create-admin') {
        const allAccounts = readAccounts()
        const exists = allAccounts.some(
          (account) => account.email?.trim()?.toLowerCase() === confirmAction.payload.email,
        )
        if (exists) {
          setFormError('An account with that email already exists.')
          return
        }

        const createdAdmin = normalizeAdminAccount({
          fullName: confirmAction.payload.fullName,
          email: confirmAction.payload.email,
          password: confirmAction.payload.password,
          role: 'admin',
          adminLevel: confirmAction.payload.adminLevel,
          adminPermissions: confirmAction.payload.adminLevel === ADMIN_LEVELS.SENIOR
            ? FULL_ADMIN_PERMISSION_IDS
            : confirmAction.payload.permissions,
          status: 'active',
          createdBy: currentAdmin.email,
          createdAt: new Date().toISOString(),
        })

        writeAccounts([...allAccounts, createdAdmin])
        appendActivityLog({
          adminName: currentAdmin.fullName || 'Admin User',
          action: 'Created admin account',
          details: `${createdAdmin.email} (${getAdminLevelLabel(createdAdmin.adminLevel)})`,
        })
        setCreateAdminForm({
          fullName: '',
          email: '',
          password: '',
          adminLevel: ADMIN_LEVELS.OPERATIONAL,
          permissions: ['view_documents', 'view_businesses'],
        })
        refreshAdminData()
        notify('success', 'Admin account created successfully.')
      }

      if (confirmAction.type === 'invite-admin') {
        const allAccounts = readAccounts()
        const existingAccount = allAccounts.find(
          (account) => account.email?.trim()?.toLowerCase() === confirmAction.payload.email,
        )
        if (existingAccount && isAdminAccount(existingAccount)) {
          setFormError('That email is already an admin account.')
          return
        }

        const existingInvites = readInvites().filter(
          (invite) => invite.email !== confirmAction.payload.email || !isAdminInvitePending(invite),
        )
        const createdInvite = normalizeAdminInvite({
          id: `INV-${Date.now()}`,
          token: createInviteToken(),
          email: confirmAction.payload.email,
          adminLevel: confirmAction.payload.adminLevel,
          adminPermissions: confirmAction.payload.adminLevel === ADMIN_LEVELS.SENIOR
            ? FULL_ADMIN_PERMISSION_IDS
            : confirmAction.payload.permissions,
          status: 'pending',
          invitedBy: currentAdmin.email || '',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString(),
        })

        const nextInvites = [createdInvite, ...existingInvites]
        writeInvites(nextInvites)
        setAdminInvites(nextInvites)
        setInviteForm({
          email: '',
          adminLevel: ADMIN_LEVELS.OPERATIONAL,
          permissions: ['view_documents', 'view_businesses'],
        })
        const inviteUrl = `${window.location.origin}/admin/setup?invite=${encodeURIComponent(createdInvite.token)}`
        setGeneratedInviteLink(inviteUrl)
        appendActivityLog({
          adminName: currentAdmin.fullName || 'Admin User',
          action: 'Sent admin invite',
          details: `${createdInvite.email} (${getAdminLevelLabel(createdInvite.adminLevel)})`,
        })
        notify('success', 'Admin invitation created.')
      }

      if (confirmAction.type === 'suspend-admin' || confirmAction.type === 'activate-admin') {
        const targetEmail = confirmAction.payload.email?.trim()?.toLowerCase()
        if (!targetEmail) return
        if (targetEmail === currentAdmin.email?.trim()?.toLowerCase()) {
          setFormError('You cannot change your own admin status.')
          return
        }

        const allAccounts = readAccounts()
        const targetIndex = allAccounts.findIndex(
          (account) => account.email?.trim()?.toLowerCase() === targetEmail,
        )
        if (targetIndex === -1) {
          setFormError('Admin account not found.')
          return
        }

        const nextStatus = confirmAction.type === 'suspend-admin' ? 'suspended' : 'active'
        allAccounts[targetIndex] = normalizeAdminAccount({
          ...allAccounts[targetIndex],
          status: nextStatus,
        })
        writeAccounts(allAccounts)
        appendActivityLog({
          adminName: currentAdmin.fullName || 'Admin User',
          action: `${nextStatus === 'suspended' ? 'Suspended' : 'Activated'} admin account`,
          details: targetEmail,
        })
        refreshAdminData()
        notify('success', `Admin ${nextStatus === 'suspended' ? 'suspended' : 'activated'} successfully.`)
      }

      if (confirmAction.type === 'delete-admin') {
        const targetEmail = confirmAction.payload.email?.trim()?.toLowerCase()
        if (!targetEmail) return
        if (targetEmail === currentAdmin.email?.trim()?.toLowerCase()) {
          setFormError('You cannot delete your own account.')
          return
        }

        const allAccounts = readAccounts()
        const nextAccounts = allAccounts.filter(
          (account) => account.email?.trim()?.toLowerCase() !== targetEmail,
        )
        writeAccounts(nextAccounts)
        appendActivityLog({
          adminName: currentAdmin.fullName || 'Admin User',
          action: 'Deleted admin account',
          details: targetEmail,
        })
        refreshAdminData()
        notify('success', 'Admin account deleted.')
      }
    } finally {
      setIsBusy(false)
      setConfirmAction(null)
    }
  }

  return (
    <div
      className="animate-fade-in"
      style={{ fontFamily: "'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Admin Settings</h2>
          <p className="text-sm text-text-muted mt-1">Governance, security controls, and admin lifecycle management.</p>
        </div>
        <div className="h-9 px-3 rounded-md border border-border-light bg-white text-xs text-text-secondary inline-flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          {getAdminLevelLabel(currentAdminLevel)}
        </div>
      </div>

      {formError && (
        <div className="mb-4 rounded-md border border-error/25 bg-error-bg px-3 py-2 text-xs text-error">
          {formError}
        </div>
      )}

      {lockedFieldNotice && (
        <div className="mb-4 rounded-md border border-border-light bg-[#F8FAFF] px-3 py-2 text-xs text-text-secondary inline-flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-primary" />
          {lockedFieldNotice}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 bg-white rounded-lg shadow-card border border-border-light p-6">
          <h3 className="text-base font-semibold text-text-primary">1. Profile Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Full Name</label>
              <input
                type="text"
                value={profileForm.fullName}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))}
                className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-text-primary">Email</label>
                <button
                  type="button"
                  onClick={() => setLockedFieldNotice('This field cannot be modified.')}
                  className="text-xs text-primary hover:text-primary-light"
                  title="This field cannot be modified."
                >
                  Why locked?
                </button>
              </div>
              <input
                type="email"
                value={profileForm.email}
                readOnly
                className="w-full h-10 px-3 border border-border-light rounded-md text-sm bg-background text-text-muted cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Role in Company</label>
              <input
                type="text"
                value={profileForm.roleInCompany}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, roleInCompany: event.target.value }))}
                className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Department</label>
              <input
                type="text"
                value={profileForm.department}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, department: event.target.value }))}
                className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Phone Number</label>
              <input
                type="text"
                value={profileForm.phoneNumber}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={saveProfile}
              className="h-10 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors"
            >
              Save Profile
            </button>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-card border border-border-light p-6">
          <h3 className="text-base font-semibold text-text-primary">2. Permission Overview</h3>
          {isSeniorAdmin ? (
            <div className="mt-4 rounded-md border border-success/30 bg-success-bg px-3 py-3 text-sm text-success inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Full System Access
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {currentAdminPermissions.map((permissionId) => (
                <div
                  key={permissionId}
                  className="h-8 px-2.5 rounded border border-border-light text-xs text-text-secondary inline-flex items-center gap-2"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-success" />
                  {ADMIN_PERMISSION_DEFINITIONS.find((permission) => permission.id === permissionId)?.label || permissionId}
                </div>
              ))}
              {currentAdminPermissions.length === 0 && (
                <p className="text-sm text-text-muted">No permissions assigned.</p>
              )}
            </div>
          )}
        </section>

        <section className="xl:col-span-3 bg-white rounded-lg shadow-card border border-border-light p-6">
          <h3 className="text-base font-semibold text-text-primary">3. Security Settings</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Session Timeout</label>
                <select
                  value={securityForm.sessionTimeout}
                  onChange={(event) => setSecurityForm((prev) => ({ ...prev, sessionTimeout: event.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="120">120 minutes</option>
                </select>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={securityForm.emailNotificationPreference}
                  onChange={(event) => setSecurityForm((prev) => ({ ...prev, emailNotificationPreference: event.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
                Email notification preference
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={securityForm.activityAlertPreference}
                  onChange={(event) => setSecurityForm((prev) => ({ ...prev, activityAlertPreference: event.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
                Activity alert preference
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={securityForm.twoFactorEnabled}
                  onChange={(event) => setSecurityForm((prev) => ({ ...prev, twoFactorEnabled: event.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
                Enable Two-Factor Authentication
              </label>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={saveSecuritySettings}
                  className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors"
                >
                  Save Security Preferences
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem('kiaminaAuthUser')
                    localStorage.removeItem('kiaminaAuthUser')
                    notify('success', 'All active sessions have been cleared locally.')
                  }}
                  className="h-9 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background transition-colors"
                >
                  Logout All Devices
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border-light p-4">
              <h4 className="text-sm font-semibold text-text-primary inline-flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                Change Password
              </h4>
              <div className="space-y-3 mt-4">
                <input
                  type="password"
                  placeholder="Current Password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                />
                <input
                  type="password"
                  placeholder="New Password"
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={updatePassword}
                  className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors"
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="xl:col-span-3 bg-white rounded-lg shadow-card border border-border-light p-6">
          <h3 className="text-base font-semibold text-text-primary">System Controls</h3>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
            <label className="flex items-center gap-3 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={systemSettings.allowSelfSignup}
                onChange={(event) => setSystemSettings((prev) => ({ ...prev, allowSelfSignup: event.target.checked }))}
                className="w-4 h-4 accent-primary"
              />
              Allow client self-signup
            </label>
            <label className="flex items-center gap-3 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={systemSettings.enforceMfa}
                onChange={(event) => setSystemSettings((prev) => ({ ...prev, enforceMfa: event.target.checked }))}
                className="w-4 h-4 accent-primary"
              />
              Enforce MFA for admin access
            </label>
            <label className="flex items-center gap-3 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={systemSettings.impersonationEnabled !== false}
                onChange={(event) => setSystemSettings((prev) => ({ ...prev, impersonationEnabled: event.target.checked }))}
                disabled={!isSeniorAdmin}
                className="w-4 h-4 accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
              Enable client impersonation
            </label>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Audit Log Retention (Days)</label>
              <input
                type="number"
                min="1"
                value={systemSettings.auditRetentionDays}
                onChange={(event) => setSystemSettings((prev) => ({ ...prev, auditRetentionDays: event.target.value }))}
                className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          {!isSeniorAdmin && (
            <p className="text-xs text-text-muted mt-3">Only Senior Admin can toggle impersonation controls.</p>
          )}
          <div className="mt-4">
            <button
              type="button"
              onClick={saveSystemSettings}
              className="h-10 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background transition-colors"
            >
              Save System Controls
            </button>
          </div>
        </section>

        <section className="xl:col-span-3 bg-white rounded-lg shadow-card border border-border-light p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-text-primary">4. Admin Management</h3>
            {!isSeniorAdmin && (
              <div className="text-xs text-warning bg-warning-bg border border-warning/30 px-2.5 py-1.5 rounded inline-flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Senior Admin only
              </div>
            )}
          </div>

          {!isSeniorAdmin ? (
            <div className="mt-4 rounded-lg border border-border-light bg-background p-4">
              <p className="text-sm font-medium text-text-primary">Insufficient Permissions</p>
              <p className="text-sm text-text-muted mt-1">You do not have access to admin lifecycle controls.</p>
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-lg border border-border-light p-4">
                  <h4 className="text-sm font-semibold text-text-primary inline-flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Create Admin
                  </h4>
                  <div className="space-y-3 mt-4">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={createAdminForm.fullName}
                      onChange={(event) => setCreateAdminForm((prev) => ({ ...prev, fullName: event.target.value }))}
                      className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                    />
                    <input
                      type="email"
                      placeholder="Work Email"
                      value={createAdminForm.email}
                      onChange={(event) => setCreateAdminForm((prev) => ({ ...prev, email: event.target.value }))}
                      className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                    />
                    <input
                      type="password"
                      placeholder="Temporary Password"
                      value={createAdminForm.password}
                      onChange={(event) => setCreateAdminForm((prev) => ({ ...prev, password: event.target.value }))}
                      className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                    />
                    <select
                      value={createAdminForm.adminLevel}
                      onChange={(event) => setCreateAdminForm((prev) => ({
                        ...prev,
                        adminLevel: event.target.value,
                        permissions: event.target.value === ADMIN_LEVELS.SENIOR
                          ? [...FULL_ADMIN_PERMISSION_IDS]
                          : ['view_documents', 'view_businesses'],
                      }))}
                      className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                    >
                      <option value={ADMIN_LEVELS.SENIOR}>Senior Admin</option>
                      <option value={ADMIN_LEVELS.OPERATIONAL}>Operational Admin</option>
                    </select>

                    {createAdminForm.adminLevel === ADMIN_LEVELS.OPERATIONAL && (
                      <div className="rounded-md border border-border-light p-3">
                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Permissions</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {operationalPermissionOptions.map((permission) => (
                            <label key={permission.id} className="inline-flex items-center gap-2 text-sm text-text-primary">
                              <input
                                type="checkbox"
                                checked={createAdminForm.permissions.includes(permission.id)}
                                onChange={() => toggleCreatePermission(permission.id)}
                                className="w-4 h-4 accent-primary"
                              />
                              {permission.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={queueCreateAdmin}
                      className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors"
                    >
                      Create Admin Account
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-border-light p-4">
                  <h4 className="text-sm font-semibold text-text-primary inline-flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" />
                    Invite Admin
                  </h4>
                  <div className="space-y-3 mt-4">
                    <input
                      type="email"
                      placeholder="Invite Email"
                      value={inviteForm.email}
                      onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
                      className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                    />
                    <select
                      value={inviteForm.adminLevel}
                      onChange={(event) => setInviteForm((prev) => ({
                        ...prev,
                        adminLevel: event.target.value,
                        permissions: event.target.value === ADMIN_LEVELS.SENIOR
                          ? [...FULL_ADMIN_PERMISSION_IDS]
                          : ['view_documents', 'view_businesses'],
                      }))}
                      className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                    >
                      <option value={ADMIN_LEVELS.SENIOR}>Senior Admin Invite</option>
                      <option value={ADMIN_LEVELS.OPERATIONAL}>Operational Admin Invite</option>
                    </select>
                    {inviteForm.adminLevel === ADMIN_LEVELS.OPERATIONAL && (
                      <div className="rounded-md border border-border-light p-3">
                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Permissions</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {operationalPermissionOptions.map((permission) => (
                            <label key={permission.id} className="inline-flex items-center gap-2 text-sm text-text-primary">
                              <input
                                type="checkbox"
                                checked={inviteForm.permissions.includes(permission.id)}
                                onChange={() => toggleInvitePermission(permission.id)}
                                className="w-4 h-4 accent-primary"
                              />
                              {permission.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={queueInviteAdmin}
                      className="h-9 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background transition-colors inline-flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Generate Invite
                    </button>
                    {generatedInviteLink && (
                      <div className="rounded-md border border-border-light bg-background px-3 py-2">
                        <p className="text-xs text-text-muted mb-1">Invite Link</p>
                        <p className="text-xs text-text-primary break-all">{generatedInviteLink}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border-light overflow-hidden">
                <div className="px-4 py-3 bg-[#F9FAFB] border-b border-border-light">
                  <p className="text-sm font-semibold text-text-primary">Admin Directory</p>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#FCFDFF]">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Name</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Email</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Role</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Status</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminAccounts.map((account) => (
                      <tr key={account.email} className="border-t border-border-light hover:bg-background">
                        <td className="px-4 py-3 text-sm text-text-primary">{account.fullName}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{account.email}</td>
                        <td className="px-4 py-3 text-sm">{getAdminLevelLabel(account.adminLevel)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center h-6 px-2.5 rounded text-xs font-medium ${account.status === 'suspended' ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success'}`}>
                            {account.status === 'suspended' ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={account.email?.trim()?.toLowerCase() === currentAdmin.email?.trim()?.toLowerCase()}
                              onClick={() => queueAccountStatusChange(account.status === 'suspended' ? 'activate-admin' : 'suspend-admin', account)}
                              className="h-8 px-2.5 border border-border rounded text-xs font-medium text-text-primary hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              {account.status === 'suspended' ? 'Activate' : 'Suspend'}
                            </button>
                            <button
                              type="button"
                              disabled={account.email?.trim()?.toLowerCase() === currentAdmin.email?.trim()?.toLowerCase()}
                              onClick={() => queueAccountStatusChange('delete-admin', account)}
                              className="h-8 px-2.5 border border-error/50 rounded text-xs font-medium text-error hover:bg-error-bg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {latestPendingInvites.length > 0 && (
                <div className="rounded-lg border border-border-light overflow-hidden">
                  <div className="px-4 py-3 bg-[#F9FAFB] border-b border-border-light">
                    <p className="text-sm font-semibold text-text-primary">Pending Invites</p>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#FCFDFF]">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Email</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Role</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Created</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestPendingInvites.map((invite) => (
                        <tr key={invite.token} className="border-t border-border-light hover:bg-background">
                          <td className="px-4 py-3 text-sm text-text-primary">{invite.email}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{getAdminLevelLabel(invite.adminLevel)}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{formatDateTime(invite.createdAt)}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary">{formatDateTime(invite.expiresAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-[220] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-border-light rounded-xl shadow-card p-6">
            <h4 className="text-lg font-semibold text-text-primary">Confirm Action</h4>
            <p className="text-sm text-text-secondary mt-2">
              {confirmAction.type === 'create-admin' && 'Create this admin account?'}
              {confirmAction.type === 'invite-admin' && 'Generate this admin invitation?'}
              {confirmAction.type === 'suspend-admin' && 'Suspend this admin account?'}
              {confirmAction.type === 'activate-admin' && 'Activate this admin account?'}
              {confirmAction.type === 'delete-admin' && 'Delete this admin account? This cannot be undone.'}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={isBusy}
                className="h-9 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmQueuedAction()}
                disabled={isBusy}
                className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                {isBusy ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminSettingsPage
