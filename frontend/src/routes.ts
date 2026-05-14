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
export const ClientList           = lazy(() => import('@/pages/accountant/ClientList').then(m => ({ default: m.ClientList })))
export const ClientsAndVendors    = lazy(() => import('@/pages/accountant/ClientsAndVendors').then(m => ({ default: m.ClientsAndVendors })))
export const RouteList            = lazy(() => import('@/pages/accountant/RouteList').then(m => ({ default: m.RouteList })))
export const WorkOrderList        = lazy(() => import('@/pages/accountant/WorkOrderList').then(m => ({ default: m.WorkOrderList })))
export const TripList             = lazy(() => import('@/pages/accountant/TripList').then(m => ({ default: m.TripList })))
export const TripDetail           = lazy(() => import('@/pages/accountant/TripDetail').then(m => ({ default: m.TripDetail })))
export const CreateTrip           = lazy(() => import('@/pages/accountant/CreateTrip').then(m => ({ default: m.CreateTrip })))
export const SalarySetup          = lazy(() => import('@/pages/accountant/SalarySetup').then(m => ({ default: m.SalarySetup })))
export const MatchTrip            = lazy(() => import('@/pages/accountant/MatchTrip').then(m => ({ default: m.MatchTrip })))
export const PricingList          = lazy(() => import('@/pages/accountant/PricingList').then(m => ({ default: m.PricingList })))
export const PricingDetail        = lazy(() => import('@/pages/accountant/PricingDetail').then(m => ({ default: m.PricingDetail })))
export const AccountantNotifications = lazy(() => import('@/pages/accountant/AccountantNotifications').then(m => ({ default: m.AccountantNotifications })))
export const CustomerSettlementReport = lazy(() => import('@/pages/accountant/CustomerSettlementReport').then(m => ({ default: m.CustomerSettlementReport })))
export const ImportOrders            = lazy(() => import('@/pages/accountant/ImportOrders').then(m => ({ default: m.ImportOrders })))
export const ImportPricing           = lazy(() => import('@/pages/accountant/ImportPricing').then(m => ({ default: m.ImportPricing })))
export const VendorList             = lazy(() => import('@/pages/accountant/VendorList').then(m => ({ default: m.VendorList })))
export const AccountantSettings      = lazy(() => import('@/pages/accountant/AccountantSettings').then(m => ({ default: m.AccountantSettings })))
export const SettingsPricingList     = lazy(() => import('@/pages/accountant/SettingsPricingList').then(m => ({ default: m.SettingsPricingList })))
export const SettingsPricingDetail   = lazy(() => import('@/pages/accountant/SettingsPricingDetail').then(m => ({ default: m.SettingsPricingDetail })))
export const LocationAliasManager    = lazy(() => import('@/pages/accountant/LocationAliasManager').then(m => ({ default: m.LocationAliasManager })))
export const RevenueProfit           = lazy(() => import('@/pages/accountant/RevenueProfit').then(m => ({ default: m.RevenueProfit })))
export const CustomerReconciliation  = lazy(() => import('@/pages/accountant/CustomerReconciliation').then(m => ({ default: m.CustomerReconciliation })))
export const VehicleExpenses         = lazy(() => import('@/pages/accountant/VehicleExpenses').then(m => ({ default: m.VehicleExpenses })))
export const VendorReconciliation    = lazy(() => import('@/pages/accountant/VendorReconciliation').then(m => ({ default: m.VendorReconciliation })))


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
