import { initializeApp, getApps } from 'firebase/app'
import {
  applyActionCode,
  browserSessionPersistence,
  browserPopupRedirectResolver,
  checkActionCode,
  confirmPasswordReset,
  getRedirectResult,
  GoogleAuthProvider,
  getAuth,
  initializeAuth,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  verifyPasswordResetCode,
} from 'firebase/auth'

const FIREBASE_WEB_API_KEY = String(import.meta.env.VITE_FIREBASE_WEB_API_KEY || '').trim()
const FIREBASE_PROJECT_ID = String(import.meta.env.VITE_FIREBASE_PROJECT_ID || 'kiaminaaccounting').trim()
const FIREBASE_AUTH_DOMAIN = String(
  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
).trim()

const hasFirebaseWebConfig = Boolean(FIREBASE_WEB_API_KEY && FIREBASE_PROJECT_ID && FIREBASE_AUTH_DOMAIN)
const GOOGLE_REDIRECT_INTENT_STORAGE_KEY = 'kiaminaGoogleRedirectIntent'
const GOOGLE_REDIRECT_INTENT_FALLBACK_STORAGE_KEY = 'kiaminaGoogleRedirectIntentFallback'
const SHOULD_USE_GOOGLE_POPUP_IN_DEV = Boolean(import.meta.env.DEV)
const GOOGLE_AUTH_DEBUG = Boolean(import.meta.env.DEV)

const logGoogleAuthDebug = (...args) => {
  if (!GOOGLE_AUTH_DEBUG) return
  console.info('[google-auth]', ...args)
}

let firebaseAuthInstance = null

const getFirebaseAuth = () => {
  if (!hasFirebaseWebConfig) return null
  if (firebaseAuthInstance) return firebaseAuthInstance

  const app = getApps()[0] || initializeApp({
    apiKey: FIREBASE_WEB_API_KEY,
    authDomain: FIREBASE_AUTH_DOMAIN,
    projectId: FIREBASE_PROJECT_ID,
  })

  try {
    firebaseAuthInstance = initializeAuth(app, {
      persistence: browserSessionPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    })
  } catch {
    firebaseAuthInstance = getAuth(app)
  }

  return firebaseAuthInstance
}

const getActionCodeErrorMessage = (error = null, fallbackMessage = '') => {
  const code = String(error?.code || '').trim().toLowerCase()
  if (code.includes('expired-action-code')) {
    return fallbackMessage
  }
  if (code.includes('invalid-action-code')) {
    return fallbackMessage
  }
  return fallbackMessage
}

const parseDisplayNameToParts = (displayName = '') => {
  const parts = String(displayName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return { firstName: '', lastName: '', otherNames: '' }
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '', otherNames: '' }
  }
  return {
    firstName: parts[0],
    lastName: parts[parts.length - 1],
    otherNames: parts.slice(1, -1).join(' ').trim(),
  }
}

const rawMessageIncludes = (error = null, fragment = '') => (
  String(error?.message || '').trim().toLowerCase().includes(String(fragment || '').trim().toLowerCase())
)

const getGoogleAuthErrorMessage = (error = null) => {
  const code = String(error?.code || '').trim().toLowerCase()
  if (code.includes('popup-closed-by-user')) {
    return 'Google sign-in was cancelled before completion.'
  }
  if (code.includes('popup-blocked')) {
    return 'Popup was blocked by your browser. Enable popups and try again.'
  }
  if (code.includes('operation-not-allowed')) {
    return 'Google sign-in is not enabled in Firebase. Enable Google under Firebase Authentication > Sign-in method.'
  }
  if (code.includes('network-request-failed')) {
    return 'Network error while contacting Google sign-in. Check your connection and try again.'
  }
  if (code.includes('too-many-requests')) {
    return 'Too many sign-in attempts. Please wait a moment and try again.'
  }
  if (code.includes('invalid-api-key')) {
    return 'Firebase Web API key is invalid. Check VITE_FIREBASE_WEB_API_KEY in your frontend env file.'
  }
  if (rawMessageIncludes(error, 'accounts:lookup')) {
    return 'Google sign-in session could not be restored. Refresh the page and try again.'
  }
  if (code.includes('unauthorized-domain')) {
    const domain = typeof window !== 'undefined' ? String(window.location.hostname || '').trim() : ''
    if (domain === '127.0.0.1') {
      return 'Google sign-in is blocked for 127.0.0.1. Add 127.0.0.1 in Firebase Authentication > Settings > Authorized domains, or run from localhost.'
    }
    if (domain) {
      return `Google sign-in is blocked for ${domain}. Add it in Firebase Authentication > Settings > Authorized domains.`
    }
    return 'This domain is not authorized for Firebase Google sign-in. Add the current domain in Firebase Authentication > Settings > Authorized domains.'
  }
  const rawMessage = String(error?.message || '').trim()
  if (code && rawMessage) {
    return `Google sign-in failed (${code}): ${rawMessage}`
  }
  return 'Unable to complete Google sign-in right now. Please try again.'
}

