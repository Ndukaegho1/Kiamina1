const DOJAH_BASE_URL = (import.meta.env.VITE_DOJAH_BASE_URL || 'https://api.dojah.io').replace(/\/+$/, '')
const DOJAH_APP_ID = String(import.meta.env.VITE_DOJAH_APP_ID || '').trim()
const DOJAH_AUTHORIZATION = String(
  import.meta.env.VITE_DOJAH_PUBLIC_KEY
  || import.meta.env.VITE_DOJAH_AUTHORIZATION
  || '',
).trim()
const DOJAH_SIMULATION_MODE = String(import.meta.env.VITE_DOJAH_SIMULATION || '').trim().toLowerCase()

const normalizeIdType = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return ''
  if (normalized.includes('nin')) return 'nin'
  if (normalized.includes('voter')) return 'vin'
  if (normalized.includes('passport')) return 'passport'
  if (normalized.includes('driver')) return 'dl'
  return ''
}

const toNameTokens = (value = '') => (
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
)

const toNumberToken = (value = '') => (
  String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
)

const isTokenSubset = (subset = [], superset = []) => {
  if (!subset.length) return false
  const supersetSet = new Set(superset)
  return subset.every((token) => supersetSet.has(token))
}

const doesNameMatchOrderIndependent = (expectedName = '', candidateName = '') => {
  const expectedTokens = [...new Set(toNameTokens(expectedName))]
  const candidateTokens = [...new Set(toNameTokens(candidateName))]
  if (!expectedTokens.length || !candidateTokens.length) return false
  if (expectedTokens.join('|') === candidateTokens.join('|')) return true
  return isTokenSubset(expectedTokens, candidateTokens) || isTokenSubset(candidateTokens, expectedTokens)
}

const toDisplayName = (entity = {}) => {
  const fromSingleFields = [
    entity.full_name,
    entity.fullName,
    entity.customer_name,
    entity.name,
  ].find((value) => String(value || '').trim())
  if (fromSingleFields) return String(fromSingleFields).trim()

  const composed = [
    [entity.first_name, entity.middle_name, entity.last_name],
    [entity.firstName, entity.middleName, entity.lastName],
    [entity.first_name, entity.other_names, entity.surname],
    [entity.surname, entity.first_name, entity.other_names],
  ]
    .map((parts) => parts.filter((part) => String(part || '').trim()).join(' ').trim())
    .find((value) => Boolean(value))

  return composed || ''
}

const extractReturnedCardNumber = (entity = {}, normalizedIdType = '') => {
  if (normalizedIdType === 'nin') {
    return entity.nin || entity.id_number || entity.idNumber || ''
  }
  if (normalizedIdType === 'vin') {
    return entity.vin || entity.voter_identification_number || entity.voter_id || ''
  }
  if (normalizedIdType === 'passport') {
    return entity.passport_number || entity.passportNumber || entity.id_number || ''
  }
  if (normalizedIdType === 'dl') {
    return entity.license_number || entity.licenseNo || entity.license_no || entity.id_number || ''
  }
  return entity.id_number || entity.idNumber || ''
}

const buildRequestForIdType = ({ idType = '', cardNumber = '', fullName = '' } = {}) => {
  const normalizedIdType = normalizeIdType(idType)
  const normalizedCardNumber = String(cardNumber || '').trim()
  const tokens = toNameTokens(fullName)
  const surname = tokens[tokens.length - 1] || ''

  if (normalizedIdType === 'nin') {
    const url = new URL(`${DOJAH_BASE_URL}/api/v1/kyc/nin`)
    url.searchParams.set('nin', normalizedCardNumber)
    return { idType: normalizedIdType, url }
  }
  if (normalizedIdType === 'vin') {
    const url = new URL(`${DOJAH_BASE_URL}/api/v1/kyc/vin`)
    url.searchParams.set('vin', normalizedCardNumber)
    return { idType: normalizedIdType, url }
  }
  if (normalizedIdType === 'passport') {
    const url = new URL(`${DOJAH_BASE_URL}/api/v1/kyc/passport`)
    url.searchParams.set('passport_number', normalizedCardNumber)
    if (surname) url.searchParams.set('surname', surname)
    return { idType: normalizedIdType, url }
  }
  if (normalizedIdType === 'dl') {
    const url = new URL(`${DOJAH_BASE_URL}/api/v1/kyc/dl`)
    url.searchParams.set('license_number', normalizedCardNumber)
    return { idType: normalizedIdType, url }
  }
  return null
}

