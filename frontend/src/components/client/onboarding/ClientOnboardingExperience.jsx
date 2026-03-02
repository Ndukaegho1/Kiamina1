import { useState } from 'react'
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
  UploadCloud,
  MapPin,
  Building,
  Lock
} from 'lucide-react'
import { INDUSTRY_OPTIONS } from '../../../data/client/mockData'
import KiaminaLogo from '../../common/KiaminaLogo'

const TOTAL_ONBOARDING_STEPS = 2
const COUNTRY_BASE_CURRENCY_MAP = Object.freeze({
  Nigeria: 'NGN',
  'United States': 'USD',
  'United Kingdom': 'GBP',
  Canada: 'CAD',
  Australia: 'AUD',
})
const BASE_CURRENCY_LABEL_MAP = Object.freeze({
  NGN: 'NGN - Nigerian Naira',
  USD: 'USD - US Dollar',
  GBP: 'GBP - British Pound',
  CAD: 'CAD - Canadian Dollar',
  AUD: 'AUD - Australian Dollar',
})

function OnboardingExperience({ currentStep, setCurrentStep, data, setData, onSkip, onComplete, showToast }) {
  const [errors, setErrors] = useState({})

  const resolvedCurrentStep = Math.min(TOTAL_ONBOARDING_STEPS, Math.max(1, Number(currentStep) || 1))
  const isBusinessEntity = data.businessType === 'Business' || data.businessType === 'Non-Profit'
  const isNigeriaRegistration = (data.country || '').trim().toLowerCase() === 'nigeria'
  const registrationNumberLabel = isNigeriaRegistration || !data.country ? 'CAC Registration Number' : 'Business Registration Number'
  const registrationPlaceholder = isNigeriaRegistration || !data.country ? 'e.g., BN123456, RC123456, or IT123456' : 'e.g., BR123456'
  const stepTitle = [
    'User profile details',
    'Tell us about your entity',
  ][resolvedCurrentStep - 1]
  const resolvedCurrency = BASE_CURRENCY_LABEL_MAP[data.currency] || BASE_CURRENCY_LABEL_MAP.NGN
  const sanitizeLettersOnly = (value = '') => (
    String(value || '')
      .replace(/[^A-Za-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trimStart()
  )
  const sanitizeAlphaNumeric = (value = '') => String(value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  const toTitleCaseValue = (value = '') => (
    String(value || '')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  )

  const updateField = (field, value) => {
    const normalizedValue = (() => {
      if (field === 'cacNumber') return sanitizeAlphaNumeric(value)
      if (field === 'primaryContact') return sanitizeLettersOnly(value)
      return value
    })()
    setData((prev) => {
      const next = { ...prev, [field]: normalizedValue }
      if (field === 'businessType' && value === 'Individual') {
        next.cacNumber = ''
        next.businessReg = ''
      }
      if (field === 'primaryContact') {
        next.primaryContact = toTitleCaseValue(normalizedValue)
      }
      if (field === 'country') {
        const autoCurrency = COUNTRY_BASE_CURRENCY_MAP[String(normalizedValue || '').trim()] || 'NGN'
        next.currency = autoCurrency
      }
      return next
    })
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const scrollToFirstInvalid = (errorMap) => {
    const firstInvalid = Object.keys(errorMap)[0]
    if (!firstInvalid) return
    setTimeout(() => {
      const el = document.getElementById(`onboarding-${firstInvalid}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        if (typeof el.focus === 'function') el.focus()
      }
    }, 0)
  }

  const validateStep = () => {
    const nextErrors = {}
    if (resolvedCurrentStep === 1) {
      if (!String(data.primaryContact || '').trim()) nextErrors.primaryContact = 'This field is required.'
      if (!String(data.language || '').trim()) nextErrors.language = 'This field is required.'
    }
    if (resolvedCurrentStep === 2) {
      if (!String(data.businessType || '').trim()) nextErrors.businessType = 'This field is required.'
      if (!String(data.businessName || '').trim()) nextErrors.businessName = 'This field is required.'
      if (!String(data.country || '').trim()) nextErrors.country = 'This field is required.'
      if (!String(data.industry || '').trim()) nextErrors.industry = 'This field is required.'
      if (data.industry === 'Others' && !String(data.industryOther || '').trim()) nextErrors.industryOther = 'This field is required.'
      if (isBusinessEntity) {
        const normalizedRegistration = sanitizeAlphaNumeric(data.cacNumber)
        if (!normalizedRegistration) {
          nextErrors.cacNumber = 'Registration number is required.'
        } else if (!/^(RC|BN|IT)/.test(normalizedRegistration)) {
          nextErrors.cacNumber = 'Registration number must start with RC, BN, or IT.'
        }
      }
    }
    return nextErrors
  }

  const handleNext = () => {
    const nextErrors = validateStep()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      showToast('error', 'Please complete all required fields.')
      scrollToFirstInvalid(nextErrors)
      return
    }
    setErrors({})
    setCurrentStep(Math.min(TOTAL_ONBOARDING_STEPS, resolvedCurrentStep + 1))
  }

  const handleFinish = () => {
    const nextErrors = validateStep()
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      showToast('error', 'Please complete all required fields.')
      scrollToFirstInvalid(nextErrors)
      return
    }
    onComplete(data)
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8" style={{ fontFamily: "'Helvetica Now', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div className="max-w-4xl mx-auto bg-white border border-border-light rounded-xl shadow-card p-8">
        <div className="flex items-center justify-center mb-6">
          <KiaminaLogo className="h-12 w-auto" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-medium text-text-muted uppercase tracking-wide">Step {resolvedCurrentStep} of {TOTAL_ONBOARDING_STEPS}</div>
            <h1 className="text-2xl font-semibold text-text-primary mt-1">{stepTitle}</h1>
          </div>
          <button type="button" onClick={onSkip} className="h-9 px-4 border border-border rounded-md text-sm font-medium text-text-secondary hover:bg-background transition-colors">
            Skip for now
          </button>
        </div>

        <div className="w-full h-2 bg-border-light rounded-full mb-8">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(resolvedCurrentStep / TOTAL_ONBOARDING_STEPS) * 100}%` }}></div>
        </div>

        {resolvedCurrentStep === 1 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Primary Contact Person</label>
              <input
                id="onboarding-primaryContact"
                type="text"
                value={data.primaryContact}
                onChange={(e) => updateField('primaryContact', e.target.value)}
                className={`w-full h-10 px-3 border rounded-md text-sm ${errors.primaryContact ? 'border-error' : 'border-border'} focus:outline-none focus:border-primary`}
              />
              {errors.primaryContact && <p className="text-xs text-error mt-1">{errors.primaryContact}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Account Language</label>
              <select id="onboarding-language" value={data.language} onChange={(e) => updateField('language', e.target.value)} className={`w-full h-10 px-3 border rounded-md text-sm ${errors.language ? 'border-error' : 'border-border'} focus:outline-none focus:border-primary`}>
                <option>English</option>
                <option>French</option>
                <option>Portuguese</option>
              </select>
              {errors.language && <p className="text-xs text-error mt-1">{errors.language}</p>}
            </div>
            <div className="col-span-2 rounded-md border border-border-light bg-background/50 px-3 py-2.5">
              <p className="text-xs uppercase tracking-wide text-text-muted">Base Currency</p>
              <p className="text-sm font-medium text-text-primary mt-1">{resolvedCurrency}</p>
              <p className="text-xs text-text-secondary mt-1">Currency is set automatically from your business country.</p>
            </div>
          </div>
        )}

        {resolvedCurrentStep === 2 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Business Type</label>
              <select id="onboarding-businessType" value={data.businessType} onChange={(e) => updateField('businessType', e.target.value)} className={`w-full h-10 px-3 border rounded-md text-sm ${errors.businessType ? 'border-error' : 'border-border'} focus:outline-none focus:border-primary`}>
                <option value="">Select business type</option>
                <option>Business</option>
                <option>Non-Profit</option>
                <option>Individual</option>
              </select>
              {errors.businessType && <p className="text-xs text-error mt-1">{errors.businessType}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Business Name</label>
              <input id="onboarding-businessName" type="text" value={data.businessName} onChange={(e) => updateField('businessName', e.target.value)} className={`w-full h-10 px-3 border rounded-md text-sm ${errors.businessName ? 'border-error' : 'border-border'} focus:outline-none focus:border-primary`} />
              {errors.businessName && <p className="text-xs text-error mt-1">{errors.businessName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Country of Registration</label>
              <select id="onboarding-country" value={data.country} onChange={(e) => updateField('country', e.target.value)} className={`w-full h-10 px-3 border rounded-md text-sm ${errors.country ? 'border-error' : 'border-border'} focus:outline-none focus:border-primary`}>
                <option value="">Select country</option>
                <option>Nigeria</option>
                <option>United States</option>
                <option>United Kingdom</option>
                <option>Canada</option>
                <option>Australia</option>
              </select>
              {errors.country && <p className="text-xs text-error mt-1">{errors.country}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Industry</label>
              <select id="onboarding-industry" value={data.industry} onChange={(e) => updateField('industry', e.target.value)} className={`w-full h-10 px-3 border rounded-md text-sm ${errors.industry ? 'border-error' : 'border-border'} focus:outline-none focus:border-primary`}>
                <option value="">Select industry</option>
                {INDUSTRY_OPTIONS.map(industry => <option key={industry} value={industry}>{industry}</option>)}
              </select>
              {errors.industry && <p className="text-xs text-error mt-1">{errors.industry}</p>}
            </div>
            <div className="col-span-2 rounded-md border border-border-light bg-background/50 px-3 py-2.5">
              <p className="text-xs uppercase tracking-wide text-text-muted">Base Currency</p>
              <p className="text-sm font-medium text-text-primary mt-1">{resolvedCurrency}</p>
              <p className="text-xs text-text-secondary mt-1">Automatically set based on the selected country.</p>
            </div>
            {data.industry === 'Others' && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-primary mb-1.5">Please specify your industry</label>
                <input id="onboarding-industryOther" type="text" value={data.industryOther} onChange={(e) => updateField('industryOther', e.target.value)} className={`w-full h-10 px-3 border rounded-md text-sm ${errors.industryOther ? 'border-error' : 'border-border'} focus:outline-none focus:border-primary`} />
                {errors.industryOther && <p className="text-xs text-error mt-1">{errors.industryOther}</p>}
              </div>
            )}
            {isBusinessEntity && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-primary mb-1.5">{registrationNumberLabel}</label>
                <input id="onboarding-cacNumber" type="text" value={data.cacNumber} onChange={(e) => updateField('cacNumber', e.target.value)} placeholder={registrationPlaceholder} className={`w-full h-10 px-3 border rounded-md text-sm ${errors.cacNumber ? 'border-error' : 'border-border'} focus:outline-none focus:border-primary`} />
                {errors.cacNumber && <p className="text-xs text-error mt-1">{errors.cacNumber}</p>}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-light">
          <button type="button" onClick={() => setCurrentStep(Math.max(1, resolvedCurrentStep - 1))} disabled={resolvedCurrentStep === 1} className="h-9 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Back
          </button>
          {resolvedCurrentStep < TOTAL_ONBOARDING_STEPS ? (
            <button type="button" onClick={handleNext} className="h-9 px-5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors">
              Next
            </button>
          ) : (
            <button type="button" onClick={handleFinish} className="h-9 px-5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-light transition-colors">
              Finish Setup
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default OnboardingExperience

