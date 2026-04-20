import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import LoginPage from '@/pages/LoginPage'
import DirectorLayout from '@/pages/director/DirectorLayout'
import DirectorDashboard from '@/pages/director/DirectorDashboard'
import FleetPage from '@/pages/director/fleet/FleetPage'
import DirectorTripsPage from '@/pages/director/trips/DirectorTripsPage'
import DirectorClientsPage from '@/pages/director/clients/DirectorClientsPage'
import DirectorInvoicesPage from '@/pages/director/invoices/DirectorInvoicesPage'
import DirectorReceivablesPage from '@/pages/director/receivables/DirectorReceivablesPage'
import DirectorKPIPage from '@/pages/director/kpi/DirectorKPIPage'
import DirectorReportsPage from '@/pages/director/reports/DirectorReportsPage'
import DispatcherLayout from '@/pages/dispatcher/DispatcherLayout'
import DispatcherDashboard from '@/pages/dispatcher/DispatcherDashboard'
import DispatcherTripsPage from '@/pages/dispatcher/trips/DispatcherTripsPage'
import DispatcherAlertsPage from '@/pages/dispatcher/alerts/DispatcherAlertsPage'
import DispatcherFleetPage from '@/pages/dispatcher/fleet/DispatcherFleetPage'
import DispatcherClientsPage from '@/pages/dispatcher/clients/DispatcherClientsPage'
import AccountantLayout from '@/pages/accountant/AccountantLayout'
import AccountantDashboard from '@/pages/accountant/AccountantDashboard'
import AccountantExpensesPage from '@/pages/accountant/expenses/AccountantExpensesPage'
import AccountantInvoicesPage from '@/pages/accountant/invoices/AccountantInvoicesPage'
import AccountantReceivablesPage from '@/pages/accountant/receivables/AccountantReceivablesPage'
import AccountantPeriodClosePage from '@/pages/accountant/period-close/AccountantPeriodClosePage'
import DriverLayout from '@/pages/driver/DriverLayout'
import DriverHome from '@/pages/driver/DriverHome'
import DriverTrips from '@/pages/driver/DriverTrips'
import DriverPhotos from '@/pages/driver/DriverPhotos'
import DriverIncome from '@/pages/driver/DriverIncome'
import DriverAccount from '@/pages/driver/DriverAccount'

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

      <Route path="/director" element={<ProtectedRoute allowedRoles={['director']}><DirectorLayout /></ProtectedRoute>}>
        <Route index element={<DirectorDashboard />} />
        <Route path="fleet" element={<FleetPage />} />
        <Route path="trips" element={<DirectorTripsPage />} />
        <Route path="clients" element={<DirectorClientsPage />} />
        <Route path="invoices" element={<DirectorInvoicesPage />} />
        <Route path="receivables" element={<DirectorReceivablesPage />} />
        <Route path="driver-kpi" element={<DirectorKPIPage />} />
        <Route path="reports" element={<DirectorReportsPage />} />
        <Route path="more" element={<div />} />
      </Route>

      <Route path="/dispatcher" element={<ProtectedRoute allowedRoles={['dispatcher']}><DispatcherLayout /></ProtectedRoute>}>
        <Route index element={<DispatcherDashboard />} />
        <Route path="trips" element={<DispatcherTripsPage />} />
        <Route path="alerts" element={<DispatcherAlertsPage />} />
        <Route path="fleet" element={<DispatcherFleetPage />} />
        <Route path="clients" element={<DispatcherClientsPage />} />
      </Route>

      <Route path="/accountant" element={<ProtectedRoute allowedRoles={['accountant']}><AccountantLayout /></ProtectedRoute>}>
        <Route index element={<AccountantDashboard />} />
        <Route path="expenses" element={<AccountantExpensesPage />} />
        <Route path="invoices" element={<AccountantInvoicesPage />} />
        <Route path="receivables" element={<AccountantReceivablesPage />} />
        <Route path="period-close" element={<AccountantPeriodClosePage />} />
      </Route>

      <Route path="/driver" element={<ProtectedRoute allowedRoles={['driver']}><DriverLayout /></ProtectedRoute>}>
        <Route index element={<DriverHome />} />
        <Route path="trips" element={<DriverTrips />} />
        <Route path="photos" element={<DriverPhotos />} />
        <Route path="income" element={<DriverIncome />} />
        <Route path="account" element={<DriverAccount />} />
      </Route>

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
