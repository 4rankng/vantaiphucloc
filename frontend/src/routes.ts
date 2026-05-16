/**
 * Route definitions — pure config, no JSX.
 * Lazy imports live here so a broken page never crashes the whole app.
 */
import { lazy } from 'react'

// ─── Layouts ──────────────────────────────────────────────────────────────────
export const DriverLayout     = lazy(() => import('@/components/shared/DriverLayout').then(m => ({ default: m.DriverLayout })))
export const AccountantLayout = lazy(() => import('@/components/shared/AccountantLayout').then(m => ({ default: m.AccountantLayout })))
export const DirectorLayout   = lazy(() => import('@/components/shared/DirectorLayout').then(m => ({ default: m.DirectorLayout })))
export const SuperAdminLayout = lazy(() => import('@/components/shared/SuperAdminLayout').then(m => ({ default: m.SuperAdminLayout })))

// ─── Driver pages ─────────────────────────────────────────────────────────────
export const DriverHome           = lazy(() => import('@/pages/driver/DriverHome').then(m => ({ default: m.DriverHome })))
export const CreateWorkOrder      = lazy(() => import('@/pages/driver/CreateWorkOrder').then(m => ({ default: m.CreateWorkOrder })))
export const EditWorkOrder        = lazy(() => import('@/pages/driver/EditWorkOrder').then(m => ({ default: m.EditWorkOrder })))
export const DriverHistory        = lazy(() => import('@/pages/driver/DriverHistory').then(m => ({ default: m.DriverHistory })))
export const DriverNotifications  = lazy(() => import('@/pages/driver/DriverNotifications').then(m => ({ default: m.DriverNotifications })))
export const JobDetail            = lazy(() => import('@/pages/driver/JobDetail').then(m => ({ default: m.JobDetail })))
export const Profile              = lazy(() => import('@/pages/driver/Profile').then(m => ({ default: m.Profile })))

// ─── Accountant pages ─────────────────────────────────────────────────────────
export const AccountantDashboard  = lazy(() => import('@/pages/accountant/AccountantDashboard').then(m => ({ default: m.AccountantDashboard })))
export const AccountantClients    = lazy(() => import('@/pages/accountant/ClientsPage').then(m => ({ default: m.ClientsPage })))
export const AccountantVendors    = lazy(() => import('@/pages/accountant/VendorsPage').then(m => ({ default: m.VendorsPage })))
export const AccountantDrivers    = lazy(() => import('@/pages/accountant/DriversPage').then(m => ({ default: m.DriversPage })))
export const AccountantTransporters = lazy(() => import('@/pages/accountant/TransportersPage').then(m => ({ default: m.TransportersPage })))
export const AccountantSettings   = lazy(() => import('@/pages/accountant/SettingsPage').then(m => ({ default: m.SettingsPage })))


// ─── Director pages ───────────────────────────────────────────────────────────
export const DirectorDashboard      = lazy(() => import('@/pages/director/DirectorDashboard').then(m => ({ default: m.DirectorDashboard })))
export const UserManagement         = lazy(() => import('@/pages/director/UserManagement').then(m => ({ default: m.UserManagement })))
export const DirectorNotifications  = lazy(() => import('@/pages/director/DirectorNotifications').then(m => ({ default: m.DirectorNotifications })))
export const DriverJobs             = lazy(() => import('@/pages/director/DriverJobs').then(m => ({ default: m.DriverJobs })))
export const ClientJobs             = lazy(() => import('@/pages/director/ClientJobs').then(m => ({ default: m.ClientJobs })))
export const DirectorPricingList    = lazy(() => import('@/pages/director/PricingList').then(m => ({ default: m.PricingList })))
export const DirectorPricingDetail  = lazy(() => import('@/pages/director/PricingDetail').then(m => ({ default: m.PricingDetail })))
export const DirectorPartners       = lazy(() => import('@/pages/director/DirectorPartners').then(m => ({ default: m.DirectorPartners })))

// ─── SuperAdmin ───────────────────────────────────────────────────────────────
export const SuperAdminApp = lazy(() => import('@/pages/superadmin/SuperAdminApp').then(m => ({ default: m.SuperAdminApp })))

// ─── Shared ───────────────────────────────────────────────────────────────────
export const NotFound = lazy(() => import('@/pages/NotFound').then(m => ({ default: m.NotFound })))
