let clientAudioContext = null
let hasPrimedClientNotificationAudio = false

const getAudioContext = () => {
  if (typeof window === 'undefined') return null
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (typeof AudioContextCtor !== 'function') return null
  if (!clientAudioContext) {
    clientAudioContext = new AudioContextCtor()
  }
  return clientAudioContext
}

const scheduleTone = (context, {
  offsetSeconds = 0,
  frequency = 932,
  durationSeconds = 0.1,
  gainValue = 0.04,
  type = 'triangle',
} = {}) => {
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()
  const startAt = context.currentTime + Math.max(0, offsetSeconds)
  const stopAt = startAt + Math.max(0.05, durationSeconds)

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startAt)
  gainNode.gain.setValueAtTime(0.0001, startAt)
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainValue), startAt + 0.012)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt)

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)
  oscillator.start(startAt)
  oscillator.stop(stopAt)
}

export const playClientNotificationSound = () => {
  const context = getAudioContext()
  if (!context) return false

  try {
    if (context.state === 'suspended' && typeof context.resume === 'function') {
      void context.resume().catch(() => {})
    }
    scheduleTone(context, { offsetSeconds: 0, frequency: 932, durationSeconds: 0.09, gainValue: 0.04, type: 'triangle' })
    scheduleTone(context, { offsetSeconds: 0.11, frequency: 1174, durationSeconds: 0.12, gainValue: 0.035, type: 'sine' })
    return true
  } catch {
    return false
  }
}

export const primeClientNotificationSound = () => {
  const context = getAudioContext()
  if (!context) return false

  try {
    if (context.state === 'suspended' && typeof context.resume === 'function') {
      void context.resume().catch(() => {})
    }
    // Near-silent primer tone to unlock autoplay restrictions after a user gesture.
    scheduleTone(context, { offsetSeconds: 0, frequency: 520, durationSeconds: 0.03, gainValue: 0.0002, type: 'sine' })
    hasPrimedClientNotificationAudio = true
    return true
  } catch {
    return false
  }
}

export const isClientNotificationSoundPrimed = () => hasPrimedClientNotificationAudio
