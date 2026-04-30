/* eslint-disable react-refresh/only-export-components */
// @refresh reset
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { Suspense, type ComponentType } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Login } from '@/pages/Login'
import { ScrollToTop } from '@/components/shared/ScrollToTop'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import * as R from '@/routes'

// ─── Shared components ────────────────────────────────────────────────────────

function Lazy({ component: Component }: { component: ComponentType }) {
  return (
    <Suspense fallback={null}>
      <Component />
    </Suspense>
  )
}

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

// ─── Router factory — called once inside App ──────────────────────────────────

export function createAppRouter() {
  return createBrowserRouter([
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
        // ─── Driver ──────────────────────────────────────────────
        {
          element: <Lazy component={R.DriverLayout} />,
          children: [
            { path: 'driver',                 element: <ErrorBoundary component="DriverHome"      level="page"><Lazy component={R.DriverHome} /></ErrorBoundary> },
            { path: 'driver/work-orders/new', element: <ErrorBoundary component="CreateWorkOrder" level="page"><Lazy component={R.CreateWorkOrder} /></ErrorBoundary> },
            { path: 'driver/history',         element: <ErrorBoundary component="DriverHistory"   level="page"><Lazy component={R.DriverHistory} /></ErrorBoundary> },
            { path: 'driver/notifications',   element: <ErrorBoundary component="Notifications"   level="page"><Lazy component={R.DriverNotifications} /></ErrorBoundary> },
            { path: 'driver/job/:jobId',      element: <ErrorBoundary component="JobDetail"       level="page"><Lazy component={R.JobDetail} /></ErrorBoundary> },
            { path: 'driver/profile',         element: <ErrorBoundary component="Profile"         level="page"><Lazy component={R.Profile} /></ErrorBoundary> },
          ],
        },
        // ─── Accountant ──────────────────────────────────────────
        {
          element: <Lazy component={R.AccountantLayout} />,
          children: [
            { path: 'accountant',                    element: <Lazy component={R.AccountantDashboard} /> },
            { path: 'accountant/clients',            element: <Lazy component={R.ClientList} /> },
            { path: 'accountant/routes',             element: <Lazy component={R.RouteList} /> },
            { path: 'accountant/work-orders',        element: <Lazy component={R.WorkOrderList} /> },
            { path: 'accountant/trips',              element: <Lazy component={R.TripList} /> },
            { path: 'accountant/trip/:tripId',       element: <Lazy component={R.TripDetail} /> },
            { path: 'accountant/create-trip',        element: <Lazy component={R.CreateTrip} /> },
            { path: 'accountant/salary-setup',       element: <Lazy component={R.SalarySetup} /> },
            { path: 'accountant/pricing',            element: <Lazy component={R.PricingList} /> },
            { path: 'accountant/match/:jobId',       element: <Lazy component={R.MatchJob} /> },
            { path: 'accountant/match-trip/:tripId', element: <Lazy component={R.MatchTrip} /> },
          ],
        },
        // ─── Director ────────────────────────────────────────────
        {
          element: <Lazy component={R.DirectorLayout} />,
          children: [
            { path: 'director',                       element: <Lazy component={R.DirectorDashboard} /> },
            { path: 'director/users',                 element: <Lazy component={R.UserManagement} /> },
            { path: 'director/notifications',         element: <Lazy component={R.DirectorNotifications} /> },
            { path: 'director/driver-jobs/:driverId', element: <Lazy component={R.DriverJobs} /> },
            { path: 'director/client-jobs/:clientId', element: <Lazy component={R.ClientJobs} /> },
          ],
        },
        // ─── SuperAdmin ──────────────────────────────────────────
        {
          path: 'superadmin',
          element: <Lazy component={R.SuperAdminApp} />,
        },
      ],
    },
    {
      path: '*',
      element: <Navigate to="/" replace />,
    },
  ])
}
