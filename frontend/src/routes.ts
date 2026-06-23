/**
 * Route definitions — pure config, no JSX.
 * Lazy imports live here so a broken page never crashes the whole app.
 */
import { lazy } from 'react'

// ─── Layouts ──────────────────────────────────────────────────────────────────
export const DriverLayout     = lazy(() => import('@/components/shared/layouts/DriverLayout').then(m => ({ default: m.DriverLayout })))
export const AccountantLayout = lazy(() => import('@/components/shared/layouts/AccountantLayout').then(m => ({ default: m.AccountantLayout })))
export const DirectorLayout   = lazy(() => import('@/components/shared/layouts/DirectorLayout').then(m => ({ default: m.DirectorLayout })))
// ─── Driver pages ─────────────────────────────────────────────────────────────
export const DriverHome           = lazy(() => import('@/pages/driver/DriverHome').then(m => ({ default: m.DriverHome })))
export const CreateDeliveredTrip      = lazy(() => import('@/pages/driver/CreateDeliveredTrip').then(m => ({ default: m.CreateDeliveredTrip })))
export const EditDeliveredTrip        = lazy(() => import('@/pages/driver/EditDeliveredTrip').then(m => ({ default: m.EditDeliveredTrip })))
export const DriverHistory        = lazy(() => import('@/pages/driver/DriverHistory').then(m => ({ default: m.DriverHistory })))
export const DriverNotifications  = lazy(() => import('@/pages/driver/DriverNotifications').then(m => ({ default: m.DriverNotifications })))
export const JobDetail            = lazy(() => import('@/pages/driver/JobDetail').then(m => ({ default: m.JobDetail })))
export const Profile              = lazy(() => import('@/pages/driver/Profile').then(m => ({ default: m.Profile })))

// ─── Accountant pages ─────────────────────────────────────────────────────────
export const AccountantDashboard  = lazy(() => import('@/pages/accountant/AccountantDashboard').then(m => ({ default: m.AccountantDashboard })))
export const AccountantClients    = lazy(() => import('@/pages/accountant/ClientsPage').then(m => ({ default: m.ClientsPage })))
export const AccountantVendors    = lazy(() => import('@/pages/accountant/VendorsPage').then(m => ({ default: m.VendorsPage })))
export const AccountantTransporters = lazy(() => import('@/pages/accountant/TransportersPage').then(m => ({ default: m.TransportersPage })))
export const AccountantSettings   = lazy(() => import('@/pages/accountant/SettingsPage').then(m => ({ default: m.SettingsPage })))
export const SalaryPeriodSettings = lazy(() => import('@/pages/accountant/SalaryPeriodSettings').then(m => ({ default: m.SalaryPeriodSettings })))
export const RoutePricingPage     = lazy(() => import('@/pages/accountant/RoutePricingPage').then(m => ({ default: m.RoutePricingPage })))
export const VendorRoutePricingPage = lazy(() => import('@/pages/accountant/VendorRoutePricingPage').then(m => ({ default: m.VendorRoutePricingPage })))
export const OperationTypesPage = lazy(() => import('@/pages/accountant/settings/OperationTypesPage').then(m => ({ default: m.OperationTypesPage })))
export const AccountantDoiSoat    = lazy(() => import('@/pages/accountant/DoiSoatPage').then(m => ({ default: m.DoiSoatPage })))
export const AccountantExpenses   = lazy(() => import('@/pages/accountant/VehicleExpensesPage').then(m => ({ default: m.VehicleExpensesPage })))
export const AccountantSalary     = lazy(() => import('@/pages/accountant/SalaryPage').then(m => ({ default: m.SalaryPage })))
export const AccountantPnL        = lazy(() => import('@/pages/accountant/PnLPage').then(m => ({ default: m.PnLPage })))
export const AccountantLocations  = lazy(() => import('@/pages/accountant/LocationAliases').then(m => ({ default: m.LocationAliasesPage })))


// ─── Director pages ───────────────────────────────────────────────────────────
export const DirectorDashboard      = lazy(() => import('@/pages/director/DirectorDashboard').then(m => ({ default: m.DirectorDashboard })))
export const UserManagement         = lazy(() => import('@/pages/director/UserManagement').then(m => ({ default: m.UserManagement })))
export const DirectorNotifications  = lazy(() => import('@/pages/director/DirectorNotifications').then(m => ({ default: m.DirectorNotifications })))
export const DriverJobs             = lazy(() => import('@/pages/director/DriverJobs').then(m => ({ default: m.DriverJobs })))
export const ClientJobs             = lazy(() => import('@/pages/director/ClientJobs').then(m => ({ default: m.ClientJobs })))
export const DirectorContacts       = lazy(() => import('@/pages/director/DirectorContacts').then(m => ({ default: m.DirectorContacts })))

// ─── SuperAdmin ───────────────────────────────────────────────────────────────
export const SuperAdminApp = lazy(() => import('@/pages/superadmin/SuperAdminApp').then(m => ({ default: m.SuperAdminApp })))
export const SuperAdminOverview = lazy(() => import('@/pages/superadmin/SuperAdminOverview').then(m => ({ default: m.SuperAdminOverview })))
export const OcrAnalytics   = lazy(() => import('@/pages/superadmin/OcrAnalytics').then(m => ({ default: m.OcrAnalytics })))

// ─── Shared ───────────────────────────────────────────────────────────────────
export const NotFound = lazy(() => import('@/pages/NotFound').then(m => ({ default: m.NotFound })))
