import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useActivities } from '../hooks/useActivities'
import { useStats } from '../hooks/useStats'
import { useNotifications } from '../hooks/useNotifications'
import { SLOTS } from '../utils/slots'
import { supabase } from '../supabase'
import { MfaEnroll } from './MfaVerify'

export default function ProfilePage() {
  const { user, updateProfile, deleteAccount } = useAuth()
  const { history } = useActivities()
  const stats = useStats(history)
  const { enabled: notifEnabled, loading: notifLoading, error: notifError, supported: notifSupported, toggle: toggleNotif } = useNotifications(user)
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [mfaEnrolled, setMfaEnrolled] = useState(false)
  const [mfaLoading, setMfaLoading] = useState(true)
  const [showEnroll, setShowEnroll] = useState(false)

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const hasTotp = data?.totp?.some(f => f.status === 'verified')
      setMfaEnrolled(!!hasTotp)
      setMfaLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() })
      setSaveMsg('Saved!')
      setTimeout(() => setSaveMsg(''), 2000)
    } catch (err) {
      setSaveMsg(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteAccount()
    } catch (err) {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleUnenrollMfa = async () => {
    const { data } = await supabase.auth.mfa.listFactors()
    const totpFactor = data?.totp?.find(f => f.status === 'verified')
    if (totpFactor) {
      await supabase.auth.mfa.unenroll({ factorId: totpFactor.id })
      await supabase.auth.refreshSession()
      setMfaEnrolled(false)
    }
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6 md:py-10">
      <div className="text-xl md:text-[2rem] font-extrabold tracking-tight font-syne mb-5 md:mb-8">Profile & Settings</div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {/* Profile card */}
        <div className="bg-white rounded-2xl md:rounded-[16px] p-5 md:p-6 shadow-md">
          <div className="text-[0.75rem] md:text-xs uppercase tracking-widest text-gray-400 font-syne font-semibold mb-4">Your Profile</div>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center text-white font-syne text-xl md:text-2xl font-extrabold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold font-syne">{user?.name}</h3>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs md:text-[0.7rem] font-semibold text-gray-500 mb-1 font-syne uppercase tracking-wider">Display Name</label>
            <input className="w-full px-3 py-2.5 border border-warm rounded-[10px] bg-white font-dm text-sm text-ink outline-none focus:border-saffron-500" type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="block text-xs md:text-[0.7rem] font-semibold text-gray-500 mb-1 font-syne uppercase tracking-wider">Email Address</label>
            <input className="w-full px-3 py-2.5 border border-warm rounded-[10px] bg-paper font-dm text-sm text-ink outline-none" type="email" defaultValue={user?.email} disabled />
          </div>
          <div className="mb-3">
            <label className="block text-xs md:text-[0.7rem] font-semibold text-gray-500 mb-1 font-syne uppercase tracking-wider">Phone Number</label>
            <input className="w-full px-3 py-2.5 border border-warm rounded-[10px] bg-white font-dm text-sm text-ink outline-none focus:border-saffron-500" type="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button className="px-6 py-2.5 bg-ink text-white border-none rounded-full font-syne font-bold text-sm cursor-pointer tracking-wide hover:bg-[#222] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {saveMsg && <span className={`text-sm font-syne font-semibold ${saveMsg === 'Saved!' ? 'text-success' : 'text-red-600'}`}>{saveMsg}</span>}
          </div>
        </div>

        {/* Consistency Goals */}
        <div className="bg-white rounded-2xl md:rounded-[16px] p-5 md:p-6 shadow-md">
          <div className="text-[0.75rem] md:text-xs uppercase tracking-widest text-gray-400 font-syne font-semibold mb-4">30-Day Consistency</div>
          <div className="flex gap-4 md:gap-6 justify-center">
            {SLOTS.map((slot) => (
              <div key={slot.key} className="text-center">
                <div className={`ring ring-sm md:ring-lg ${slot.color}`} style={{ '--pct': `${stats.slotConsistency[slot.key] || 0}%` }}>
                  <div className="ring-core">
                    <span className="ring-inner">{stats.slotConsistency[slot.key] || 0}%</span>
                  </div>
                </div>
                <div className="text-[0.6rem] md:text-[0.65rem] text-gray-400 uppercase tracking-wider font-syne mt-1">{slot.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Security - 2FA */}
        <div className="bg-white rounded-2xl md:rounded-[16px] shadow-md overflow-hidden">
          <div className="text-[0.75rem] md:text-xs uppercase tracking-widest text-gray-400 font-syne font-semibold p-4 md:px-6 py-3 bg-cream">Security</div>
          <div className="p-4 md:p-6">
            {!mfaLoading && (
              mfaEnrolled ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold">Authenticator App</div>
                      <div className="text-xs text-success font-syne font-semibold mt-0.5">Enabled</div>
                    </div>
                    <button onClick={handleUnenrollMfa} className="px-4 py-2 border border-red-300 text-red-600 rounded-[10px] font-syne font-bold text-xs cursor-pointer hover:bg-red-50 transition-colors">Disable</button>
                  </div>
                  <p className="text-xs text-gray-400">Your account is protected with two-factor authentication. You'll be asked for a verification code when signing in.</p>
                </div>
              ) : showEnroll ? (
                <div>
                  <div className="text-sm font-semibold mb-3">Set Up Authenticator</div>
                  <MfaEnroll onDone={() => { setMfaEnrolled(true); setShowEnroll(false) }} />
                  <button className="text-xs text-gray-400 mt-3 cursor-pointer hover:text-ink" onClick={() => setShowEnroll(false)}>Cancel</button>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-semibold mb-1">Two-Factor Authentication</div>
                  <p className="text-xs text-gray-400 mb-3">Add an extra layer of security to your account. When enabled, you'll need to enter a code from your authenticator app when signing in.</p>
                  <button onClick={() => setShowEnroll(true)} className="px-5 py-2.5 bg-ink text-white border-none rounded-full font-syne font-bold text-sm cursor-pointer tracking-wide hover:bg-[#222] transition-colors">Enable 2FA</button>
                </div>
              )
            )}
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-2xl md:rounded-[16px] shadow-md overflow-hidden">
          <div className="text-[0.75rem] md:text-xs uppercase tracking-widest text-gray-400 font-syne font-semibold p-4 md:px-6 py-3 bg-cream">Preferences</div>
          <div className="flex items-center justify-between px-4 md:px-6 py-3">
            <div>
              <div className="text-sm">Daily Reminders</div>
              <div className="text-xs text-gray-400">Prathakala by 11 AM, Madhyanika by 3 PM, Saayamkala by 8 PM</div>
            </div>
            {notifSupported ? (
              !notifLoading ? (
                <button
                  onClick={toggleNotif}
                  className={`w-11 h-[26px] rounded-full relative cursor-pointer transition-colors after:content-[''] after:absolute after:top-[3px] after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform ${notifEnabled ? 'bg-saffron-600 after:left-[22px]' : 'bg-warm after:left-[3px]'}`}
                />
              ) : (
                <div className="w-5 h-5 border-2 border-warm border-t-saffron-600 rounded-full animate-spin" />
              )
            ) : (
              <span className="text-xs text-gray-400">Not supported</span>
            )}
          </div>
          {notifError && <div className="px-4 md:px-6 pb-3 text-xs text-red-500">{notifError}</div>}
        </div>
      </div>

      <button className="w-full mt-6 py-3 bg-transparent text-red-600 border-1.5 border-red-600 rounded-xl md:rounded-[100px] font-syne font-bold text-sm cursor-pointer tracking-wide hover:bg-red-50 transition-colors" onClick={() => setShowDeleteConfirm(true)}>Delete Account & Data</button>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold font-syne text-ink mb-2">Delete Account?</h3>
            <p className="text-sm text-gray-500 mb-5">This will permanently delete your account and all tracking data. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 border border-warm rounded-[10px] font-syne font-semibold text-sm cursor-pointer hover:bg-cream transition-colors" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancel</button>
              <button className="flex-1 py-2.5 bg-red-600 text-white border-none rounded-[10px] font-syne font-bold text-sm cursor-pointer hover:bg-red-700 transition-colors disabled:bg-gray-300" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Yes, Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}