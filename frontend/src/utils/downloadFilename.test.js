import { describe, expect, it } from 'vitest'
import { buildClientDownloadFilename } from './downloadFilename'

describe('buildClientDownloadFilename', () => {
  it('adds business name prefix when provided', () => {
    const filename = buildClientDownloadFilename({
      businessName: 'Kiamina Limited',
      fileName: 'march-report.pdf',
    })
    expect(filename).toBe('Kiamina Limited - march-report.pdf')
  })

  it('falls back to fallbackFileName when fileName is empty', () => {
    const filename = buildClientDownloadFilename({
      businessName: '',
      fileName: '   ',
      fallbackFileName: 'document',
    })
    expect(filename).toBe('document')
  })

  it('sanitizes reserved filename characters', () => {
    const filename = buildClientDownloadFilename({
      businessName: 'Kiamina/West*',
      fileName: 'invoice?:2026.csv',
    })
    expect(filename).toBe('Kiamina West - invoice 2026.csv')
    expect(filename).not.toMatch(/[<>:"/\\|?*]/)
  })
})
