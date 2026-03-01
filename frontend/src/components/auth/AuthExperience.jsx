import { useState, useRef } from 'react'
import {
  LayoutDashboard,
  DollarSign,
  TrendingUp,
  Building2,
  Upload,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  Plus,
  Eye,
  X,
  FileUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  FileText,
  FileSpreadsheet,
  File,
  ChevronRight,
  User,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  UploadCloud,
  MapPin,
  Building,
  Lock
} from 'lucide-react'
import KiaminaLogo from '../common/KiaminaLogo'
function AppleBrandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path fill="currentColor" d="M16.36 12.38c.03 3.06 2.68 4.08 2.71 4.09-.02.07-.42 1.43-1.39 2.83-.84 1.21-1.71 2.42-3.08 2.45-1.34.02-1.77-.79-3.3-.79-1.53 0-2.01.77-3.27.81-1.31.05-2.31-1.31-3.15-2.52-1.71-2.46-3.02-6.96-1.26-10.02.87-1.52 2.44-2.47 4.14-2.49 1.29-.03 2.5.87 3.3.87.8 0 2.3-1.08 3.88-.92.66.03 2.52.27 3.72 2.02-.1.06-2.22 1.3-2.2 3.87zm-2.62-6.63c.7-.84 1.17-2 1.04-3.16-1 .04-2.2.67-2.92 1.51-.64.74-1.2 1.92-1.05 3.05 1.11.09 2.24-.56 2.93-1.4z"/>
    </svg>
  )
}

function GoogleBrandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.26-.96 2.32-2.05 3.04l3.31 2.57c1.93-1.78 3.04-4.4 3.04-7.51 0-.72-.07-1.43-.2-2.1H12z"/>
      <path fill="#34A853" d="M12 22c2.75 0 5.07-.9 6.76-2.29l-3.31-2.57c-.92.62-2.09.98-3.45.98-2.66 0-4.9-1.8-5.7-4.21l-3.42 2.64C4.55 19.84 8.01 22 12 22z"/>
      <path fill="#4A90E2" d="M6.3 13.91A5.95 5.95 0 0 1 6 12c0-.66.11-1.3.3-1.91L2.88 7.45A9.97 9.97 0 0 0 2 12c0 1.6.38 3.11 1.05 4.45l3.25-2.54z"/>
      <path fill="#FBBC05" d="M12 5.88c1.49 0 2.82.51 3.87 1.5l2.9-2.9C17.06 2.88 14.75 2 12 2 8.01 2 4.55 4.16 2.88 7.45l3.42 2.64c.8-2.41 3.04-4.21 5.7-4.21z"/>
    </svg>
  )
}

function LinkedInBrandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="3" fill="#0A66C2" />
      <circle cx="8" cy="8" r="1.5" fill="white" />
      <rect x="6.5" y="10" width="3" height="8" fill="white" />
      <path fill="white" d="M12 10h2.88v1.1h.04c.4-.75 1.38-1.54 2.84-1.54C20.8 9.56 22 11.43 22 14.33V18h-3.02v-3.24c0-.77-.01-1.77-1.08-1.77-1.08 0-1.24.84-1.24 1.71V18H13.64v-8z"/>
    </svg>
  )
}

