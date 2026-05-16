import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../supabase'
import { friendlyError } from '../utils/errors'

function validate(form, tab) {
  const errors = {}
  if (!form.email) {
    errors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!form.password) {
    errors.password = 'Password is required.'
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  }
  if (tab === 'register' && !form.name.trim()) {
    errors.name = 'Name is required.'
  }
  return errors
}

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle, signupDone, setSignupDone } = useAuth()
  const [tab, setTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [touched, setTouched] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }))

  const errors = validate(form, tab)

  const handleSubmit = async () => {
    const allTouched = { name: true, email: true, password: true }
    setTouched(allTouched)
    if (Object.keys(errors).length > 0) return
    setError('')
    setLoading(true)
    try {
      if (tab === 'login') {
        await signIn(form.email, form.password)
      } else {
        await signUp(form.email, form.password, form.name)
      }
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  const handleResetPassword = async () => {
    setResetMsg('')
    setResetLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + '/auth',
      })
      if (error) throw error
      setResetMsg('Check your email for a password reset link.')
    } catch (err) {
      setResetMsg(friendlyError(err))
    } finally {
      setResetLoading(false)
    }
  }

  const fieldError = (field) => touched[field] ? errors[field] : null

  const inputClass = (field) =>
    `w-full px-3 py-3 border rounded-[10px] bg-white font-dm text-sm text-ink outline-none transition-all focus:border-saffron-500 focus:shadow-[0_0_0_3px_rgba(255,153,51,0.12)] ${
      fieldError(field) ? 'border-red-400 bg-red-50/30' : 'border-warm'
    }`

  if (showReset) {
    return (
      <div className="min-h-screen grid md:grid-cols-2">
        <div className="hidden md:flex bg-ink flex-col justify-end p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(200,68,26,0.3)_0%,transparent_60%),radial-gradient(ellipse_at_80%_80%,rgba(124,58,237,0.2)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:28px_28px]" />
          <div className="relative z-10">
            <h1 className="text-[1.85rem] text-white font-extrabold leading-tight tracking-tight mb-5 font-syne">Reset your<br /><em className="not-italic text-saffron-400">password</em></h1>
            <p className="text-white/50 text-base max-w-[360px]">We'll send you a link to set a new password.</p>
          </div>
        </div>
        <div className="flex flex-col justify-center px-6 md:px-12 py-8 md:py-0 bg-paper">
          <div className="max-w-[380px] mx-auto w-full">
            <h2 className="text-2xl font-extrabold font-syne tracking-tight mb-1">Forgot Password?</h2>
            <p className="text-gray-400 text-sm mb-5">Enter your email and we'll send you a reset link.</p>
            {resetMsg && <div className="bg-saffron-50 border border-saffron-200 text-saffron-700 px-3.5 py-2.5 rounded-[10px] text-sm mb-4">{resetMsg}</div>}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 font-syne uppercase tracking-wider">Email Address</label>
              <input className={inputClass('email')} type="email" placeholder="you@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
            </div>
            <button className="w-full py-3.5 bg-ink text-white border-none rounded-[10px] font-syne font-bold text-sm cursor-pointer tracking-wide hover:bg-[#222] active:scale-[0.99] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed" onClick={handleResetPassword} disabled={resetLoading || !resetEmail}>
              {resetLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <button className="w-full mt-3 py-2.5 bg-transparent text-gray-500 border-none rounded-[10px] font-syne font-semibold text-sm cursor-pointer hover:text-ink transition-colors" onClick={() => { setShowReset(false); setResetMsg('') }}>
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Hero */}
      <div className="hidden md:flex bg-ink flex-col justify-end p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(200,68,26,0.3)_0%,transparent_60%),radial-gradient(ellipse_at_80%_80%,rgba(124,58,237,0.2)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:28px_28px]" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/12 text-white/75 px-3.5 py-1.5 rounded-full text-xs tracking-widest uppercase font-syne mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-saffron-400 block animate-pulse" />Daily Sandhyavandhanam Tracker
          </div>
          <img src="/peryava.jpeg" alt="Peryava" className="w-[120px] h-auto rounded-lg mb-6 border-2 border-white/15" />
          <h1 className="text-[1.85rem] text-white font-extrabold leading-tight tracking-tight mb-5 font-syne">Build habits.<br /><em className="not-italic text-saffron-400">Track</em> your<br />daily Sandhyavandanam.</h1>
        </div>
      </div>

      {/* Mobile hero */}
      <div className="md:hidden bg-gradient-to-b from-ink to-[#1a1a1a] py-10 px-6 text-center relative overflow-hidden">
        <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 w-[260px] h-[260px] rounded-full bg-[radial-gradient(circle,rgba(243,124,2,0.2)_0%,transparent_70%)]" />
        <div className="relative">
          <img src="/peryava.jpeg" alt="Peryava" className="w-24 h-auto rounded-lg mx-auto mb-4 border-2 border-white/15" />
          <h1 className="text-[1.4rem] text-white font-extrabold leading-tight tracking-tight font-syne">Build habits.<br /><em className="not-italic text-saffron-400">Track</em> your<br />daily Sandhyavandanam.</h1>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center px-6 md:px-12 py-8 md:py-0 bg-paper">
        <div className="flex items-center mb-8 md:mb-10">
          <img src="/logo.png" alt="Asthika Samaj" className="h-10" />
        </div>
        <div className="max-w-[380px] mx-auto w-full">
          {signupDone ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-saffron-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📧</span>
              </div>
              <h2 className="text-xl font-extrabold font-syne tracking-tight mb-2">Check Your Email</h2>
              <p className="text-sm text-gray-400 mb-1">We sent a verification link to</p>
              <p className="text-sm font-semibold text-ink mb-5">{form.email}</p>
              <p className="text-xs text-gray-400 mb-6">Click the link in the email to verify your account, then sign in. If you don't see it, check your spam folder.</p>
              <button
                className="px-6 py-2.5 bg-ink text-white rounded-[10px] font-syne font-bold text-sm cursor-pointer hover:bg-[#222] transition-colors"
                onClick={() => { setSignupDone(false); setTab('login'); setForm({ name: '', email: '', password: '' }); setError('') }}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
          <div className="flex bg-cream rounded-[10px] p-1 mb-6">
            <button className={`flex-1 py-2.5 rounded-lg font-syne font-semibold text-sm cursor-pointer transition-all ${tab === 'login' ? 'bg-white text-ink shadow-sm' : 'text-gray-400 bg-transparent'}`} onClick={() => { setTab('login'); setError(''); setTouched({}) }}>Sign In</button>
            <button className={`flex-1 py-2.5 rounded-lg font-syne font-semibold text-sm cursor-pointer transition-all ${tab === 'register' ? 'bg-white text-ink shadow-sm' : 'text-gray-400 bg-transparent'}`} onClick={() => { setTab('register'); setError(''); setTouched({}) }}>Create Account</button>
          </div>

          <h2 className="text-2xl md:text-[1.8rem] font-extrabold font-syne tracking-tight mb-1">{tab === 'login' ? 'Welcome back' : 'Get started'}</h2>
          <p className="text-gray-400 text-sm mb-5">{tab === 'login' ? 'Sign in to your account to continue.' : 'Create your account - it takes 30 seconds.'}</p>

          {error && <div className="bg-red-50 border border-red-200 text-saffron-700 px-3.5 py-2.5 rounded-[10px] text-sm mb-4">{error}</div>}

          {/* Google SSO */}
          <button onClick={handleGoogle} className="w-full py-3 border border-warm rounded-[10px] bg-white font-syne font-semibold text-sm cursor-pointer hover:bg-cream transition-colors flex items-center justify-center gap-2.5 mb-4">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-warm" />
            <span className="text-[0.65rem] text-gray-400 uppercase tracking-widest font-syne">or</span>
            <div className="flex-1 h-px bg-warm" />
          </div>

          {tab === 'register' && (
            <div className="mb-3">
              <label htmlFor="name" className="block text-xs font-semibold text-gray-500 mb-1.5 font-syne uppercase tracking-wider">Your Name</label>
              <input id="name" className={inputClass('name')} type="text" placeholder="Alex Johnson" value={form.name} onChange={set('name')} onBlur={blur('name')} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
              {fieldError('name') && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
          )}

          <div className="mb-3">
            <label htmlFor="email" className="block text-xs font-semibold text-gray-500 mb-1.5 font-syne uppercase tracking-wider">Email Address</label>
            <input id="email" className={inputClass('email')} type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} onBlur={blur('email')} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
            {fieldError('email') && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-xs font-semibold text-gray-500 mb-1.5 font-syne uppercase tracking-wider">Password</label>
            <div className="relative">
              <input id="password" className={`${inputClass('password')} pr-10`} type={showPassword ? 'text' : 'password'} placeholder={tab === 'register' ? 'Min 8 characters' : '••••••••'} value={form.password} onChange={set('password')} onBlur={blur('password')} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-syne font-semibold cursor-pointer bg-transparent border-0" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {fieldError('password') && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          {tab === 'login' && (
            <button type="button" className="text-xs text-saffron-600 font-syne font-semibold cursor-pointer bg-transparent border-0 mb-3 hover:text-saffron-700" onClick={() => { setShowReset(true); setResetEmail(form.email) }}>Forgot password?</button>
          )}

          <button className="w-full py-3.5 bg-ink text-white border-none rounded-[10px] font-syne font-bold text-sm cursor-pointer tracking-wide hover:bg-[#222] active:scale-[0.99] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Please wait...' : tab === 'login' ? 'Sign In →' : 'Create Account →'}
          </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}