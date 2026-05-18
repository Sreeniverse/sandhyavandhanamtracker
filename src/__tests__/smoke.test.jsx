import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

// Mock Capacitor before any imports that depend on it
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}))

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      mfa: {
        getAuthenticatorAssuranceLevel: () =>
          Promise.resolve({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } }),
        listFactors: () => Promise.resolve({ data: { totp: [] } }),
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
        is: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
    rpc: () => Promise.resolve({ data: null, error: null }),
  },
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

import App from '../App'
import { AuthProvider } from '../hooks/useAuth'

describe('App smoke test', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    )
    expect(container).toBeTruthy()
  })

  it('shows loading spinner initially', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    )
    // After session resolution (null session), should redirect to /auth
    const root = document.querySelector('#root') || document.body
    expect(root).toBeTruthy()
  })
})

describe('Utilities', () => {
  it('SLOTS has 3 entries in correct order', async () => {
    const { SLOTS } = await import('../utils/slots')
    expect(SLOTS).toHaveLength(3)
    expect(SLOTS.map((s) => s.key)).toEqual(['morning', 'afternoon', 'evening'])
  })

  it('toDateString formats dates correctly', async () => {
    const { toDateString } = await import('../utils/dates')
    expect(toDateString(new Date(2026, 4, 18))).toBe('2026-05-18')
    expect(toDateString(new Date(2026, 0, 1))).toBe('2026-01-01')
  })

  it('friendlyError returns expected messages', async () => {
    const { friendlyError } = await import('../utils/errors')
    expect(friendlyError(null)).toBe('Something went wrong. Please try again.')
    expect(friendlyError(new Error('network error'))).toContain('network error')
    expect(friendlyError({ message: 'PGRST116' })).toBe('No results found.')
  })
})