const parsePayloadEntity = (payload = {}) => {
  if (!payload || typeof payload !== 'object') return {}
  if (payload.entity && typeof payload.entity === 'object') return payload.entity
  if (payload.data && typeof payload.data === 'object') {
    if (payload.data.entity && typeof payload.data.entity === 'object') return payload.data.entity
    return payload.data
  }
  return {}
}

const shouldUseSimulation = () => (
  DOJAH_SIMULATION_MODE === 'true'
  || (
    DOJAH_SIMULATION_MODE !== 'false'
    && (!DOJAH_APP_ID || !DOJAH_AUTHORIZATION)
  )
)

const runSimulatedVerification = ({
  fullName = '',
  idType = '',
  cardNumber = '',
} = {}) => {
  const normalizedFullName = String(fullName || '').trim()
  const normalizedCardNumber = String(cardNumber || '').trim()
  const request = buildRequestForIdType({
    idType,
    cardNumber: normalizedCardNumber,
    fullName: normalizedFullName,
  })
  if (!request) {
    return {
      ok: false,
      message: 'Unsupported government ID type.',
      provider: 'simulation',
    }
  }
  if (!normalizedFullName || !normalizedCardNumber) {
    return {
      ok: false,
      message: 'Full name and ID card number are required.',
      provider: 'simulation',
    }
  }
  const normalizedToken = toNumberToken(normalizedCardNumber)
  if (!normalizedToken) {
    return {
      ok: false,
      message: 'Enter a valid ID card number.',
      provider: 'simulation',
    }
  }
  const lastCharacter = normalizedToken.slice(-1)
  const failByOddNumber = ['1', '3', '5', '7', '9'].includes(lastCharacter)
  const failByKeyword = normalizedToken.includes('fail')
  if (failByOddNumber || failByKeyword) {
    return {
      ok: false,
      message: 'Verification failed. Please re-upload.',
      provider: 'simulation',
    }
  }
  return {
    ok: true,
    message: 'Identity verified successfully.',
    provider: 'simulation',
    verifiedName: normalizedFullName,
  }
}

export const verifyIdentityWithDojah = async ({
  fullName = '',
  idType = '',
  cardNumber = '',
} = {}) => {
  if (shouldUseSimulation()) return runSimulatedVerification({ fullName, idType, cardNumber })

  const normalizedFullName = String(fullName || '').trim()
  const normalizedCardNumber = String(cardNumber || '').trim()
  const request = buildRequestForIdType({ idType, cardNumber: normalizedCardNumber, fullName: normalizedFullName })
  if (!request) {
    return {
      ok: false,
      message: 'Unsupported government ID type.',
      provider: 'dojah',
    }
  }
  if (!normalizedFullName || !normalizedCardNumber) {
    return {
      ok: false,
      message: 'Full name and ID card number are required.',
      provider: 'dojah',
    }
  }

  try {
    const response = await fetch(request.url.toString(), {
      method: 'GET',
      headers: {
        AppId: DOJAH_APP_ID,
        Authorization: DOJAH_AUTHORIZATION,
      },
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return {
        ok: false,
        message: String(payload?.error || payload?.message || 'Identity verification failed.').trim(),
        provider: 'dojah',
      }
    }

    const entity = parsePayloadEntity(payload)
    const verifiedName = toDisplayName(entity)
    const returnedCardNumber = extractReturnedCardNumber(entity, request.idType)
    const namesMatch = doesNameMatchOrderIndependent(normalizedFullName, verifiedName)
    const submittedCardNumber = toNumberToken(normalizedCardNumber)
    const responseCardNumber = toNumberToken(returnedCardNumber)
    const cardNumberMatches = !responseCardNumber || responseCardNumber === submittedCardNumber

    if (!namesMatch || !cardNumberMatches) {
      return {
        ok: false,
        message: 'Verification failed. Full name or ID card number did not match.',
        provider: 'dojah',
        verifiedName,
      }
    }

    return {
      ok: true,
      message: 'Identity verified successfully.',
      provider: 'dojah',
      verifiedName,
      payload,
    }
  } catch {
    return {
      ok: false,
      message: 'Unable to verify identity right now. Please try again.',
      provider: 'dojah',
    }
  }
}