function LegacyAuthExperience({ mode, setMode, onLogin, onSignup, onSocialLogin, onForgotPassword, onRequestOtp }) {
  const [loginForm, setLoginForm] = useState({ email: '', password: '', otp: '', remember: false, agree: false })
  const [otpSent, setOtpSent] = useState(false)
  const [signupErrors, setSignupErrors] = useState({ password: '' })
  const [signupForm, setSignupForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agree: false,
  })
  const signupPasswordRegex = /^(?=.*\d)(?=.*[^A-Za-z0-9]).+$/

  const socialButtons = [
    { id: 'apple', label: 'Continue with Apple', icon: AppleBrandIcon },
    { id: 'google', label: 'Continue with Google', icon: GoogleBrandIcon },
    { id: 'linkedin', label: 'Continue with LinkedIn', icon: LinkedInBrandIcon },
  ]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10" style={{ fontFamily: "'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div className="w-full max-w-md bg-white border border-border-light rounded-xl shadow-card p-8">
        <div className="flex items-center justify-center mb-6">
          <KiaminaLogo className="h-12 w-auto" />
        </div>

        {mode === 'login' ? (
          <>
            <h1 className="text-2xl font-semibold text-text-primary text-center">Welcome Back</h1>
            <p className="text-sm text-text-muted text-center mt-2 mb-6">Access your financial dashboard securely.</p>

            <div className="space-y-3">
              {socialButtons.map((button) => (
                <button
                  key={button.id}
                  type="button"
                  onClick={() => onSocialLogin(button.id)}
                  className="w-full h-11 px-4 border border-border rounded-md flex items-center justify-center gap-2 text-sm font-medium text-text-primary hover:bg-background transition-colors"
                >
                  <button.icon />
                  {button.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 border-t border-border-light"></div>
              <span className="text-xs text-text-muted font-medium">OR</span>
              <div className="flex-1 border-t border-border-light"></div>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                onLogin(loginForm)
              }}
            >
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                />
              </div>
              {otpSent && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">One-Time Password (OTP)</label>
                  <input
                    type="text"
                    value={loginForm.otp}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, otp: e.target.value }))}
                    className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary tracking-[0.2em]"
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={loginForm.remember}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, remember: e.target.checked }))}
                    className="w-4 h-4 accent-primary"
                  />
                  Remember Me
                </label>
                <button type="button" onClick={() => onForgotPassword(loginForm.email)} className="text-sm text-primary hover:text-primary-light">
                  Forgot Password?
                </button>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={loginForm.agree}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, agree: e.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
                I agree to the Terms & Privacy Policy
              </label>
              <button
                type="button"
                onClick={async () => {
                  const sent = await onRequestOtp(loginForm.email)
                  if (sent) setOtpSent(true)
                }}
                className="w-full h-10 bg-white border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background transition-colors"
              >
                Send OTP to Email
              </button>
              <button
                type="submit"
                disabled={!loginForm.agree}
                className="w-full h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {otpSent ? 'Verify OTP & Sign In' : 'Sign In'}
              </button>
            </form>

            <p className="text-sm text-text-muted text-center mt-6">
              Don't have an account?{' '}
              <button type="button" onClick={() => setMode('signup')} className="text-primary font-medium hover:text-primary-light">
                Sign Up
              </button>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-text-primary text-center">Create Your Account</h1>
            <p className="text-sm text-text-muted text-center mt-2 mb-6">Start managing your accounting and compliance in one secure platform.</p>

            <div className="space-y-3">
              {socialButtons.map((button) => (
                <button
                  key={button.id}
                  type="button"
                  onClick={() => onSocialLogin(button.id)}
                  className="w-full h-11 px-4 border border-border rounded-md flex items-center justify-center gap-2 text-sm font-medium text-text-primary hover:bg-background transition-colors"
                >
                  <button.icon />
                  {button.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 border-t border-border-light"></div>
              <span className="text-xs text-text-muted font-medium">OR</span>
              <div className="flex-1 border-t border-border-light"></div>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                const passwordError = signupPasswordRegex.test(signupForm.password)
                  ? ''
                  : 'Password must include at least one number and one special character.'
                setSignupErrors({ password: passwordError })
                if (passwordError) return
                onSignup(signupForm)
              }}
            >
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={signupForm.fullName}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Password</label>
                <input
                  type="password"
                  value={signupForm.password}
                  onChange={(e) => {
                    const nextPassword = e.target.value
                    setSignupForm(prev => ({ ...prev, password: nextPassword }))
                    if (signupErrors.password) {
                      setSignupErrors({
                        password: signupPasswordRegex.test(nextPassword)
                          ? ''
                          : 'Password must include at least one number and one special character.'
                      })
                    }
                  }}
                  className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                />
                {signupErrors.password && <p className="text-xs text-error mt-1">{signupErrors.password}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={signupForm.confirmPassword}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={signupForm.agree}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, agree: e.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
                I agree to the Terms & Privacy Policy
              </label>
              <button
                type="submit"
                disabled={!signupForm.agree}
                className="w-full h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Account
              </button>
            </form>

            <p className="text-xs text-text-muted text-center mt-4">Your information is encrypted and securely stored.</p>
            <p className="text-sm text-text-muted text-center mt-4">
              Already have an account?{' '}
              <button type="button" onClick={() => setMode('login')} className="text-primary font-medium hover:text-primary-light">
                Sign In
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function maskEmailAddress(email) {
  const normalized = email?.trim() || ''
  const atIndex = normalized.indexOf('@')
  if (atIndex <= 1) return normalized || 'your registered email'
  const local = normalized.slice(0, atIndex)
  const domain = normalized.slice(atIndex)
  return `${local[0]}${'*'.repeat(Math.max(4, local.length - 1))}${domain}`
}

function getOtpPreviewCode(email) {
  if (!import.meta.env.DEV) return ''
  const normalizedEmail = email?.trim()?.toLowerCase()
  if (!normalizedEmail) return ''
  try {
    const rawPreview = sessionStorage.getItem('kiaminaOtpPreview')
    if (!rawPreview) return ''
    const parsedPreview = JSON.parse(rawPreview)
    return parsedPreview?.[normalizedEmail]?.code || ''
  } catch {
    return ''
  }
}

function getPasswordStrengthState(password) {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 1) return { score, label: 'Weak', color: 'bg-error' }
  if (score === 2) return { score, label: 'Fair', color: 'bg-warning' }
  if (score === 3) return { score, label: 'Good', color: 'bg-primary' }
  return { score, label: 'Strong', color: 'bg-success' }
}

function OtpVerificationModal({ challenge, onVerifyOtp, onResendOtp, onCancelOtp }) {
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const otpInputRefs = useRef([])

  const otpCode = otpDigits.join('')
  const maskedEmail = maskEmailAddress(challenge.email)
  const devOtpCode = getOtpPreviewCode(challenge?.email)

  const triggerShake = () => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 350)
  }

  const handleOtpChange = (index, rawValue) => {
    const digitsOnly = rawValue.replace(/\D/g, '')
    if (!digitsOnly) {
      const next = [...otpDigits]
      next[index] = ''
      setOtpDigits(next)
      return
    }

    const next = [...otpDigits]
    digitsOnly.slice(0, 6 - index).split('').forEach((digit, offset) => {
      next[index + offset] = digit
    })
    setOtpDigits(next)
    setOtpError('')

    const nextFocusIndex = Math.min(index + digitsOnly.length, 5)
    otpInputRefs.current[nextFocusIndex]?.focus()
    otpInputRefs.current[nextFocusIndex]?.select()

    if (next.join('').length === 6) {
      void handleVerify(next.join(''))
    }
  }

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      if (otpDigits[index]) {
        const next = [...otpDigits]
        next[index] = ''
        setOtpDigits(next)
      } else if (index > 0) {
        const next = [...otpDigits]
        next[index - 1] = ''
        setOtpDigits(next)
        otpInputRefs.current[index - 1]?.focus()
      }
    }
  }

  const handleOtpPaste = (event) => {
    event.preventDefault()
    const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pastedDigits) return
    const next = ['', '', '', '', '', '']
    pastedDigits.split('').forEach((digit, idx) => {
      next[idx] = digit
    })
    setOtpDigits(next)
    setOtpError('')
    if (pastedDigits.length === 6) {
      void handleVerify(pastedDigits)
    } else {
      otpInputRefs.current[pastedDigits.length]?.focus()
    }
  }

  const handleVerify = async (overrideCode) => {
    const code = overrideCode || otpCode
    if (code.length !== 6 || isVerifying) return
    setIsVerifying(true)
    setOtpError('')
    const result = await onVerifyOtp(code)
    if (!result?.ok) {
      setOtpError(result?.message || 'Incorrect verification code.')
      triggerShake()
    }
    setIsVerifying(false)
  }

  const handleResend = async () => {
    if (isResending) return
    setIsResending(true)
    setOtpError('')
    await onResendOtp()
    setOtpDigits(['', '', '', '', '', ''])
    otpInputRefs.current[0]?.focus()
    setIsResending(false)
  }

  return (
    <div className="fixed inset-0 z-[230] bg-black/35 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-border-light rounded-xl shadow-card p-6">
        <style>{'@keyframes otp-shake{0%{transform:translateX(0)}25%{transform:translateX(-6px)}50%{transform:translateX(6px)}75%{transform:translateX(-4px)}100%{transform:translateX(0)}}'}</style>
        <h3 className="text-xl font-semibold text-text-primary">Verify Your Identity</h3>
        <p className="text-sm text-text-secondary mt-2">We&apos;ve sent a 6-digit code to your registered email.</p>
        <p className="text-xs text-text-muted mt-1">{maskedEmail}</p>
        {devOtpCode && (
          <div className="mt-3 rounded-md border border-info/30 bg-info-bg px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-primary font-semibold">Development OTP</p>
            <p className="text-sm text-primary font-mono mt-0.5">{devOtpCode}</p>
          </div>
        )}

        <div className="mt-6" style={isShaking ? { animation: 'otp-shake 0.35s ease-in-out' } : undefined}>
          <div className="grid grid-cols-6 gap-2" onPaste={handleOtpPaste}>
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { otpInputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className={`h-12 text-center text-lg font-semibold border rounded-md focus:outline-none focus:border-primary ${otpError ? 'border-error' : 'border-border'}`}
              />
            ))}
          </div>
          {otpError && <p className="text-xs text-error mt-2">{otpError}</p>}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="text-sm text-primary hover:text-primary-light disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isResending && <Loader2 className="w-4 h-4 animate-spin" />}
            Resend code
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancelOtp}
              className="h-9 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleVerify()}
              disabled={otpCode.length !== 6 || isVerifying}
              className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
              {isVerifying ? 'Processing...' : 'Verify'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AuthExperience({
  mode,
  setMode,
  onLogin,
  onSignup,
  onSocialLogin,
  onRequestPasswordReset,
  onUpdatePassword,
  passwordResetEmail,
  setPasswordResetEmail,
  otpChallenge,
  onVerifyOtp,
  onResendOtp,
  onCancelOtp,
}) {
  const [loginForm, setLoginForm] = useState({ email: '', password: '', remember: false, agree: false })
  const [signupForm, setSignupForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '', agree: false })
  const [forgotForm, setForgotForm] = useState({ email: passwordResetEmail || '' })
  const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' })
  const [loginError, setLoginError] = useState('')
  const [signupError, setSignupError] = useState('')
  const [forgotFeedback, setForgotFeedback] = useState(null)
  const [resetError, setResetError] = useState('')
  const [signupPasswordError, setSignupPasswordError] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showSignupPasswords, setShowSignupPasswords] = useState(false)
  const [showResetPasswords, setShowResetPasswords] = useState(false)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [isSignupLoading, setIsSignupLoading] = useState(false)
  const [isSendingResetLink, setIsSendingResetLink] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [socialLoadingProvider, setSocialLoadingProvider] = useState('')
  const [isSubmittingSocialName, setIsSubmittingSocialName] = useState(false)
  const [socialNamePrompt, setSocialNamePrompt] = useState({
    open: false,
    provider: '',
    fullName: '',
    error: '',
  })

  const signupPasswordRegex = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
  const passwordStrength = getPasswordStrengthState(resetForm.password)
  const activeResetEmail = passwordResetEmail || forgotForm.email
  const busy = Boolean(socialLoadingProvider) || isLoginLoading || isSignupLoading || isSendingResetLink || isUpdatingPassword || isSubmittingSocialName

  const socialButtons = [
    { id: 'apple', label: 'Continue with Apple', icon: AppleBrandIcon },
    { id: 'google', label: 'Continue with Google', icon: GoogleBrandIcon },
    { id: 'linkedin', label: 'Continue with LinkedIn', icon: LinkedInBrandIcon },
  ]

  const submitSocial = async (provider) => {
    setLoginError('')
    setSignupError('')
    setSocialLoadingProvider(provider)
    const result = await onSocialLogin(provider)
    if (result?.requiresFullName) {
      setSocialNamePrompt({
        open: true,
        provider,
        fullName: '',
        error: '',
      })
      setSocialLoadingProvider('')
      return
    }
    if (!result?.ok) {
      const message = result?.message || 'Authentication failed. Please try again.'
      if (mode === 'signup') setSignupError(message)
      if (mode === 'login') setLoginError(message)
    }
    setSocialLoadingProvider('')
  }

  const closeSocialNamePrompt = () => {
    if (isSubmittingSocialName) return
    setSocialNamePrompt({
      open: false,
      provider: '',
      fullName: '',
      error: '',
    })
  }

  const submitSocialWithName = async () => {
    const fullName = socialNamePrompt.fullName.trim()
    if (!fullName) {
      setSocialNamePrompt(prev => ({ ...prev, error: 'Please complete all required fields.' }))
      return
    }

    setIsSubmittingSocialName(true)
    const result = await onSocialLogin(socialNamePrompt.provider, fullName)
    if (!result?.ok) {
      setSocialNamePrompt(prev => ({ ...prev, error: result?.message || 'Authentication failed. Please try again.' }))
      setIsSubmittingSocialName(false)
      return
    }

    setIsSubmittingSocialName(false)
    setSocialNamePrompt({
      open: false,
      provider: '',
      fullName: '',
      error: '',
    })
  }

  const submitLogin = async (event) => {
    event.preventDefault()
    setLoginError('')
    setIsLoginLoading(true)
    const result = await onLogin(loginForm)
    if (!result?.ok) setLoginError(result?.message || 'Email or password incorrect.')
    setIsLoginLoading(false)
  }

  const submitSignup = async (event) => {
    event.preventDefault()
    setSignupError('')
    const passwordError = signupPasswordRegex.test(signupForm.password) ? '' : 'Password must include at least one number and one special character.'
    setSignupPasswordError(passwordError)
    if (passwordError) return

    setIsSignupLoading(true)
    const result = await onSignup(signupForm)
    if (!result?.ok) setSignupError(result?.message || 'Unable to create account.')
    setIsSignupLoading(false)
  }

  const submitForgotPassword = async (event) => {
    event.preventDefault()
    setForgotFeedback(null)
    setIsSendingResetLink(true)
    const result = await onRequestPasswordReset(forgotForm.email)
    if (result?.ok && result.email) setPasswordResetEmail(result.email)
    setForgotFeedback({
      type: result?.ok ? 'success' : 'error',
      message: result?.message || 'Unable to process your request.',
    })
    setIsSendingResetLink(false)
  }

  const submitPasswordUpdate = async (event) => {
    event.preventDefault()
    setResetError('')
    setIsUpdatingPassword(true)
    const result = await onUpdatePassword({
      email: activeResetEmail,
      password: resetForm.password,
      confirmPassword: resetForm.confirmPassword,
    })
    if (!result?.ok) {
      setResetError(result?.message || 'Unable to update password.')
      setIsUpdatingPassword(false)
      return
    }
    setResetForm({ password: '', confirmPassword: '' })
    setPasswordResetEmail('')
    setMode('login')
    setIsUpdatingPassword(false)
  }

  const renderSocialButtons = () => (
    <div className="space-y-3">
      {socialButtons.map((button) => (
        <button
          key={button.id}
          type="button"
          disabled={busy}
          onClick={() => void submitSocial(button.id)}
          className="w-full h-11 px-4 border border-border rounded-md flex items-center justify-center gap-2 text-sm font-medium text-text-primary hover:bg-background transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {socialLoadingProvider === button.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <button.icon />}
          {socialLoadingProvider === button.id ? 'Processing...' : button.label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10" style={{ fontFamily: "'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div className="w-full max-w-md bg-white border border-border-light rounded-xl shadow-card p-8">
        <div className="flex items-center justify-center mb-6">
          <KiaminaLogo className="h-12 w-auto" />
        </div>

        {mode === 'login' && (
          <>
            <h1 className="text-2xl font-semibold text-text-primary text-center">Welcome Back</h1>
            <p className="text-sm text-text-muted text-center mt-2 mb-6">Access your financial dashboard securely.</p>
            {renderSocialButtons()}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 border-t border-border-light"></div>
              <span className="text-xs text-text-muted font-medium">OR</span>
              <div className="flex-1 border-t border-border-light"></div>
            </div>
            <form className="space-y-4" onSubmit={submitLogin}>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Email Address <span className="text-error">*</span></label>
                <input type="email" value={loginForm.email} onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Password <span className="text-error">*</span></label>
                <input type={showLoginPassword ? 'text' : 'password'} value={loginForm.password} onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" checked={showLoginPassword} onChange={(e) => setShowLoginPassword(e.target.checked)} className="w-4 h-4 accent-primary" />
                Show password
              </label>
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                  <input type="checkbox" checked={loginForm.remember} onChange={(e) => setLoginForm(prev => ({ ...prev, remember: e.target.checked }))} className="w-4 h-4 accent-primary" />
                  Remember Me
                </label>
                <button type="button" className="text-sm text-primary hover:text-primary-light" onClick={() => { setForgotForm({ email: loginForm.email }); setForgotFeedback(null); setMode('forgot-password') }}>
                  Forgot Password?
                </button>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" checked={loginForm.agree} onChange={(e) => setLoginForm(prev => ({ ...prev, agree: e.target.checked }))} className="w-4 h-4 accent-primary" />
                I agree to the Terms & Privacy Policy <span className="text-error">*</span>
              </label>
              {loginError && <p className="text-xs text-error">{loginError}</p>}
              <button type="submit" disabled={!loginForm.agree || busy} className="w-full h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
                {isLoginLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLoginLoading ? 'Processing...' : 'Sign In'}
              </button>
            </form>
            <p className="text-sm text-text-muted text-center mt-6">
              Don&apos;t have an account?{' '}
              <button type="button" onClick={() => setMode('signup')} className="text-primary font-medium hover:text-primary-light">Sign Up</button>
            </p>
          </>
        )}

        {mode === 'signup' && (
          <>
            <h1 className="text-2xl font-semibold text-text-primary text-center">Create Your Account</h1>
            <p className="text-sm text-text-muted text-center mt-2 mb-6">Start managing your accounting and compliance in one secure platform.</p>
            {renderSocialButtons()}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 border-t border-border-light"></div>
              <span className="text-xs text-text-muted font-medium">OR</span>
              <div className="flex-1 border-t border-border-light"></div>
            </div>
            <form className="space-y-4" onSubmit={submitSignup}>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Full Name <span className="text-error">*</span></label>
                <input type="text" value={signupForm.fullName} onChange={(e) => setSignupForm(prev => ({ ...prev, fullName: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Email Address <span className="text-error">*</span></label>
                <input type="email" value={signupForm.email} onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Password <span className="text-error">*</span></label>
                <input type={showSignupPasswords ? 'text' : 'password'} value={signupForm.password} onChange={(e) => { const nextPassword = e.target.value; setSignupForm(prev => ({ ...prev, password: nextPassword })); if (signupPasswordError) setSignupPasswordError(signupPasswordRegex.test(nextPassword) ? '' : 'Password must include at least one number and one special character.')}} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
                {signupPasswordError && <p className="text-xs text-error mt-1">{signupPasswordError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Confirm Password <span className="text-error">*</span></label>
                <input type={showSignupPasswords ? 'text' : 'password'} value={signupForm.confirmPassword} onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" checked={showSignupPasswords} onChange={(e) => setShowSignupPasswords(e.target.checked)} className="w-4 h-4 accent-primary" />
                Show password
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" checked={signupForm.agree} onChange={(e) => setSignupForm(prev => ({ ...prev, agree: e.target.checked }))} className="w-4 h-4 accent-primary" />
                I agree to the Terms & Privacy Policy <span className="text-error">*</span>
              </label>
              {signupError && <p className="text-xs text-error">{signupError}</p>}
              <button type="submit" disabled={!signupForm.agree || busy} className="w-full h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
                {isSignupLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSignupLoading ? 'Processing...' : 'Create Account'}
              </button>
            </form>
            <p className="text-xs text-text-muted text-center mt-4">Your information is encrypted and securely stored.</p>
            <p className="text-sm text-text-muted text-center mt-4">
              Already have an account?{' '}
              <button type="button" onClick={() => setMode('login')} className="text-primary font-medium hover:text-primary-light">Sign In</button>
            </p>
          </>
        )}

        {mode === 'forgot-password' && (
          <>
            <h1 className="text-2xl font-semibold text-text-primary text-center">Reset Your Password</h1>
            <p className="text-sm text-text-muted text-center mt-2 mb-6">Enter your email to receive a password reset link.</p>
            <form className="space-y-4" onSubmit={submitForgotPassword}>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Email Address <span className="text-error">*</span></label>
                <input type="email" value={forgotForm.email} placeholder="name@company.com" onChange={(e) => setForgotForm({ email: e.target.value })} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
              </div>
              {forgotFeedback && <p className={`text-xs ${forgotFeedback.type === 'success' ? 'text-success' : 'text-error'}`}>{forgotFeedback.message}</p>}
              <button type="submit" disabled={isSendingResetLink} className="w-full h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
                {isSendingResetLink && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSendingResetLink ? 'Processing...' : 'Send Reset Link'}
              </button>
            </form>
            {forgotFeedback?.type === 'success' && (
              <button type="button" onClick={() => setMode('reset-password')} className="w-full mt-3 h-10 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background transition-colors">
                Continue
              </button>
            )}
            <p className="text-sm text-text-muted text-center mt-6">
              <button type="button" onClick={() => setMode('login')} className="text-primary font-medium hover:text-primary-light">Back to Sign In</button>
            </p>
          </>
        )}

        {mode === 'reset-password' && (
          <>
            <h1 className="text-2xl font-semibold text-text-primary text-center">Create New Password</h1>
            <p className="text-sm text-text-muted text-center mt-2 mb-6">Set a new password for your account.</p>
            <form className="space-y-4" onSubmit={submitPasswordUpdate}>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Email Address <span className="text-error">*</span></label>
                <input type="email" value={activeResetEmail || ''} readOnly className="w-full h-10 px-3 border border-border-light rounded-md text-sm bg-background text-text-secondary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">New Password <span className="text-error">*</span></label>
                <input type={showResetPasswords ? 'text' : 'password'} value={resetForm.password} onChange={(e) => setResetForm(prev => ({ ...prev, password: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
                <div className="mt-2">
                  <div className="w-full h-1.5 bg-border-light rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${passwordStrength.color}`} style={{ width: `${(passwordStrength.score / 4) * 100}%` }}></div>
                  </div>
                  <p className="text-xs text-text-muted mt-1">Password strength: {passwordStrength.label}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Confirm New Password <span className="text-error">*</span></label>
                <input type={showResetPasswords ? 'text' : 'password'} value={resetForm.confirmPassword} onChange={(e) => setResetForm(prev => ({ ...prev, confirmPassword: e.target.value }))} className="w-full h-10 px-3 border border-border rounded-md text-sm focus:outline-none focus:border-primary" />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" checked={showResetPasswords} onChange={(e) => setShowResetPasswords(e.target.checked)} className="w-4 h-4 accent-primary" />
                Show password
              </label>
              {resetError && <p className="text-xs text-error">{resetError}</p>}
              <button type="submit" disabled={isUpdatingPassword} className="w-full h-10 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2">
                {isUpdatingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                {isUpdatingPassword ? 'Processing...' : 'Update Password'}
              </button>
            </form>
            <p className="text-sm text-text-muted text-center mt-6">
              <button type="button" onClick={() => setMode('login')} className="text-primary font-medium hover:text-primary-light">Back to Sign In</button>
            </p>
          </>
        )}
      </div>

      {socialNamePrompt.open && (
        <div className="fixed inset-0 z-[225] bg-black/35 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-border-light rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold text-text-primary">Complete Your Profile</h3>
            <p className="text-sm text-text-secondary mt-2">Enter your full name to continue to onboarding.</p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-text-primary mb-1.5">Full Name <span className="text-error">*</span></label>
              <input
                type="text"
                value={socialNamePrompt.fullName}
                onChange={(e) => setSocialNamePrompt(prev => ({ ...prev, fullName: e.target.value, error: '' }))}
                placeholder="Enter your full legal name"
                className={`w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:border-primary ${socialNamePrompt.error ? 'border-error' : 'border-border'}`}
              />
              {socialNamePrompt.error && <p className="text-xs text-error mt-1">{socialNamePrompt.error}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeSocialNamePrompt}
                className="h-9 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitSocialWithName()}
                disabled={isSubmittingSocialName}
                className="h-9 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isSubmittingSocialName && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmittingSocialName ? 'Processing...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {otpChallenge && (
        <OtpVerificationModal
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

export default AuthExperience

