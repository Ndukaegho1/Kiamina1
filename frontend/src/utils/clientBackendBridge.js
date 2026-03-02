import { apiFetch, setApiSessionId } from './apiClient'

const buildJsonHeaders = (authorizationToken = '') => {
  const headers = {
    'Content-Type': 'application/json',
  }
  const token = String(authorizationToken || '').trim()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

const splitNameParts = (value = '') => {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return { firstName: '', lastName: '', otherNames: '' }
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '', otherNames: '' }
  }
  return {
    firstName: parts[0],
    lastName: parts[parts.length - 1],
    otherNames: parts.slice(1, -1).join(' '),
  }
}

const normalizeBusinessType = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'non profit') return 'non-profit'
  if (normalized === 'non-profit') return 'non-profit'
  if (normalized === 'business') return 'business'
  if (normalized === 'individual') return 'individual'
  return ''
}

const postJson = async (path, payload, { authorizationToken = '' } = {}) => {
  try {
    const response = await apiFetch(path, {
      method: 'POST',
      headers: buildJsonHeaders(authorizationToken),
      body: JSON.stringify(payload || {}),
    })
    const data = await response.json().catch(() => ({}))
    return { ok: response.ok, status: response.status, data }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: { message: String(error?.message || 'Network request failed.') },
    }
  }
}

const patchJson = async (path, payload, { authorizationToken = '' } = {}) => {
  try {
    const response = await apiFetch(path, {
      method: 'PATCH',
      headers: buildJsonHeaders(authorizationToken),
      body: JSON.stringify(payload || {}),
    })
    const data = await response.json().catch(() => ({}))
    return { ok: response.ok, status: response.status, data }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: { message: String(error?.message || 'Network request failed.') },
    }
  }
}

export const registerAuthAccountRecord = async ({
  uid = '',
  email = '',
  fullName = '',
  role = 'client',
  provider = 'email-password',
  status = 'active',
  emailVerified = false,
  phoneVerified = false,
} = {}) => (
  postJson('/api/auth/register-account', {
    uid: String(uid || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    fullName: String(fullName || '').trim(),
    role: String(role || 'client').trim().toLowerCase(),
    provider: String(provider || 'email-password').trim().toLowerCase(),
    status: String(status || 'active').trim().toLowerCase(),
    emailVerified: Boolean(emailVerified),
    phoneVerified: Boolean(phoneVerified),
  })
)

export const recordAuthLoginSession = async ({
  uid = '',
  email = '',
  role = 'client',
  loginMethod = 'otp',
  remember = false,
  mfaCompleted = true,
} = {}) => {
  const sessionTtlMinutes = remember ? 10080 : 720
  const response = await postJson('/api/auth/login-session', {
    uid: String(uid || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    role: String(role || 'client').trim().toLowerCase(),
    loginMethod: String(loginMethod || 'otp').trim().toLowerCase(),
    sessionTtlMinutes,
    mfaCompleted: Boolean(mfaCompleted),
  })
  const sessionId = String(response?.data?.session?.sessionId || '').trim()
  if (response.ok && sessionId) {
    setApiSessionId(sessionId, { remember: Boolean(remember) })
  }
  return response
}

export const persistClientOnboardingToBackend = async ({
  authorizationToken = '',
  email = '',
  fullName = '',
  onboardingData = {},
  defaultLandingPage = 'dashboard',
} = {}) => {
  const token = String(authorizationToken || '').trim()
  if (!token) {
    return { ok: false, profileOk: false, dashboardOk: false, reason: 'missing-token' }
  }

  const fallbackFullName = String(fullName || onboardingData?.primaryContact || '').trim()
  const nameParts = splitNameParts(fallbackFullName)
  const businessType = normalizeBusinessType(onboardingData?.businessType)

  const profilePayload = {
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    otherNames: nameParts.otherNames,
    language: String(onboardingData?.language || '').trim() || 'English',
    businessType,
    businessName: String(onboardingData?.businessName || '').trim(),
    country: String(onboardingData?.country || '').trim(),
    currency: String(onboardingData?.currency || '').trim() || 'NGN',
    industry: String(onboardingData?.industry || '').trim(),
    industryOther: String(onboardingData?.industryOther || '').trim(),
    cacNumber: String(onboardingData?.cacNumber || '').trim(),
    tin: String(onboardingData?.tin || '').trim(),
  }
  const dashboardPayload = {
    defaultLandingPage: String(defaultLandingPage || 'dashboard').trim() || 'dashboard',
    lastVisitedPage: String(defaultLandingPage || 'dashboard').trim() || 'dashboard',
    showGreeting: true,
  }

  const profileResponse = await patchJson('/api/users/me/profile', profilePayload, {
    authorizationToken: token,
  })
  const dashboardResponse = await patchJson('/api/users/me/client-dashboard', dashboardPayload, {
    authorizationToken: token,
  })

  return {
    ok: Boolean(profileResponse.ok || dashboardResponse.ok),
    profileOk: Boolean(profileResponse.ok),
    dashboardOk: Boolean(dashboardResponse.ok),
    profileStatus: profileResponse.status,
    dashboardStatus: dashboardResponse.status,
  }
}

export const fetchClientDashboardOverviewFromBackend = async ({
  authorizationToken = '',
} = {}) => {
  const token = String(authorizationToken || '').trim()
  if (!token) {
    return { ok: false, status: 0, data: null }
  }
  try {
    const response = await apiFetch('/api/users/me/client-dashboard/overview', {
      method: 'GET',
      headers: buildJsonHeaders(token),
    })
    const data = await response.json().catch(() => null)
    return { ok: response.ok, status: response.status, data }
  } catch (error) {
    return { ok: false, status: 0, data: { message: String(error?.message || 'Network request failed.') } }
  }
}
