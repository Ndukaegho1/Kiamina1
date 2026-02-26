import { useState } from 'react'
import { ShieldCheck, Lock, Mail, Loader2, ArrowLeft } from 'lucide-react'
import AdminOtpModal from './AdminOtpModal'

function AdminLoginPortal({
  onLogin,
  otpChallenge,
  onVerifyOtp,
  onResendOtp,
  onCancelOtp,
  onSwitchToClientLogin,
}) {
  const [formState, setFormState] = useState({
    email: '',
    password: '',
    remember: true,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitLogin = async (event) => {
    event.preventDefault()
    setLoginError('')
    setIsSubmitting(true)
    const result = await onLogin(formState)
    if (!result?.ok) {
      setLoginError(result?.message || 'Admin authentication failed.')
    }
    setIsSubmitting(false)
  }

  return (
    <div
      className="min-h-screen bg-[#F4F6FB] flex items-center justify-center px-4 py-10"
      style={{ fontFamily: "'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      <div className="w-full max-w-md bg-white border border-border-light rounded-xl shadow-card p-8">
        <div className="flex items-center justify-center mb-6">
          <div className="w-11 h-11 bg-primary rounded-md flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-text-primary text-center">Admin Portal</h1>
        <p className="text-sm text-text-secondary text-center mt-2 mb-7">Authorized personnel only.</p>

        <form className="space-y-4" onSubmit={submitLogin}>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                value={formState.email}
                onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="admin@company.com"
                className="w-full h-11 pl-9 pr-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formState.password}
                onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full h-11 pl-9 pr-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              Show password
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={formState.remember}
                onChange={(event) => setFormState((prev) => ({ ...prev, remember: event.target.checked }))}
                className="w-4 h-4 accent-primary"
              />
              Keep me signed in
            </label>
          </div>

          {loginError && (
            <div className="rounded-md border border-error/25 bg-error-bg px-3 py-2">
              <p className="text-xs text-error">{loginError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Processing...' : 'Sign In to Admin Portal'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-border-light">
          <button
            type="button"
            onClick={onSwitchToClientLogin}
            className="text-sm text-text-secondary hover:text-text-primary inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Client Login
          </button>
        </div>
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

export default AdminLoginPortal
