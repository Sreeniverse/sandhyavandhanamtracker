import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useActivities } from '../hooks/useActivities'
import { useStats } from '../hooks/useStats'
import { useNotifications } from '../hooks/useNotifications'
import { SLOTS } from '../utils/slots'
import { supabase } from '../supabase'
import { MfaEnroll } from './MfaVerify'
import { friendlyError } from '../utils/errors'

export default function ProfilePage() {
  const { user, updateProfile, deleteAccount, familyMembers, addFamilyMember, removeFamilyMember, selectedProfile } = useAuth()
  const { history } = useActivities()
  const stats = useStats(history)
  const { enabled: notifEnabled, loading: notifLoading, error: notifError, supported: notifSupported, toggle: toggleNotif } = useNotifications(user)
  const viewingSon = !!selectedProfile
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [mfaEnrolled, setMfaEnrolled] = useState(false)
  const [mfaLoading, setMfaLoading] = useState(true)
  const [showEnroll, setShowEnroll] = useState(false)
  const [newChildName, setNewChildName] = useState('')
  const [addingChild, setAddingChild] = useState(false)
  const [familyError, setFamilyError] = useState('')
  const [mfaError, setMfaError] = useState('')
  const [removeConfirm, setRemoveConfirm] = useState(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

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
      setSaveMsg(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteAccount()
    } catch (err) {
      setDeleteError(friendlyError(err))
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleUnenrollMfa = async () => {
    setMfaError('')
    try {
      const { data } = await supabase.auth.mfa.listFactors()
      const totpFactor = data?.totp?.find(f => f.status === 'verified')
      if (totpFactor) {
        await supabase.auth.mfa.unenroll({ factorId: totpFactor.id })
        await supabase.auth.refreshSession()
        setMfaEnrolled(false)
      }
    } catch (err) {
      setMfaError(friendlyError(err))
    }
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6 md:py-10">
      <div className="text-xl md:text-[2rem] font-extrabold tracking-tight font-syne mb-5 md:mb-8">Profile & Settings</div>

      {viewingSon && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-[10px] text-sm mb-4 font-syne">
          Viewing {selectedProfile.name}'s profile. Settings below apply to your account. Switch to &ldquo;Me&rdquo; to edit them.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {/* Profile card */}
        <div className={`bg-white rounded-2xl md:rounded-[16px] p-5 md:p-6 shadow-md relative ${viewingSon ? 'opacity-50 pointer-events-none' : ''}`}>
          {viewingSon && <div className="absolute inset-0 z-10" />}
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

        {/* Family */}
        <div className={`bg-white rounded-2xl md:rounded-[16px] shadow-md overflow-hidden relative ${viewingSon ? 'opacity-50 pointer-events-none' : ''}`}>
          {viewingSon && <div className="absolute inset-0 z-10" />}
          <div className="text-[0.75rem] md:text-xs uppercase tracking-widest text-gray-400 font-syne font-semibold p-4 md:px-6 py-3 bg-cream">Family Members</div>
          <div className="p-4 md:p-6">
            {familyError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-[10px] text-xs mb-3">{familyError}</div>}
            <p className="text-xs text-gray-400 mb-4">Add your sons to track their Sandhyavandhanam. Switch between profiles on the Dashboard when marking rituals.</p>
            {familyMembers.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-4">
                {familyMembers.map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-cream rounded-[10px] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-saffron-200 flex items-center justify-center text-saffron-700 font-syne font-bold text-[0.65rem]">{m.name[0]}</div>
                      <span className="text-sm font-semibold">{m.name}</span>
                    </div>
                    <button onClick={() => setRemoveConfirm(m)} className="text-xs text-red-500 font-syne font-semibold cursor-pointer hover:text-red-700 bg-transparent border-0">Remove</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 border border-warm rounded-[10px] bg-white font-dm text-sm outline-none focus:border-saffron-500"
                type="text"
                placeholder="Son's name"
                value={newChildName}
                onChange={e => setNewChildName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newChildName.trim()) { setAddingChild(true); setFamilyError(''); addFamilyMember(newChildName).then(() => { setNewChildName(''); setAddingChild(false) }).catch(err => { setFamilyError(friendlyError(err)); setAddingChild(false) }) }}}
              />
              <button
                className="px-4 py-2 bg-ink text-white rounded-[10px] font-syne font-bold text-xs cursor-pointer hover:bg-[#222] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                onClick={async () => { if (!newChildName.trim()) return; setAddingChild(true); setFamilyError(''); try { await addFamilyMember(newChildName); setNewChildName('') } catch (err) { setFamilyError(friendlyError(err)) } finally { setAddingChild(false) }}}
                disabled={addingChild || !newChildName.trim()}
              >
                {addingChild ? '...' : '+ Add Son'}
              </button>
            </div>
          </div>
        </div>

        {/* Security - 2FA */}
        <div className={`bg-white rounded-2xl md:rounded-[16px] shadow-md overflow-hidden relative ${viewingSon ? 'opacity-50 pointer-events-none' : ''}`}>
          {viewingSon && <div className="absolute inset-0 z-10" />}
          <div className="text-[0.75rem] md:text-xs uppercase tracking-widest text-gray-400 font-syne font-semibold p-4 md:px-6 py-3 bg-cream">Security</div>
          <div className="p-4 md:p-6">
            {mfaError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-[10px] text-xs mb-3">{mfaError}</div>}
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
        <div className={`bg-white rounded-2xl md:rounded-[16px] shadow-md overflow-hidden relative ${viewingSon ? 'opacity-50 pointer-events-none' : ''}`}>
          {viewingSon && <div className="absolute inset-0 z-10" />}
          <div className="text-[0.75rem] md:text-xs uppercase tracking-widest text-gray-400 font-syne font-semibold p-4 md:px-6 py-3 bg-cream">Preferences</div>
          <div className="flex items-center justify-between px-4 md:px-6 py-3">
            <div>
              <div className="text-sm">Daily Reminders</div>
              <div className="text-xs text-gray-400">Prathakala by 9:30 AM, Madhyanika by 1:30 PM, Saayamkala by 6:30 PM</div>
            </div>
            {notifSupported ? (
              !notifLoading ? (
                <div
                  onClick={toggleNotif}
                  role="switch"
                  aria-checked={notifEnabled}
                  aria-label="Toggle daily reminders"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleNotif() }}}
                  className={`w-11 h-[26px] rounded-full cursor-pointer transition-colors flex items-center flex-shrink-0 ${notifEnabled ? 'bg-saffron-600 justify-end' : 'bg-gray-300 justify-start'}`}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-sm mx-[2px]" />
                </div>
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

      <div className="text-center mt-8 text-[0.65rem] text-gray-300 font-syne">v0.1.13</div>

      {deleteError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[10px] text-sm mt-4">{deleteError}</div>
      )}
      <button className="w-full mt-2 py-3 bg-transparent text-red-600 border-1.5 border-red-600 rounded-xl md:rounded-[100px] font-syne font-bold text-sm cursor-pointer tracking-wide hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent" onClick={() => setShowDeleteConfirm(true)} disabled={viewingSon}>Delete Account & Data</button>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold font-syne text-ink mb-2">Delete Account?</h3>
            <p className="text-sm text-gray-500 mb-4">This will permanently delete your account and all tracking data. This action cannot be undone.</p>
            <p className="text-sm text-gray-500 mb-3">Type <strong>DELETE</strong> to confirm:</p>
            <input className="w-full px-3 py-2.5 border border-warm rounded-[10px] bg-white font-dm text-sm text-ink outline-none focus:border-red-500 mb-4" type="text" placeholder="Type DELETE" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} />
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 border border-warm rounded-[10px] font-syne font-semibold text-sm cursor-pointer hover:bg-cream transition-colors" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }} disabled={deleting}>Cancel</button>
              <button className="flex-1 py-2.5 bg-red-600 text-white border-none rounded-[10px] font-syne font-bold text-sm cursor-pointer hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed" onClick={handleDelete} disabled={deleting || deleteConfirmText !== 'DELETE'}>{deleting ? 'Deleting...' : 'Delete Account'}</button>
            </div>
          </div>
        </div>
      )}

      {removeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold font-syne text-ink mb-2">Remove {removeConfirm.name}?</h3>
            <p className="text-sm text-gray-500 mb-5">This will delete all of {removeConfirm.name}'s tracked rituals. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button className="flex-1 py-2.5 border border-warm rounded-[10px] font-syne font-semibold text-sm cursor-pointer hover:bg-cream transition-colors" onClick={() => setRemoveConfirm(null)}>Cancel</button>
              <button className="flex-1 py-2.5 bg-red-600 text-white border-none rounded-[10px] font-syne font-bold text-sm cursor-pointer hover:bg-red-700 transition-colors" onClick={async () => { try { await removeFamilyMember(removeConfirm.id) } catch (err) { setFamilyError(friendlyError(err)) } setRemoveConfirm(null) }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}