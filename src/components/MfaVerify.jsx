import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../hooks/useAuth'

export function MfaVerify() {
  const { setNeedsMfa } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setError('')
    setLoading(true)

    try {
      const factors = await supabase.auth.mfa.listFactors()
      if (factors.error) throw factors.error

      const totpFactor = factors.data.totp[0]
      if (!totpFactor) throw new Error('No authenticator found. Please contact support.')

      const challenge = await supabase.auth.mfa.challenge({ factorId: totpFactor.id })
      if (challenge.error) throw challenge.error

      const verify = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.data.id,
        code: code.trim(),
      })
      if (verify.error) throw verify.error

      setNeedsMfa(false)
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-6 md:p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔐</span>
        </div>
        <h2 className="text-xl font-extrabold font-syne text-ink mb-1">Two-Factor Auth</h2>
        <p className="text-sm text-gray-400 mb-5">Enter the code from your authenticator app to continue.</p>

        {error && <div className="bg-red-50 border border-red-200 text-saffron-700 px-3 py-2 rounded-[10px] text-sm mb-4">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            className="w-full px-4 py-3 text-center text-lg font-syne font-bold tracking-[0.3em] border border-warm rounded-[10px] bg-white text-ink outline-none focus:border-saffron-500 focus:shadow-[0_0_0_3px_rgba(255,153,51,0.12)]]"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
          <button
            className="w-full mt-4 py-3 bg-ink text-white border-none rounded-[10px] font-syne font-bold text-sm cursor-pointer tracking-wide hover:bg-[#222] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            type="submit"
            disabled={loading || code.length < 6}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      </div>
    </div>
  )
}

export function MfaEnroll({ onDone }) {
  const [step, setStep] = useState('loading') // loading, qr, verify
  const [factorId, setFactorId] = useState('')
  const [qr, setQr] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.mfa.enroll({ factorType: 'totp' }).then(({ data, error }) => {
      if (error) {
        setError(error.message)
        setStep('error')
        return
      }
      setFactorId(data.id)
      setQr(data.totp.qr_code)
      setSecret(data.totp.secret)
      setStep('qr')
    })
  }, [])

  const handleVerify = async () => {
    if (!code.trim() || code.trim().length < 6) return
    setError('')
    setLoading(true)

    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId })
      if (challenge.error) throw challenge.error

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      })
      if (verify.error) throw verify.error

      onDone?.()
    } catch (err) {
      setError(err.message || 'Verification failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'loading') {
    return <div className="text-center py-6"><div className="w-6 h-6 border-2 border-warm border-t-saffron-600 rounded-full animate-spin mx-auto" /></div>
  }

  if (step === 'error') {
    return <div className="text-center text-sm text-red-600 py-4">{error}</div>
  }

  return (
    <div>
      {step === 'qr' && (
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-3">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
          <div className="flex justify-center mb-3">
            <img src={qr} alt="QR Code" className="w-48 h-48" />
          </div>
          <details className="text-xs text-gray-400 mb-4">
            <summary className="cursor-pointer font-syne font-semibold">Can't scan? Enter manually</summary>
            <p className="mt-1 font-mono bg-cream p-2 rounded break-all select-all">{secret}</p>
          </details>
          <p className="text-sm text-gray-500 mb-3">Then enter the 6-digit code below:</p>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-saffron-700 px-3 py-2 rounded-[10px] text-sm mb-3">{error}</div>}

      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2.5 text-center font-syne font-bold tracking-[0.2em] border border-warm rounded-[10px] bg-white text-ink outline-none focus:border-saffron-500"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
        <button
          className="px-5 py-2.5 bg-ink text-white border-none rounded-[10px] font-syne font-bold text-sm cursor-pointer tracking-wide hover:bg-[#222] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          onClick={handleVerify}
          disabled={loading || code.length < 6}
        >
          {loading ? '...' : 'Verify'}
        </button>
      </div>
    </div>
  )
}