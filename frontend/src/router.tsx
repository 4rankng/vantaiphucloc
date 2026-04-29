/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Login } from '@/pages/Login'
import { ScrollToTop } from '@/components/shared/ScrollToTop'

// Layouts
import { DriverLayout } from '@/components/shared/DriverLayout'
import { AccountantLayout } from '@/components/shared/AccountantLayout'
import { DirectorLayout } from '@/components/shared/DirectorLayout'

// Driver pages
import { DriverHome } from '@/pages/driver/DriverHome'
import { CreateWorkOrder } from '@/pages/driver/CreateWorkOrder'
import { DriverHistory } from '@/pages/driver/DriverHistory'
import { DriverNotifications } from '@/pages/driver/DriverNotifications'
import { JobDetail } from '@/pages/driver/JobDetail'
import { Profile } from '@/pages/driver/Profile'

// Accountant pages
import { AccountantDashboard } from '@/pages/accountant/AccountantDashboard'
import { ClientList } from '@/pages/accountant/ClientList'
import { RouteList } from '@/pages/accountant/RouteList'
import { WorkOrderList } from '@/pages/accountant/WorkOrderList'
import { TripList } from '@/pages/accountant/TripList'
import { TripDetail } from '@/pages/accountant/TripDetail'
import { CreateTrip } from '@/pages/accountant/CreateTrip'
import { SalarySetup } from '@/pages/accountant/SalarySetup'
import { MatchJob } from '@/pages/accountant/MatchJob'
import { MatchTrip } from '@/pages/accountant/MatchTrip'
import { PricingList } from '@/pages/accountant/PricingList'

// Director pages
import { DirectorDashboard } from '@/pages/director/DirectorDashboard'
import { UserManagement } from '@/pages/director/UserManagement'
import { DirectorNotifications } from '@/pages/director/DirectorNotifications'
import { DriverJobs } from '@/pages/director/DriverJobs'
import { ClientJobs } from '@/pages/director/ClientJobs'

// SuperAdmin pages
import { SuperAdminApp } from '@/pages/superadmin/SuperAdminApp'

// Error boundary
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

function AuthGuard() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  )
}

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  const targets: Record<string, string> = {
    driver: '/driver',
    accountant: '/accountant',
    director: '/director',
    superadmin: '/superadmin',
  }
  return <Navigate to={targets[user.role] ?? '/driver'} replace />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        index: true,
        element: <RoleRedirect />,
      },
      // ─── Driver ────────────────────────────────────────────────
      {
        element: <DriverLayout />,
        children: [
          { path: 'driver', element: <ErrorBoundary component="DriverHome" level="page"><DriverHome /></ErrorBoundary> },
          { path: 'driver/work-orders/new', element: <ErrorBoundary component="CreateWorkOrder" level="page"><CreateWorkOrder /></ErrorBoundary> },
          { path: 'driver/history', element: <ErrorBoundary component="DriverHistory" level="page"><DriverHistory /></ErrorBoundary> },
          { path: 'driver/notifications', element: <ErrorBoundary component="Notifications" level="page"><DriverNotifications /></ErrorBoundary> },
          { path: 'driver/job/:jobId', element: <ErrorBoundary component="JobDetail" level="page"><JobDetail /></ErrorBoundary> },
          { path: 'driver/profile', element: <ErrorBoundary component="Profile" level="page"><Profile /></ErrorBoundary> },
        ],
      },
      // ─── Accountant ─────────────────────────────────────────────
      {
        element: <AccountantLayout />,
        children: [
          { path: 'accountant', element: <AccountantDashboard /> },
          { path: 'accountant/clients', element: <ClientList /> },
          { path: 'accountant/routes', element: <RouteList /> },
          { path: 'accountant/work-orders', element: <WorkOrderList /> },
          { path: 'accountant/trips', element: <TripList /> },
          { path: 'accountant/trip/:tripId', element: <TripDetail /> },
          { path: 'accountant/create-trip', element: <CreateTrip /> },
          { path: 'accountant/salary-setup', element: <SalarySetup /> },
          { path: 'accountant/pricing', element: <PricingList /> },
          { path: 'accountant/match/:jobId', element: <MatchJob /> },
          { path: 'accountant/match-trip/:tripId', element: <MatchTrip /> },
        ],
      },
      // ─── Director ───────────────────────────────────────────────
      {
        element: <DirectorLayout />,
        children: [
          { path: 'director', element: <DirectorDashboard /> },
          { path: 'director/users', element: <UserManagement /> },
          { path: 'director/notifications', element: <DirectorNotifications /> },
          { path: 'director/driver-jobs/:driverId', element: <DriverJobs /> },
          { path: 'director/client-jobs/:clientId', element: <ClientJobs /> },
        ],
      },
      // ─── SuperAdmin ─────────────────────────────────────────────
      {
        path: 'superadmin',
        element: <SuperAdminApp />,
      },
    ],
  },
])
