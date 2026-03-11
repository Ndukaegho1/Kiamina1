import { describe, expect, it } from 'vitest'
import { getScopedStorageKey, normalizeEmailForStorage } from './storage'

describe('storage helpers', () => {
  it('normalizes email for storage lookups', () => {
    expect(normalizeEmailForStorage('  USER@Example.COM  ')).toBe('user@example.com')
  })

  it('builds scoped key when email exists', () => {
    expect(getScopedStorageKey('kiaminaClientDocuments', 'User@Example.com')).toBe(
      'kiaminaClientDocuments:user@example.com',
    )
  })

  it('returns base key when email is empty', () => {
    expect(getScopedStorageKey('kiaminaClientDocuments', '')).toBe('kiaminaClientDocuments')
  })
})
