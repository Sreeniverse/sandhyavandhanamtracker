import { describe, it, expect, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}))

import { buildShareText, whatsappShareUrl } from '../utils/whatsapp'
import { SLOTS } from '../utils/slots'

describe('whatsapp share', () => {
  it('builds share text with person, ritual name and date', () => {
    expect(buildShareText('Aditya', SLOTS[0], 'Thursday, October 22'))
      .toBe('Aditya - Pratah Sandhyavandhanam done on Thursday, October 22. 🙏🏻')
    expect(buildShareText('Aditya', SLOTS[1], 'Thursday, October 22'))
      .toBe('Aditya - Madhyanikam done on Thursday, October 22. 🙏🏻')
  })

  it('encodes text into a wa.me url', () => {
    expect(whatsappShareUrl('a b&c')).toBe('https://wa.me/?text=a%20b%26c')
  })
})
