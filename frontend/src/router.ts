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
            { path: 'work-orders/new',       element: ebc('CreateWorkOrder', h(Lazy, { component: R.CreateWorkOrder })) },
            { path: 'work-orders/:jobId/edit', element: ebc('EditWorkOrder', h(Lazy, { component: R.EditWorkOrder })) },
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
            { path: 'partners',              element: ebc('ClientsAndVendors', h(Lazy, { component: R.ClientsAndVendors })) },
            { path: 'routes',                element: ebc('RouteList', h(Lazy, { component: R.RouteList })) },
            { path: 'orders',               element: h(Navigate, { to: '/accountant/trips', replace: true }) },
            { path: 'work-orders',           element: h(Navigate, { to: '/accountant/reconciliation?tab=match', replace: true }) },
            { path: 'trips',                 element: ebc('TripList', h(Lazy, { component: R.TripList })) },
            { path: 'trip/:tripId',          element: ebc('TripDetail', h(Lazy, { component: R.TripDetail })) },
            { path: 'create-trip',           element: ebc('CreateTrip', h(Lazy, { component: R.CreateTrip })) },
            { path: 'salary-setup',          element: ebc('SalarySetup', h(Lazy, { component: R.SalarySetup })) },
            { path: 'revenue-profit',        element: ebc('RevenueProfit', h(Lazy, { component: R.RevenueProfit })) },
            { path: 'vehicle-expenses',      element: ebc('VehicleExpenses', h(Lazy, { component: R.VehicleExpenses })) },
            { path: 'customer-reconciliation', element: h(Navigate, { to: '/accountant/reconciliation?tab=customer', replace: true }) },
            { path: 'vendor-reconciliation',   element: h(Navigate, { to: '/accountant/reconciliation?tab=vendor', replace: true }) },
            { path: 'reconciliation',          element: ebc('ReconciliationPage', h(Lazy, { component: R.ReconciliationPage })) },
            { path: 'pricing',               element: ebc('PricingList', h(Lazy, { component: R.PricingList })) },
            { path: 'pricing/:clientId',     element: ebc('PricingDetail', h(Lazy, { component: R.PricingDetail })) },
            { path: 'reports/customer-settlement', element: ebc('CustomerSettlement', h(Lazy, { component: R.CustomerSettlementReport })) },
            { path: 'import-orders',             element: ebc('ImportOrders', h(Lazy, { component: R.ImportOrders })) },
            { path: 'import-pricing',            element: ebc('ImportPricing', h(Lazy, { component: R.ImportPricing })) },
            { path: 'settings',                  element: h(Lazy, { component: R.AccountantSettings }), children: [
              { path: 'salary',                  element: ebc('SalarySetup', h(Lazy, { component: R.SalarySetup })) },
              { path: 'pricing',                 element: ebc('SettingsPricingList', h(Lazy, { component: R.SettingsPricingList })) },
              { path: 'pricing/:clientId',       element: ebc('SettingsPricingDetail', h(Lazy, { component: R.SettingsPricingDetail })) },
              { path: 'clients',                 element: ebc('ClientList', h(Lazy, { component: R.ClientList })) },
              { path: 'vendors',                 element: ebc('VendorList', h(Lazy, { component: R.VendorList })) },
              { path: 'contractors',             element: h(Navigate, { to: '/accountant/settings/vendors', replace: true }) },
              { path: 'users',                   element: ebc('UserManagement', h(Lazy, { component: R.UserManagement })) },
              { path: 'locations',                element: ebc('LocationAliasManager', h(Lazy, { component: R.LocationAliasManager })) },
            ]},

            { path: 'match-trip/:tripId',    element: ebc('MatchTrip', h(Lazy, { component: R.MatchTrip })) },
            { path: 'trips/import',          element: h(Navigate, { to: '/accountant/trips?import=true', replace: true }) },
            { path: 'notifications',         element: ebc('Notifications', h(Lazy, { component: R.AccountantNotifications })) },
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
            { path: 'partners',                  element: ebc('DirectorPartners', h(Lazy, { component: R.DirectorPartners })) },
            { path: 'routes',                    element: ebc('RouteList', h(Lazy, { component: R.RouteList })) },
            { path: 'pricing',                   element: ebc('DirectorPricingList', h(Lazy, { component: R.DirectorPricingList })) },
            { path: 'pricing/:clientId',         element: ebc('DirectorPricingDetail', h(Lazy, { component: R.DirectorPricingDetail })) },
            { path: 'trips',                     element: ebc('TripList', h(Lazy, { component: R.TripList })) },
            { path: 'trip/:tripId',              element: ebc('TripDetail', h(Lazy, { component: R.TripDetail })) },
            { path: 'create-trip',               element: ebc('CreateTrip', h(Lazy, { component: R.CreateTrip })) },
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
