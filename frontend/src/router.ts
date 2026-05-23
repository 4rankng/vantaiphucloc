// Pure .ts — NO JSX. Avoids @vitejs/plugin-react preamble crash.
import { createElement, Fragment, Suspense, type ComponentType } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Login } from '@/pages/Login'
import { ScrollToTop } from '@/components/shared/ScrollToTop'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import * as R from '@/routes'

const h = createElement

function Lazy({ component: Component }: { component: ComponentType }) {
  return h(Suspense, { fallback: null }, h(Component))
}

function AuthGuard() {
  const { user } = useAuth()
  if (!user) return h(Login)
  return h(Fragment, null, h(ScrollToTop), h(Outlet))
}

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return h(Navigate, { to: '/', replace: true })
  const targets: Record<string, string> = {
    driver: '/driver',
    accountant: '/accountant',
    director: '/director',
    superadmin: '/superadmin',
  }
  return h(Navigate, { to: targets[user.role] ?? '/driver', replace: true })
}

function ebc(name: string, child: ReturnType<typeof createElement>) {
  return h(ErrorBoundary, { component: name, level: 'page' }, child)
}

export function createAppRouter() {
  return createBrowserRouter([
    {
      path: '/',
      element: h(AuthGuard),
      children: [
        { index: true, element: h(RoleRedirect) },
        // ─── Driver ────────────────────────────────────────────
        {
          path: 'driver',
          element: h(Lazy, { component: R.DriverLayout }),
          children: [
            { index: true,               element: ebc('DriverHome', h(Lazy, { component: R.DriverHome })) },
            { path: 'delivered-trips/new',       element: ebc('CreateDeliveredTrip', h(Lazy, { component: R.CreateDeliveredTrip })) },
            { path: 'delivered-trips/:jobId/edit', element: ebc('EditDeliveredTrip', h(Lazy, { component: R.EditDeliveredTrip })) },
            { path: 'history',           element: ebc('DriverHistory', h(Lazy, { component: R.DriverHistory })) },
            { path: 'notifications',     element: ebc('Notifications', h(Lazy, { component: R.DriverNotifications })) },
            { path: 'job/:jobId',        element: ebc('JobDetail', h(Lazy, { component: R.JobDetail })) },
            { path: 'profile',           element: ebc('Profile', h(Lazy, { component: R.Profile })) },
            { path: '*',                 element: ebc('NotFound', h(Lazy, { component: R.NotFound })) },
          ],
        },
        // ─── Accountant ────────────────────────────────────────
        {
          path: 'accountant',
          element: h(Lazy, { component: R.AccountantLayout }),
          children: [
            { index: true,                   element: ebc('AccountantDashboard', h(Lazy, { component: R.AccountantDashboard })) },
            { path: 'clients',               element: ebc('AccountantClients', h(Lazy, { component: R.AccountantClients })) },
            { path: 'vendors',               element: h(Navigate, { to: '/accountant/transporters?tab=nha-thau', replace: true }) },
            { path: 'drivers',               element: h(Navigate, { to: '/accountant/transporters', replace: true }) },
            { path: 'transporters',          element: ebc('AccountantTransporters', h(Lazy, { component: R.AccountantTransporters })) },
            { path: 'doi-soat',              element: ebc('AccountantDoiSoat', h(Lazy, { component: R.AccountantDoiSoat })) },
            { path: 'import',                element: h(Navigate, { to: '/accountant/doi-soat', replace: true }) },
            { path: 'expenses',              element: ebc('AccountantExpenses', h(Lazy, { component: R.AccountantExpenses })) },
            { path: 'salary',                element: ebc('AccountantSalary', h(Lazy, { component: R.AccountantSalary })) },
            { path: 'pnl',                   element: ebc('AccountantPnL', h(Lazy, { component: R.AccountantPnL })) },
            { path: 'settlement',            element: ebc('AccountantSettlement', h(Lazy, { component: R.AccountantSettlement })) },
            { path: 'locations',             element: ebc('AccountantLocations', h(Lazy, { component: R.AccountantLocations })) },
            { path: 'settings',              element: ebc('AccountantSettings', h(Lazy, { component: R.AccountantSettings })) },
            { path: 'settings/ky-luong',     element: ebc('SalaryPeriodSettings', h(Lazy, { component: R.SalaryPeriodSettings })) },
            { path: 'settings/cuoc-tuyen',   element: ebc('RoutePricingPage', h(Lazy, { component: R.RoutePricingPage })) },
            { path: 'profile',               element: ebc('Profile', h(Lazy, { component: R.Profile })) },
            { path: '*',                     element: ebc('NotFound', h(Lazy, { component: R.NotFound })) },
          ],
        },
        // ─── Director ──────────────────────────────────────────
        {
          path: 'director',
          element: h(Lazy, { component: R.DirectorLayout }),
          children: [
            { index: true,                       element: ebc('DirectorDashboard', h(Lazy, { component: R.DirectorDashboard })) },
            { path: 'users',                     element: ebc('UserManagement', h(Lazy, { component: R.UserManagement })) },
            { path: 'partners',                  element: ebc('DirectorContacts', h(Lazy, { component: R.DirectorContacts })) },
            { path: 'pricing',                   element: ebc('DirectorPricingList', h(Lazy, { component: R.DirectorPricingList })) },
            { path: 'pricing/:clientId',         element: ebc('DirectorPricingDetail', h(Lazy, { component: R.DirectorPricingDetail })) },
            { path: 'notifications',             element: ebc('Notifications', h(Lazy, { component: R.DirectorNotifications })) },
            { path: 'driver-jobs/:driverId',     element: ebc('DriverJobs', h(Lazy, { component: R.DriverJobs })) },
            { path: 'client-jobs/:clientId',     element: ebc('ClientJobs', h(Lazy, { component: R.ClientJobs })) },
            { path: 'profile',                   element: ebc('Profile', h(Lazy, { component: R.Profile })) },
            { path: '*',                         element: ebc('NotFound', h(Lazy, { component: R.NotFound })) },
          ],
        },
        // ─── SuperAdmin ────────────────────────────────────────
        {
          path: 'superadmin',
          element: h(Lazy, { component: R.SuperAdminLayout }),
          children: [
            { index: true, element: ebc('SuperAdminDashboard', h(Lazy, { component: R.SuperAdminApp })) },
            { path: 'profile', element: ebc('Profile', h(Lazy, { component: R.Profile })) },
            { path: '*',       element: ebc('NotFound', h(Lazy, { component: R.NotFound })) },
          ],
        },
      ],
    },
    { path: '*', element: ebc('NotFound', h(Lazy, { component: R.NotFound })) },
  ])
}
