import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Layout() {
  const { user, signOut } = useAuth()
  const [signOutError, setSignOutError] = useState('')

  const handleSignOut = async () => {
    setSignOutError('')
    try {
      await signOut()
    } catch (err) {
      setSignOutError(err.message || 'Failed to sign out. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-paper">
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
          <div className="w-7 h-7 md:w-[30px] md:h-[30px] rounded-full bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center text-white font-syne font-bold text-xs">{user?.name?.[0]}</div>
          <button onClick={handleSignOut} className="bg-white/8 border border-white/12 text-white/70 px-3 py-1 rounded-full text-xs font-syne font-semibold cursor-pointer hover:bg-white/15 hover:text-white transition-colors">Sign Out</button>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-ink border-t border-white/10 z-50 flex">
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

      <main className="pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  )
}