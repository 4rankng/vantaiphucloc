/**
 * Route definitions — pure config, no JSX.
 * Lazy imports live here so a broken page never crashes the whole app.
 */
import { lazy } from 'react'

// ─── Layouts ──────────────────────────────────────────────────────────────────
export const DriverLayout     = lazy(() => import('@/components/shared/DriverLayout').then(m => ({ default: m.DriverLayout })))
export const AccountantLayout = lazy(() => import('@/components/shared/AccountantLayout').then(m => ({ default: m.AccountantLayout })))
export const DirectorLayout   = lazy(() => import('@/components/shared/DirectorLayout').then(m => ({ default: m.DirectorLayout })))

// ─── Driver pages ─────────────────────────────────────────────────────────────
export const DriverHome           = lazy(() => import('@/pages/driver/DriverHome').then(m => ({ default: m.DriverHome })))
export const CreateWorkOrder      = lazy(() => import('@/pages/driver/CreateWorkOrder').then(m => ({ default: m.CreateWorkOrder })))
export const DriverHistory        = lazy(() => import('@/pages/driver/DriverHistory').then(m => ({ default: m.DriverHistory })))
export const DriverNotifications  = lazy(() => import('@/pages/driver/DriverNotifications').then(m => ({ default: m.DriverNotifications })))
export const JobDetail            = lazy(() => import('@/pages/driver/JobDetail').then(m => ({ default: m.JobDetail })))
export const Profile              = lazy(() => import('@/pages/driver/Profile').then(m => ({ default: m.Profile })))

// ─── Accountant pages ─────────────────────────────────────────────────────────
export const AccountantDashboard  = lazy(() => import('@/pages/accountant/AccountantDashboard').then(m => ({ default: m.AccountantDashboard })))
export const ClientList           = lazy(() => import('@/pages/accountant/ClientList').then(m => ({ default: m.ClientList })))
export const ClientsAndVendors    = lazy(() => import('@/pages/accountant/ClientsAndVendors').then(m => ({ default: m.ClientsAndVendors })))
export const RouteList            = lazy(() => import('@/pages/accountant/RouteList').then(m => ({ default: m.RouteList })))
export const WorkOrderList        = lazy(() => import('@/pages/accountant/WorkOrderList').then(m => ({ default: m.WorkOrderList })))
export const TripList             = lazy(() => import('@/pages/accountant/TripList').then(m => ({ default: m.TripList })))
export const TripDetail           = lazy(() => import('@/pages/accountant/TripDetail').then(m => ({ default: m.TripDetail })))
export const CreateTrip           = lazy(() => import('@/pages/accountant/CreateTrip').then(m => ({ default: m.CreateTrip })))
export const SalarySetup          = lazy(() => import('@/pages/accountant/SalarySetup').then(m => ({ default: m.SalarySetup })))
export const MatchJob             = lazy(() => import('@/pages/accountant/MatchJob').then(m => ({ default: m.MatchJob })))
export const MatchTrip            = lazy(() => import('@/pages/accountant/MatchTrip').then(m => ({ default: m.MatchTrip })))
export const PricingList          = lazy(() => import('@/pages/accountant/PricingList').then(m => ({ default: m.PricingList })))

// ─── Director pages ───────────────────────────────────────────────────────────
export const DirectorDashboard      = lazy(() => import('@/pages/director/DirectorDashboard').then(m => ({ default: m.DirectorDashboard })))
export const UserManagement         = lazy(() => import('@/pages/director/UserManagement').then(m => ({ default: m.UserManagement })))
export const DirectorNotifications  = lazy(() => import('@/pages/director/DirectorNotifications').then(m => ({ default: m.DirectorNotifications })))
export const DriverJobs             = lazy(() => import('@/pages/director/DriverJobs').then(m => ({ default: m.DriverJobs })))
export const ClientJobs             = lazy(() => import('@/pages/director/ClientJobs').then(m => ({ default: m.ClientJobs })))

// ─── SuperAdmin ───────────────────────────────────────────────────────────────
export const SuperAdminApp = lazy(() => import('@/pages/superadmin/SuperAdminApp').then(m => ({ default: m.SuperAdminApp })))