export const clearFirebaseAuthSession = async () => {
  const auth = getFirebaseAuth()
  if (!auth) return
  try {
    await signOut(auth)
  } catch {
    // Best-effort cleanup only.
  }
}

const getGoogleRedirectIntent = () => {
  if (typeof window === 'undefined') return ''
  try {
    const sessionIntent = String(window.sessionStorage.getItem(GOOGLE_REDIRECT_INTENT_STORAGE_KEY) || '').trim().toLowerCase()
    if (sessionIntent) return sessionIntent
    return String(window.localStorage.getItem(GOOGLE_REDIRECT_INTENT_FALLBACK_STORAGE_KEY) || '').trim().toLowerCase()
  } catch {
    return ''
  }
}

const setGoogleRedirectIntent = (intent = '') => {
  if (typeof window === 'undefined') return
  try {
    const normalizedIntent = String(intent || '').trim().toLowerCase()
    if (!normalizedIntent) {
      window.sessionStorage.removeItem(GOOGLE_REDIRECT_INTENT_STORAGE_KEY)
      window.localStorage.removeItem(GOOGLE_REDIRECT_INTENT_FALLBACK_STORAGE_KEY)
      return
    }
    window.sessionStorage.setItem(GOOGLE_REDIRECT_INTENT_STORAGE_KEY, normalizedIntent)
    window.localStorage.setItem(GOOGLE_REDIRECT_INTENT_FALLBACK_STORAGE_KEY, normalizedIntent)
  } catch {
    // Best-effort only.
  }
}

const waitForFirebaseCurrentUser = async (auth, timeoutMs = 8000) => {
  if (!auth) return null
  if (auth.currentUser) return auth.currentUser

  if (typeof auth.authStateReady === 'function') {
    try {
      await Promise.race([
        auth.authStateReady(),
        new Promise((resolve) => {
          window.setTimeout(resolve, timeoutMs)
        }),
      ])
    } catch {
      // Fall back to a lightweight poll below.
    }
  }

  if (auth.currentUser) return auth.currentUser

  const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0)
  while (Date.now() < deadline) {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 100)
    })
    if (auth.currentUser) {
      return auth.currentUser
    }
  }

  return null
}

const buildGoogleAuthPayload = async (user = null) => {
  const idToken = String((await user?.getIdToken?.()) || '').trim()
  const email = String(user?.email || '').trim().toLowerCase()
  const uid = String(user?.uid || '').trim()
  const fullName = String(user?.displayName || '').trim()
  const parsedName = parseDisplayNameToParts(fullName)

  if (!idToken || !email) {
    return {
      ok: false,
      message: 'Google sign-in completed but account details are incomplete. Try another Google account.',
    }
  }

  return {
    ok: true,
    idToken,
    uid,
    email,
    fullName,
    firstName: parsedName.firstName,
    lastName: parsedName.lastName,
    otherNames: parsedName.otherNames,
    message: '',
  }
}

export const startGoogleSignInRedirect = async ({ intent = 'login' } = {}) => {
  const auth = getFirebaseAuth()
  logGoogleAuthDebug('start', {
    intent,
    hasFirebaseWebConfig,
    projectId: FIREBASE_PROJECT_ID,
    authDomain: FIREBASE_AUTH_DOMAIN,
    mode: SHOULD_USE_GOOGLE_POPUP_IN_DEV ? 'popup' : 'redirect',
  })
  if (!auth) {
    return {
      ok: false,
      message: 'Firebase Google sign-in is not configured. Set VITE_FIREBASE_WEB_API_KEY, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_AUTH_DOMAIN.',
    }
  }

  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  try {
    if (auth.currentUser) {
      await signOut(auth)
    }
    if (SHOULD_USE_GOOGLE_POPUP_IN_DEV) {
      const authResult = await signInWithPopup(auth, provider)
      const payload = await buildGoogleAuthPayload(authResult?.user || null)
      logGoogleAuthDebug('popup-result', {
        ok: payload.ok,
        email: payload.email,
        uid: payload.uid,
      })
      await signOut(auth).catch(() => {})
      setGoogleRedirectIntent('')
      return {
        ...payload,
        pendingRedirect: false,
      }
    }

    setGoogleRedirectIntent(intent)
    await signInWithRedirect(auth, provider)
    logGoogleAuthDebug('redirect-started', { intent })
    return {
      ok: true,
      pendingRedirect: true,
      message: 'Redirecting to Google sign-in...',
    }
  } catch (error) {
    logGoogleAuthDebug('start-failed', {
      code: String(error?.code || '').trim(),
      message: String(error?.message || '').trim(),
    })
    setGoogleRedirectIntent('')
    return {
      ok: false,
      code: String(error?.code || '').trim(),
      message: getGoogleAuthErrorMessage(error),
    }
  }
}

