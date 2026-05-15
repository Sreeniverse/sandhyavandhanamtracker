import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { friendlyError } from '../utils/errors'

export default function Layout() {
  const { user, signOut, selectedProfile, setSelectedProfile, familyMembers } = useAuth()
  const isOnline = useOnlineStatus()
  const [signOutError, setSignOutError] = useState('')
  const [showBackOnline, setShowBackOnline] = useState(false)
  const wasOffline = useRef(false)

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true
      setShowBackOnline(false)
    } else if (wasOffline.current) {
      setShowBackOnline(true)
      wasOffline.current = false
      const timer = setTimeout(() => setShowBackOnline(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline])

  const handleSignOut = async () => {
    setSignOutError('')
    try {
      await signOut()
    } catch (err) {
      setSignOutError(friendlyError(err))
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      {!isOnline && (
        <div className="bg-amber-500 text-amber-950 text-xs text-center py-1.5 px-4 font-syne font-semibold sticky top-0 z-[60]">
          You're offline. Changes will sync when you reconnect.
        </div>
      )}
      {showBackOnline && (
        <div className="bg-success text-white text-xs text-center py-1.5 px-4 font-syne font-semibold sticky top-0 z-[60]">
          Back online! Syncing your changes...
        </div>
      )}
      {signOutError && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 px-4 py-2 text-xs text-center font-syne">{signOutError}</div>
      )}
      <nav className="bg-ink px-4 md:px-8 h-[52px] md:h-[60px] flex items-center justify-between sticky top-0 z-50">
        <NavLink to="/" className="flex items-center">
          <img src="/logo.png" alt="Asthika Samaj" className="h-7 md:h-9" />
        </NavLink>
        <div className="hidden md:flex items-center gap-6">
          <NavLink to="/" className={({ isActive }) => `text-xs font-semibold font-syne tracking-wide uppercase no-underline transition-colors ${isActive ? 'text-white' : 'text-white/50 hover:text-white'}`}>Dashboard</NavLink>
          <NavLink to="/history" className={({ isActive }) => `text-xs font-semibold font-syne tracking-wide uppercase no-underline transition-colors ${isActive ? 'text-white' : 'text-white/50 hover:text-white'}`}>History</NavLink>
          <NavLink to="/community" className={({ isActive }) => `text-xs font-semibold font-syne tracking-wide uppercase no-underline transition-colors ${isActive ? 'text-white' : 'text-white/50 hover:text-white'}`}>Community</NavLink>
          <NavLink to="/profile" className={({ isActive }) => `text-xs font-semibold font-syne tracking-wide uppercase no-underline transition-colors ${isActive ? 'text-white' : 'text-white/50 hover:text-white'}`}>Settings</NavLink>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/50 hidden md:inline">Hey, <strong className="text-white/85">{user?.name?.split(' ')[0]}</strong></span>
          {familyMembers.length > 0 && (
            <div className="hidden md:flex gap-1">
              <button
                onClick={() => setSelectedProfile(null)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-syne font-bold transition-colors ${!selectedProfile ? 'bg-saffron-500 text-white' : 'bg-white/10 text-white/50 hover:text-white/70'}`}
              >
                Me
              </button>
              {familyMembers.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedProfile(m)}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-syne font-bold transition-colors ${selectedProfile?.id === m.id ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/50 hover:text-white/70'}`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
          <div className={`w-7 h-7 md:w-[30px] md:h-[30px] rounded-full flex items-center justify-center text-white font-syne font-bold text-xs ${selectedProfile ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-saffron-400 to-saffron-600'}`}>
            {selectedProfile ? selectedProfile.name[0]?.toUpperCase() : user?.name?.[0]}
          </div>
          <button onClick={handleSignOut} className="bg-white/8 border border-white/12 text-white/70 px-3 py-1 rounded-full text-xs font-syne font-semibold cursor-pointer hover:bg-white/15 hover:text-white transition-colors">Sign Out</button>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-ink border-t border-white/10 z-50">
        {familyMembers.length > 0 && (
          <div className="flex gap-1 px-3 pt-1.5 pb-0.5 justify-center">
            <button
              onClick={() => setSelectedProfile(null)}
              className={`px-3 py-0.5 rounded-full text-[0.6rem] font-syne font-bold transition-colors ${!selectedProfile ? 'bg-saffron-500 text-white' : 'bg-white/10 text-white/50 hover:text-white/70'}`}
            >
              Me
            </button>
            {familyMembers.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedProfile(m)}
                className={`px-3 py-0.5 rounded-full text-[0.6rem] font-syne font-bold transition-colors ${selectedProfile?.id === m.id ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/50 hover:text-white/70'}`}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex">
        <NavLink to="/" className={({ isActive }) => `flex-1 flex flex-col items-center py-2 text-[0.6rem] font-syne font-semibold no-underline ${isActive ? 'text-saffron-400' : 'text-white/40'}`}>
          <span className="text-lg">📊</span>Home
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `flex-1 flex flex-col items-center py-2 text-[0.6rem] font-syne font-semibold no-underline ${isActive ? 'text-saffron-400' : 'text-white/40'}`}>
          <span className="text-lg">📅</span>History
        </NavLink>
        <NavLink to="/community" className={({ isActive }) => `flex-1 flex flex-col items-center py-2 text-[0.6rem] font-syne font-semibold no-underline ${isActive ? 'text-saffron-400' : 'text-white/40'}`}>
          <span className="text-lg">🏆</span>Community
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `flex-1 flex flex-col items-center py-2 text-[0.6rem] font-syne font-semibold no-underline ${isActive ? 'text-saffron-400' : 'text-white/40'}`}>
          <span className="text-lg">⚙️</span>Settings
        </NavLink>
        </div>
      </div>

      <main className="pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  )
}