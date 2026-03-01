let sharedAudioContext = null
let hasPrimedNotificationAudio = false
export const SUPPORT_NOTIFICATION_INITIAL_DELAY_MS = 5000

const getAudioContext = () => {
  if (typeof window === 'undefined') return null
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (typeof AudioContextCtor !== 'function') return null
  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextCtor()
  }
  return sharedAudioContext
}

const scheduleTone = (context, {
  offsetSeconds = 0,
  frequency = 880,
  durationSeconds = 0.12,
  gainValue = 0.05,
} = {}) => {
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()
  const startAt = context.currentTime + Math.max(0, offsetSeconds)
  const stopAt = startAt + Math.max(0.05, durationSeconds)

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, startAt)
  gainNode.gain.setValueAtTime(0.0001, startAt)
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainValue), startAt + 0.015)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt)

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)
  oscillator.start(startAt)
  oscillator.stop(stopAt)
}

export const playSupportNotificationSound = () => {
  const context = getAudioContext()
  if (!context) return false

  try {
    if (context.state === 'suspended' && typeof context.resume === 'function') {
      void context.resume().catch(() => {})
    }
    scheduleTone(context, { offsetSeconds: 0, frequency: 880, durationSeconds: 0.11, gainValue: 0.05 })
    scheduleTone(context, { offsetSeconds: 0.14, frequency: 660, durationSeconds: 0.13, gainValue: 0.045 })
    return true
  } catch {
    return false
  }
}

export const primeSupportNotificationSound = () => {
  const context = getAudioContext()
  if (!context) return false

  try {
    if (context.state === 'suspended' && typeof context.resume === 'function') {
      void context.resume().catch(() => {})
    }
    // Near-silent primer tone to unlock autoplay restrictions after a user gesture.
    scheduleTone(context, { offsetSeconds: 0, frequency: 420, durationSeconds: 0.03, gainValue: 0.0002 })
    hasPrimedNotificationAudio = true
    return true
  } catch {
    return false
  }
}

export const isSupportNotificationSoundPrimed = () => hasPrimedNotificationAudio
