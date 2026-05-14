import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import AuthPage from './components/AuthPage'
import Dashboard from './components/Dashboard'
import HistoryPage from './components/HistoryPage'
import ProfilePage from './components/ProfilePage'
import CommunityPage from './components/CommunityPage'
import { MfaVerify } from './components/MfaVerify'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-paper"><div className="w-3 h-3 rounded-full bg-saffron-600 animate-pulse" /></div>
  if (!user) return <Navigate to="/auth" replace />
  return children
}

export default function App() {
  const { user, loading, needsMfa } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-paper"><div className="w-3 h-3 rounded-full bg-saffron-600 animate-pulse" /></div>
  }

  if (needsMfa) {
    return <MfaVerify />
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  )
}