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
  Loader2,
  UploadCloud,
  MapPin,
  Building,
  Lock
} from 'lucide-react'
import { INDUSTRY_OPTIONS } from '../../../data/client/mockData'
function OnboardingExperience({ currentStep, setCurrentStep, data, setData, onSkip, onComplete, showToast }) {
  const [errors, setErrors] = useState({})

  const isBusinessEntity = data.businessType === 'Business' || data.businessType === 'Non-Profit'
  const isNigeriaRegistration = (data.country || '').trim().toLowerCase() === 'nigeria'
  const registrationNumberLabel = isNigeriaRegistration || !data.country ? 'CAC Registration Number' : 'Business Registration Number'
  const registrationPlaceholder = isNigeriaRegistration || !data.country ? 'e.g., BN123456, RC123456, or IT123456' : 'e.g., BR123456'
  const stepTitle = [
    'Tell us about your entity',
    'Set up your tax details',
    'Configure your financial profile',
    'Verify your identity',
    'Customize your experience',
  ][currentStep - 1]

  const updateField = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const toggleService = (service) => {
    setData(prev => {
      const exists = prev.servicesNeeded.includes(service)
      return {
        ...prev,
        servicesNeeded: exists ? prev.servicesNeeded.filter(item => item !== service) : [...prev.servicesNeeded, service],
      }
    })
    setErrors(prev => ({ ...prev, servicesNeeded: '' }))
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
    return {}
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
    setCurrentStep(Math.min(5, currentStep + 1))
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-medium text-text-muted uppercase tracking-wide">Step {currentStep} of 5</div>
            <h1 className="text-2xl font-semibold text-text-primary mt-1">{stepTitle}</h1>
          </div>
          <button type="button" onClick={onSkip} className="h-9 px-4 border border-border rounded-md text-sm font-medium text-text-secondary hover:bg-background transition-colors">
            Skip for now
          </button>
        </div>

        <div className="w-full h-2 bg-border-light rounded-full mb-8">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(currentStep / 5) * 100}%` }}></div>
        </div>

        {currentStep === 1 && (
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

        {currentStep === 2 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">TIN</label>
              <input id="onboarding-tin" type="text" value={data.tin} onChange={(e) => updateField('tin', e.target.value)} className={`w-full h-10 px-3 border rounded-md text-sm ${errors.tin ? 'border-error' : 'border-border'} focus:outline-none focus:border-primary`} />
              {errors.tin && <p className="text-xs text-error mt-1">{errors.tin}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Reporting Cycle</label>
              <select id="onboarding-reportingCycle" value={data.reportingCycle} onChange={(e) => updateField('reportingCycle', e.target.value)} className={`w-full h-10 px-3 border rounded-md text-sm ${errors.reportingCycle ? 'border-error' : 'border-border'} focus:outline-none focus:border-primary`}>
                <option value="">Select reporting cycle</option>
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Annually</option>
              </select>
              {errors.reportingCycle && <p className="text-xs text-error mt-1">{errors.reportingCycle}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-1.5">Start Month</label>
              <select id="onboarding-startMonth" value={data.startMonth} onChange={(e) => updateField('startMonth', e.target.value)} className={`w-full h-10 px-3 border rounded-md text-sm ${errors.startMonth ? 'border-error' : 'border-border'} focus:outline-none focus:border-primary`}>
                <option value="">Select start month</option>
                <option>January</option>
                <option>February</option>
                <option>March</option>
                <option>April</option>
                <option>May</option>
                <option>June</option>
                <option>July</option>
                <option>August</option>
                <option>September</option>
                <option>October</option>
                <option>November</option>
                <option>December</option>
              </select>
              {errors.startMonth && <p className="text-xs text-error mt-1">{errors.startMonth}</p>}
              <p className="text-xs text-text-muted mt-1">These details determine your compliance reporting schedule.</p>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Base Currency</label>
              <select id="onboarding-currency" value={data.currency} onChange={(e) => updateField('currency', e.target.value)} className={`w-full h-10 px-3 border rounded-md text-sm ${errors.currency ? 'border-error' : 'border-border'} focus:outline-none focus:border-primary`}>
                <option value="NGN">NGN - Nigerian Naira</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
              {errors.currency && <p className="text-xs text-error mt-1">{errors.currency}</p>}
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
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-1.5">Primary Contact Person</label>
              <input id="onboarding-primaryContact" type="text" value={data.primaryContact} onChange={(e) => updateField('primaryContact', e.target.value)} className={`w-full h-10 px-3 border rounded-md text-sm ${errors.primaryContact ? 'border-error' : 'border-border'} focus:outline-none focus:border-primary`} />
              {errors.primaryContact && <p className="text-xs text-error mt-1">{errors.primaryContact}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-1.5">Select Services Needed</label>
              <div id="onboarding-servicesNeeded" className="grid grid-cols-2 gap-3">
                {['Expenses', 'Sales', 'Bank Statements', 'Payroll', 'Tax Support'].map((service) => (
                  <label key={service} className="inline-flex items-center gap-2 text-sm text-text-secondary border border-border rounded-md px-3 py-2">
                    <input type="checkbox" checked={data.servicesNeeded.includes(service)} onChange={() => toggleService(service)} className="w-4 h-4 accent-primary" />
                    {service}
                  </label>
                ))}
              </div>
              {errors.servicesNeeded && <p className="text-xs text-error mt-1">{errors.servicesNeeded}</p>}
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">Verification helps us maintain compliance and security.</p>
            {[
              { id: 'govId', label: 'Government ID' },
              { id: 'proofOfAddress', label: 'Proof of Address' },
              { id: 'businessReg', label: 'Business Registration Document (if applicable)' },
            ].map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-text-primary mb-1.5">{field.label}</label>
                <input
                  id={`onboarding-${field.id}`}
                  type="file"
                  onChange={(e) => updateField(field.id, e.target.files?.[0]?.name || '')}
                  className="w-full h-10 px-3 border border-border rounded-md text-sm file:mr-3 file:border-0 file:bg-background file:px-2 file:py-1"
                />
                {data[field.id] && <p className="text-xs text-success mt-1">Attached: {data[field.id]}</p>}
              </div>
            ))}
          </div>
        )}

        {currentStep === 5 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Default landing page</label>
              <select id="onboarding-defaultLandingPage" value={data.defaultLandingPage} onChange={(e) => updateField('defaultLandingPage', e.target.value)} className={`w-full h-10 px-3 border rounded-md text-sm ${errors.defaultLandingPage ? 'border-error' : 'border-border'} focus:outline-none focus:border-primary`}>
                <option value="dashboard">Dashboard Overview</option>
                <option value="expenses">Expenses</option>
                <option value="sales">Sales</option>
                <option value="bank-statements">Bank Statements</option>
              </select>
              {errors.defaultLandingPage && <p className="text-xs text-error mt-1">{errors.defaultLandingPage}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Upload preferences</label>
              <select id="onboarding-uploadPreference" value={data.uploadPreference} onChange={(e) => updateField('uploadPreference', e.target.value)} className={`w-full h-10 px-3 border rounded-md text-sm ${errors.uploadPreference ? 'border-error' : 'border-border'} focus:outline-none focus:border-primary`}>
                <option value="standard">Standard review workflow</option>
                <option value="strict">Strict compliance review</option>
              </select>
              {errors.uploadPreference && <p className="text-xs text-error mt-1">{errors.uploadPreference}</p>}
            </div>
            <div className="col-span-2 space-y-3">
              <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" checked={data.notifyEmail} onChange={(e) => updateField('notifyEmail', e.target.checked)} className="w-4 h-4 accent-primary" />
                Email notifications for account activity
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" checked={data.notifyCompliance} onChange={(e) => updateField('notifyCompliance', e.target.checked)} className="w-4 h-4 accent-primary" />
                Compliance deadline reminders
              </label>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-light">
          <button type="button" onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1} className="h-9 px-4 border border-border rounded-md text-sm font-medium text-text-primary hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Back
          </button>
          {currentStep < 5 ? (
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

