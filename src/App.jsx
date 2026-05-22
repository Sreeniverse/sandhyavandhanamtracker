import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import { MfaVerify } from './components/MfaVerify'

const AuthPage = lazy(() => import('./components/AuthPage'))
const Dashboard = lazy(() => import('./components/Dashboard'))
const HistoryPage = lazy(() => import('./components/HistoryPage'))
const ProfilePage = lazy(() => import('./components/ProfilePage'))
const CommunityPage = lazy(() => import('./components/CommunityPage'))
const NotFoundPage = lazy(() => import('./components/NotFoundPage'))

function AppSpinner() {
  return <div className="min-h-screen flex items-center justify-center bg-paper"><div className="w-7 h-7 border-3 border-warm border-t-saffron-600 rounded-full animate-spin" /></div>
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-paper"><div className="w-3 h-3 rounded-full bg-saffron-600 animate-pulse" /></div>
  if (!user) return <Navigate to="/auth" replace />
  return children
}

export default function App() {
  const { user, loading, needsMfa } = useAuth()

  if (loading) {
    return <AppSpinner />
  }

  if (needsMfa) {
    return <MfaVerify />
  }

  return (
    <Suspense fallback={<AppSpinner />}>
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="community" element={<CommunityPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
