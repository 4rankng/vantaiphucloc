import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import LoginPage from '@/pages/LoginPage'
import DirectorDashboard from '@/pages/director/DirectorDashboard'
import DispatcherDashboard from '@/pages/dispatcher/DispatcherDashboard'
import AccountantDashboard from '@/pages/accountant/AccountantDashboard'
import DriverHome from '@/pages/driver/DriverHome'
import DriverTrips from '@/pages/driver/DriverTrips'

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { role } = useAuth()
  if (!role) return <Navigate to="/" replace />
  if (!allowedRoles.includes(role)) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { role } = useAuth()

  return (
    <Routes>
      <Route path="/" element={role ? <Navigate to={`/${role}`} replace /> : <LoginPage />} />
      <Route path="/director" element={<ProtectedRoute allowedRoles={['director']}><DirectorDashboard /></ProtectedRoute>} />
      <Route path="/director/*" element={<ProtectedRoute allowedRoles={['director']}><DirectorDashboard /></ProtectedRoute>} />
      <Route path="/dispatcher" element={<ProtectedRoute allowedRoles={['dispatcher']}><DispatcherDashboard /></ProtectedRoute>} />
      <Route path="/dispatcher/*" element={<ProtectedRoute allowedRoles={['dispatcher']}><DispatcherDashboard /></ProtectedRoute>} />
      <Route path="/accountant" element={<ProtectedRoute allowedRoles={['accountant']}><AccountantDashboard /></ProtectedRoute>} />
      <Route path="/accountant/*" element={<ProtectedRoute allowedRoles={['accountant']}><AccountantDashboard /></ProtectedRoute>} />
      <Route path="/driver" element={<ProtectedRoute allowedRoles={['driver']}><DriverHome /></ProtectedRoute>} />
      <Route path="/driver/trips" element={<ProtectedRoute allowedRoles={['driver']}><DriverTrips /></ProtectedRoute>} />
      <Route path="/driver/*" element={<ProtectedRoute allowedRoles={['driver']}><DriverHome /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
