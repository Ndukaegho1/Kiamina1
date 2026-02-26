import { useMemo, useState } from 'react'
import { ShieldCheck, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import {
  ADMIN_LEVELS,
  ADMIN_PERMISSION_DEFINITIONS,
  getAdminLevelLabel,
  isAdminInvitePending,
} from '../adminIdentity'
import AdminOtpModal from './AdminOtpModal'

function AdminAccountSetup({
  invite,
  otpChallenge,
  onCreateAccount,
  onVerifyOtp,
  onResendOtp,
  onCancelOtp,
  onReturnToAdminLogin,
}) {
  const [setupForm, setSetupForm] = useState({
    fullName: '',
    email: invite?.email || '',
    password: '',
    confirmPassword: '',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isInviteValid = isAdminInvitePending(invite)
  const invitePermissions = useMemo(() => {
    if (!invite) return []
    if (invite.adminLevel === ADMIN_LEVELS.SENIOR) {
      return ['Full System Access']
    }
    return invite.adminPermissions
      .map((permissionId) => ADMIN_PERMISSION_DEFINITIONS.find((permission) => permission.id === permissionId)?.label)
      .filter(Boolean)
  }, [invite])

  const submitSetup = async (event) => {
    event.preventDefault()
    if (!invite?.token) return

    setErrorMessage('')
    setIsSubmitting(true)
    const result = await onCreateAccount({
      inviteToken: invite.token,
      fullName: setupForm.fullName,
      email: setupForm.email,
      password: setupForm.password,
      confirmPassword: setupForm.confirmPassword,
    })
    if (!result?.ok) {
      setErrorMessage(result?.message || 'Unable to create admin account.')
    }
    setIsSubmitting(false)
  }

  if (!isInviteValid) {
    return (
      <div
        className="min-h-screen bg-[#F4F6FB] flex items-center justify-center px-4 py-10"
        style={{ fontFamily: "'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
      >
        <div className="w-full max-w-lg bg-white border border-border-light rounded-xl shadow-card p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-11 h-11 bg-primary rounded-md flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-text-primary text-center">Admin Account Setup</h1>
          <p className="text-sm text-error text-center mt-3">Invitation link is invalid or has expired.</p>

          <div className="mt-7 flex justify-center">
            <button
              type="button"
              onClick={onReturnToAdminLogin}
              className="h-10 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Admin Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-[#F4F6FB] flex items-center justify-center px-4 py-10"
      style={{ fontFamily: "'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      <div className="w-full max-w-2xl bg-white border border-border-light rounded-xl shadow-card p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="w-11 h-11 bg-primary rounded-md flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-text-primary text-center">Admin Account Setup</h1>
        <p className="text-sm text-text-secondary text-center mt-2 mb-6">Complete your invited admin profile.</p>

        <div className="rounded-lg border border-border-light bg-[#FAFBFF] p-4 mb-6">
          <p className="text-xs uppercase tracking-wide text-text-muted">Assigned Role</p>
          <p className="text-sm font-semibold text-text-primary mt-1">{getAdminLevelLabel(invite.adminLevel)}</p>
          <div className="mt-3">
            <p className="text-xs uppercase tracking-wide text-text-muted">Granted Permissions</p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {invitePermissions.map((label) => (
                <div key={label} className="h-8 px-2.5 rounded border border-border-light bg-white text-xs text-text-secondary inline-flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submitSetup}>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Full Name</label>
            <input
              type="text"
              value={setupForm.fullName}
              onChange={(event) => setSetupForm((prev) => ({ ...prev, fullName: event.target.value }))}
              className="w-full h-11 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Work Email</label>
            <input
              type="email"
              value={setupForm.email}
              onChange={(event) => setSetupForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full h-11 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-text-muted mt-1">This must match the invited email address.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
              <input
                type="password"
                value={setupForm.password}
                onChange={(event) => setSetupForm((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full h-11 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={setupForm.confirmPassword}
                onChange={(event) => setSetupForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                className="w-full h-11 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-md border border-error/25 bg-error-bg px-3 py-2">
              <p className="text-xs text-error">{errorMessage}</p>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={onReturnToAdminLogin}
              className="text-sm text-text-secondary hover:text-text-primary inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Admin Login
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Processing...' : 'Create Admin Account'}
            </button>
          </div>
        </form>
      </div>

      {otpChallenge && (
        <AdminOtpModal
          key={otpChallenge.requestId}
          challenge={otpChallenge}
          onVerifyOtp={onVerifyOtp}
          onResendOtp={onResendOtp}
          onCancelOtp={onCancelOtp}
        />
      )}
    </div>
  )
}

export default AdminAccountSetup
