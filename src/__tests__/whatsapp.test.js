import { describe, it, expect, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}))

import { buildShareText, whatsappShareUrl } from '../utils/whatsapp'
import { SLOTS } from '../utils/slots'

describe('whatsapp share', () => {
  it('builds share text with ritual name and date', () => {
    const text = buildShareText(SLOTS[0], 'Thursday, October 22')
    expect(text).toContain('Pratah Sandhyavandhanam')
    expect(text).toContain('Thursday, October 22')
  })

  it('encodes text into a wa.me url', () => {
    expect(whatsappShareUrl('a b&c')).toBe('https://wa.me/?text=a%20b%26c')
  })
})
