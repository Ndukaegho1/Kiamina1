import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import {
  ADMIN_LEVELS,
  ADMIN_PERMISSION_DEFINITIONS,
  getAdminLevelLabel,
  isAdminInvitePending,
  sanitizeAdminPermissions,
} from '../adminIdentity'
import AdminOtpModal from './AdminOtpModal'
import KiaminaLogo from '../../common/KiaminaLogo'
import DotLottiePreloader from '../../common/DotLottiePreloader'
import { verifyIdentityWithDojah } from '../../../utils/dojahIdentity'

const ADMIN_GOV_ID_TYPES_NIGERIA = ['International Passport', 'NIN', "Voter's Card", "Driver's Licence"]
const ADMIN_GOV_ID_TYPE_INTERNATIONAL = 'Government Issued ID'
const PHONE_COUNTRY_CODE_OPTIONS = [
  { value: '+234', label: 'NG +234' },
  { value: '+1', label: 'US/CA +1' },
  { value: '+44', label: 'UK +44' },
  { value: '+61', label: 'AU +61' },
]
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
const formatPhoneNumber = (countryCode = '+234', number = '') => {
  const normalizedCode = String(countryCode || '').trim() || '+234'
  const normalizedNumber = String(number || '').trim()
  if (!normalizedNumber) return ''
  return `${normalizedCode} ${normalizedNumber}`.trim()
}

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
    roleInCompany: '',
    department: '',
    phoneCountryCode: '+234',
    phoneNumber: '',
    workCountry: 'Nigeria',
    governmentIdType: '',
    governmentIdNumber: '',
    governmentIdFile: '',
    residentialAddress: '',
    password: '',
    confirmPassword: '',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isIdentityVerifying, setIsIdentityVerifying] = useState(false)
  const [identityVerificationState, setIdentityVerificationState] = useState({
    status: '',
    message: '',
  })
  const [idUploadInputKey, setIdUploadInputKey] = useState(0)
  const normalizedWorkCountry = normalizeAdminVerificationCountry(setupForm.workCountry)
  const govIdTypeOptions = getAdminGovIdTypeOptions(normalizedWorkCountry)

  const isInviteValid = isAdminInvitePending(invite)
  const invitePermissions = useMemo(() => {
    if (!invite) return []
    if (invite.adminLevel === ADMIN_LEVELS.SUPER) {
      return ['Full System Access']
    }
    const permissionIds = sanitizeAdminPermissions(invite.adminPermissions)
    return permissionIds
      .map((permissionId) => ADMIN_PERMISSION_DEFINITIONS.find((permission) => permission.id === permissionId)?.label)
      .filter(Boolean)
  }, [invite])

  const resetIdentityVerificationState = () => {
    setIdentityVerificationState({ status: '', message: '' })
  }

  const handleVerifyIdentity = async () => {
    if (!setupForm.fullName.trim() || !setupForm.governmentIdType || !setupForm.governmentIdNumber.trim()) {
      setErrorMessage('Full name, government ID type, and ID card number are required before verification.')
      return
    }
    if (!setupForm.governmentIdFile) {
      setErrorMessage('Upload government ID before verification.')
      return
    }

    setErrorMessage('')
    setIsIdentityVerifying(true)
    setIdentityVerificationState({ status: 'verifying', message: 'Identifying...' })
    const verifyResult = await verifyIdentityWithDojah({
      fullName: setupForm.fullName,
      idType: setupForm.governmentIdType,
      cardNumber: setupForm.governmentIdNumber,
    })
    if (!verifyResult.ok) {
      setIdentityVerificationState({
        status: 'failed',
        message: 'Verification failed. Please re-upload.',
      })
      setSetupForm((prev) => ({
        ...prev,
        governmentIdFile: '',
      }))
      setIdUploadInputKey((prev) => prev + 1)
      setIsIdentityVerifying(false)
      return
    }
    setIdentityVerificationState({
      status: 'verified',
      message: 'Identity verified successfully.',
    })
    setIsIdentityVerifying(false)
  }

  const submitSetup = async (event) => {
    event.preventDefault()
    if (!invite?.token) return
    if (identityVerificationState.status !== 'verified') {
      setErrorMessage('Submit identity verification before creating account.')
      return
    }

    setErrorMessage('')
    setIsSubmitting(true)
    const result = await onCreateAccount({
      inviteToken: invite.token,
      fullName: setupForm.fullName,
      email: setupForm.email,
      roleInCompany: setupForm.roleInCompany,
      department: setupForm.department,
      phoneNumber: formatPhoneNumber(setupForm.phoneCountryCode, setupForm.phoneNumber),
      workCountry: normalizedWorkCountry,
      governmentIdType: setupForm.governmentIdType,
      governmentIdNumber: setupForm.governmentIdNumber,
      identityVerificationPassed: identityVerificationState.status === 'verified',
      residentialAddress: setupForm.residentialAddress,
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
            <KiaminaLogo className="h-12 w-auto" />
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
          <KiaminaLogo className="h-12 w-auto" />
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
              onChange={(event) => {
                setSetupForm((prev) => ({ ...prev, fullName: event.target.value }))
                resetIdentityVerificationState()
              }}
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
              <label className="block text-sm font-medium text-text-primary mb-1.5">Role In Company</label>
              <input
                type="text"
                value={setupForm.roleInCompany}
                onChange={(event) => setSetupForm((prev) => ({ ...prev, roleInCompany: event.target.value }))}
                className="w-full h-11 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Department</label>
              <input
                type="text"
                value={setupForm.department}
                onChange={(event) => setSetupForm((prev) => ({ ...prev, department: event.target.value }))}
                className="w-full h-11 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Phone Number</label>
            <div className="grid grid-cols-[130px_1fr] gap-2">
              <select
                value={setupForm.phoneCountryCode || '+234'}
                onChange={(event) => setSetupForm((prev) => ({ ...prev, phoneCountryCode: event.target.value }))}
                className="h-11 px-2 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              >
                {PHONE_COUNTRY_CODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input
                type="tel"
                value={setupForm.phoneNumber}
                onChange={(event) => setSetupForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                placeholder="Enter phone number"
                className="w-full h-11 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Country</label>
              <select
                value={normalizedWorkCountry}
                onChange={(event) => {
                  setSetupForm((prev) => ({
                    ...prev,
                    workCountry: normalizeAdminVerificationCountry(event.target.value),
                    governmentIdType: '',
                  }))
                  resetIdentityVerificationState()
                }}
                className="w-full h-11 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              >
                <option value="Nigeria">Nigeria</option>
                <option value="International">Outside Nigeria</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Government ID Type</label>
              <select
                value={setupForm.governmentIdType}
                onChange={(event) => {
                  setSetupForm((prev) => ({ ...prev, governmentIdType: event.target.value }))
                  resetIdentityVerificationState()
                }}
                className="w-full h-11 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              >
                <option value="">Select ID type</option>
                {govIdTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Government ID Number</label>
            <input
              type="text"
              value={setupForm.governmentIdNumber}
              onChange={(event) => {
                setSetupForm((prev) => ({ ...prev, governmentIdNumber: event.target.value }))
                resetIdentityVerificationState()
              }}
              placeholder={normalizedWorkCountry === 'Nigeria' ? 'Enter NIN / Passport / Voter ID number' : 'Enter government-issued ID number'}
              className="w-full h-11 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-text-muted mt-1">
              Nigeria admins can use International Passport, NIN, Voter&apos;s Card, or Driver&apos;s Licence. Outside Nigeria, use your government-issued ID.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Government ID Upload</label>
            <input
              key={idUploadInputKey}
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                setSetupForm((prev) => ({
                  ...prev,
                  governmentIdFile: file?.name || '',
                }))
                resetIdentityVerificationState()
              }}
              className="w-full h-11 px-3 border border-border rounded-md text-sm file:mr-3 file:border-0 file:bg-background file:px-2 file:py-1"
            />
            {setupForm.governmentIdFile && (
              <p className="text-xs text-success mt-1">Uploaded: {setupForm.governmentIdFile}</p>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={handleVerifyIdentity}
              disabled={isIdentityVerifying}
              className="h-10 px-4 border border-primary text-primary rounded-md text-sm font-semibold hover:bg-primary-tint transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isIdentityVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
              {isIdentityVerifying ? 'Identifying...' : 'Submit for Verification'}
            </button>
            {identityVerificationState.message && (
              <p className={`text-xs mt-2 ${
                identityVerificationState.status === 'verified'
                  ? 'text-success'
                  : identityVerificationState.status === 'failed'
                    ? 'text-error'
                    : 'text-text-muted'
              }`}
              >
                {identityVerificationState.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Residential Address (Optional)</label>
            <input
              type="text"
              value={setupForm.residentialAddress}
              onChange={(event) => setSetupForm((prev) => ({ ...prev, residentialAddress: event.target.value }))}
              placeholder="Enter your full residential address"
              className="w-full h-11 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
            />
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
              disabled={isSubmitting || isIdentityVerifying}
              className="h-11 px-5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isSubmitting && <DotLottiePreloader size={18} />}
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
