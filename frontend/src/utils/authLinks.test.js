import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildClientResetPasswordLink } from './authLinks'

describe('buildClientResetPasswordLink', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('replaces {email} placeholder when configured', () => {
    vi.stubEnv('VITE_CLIENT_RESET_PASSWORD_URL', 'https://portal.example.com/reset/{email}')
    const link = buildClientResetPasswordLink('User+One@Example.com')
    expect(link).toBe('https://portal.example.com/reset/user%2Bone%40example.com')
  })

  it('appends reset query params for non-template urls', () => {
    vi.stubEnv('VITE_CLIENT_RESET_PASSWORD_URL', 'https://portal.example.com/login')
    const link = buildClientResetPasswordLink('client@example.com')
    expect(link).toBe('https://portal.example.com/login?mode=reset-password&email=client%40example.com')
  })

  it('uses /login fallback when env is unset', () => {
    vi.stubEnv('VITE_CLIENT_RESET_PASSWORD_URL', '')
    const link = buildClientResetPasswordLink('')
    expect(link).toBe('http://localhost/login?mode=reset-password')
  })
})