export const consumeGoogleSignInRedirectResult = async () => {
  const auth = getFirebaseAuth()
  const intent = getGoogleRedirectIntent()
  logGoogleAuthDebug('consume-start', { intent, hasAuth: Boolean(auth) })
  if (!auth) {
    return {
      ok: false,
      hasResult: false,
      intent,
      pendingRedirect: Boolean(intent),
      message: '',
    }
  }

  try {
    const authResult = await getRedirectResult(auth)
    const resolvedUser = authResult?.user || await waitForFirebaseCurrentUser(auth, intent ? 8000 : 0)
    if (!resolvedUser) {
      logGoogleAuthDebug('consume-empty', { intent })
      return {
        ok: false,
        hasResult: false,
        intent,
        pendingRedirect: Boolean(intent),
        message: '',
      }
    }

    const payload = await buildGoogleAuthPayload(resolvedUser)
    logGoogleAuthDebug('consume-result', {
      ok: payload.ok,
      email: payload.email,
      uid: payload.uid,
      intent,
    })
    await signOut(auth).catch(() => {})
    setGoogleRedirectIntent('')
    return {
      ...payload,
      hasResult: payload.ok,
      intent,
    }
  } catch (error) {
    logGoogleAuthDebug('consume-failed', {
      code: String(error?.code || '').trim(),
      message: String(error?.message || '').trim(),
      intent,
    })
    await signOut(auth).catch(() => {})
    setGoogleRedirectIntent('')
    return {
      ok: false,
      hasResult: Boolean(intent),
      intent,
      code: String(error?.code || '').trim(),
      message: getGoogleAuthErrorMessage(error),
    }
  }
}

export const inspectEmailVerificationCode = async (oobCode = '') => {
  const auth = getFirebaseAuth()
  const normalizedCode = String(oobCode || '').trim()
  if (!auth || !normalizedCode) {
    return {
      ok: false,
      email: '',
      message: 'Verification link expired. Please request a new one.',
    }
  }

  try {
    const action = await checkActionCode(auth, normalizedCode)
    return {
      ok: true,
      email: String(action?.data?.email || '').trim().toLowerCase(),
      message: '',
    }
  } catch (error) {
    return {
      ok: false,
      email: '',
      message: getActionCodeErrorMessage(error, 'Verification link expired. Please request a new one.'),
    }
  }
}

export const applyEmailVerificationCode = async (oobCode = '') => {
  const auth = getFirebaseAuth()
  const normalizedCode = String(oobCode || '').trim()
  if (!auth || !normalizedCode) {
    return {
      ok: false,
      message: 'Verification link expired. Please request a new one.',
    }
  }

  try {
    await applyActionCode(auth, normalizedCode)
    return {
      ok: true,
      message: 'Email verified successfully.',
    }
  } catch (error) {
    return {
      ok: false,
      message: getActionCodeErrorMessage(error, 'Verification link expired. Please request a new one.'),
    }
  }
}

export const inspectPasswordResetCode = async (oobCode = '') => {
  const auth = getFirebaseAuth()
  const normalizedCode = String(oobCode || '').trim()
  if (!auth || !normalizedCode) {
    return {
      ok: false,
      email: '',
      message: 'Reset link is invalid or expired.',
    }
  }

  try {
    const email = await verifyPasswordResetCode(auth, normalizedCode)
    return {
      ok: true,
      email: String(email || '').trim().toLowerCase(),
      message: '',
    }
  } catch (error) {
    return {
      ok: false,
      email: '',
      message: getActionCodeErrorMessage(error, 'Reset link is invalid or expired.'),
    }
  }
}

export const completePasswordResetWithCode = async (oobCode = '', newPassword = '') => {
  const auth = getFirebaseAuth()
  const normalizedCode = String(oobCode || '').trim()
  const normalizedPassword = String(newPassword || '')
  if (!auth || !normalizedCode || !normalizedPassword) {
    return {
      ok: false,
      message: 'Reset link is invalid or expired.',
    }
  }

  try {
    await confirmPasswordReset(auth, normalizedCode, normalizedPassword)
    return {
      ok: true,
      message: 'Your password has been updated successfully. You can now sign in.',
    }
  } catch (error) {
    const code = String(error?.code || '').trim().toLowerCase()
    if (code.includes('weak-password') || code.includes('password-does-not-meet-requirements')) {
      return {
        ok: false,
        message: 'Password does not meet security requirements.',
      }
    }
    return {
      ok: false,
      message: getActionCodeErrorMessage(error, 'Reset link is invalid or expired.'),
    }
  }
}
