const NETWORK_BUCKETS = ['slow-2g', '2g', '3g', '4g']

const NETWORK_DURATION_MAP = {
  'dashboard-refresh': {
    'slow-2g': 5000,
    '2g': 3600,
    '3g': 2300,
    '4g': 1200,
    default: 1700,
  },
  search: {
    'slow-2g': 1400,
    '2g': 1050,
    '3g': 760,
    '4g': 520,
    default: 720,
  },
  'slow-threshold': {
    'slow-2g': 450,
    '2g': 600,
    '3g': 750,
    '4g': 900,
    default: 800,
  },
  'runtime-min-visible': {
    'slow-2g': 1100,
    '2g': 900,
    '3g': 700,
    '4g': 520,
    default: 650,
  },
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const normalizeEffectiveType = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase()
  if (NETWORK_BUCKETS.includes(normalized)) return normalized
  return ''
}

export const getNetworkConnectionSnapshot = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      effectiveType: '',
      downlink: 0,
      rtt: 0,
      saveData: false,
    }
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  const downlink = Number(connection?.downlink || 0)
  const rtt = Number(connection?.rtt || 0)

  return {
    effectiveType: normalizeEffectiveType(connection?.effectiveType || ''),
    downlink: Number.isFinite(downlink) ? downlink : 0,
    rtt: Number.isFinite(rtt) ? rtt : 0,
    saveData: Boolean(connection?.saveData),
  }
}

const resolveBaseDuration = (context = 'search', effectiveType = '') => {
  const contextMap = NETWORK_DURATION_MAP[context] || NETWORK_DURATION_MAP.search
  return contextMap[effectiveType] || contextMap.default
}

const applyConnectionAdjustments = (duration, snapshot = {}, context = 'search') => {
  let adjusted = Number(duration || 0)
  const downlink = Number(snapshot?.downlink || 0)
  const rtt = Number(snapshot?.rtt || 0)

  if (downlink > 0) {
    if (downlink < 0.7) adjusted += 700
    else if (downlink < 1.4) adjusted += 350
    else if (downlink > 5 && context !== 'dashboard-refresh') adjusted -= 120
  }

  if (rtt > 0) {
    if (rtt > 900) adjusted += 650
    else if (rtt > 500) adjusted += 280
    else if (rtt < 120) adjusted -= 90
  }

  if (snapshot?.saveData) adjusted += 420

  return adjusted
}

export const getNetworkAwareDurationMs = (context = 'search') => {
  const snapshot = getNetworkConnectionSnapshot()
  const baseDuration = resolveBaseDuration(context, snapshot.effectiveType)
  const adjusted = applyConnectionAdjustments(baseDuration, snapshot, context)
  if (context === 'dashboard-refresh') return clamp(Math.round(adjusted), 900, 6500)
  if (context === 'slow-threshold') return clamp(Math.round(adjusted), 300, 1500)
  if (context === 'runtime-min-visible') return clamp(Math.round(adjusted), 350, 1600)
  return clamp(Math.round(adjusted), 300, 2200)
}

export const isPageReloadNavigation = () => {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return false
  const entries = performance.getEntriesByType('navigation')
  const firstEntry = Array.isArray(entries) && entries.length > 0 ? entries[0] : null
  if (firstEntry?.type) return firstEntry.type === 'reload'
  try {
    return performance.navigation?.type === 1
  } catch {
    return false
  }
}
