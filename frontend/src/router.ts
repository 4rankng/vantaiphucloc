// Pure .ts — NO JSX. Avoids @vitejs/plugin-react preamble crash.
import { createElement, Fragment, Suspense, type ComponentType } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom' // eslint-disable-line
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
            { path: 'work-orders/new',       element: ebc('CreateWorkOrder', h(Lazy, { component: R.CreateWorkOrder })) },
            { path: 'work-orders/:jobId/edit', element: ebc('EditWorkOrder', h(Lazy, { component: R.EditWorkOrder })) },
            { path: 'history',           element: ebc('DriverHistory', h(Lazy, { component: R.DriverHistory })) },
            { path: 'notifications',     element: ebc('Notifications', h(Lazy, { component: R.DriverNotifications })) },
            { path: 'job/:jobId',        element: ebc('JobDetail', h(Lazy, { component: R.JobDetail })) },
            { path: 'profile',           element: ebc('Profile', h(Lazy, { component: R.Profile })) },
          ],
        },
        // ─── Accountant ────────────────────────────────────────
        {
          path: 'accountant',
          element: h(Lazy, { component: R.AccountantLayout }),
          children: [
            { index: true,                   element: h(Lazy, { component: R.AccountantDashboard }) },
            { path: 'partners',              element: h(Lazy, { component: R.ClientsAndVendors }) },
            { path: 'routes',                element: h(Lazy, { component: R.RouteList }) },
            { path: 'work-orders',           element: h(Lazy, { component: R.WorkOrderList }) },
            { path: 'trips',                 element: h(Lazy, { component: R.TripList }) },
            { path: 'trip/:tripId',          element: h(Lazy, { component: R.TripDetail }) },
            { path: 'create-trip',           element: h(Lazy, { component: R.CreateTrip }) },
            { path: 'salary-setup',          element: h(Lazy, { component: R.SalarySetup }) },
            { path: 'pricing',               element: h(Lazy, { component: R.PricingList }) },
            { path: 'pricing/:clientId',     element: h(Lazy, { component: R.PricingDetail }) },
            { path: 'reports/customer-settlement', element: ebc('CustomerSettlement', h(Lazy, { component: R.CustomerSettlementReport })) },
            { path: 'import-orders',             element: ebc('ImportOrders', h(Lazy, { component: R.ImportOrders })) },
            { path: 'import-pricing',            element: ebc('ImportPricing', h(Lazy, { component: R.ImportPricing })) },
            { path: 'settings',                  element: ebc('AccountantSettings', h(Lazy, { component: R.AccountantSettings })) },

            { path: 'match/:jobId',          element: h(Lazy, { component: R.MatchJob }) },
            { path: 'match-trip/:tripId',    element: h(Lazy, { component: R.MatchTrip }) },
            { path: 'notifications',         element: ebc('Notifications', h(Lazy, { component: R.AccountantNotifications })) },
            { path: 'profile',               element: ebc('Profile', h(Lazy, { component: R.Profile })) },

          ],
        },
        // ─── Director ──────────────────────────────────────────
        {
          path: 'director',
          element: h(Lazy, { component: R.DirectorLayout }),
          children: [
            { index: true,                       element: h(Lazy, { component: R.DirectorDashboard }) },
            { path: 'users',                     element: h(Lazy, { component: R.UserManagement }) },
            { path: 'partners',                  element: h(Lazy, { component: R.DirectorPartners }) },
            { path: 'routes',                    element: h(Lazy, { component: R.RouteList }) },
            { path: 'pricing',                   element: h(Lazy, { component: R.DirectorPricingList }) },
            { path: 'pricing/:clientId',         element: h(Lazy, { component: R.DirectorPricingDetail }) },
            { path: 'trips',                     element: h(Lazy, { component: R.TripList }) },
            { path: 'trip/:tripId',              element: h(Lazy, { component: R.TripDetail }) },
            { path: 'create-trip',               element: h(Lazy, { component: R.CreateTrip }) },
            { path: 'notifications',             element: h(Lazy, { component: R.DirectorNotifications }) },
            { path: 'driver-jobs/:driverId',     element: h(Lazy, { component: R.DriverJobs }) },
            { path: 'client-jobs/:clientId',     element: h(Lazy, { component: R.ClientJobs }) },
            { path: 'profile',                   element: ebc('Profile', h(Lazy, { component: R.Profile })) },
          ],
        },
        // ─── SuperAdmin ────────────────────────────────────────
        {
          path: 'superadmin',
          element: h(Lazy, { component: R.SuperAdminLayout }),
          children: [
            { index: true, element: ebc('SuperAdminDashboard', h(Lazy, { component: R.SuperAdminApp })) },
            { path: 'profile', element: ebc('Profile', h(Lazy, { component: R.Profile })) },
          ],
        },
      ],
    },
    { path: '*', element: h(Navigate, { to: '/', replace: true }) },
  ])
}
