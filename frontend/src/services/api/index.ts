/**
 * API client barrel — re-exports from per-domain modules.
 *
 * Usage:  import { apiClient } from '@/services/api'
 *         apiClient.getClients()
 */

// Shared utilities — also available for direct import
export { toCamel, toSnake, ok, fail, isNetworkError } from './utils'

// Domain modules
import * as clientsApi from './clients.api'
import * as vendorsApi from './vendors.api'
import * as locationsApi from './locations.api'
import * as locationAliasesApi from './locationAliases.api'
import * as pricingsApi from './pricings.api'
import * as deliveredTripsApi from './deliveredTrips.api'
import * as bookedTripsApi from './bookedTrips.api'
import * as salaryApi from './salary.api'
import * as driversApi from './drivers.api'
import * as dashboardApi from './dashboard.api'
import * as usersApi from './users.api'
import * as importsApi from './imports.api'
import * as auditApi from './audit.api'
import * as pnlApi from './pnl.api'
import * as vehicleExpensesApi from './vehicleExpenses.api'
import * as vehiclesApi from './vehicles.api'
import * as vehicleDriversApi from './vehicleDrivers.api'
import * as routePricingsApi from './routePricings.api'
import * as vendorRoutePricingsApi from './vendorRoutePricings.api'

export const apiClient = {
  // Clients
  getClients: clientsApi.getClients,
  getClientsPaged: clientsApi.getClientsPaged,
  createClient: clientsApi.createClient,
  updateClient: clientsApi.updateClient,
  deleteClient: clientsApi.deleteClient,

  // Vendors
  getVendors: vendorsApi.getVendors,
  getVendorsPaged: vendorsApi.getVendorsPaged,
  createVendor: vendorsApi.createVendor,
  updateVendor: vendorsApi.updateVendor,
  deleteVendor: vendorsApi.deleteVendor,

  // Locations
  getLocations: locationsApi.getLocations,
  createLocation: locationsApi.createLocation,
  updateLocation: locationsApi.updateLocation,
  deleteLocation: locationsApi.deleteLocation,

  // Location Aliases
  listAliases: locationAliasesApi.listAliases,
  createAlias: locationAliasesApi.createAlias,
  confirmAlias: locationAliasesApi.confirmAlias,
  rejectAlias: locationAliasesApi.rejectAlias,
  reopenAlias: locationAliasesApi.reopenAlias,
  mergeLocations: locationAliasesApi.mergeLocations,
  getPendingReviewLocations: locationAliasesApi.getPendingReviewLocations,

  // Pricings
  getPricings: pricingsApi.getPricings,
  createPricing: pricingsApi.createPricing,
  updatePricing: pricingsApi.updatePricing,
  deletePricing: pricingsApi.deletePricing,

  // Work Orders
  getDeliveredTrip: deliveredTripsApi.getDeliveredTrip,
  getDeliveredTrips: deliveredTripsApi.getDeliveredTrips,
  createDeliveredTrip: deliveredTripsApi.createDeliveredTrip,
  updateDeliveredTrip: deliveredTripsApi.updateDeliveredTrip,
  ocrContainer: deliveredTripsApi.ocrContainer,
  validateContainer: deliveredTripsApi.validateContainer,
  getSuggestedRoutes: deliveredTripsApi.getSuggestedRoutes,
  bulkImportAndMatch: deliveredTripsApi.bulkImportAndMatch,
  parsePreview: deliveredTripsApi.parsePreview,

  // Trip Orders
  getBookedTrip: bookedTripsApi.getBookedTrip,
  getBookedTrips: bookedTripsApi.getBookedTrips,
  createBookedTrip: bookedTripsApi.createBookedTrip,
  updateBookedTrip: bookedTripsApi.updateBookedTrip,
  toggleTripConfirmation: bookedTripsApi.toggleTripConfirmation,
  getDistinctTripPartners: bookedTripsApi.getDistinctTripPartners,
  importBookedTrips: bookedTripsApi.importBookedTrips,
  exportBookedTripsExcel: bookedTripsApi.exportBookedTripsExcel,
  exportDoiSoatExcel: bookedTripsApi.exportDoiSoatExcel,

  // Salary
  calculateSalary: salaryApi.calculateSalary,
  getDriverEarnings: salaryApi.getDriverEarnings,
  getMyEarnings: salaryApi.getMyEarnings,
  getSalaryConfig: salaryApi.getSalaryConfig,
  updateSalaryConfig: salaryApi.updateSalaryConfig,
  getSalaryDashboard: salaryApi.getSalaryDashboard,
  exportSalaryExcel: salaryApi.exportSalaryExcel,
  getDriverBaseSalaryHistory: salaryApi.getDriverBaseSalaryHistory,
  setDriverBaseSalary: salaryApi.setDriverBaseSalary,

  // Monthly P&L
  getMonthlyPnL: pnlApi.getMonthlyPnL,
  getVehiclePnL: pnlApi.getVehiclePnL,
  getTripDailyStats: pnlApi.getTripDailyStats,

  // Vehicle expenses (CP Xe)
  listVehicleExpenses: vehicleExpensesApi.listVehicleExpenses,
  createVehicleExpense: vehicleExpensesApi.createVehicleExpense,
  updateVehicleExpense: vehicleExpensesApi.updateVehicleExpense,
  deleteVehicleExpense: vehicleExpensesApi.deleteVehicleExpense,

  // Vehicles
  getVehicles: vehiclesApi.getVehicles,

  // Vehicle Drivers
  getVehicleDrivers: vehicleDriversApi.getVehicleDrivers,
  addVehicleDriver: vehicleDriversApi.addVehicleDriver,
  removeVehicleDriver: vehicleDriversApi.removeVehicleDriver,
  createVehicle: vehicleDriversApi.createVehicle,

  // Work Order Export
  exportDeliveredTripsExcel: deliveredTripsApi.exportDeliveredTripsExcel,

  // Drivers
  getDrivers: driversApi.getDrivers,
  getDriversPaged: driversApi.getDriversPaged,
  createDriver: driversApi.createDriver,
  updateDriver: driversApi.updateDriver,
  resetDriverPassword: driversApi.resetDriverPassword,

  // Dashboard & Notifications
  getDashboardSummary: dashboardApi.getDashboardSummary,
  getKpiTrends: dashboardApi.getKpiTrends,
  getNotifications: dashboardApi.getNotifications,

  // Users
  getUsers: usersApi.getUsers,
  getUsersPaged: usersApi.getUsersPaged,
  createUser: usersApi.createUser,
  updateUser: usersApi.updateUser,
  deleteUser: usersApi.deleteUser,
  getProfile: usersApi.getProfile,
  updateProfile: usersApi.updateProfile,
  changePassword: usersApi.changePassword,

  // Customer-Excel imports
  getCanonicalSchema: importsApi.getCanonicalSchema,
  listExcelSheets: importsApi.listExcelSheets,
  previewCustomerExcel: importsApi.previewCustomerExcel,
  commitCustomerExcel: importsApi.commitCustomerExcel,
  applyPricingToTripIds: importsApi.applyPricingToTripIds,
  uploadVendorReconciliation: importsApi.uploadVendorReconciliation,
  uploadDriverReconciliation: importsApi.uploadDriverReconciliation,
  previewDriverReconciliation: importsApi.previewDriverReconciliation,
  commitDriverReconciliation: importsApi.commitDriverReconciliation,

  // Customer-Pricing imports
  previewCustomerPricing: importsApi.previewCustomerPricing,
  commitCustomerPricing: importsApi.commitCustomerPricing,

  // Audit Logs
  getAuditLogs: auditApi.getAuditLogs,

  // Route Pricings (Cước tuyến)
  getRoutePricings: routePricingsApi.getRoutePricings,
  createRoutePricing: routePricingsApi.createRoutePricing,
  updateRoutePricing: routePricingsApi.updateRoutePricing,
  deleteRoutePricing: routePricingsApi.deleteRoutePricing,

  // Vendor Route Pricings (Cước trả xe ngoài)
  getVendorRoutePricings: vendorRoutePricingsApi.getVendorRoutePricings,
  createVendorRoutePricing: vendorRoutePricingsApi.createVendorRoutePricing,
  updateVendorRoutePricing: vendorRoutePricingsApi.updateVendorRoutePricing,
  deleteVendorRoutePricing: vendorRoutePricingsApi.deleteVendorRoutePricing,
}

// Re-export types from salary.api
export type {
  AsyncJobResult,
  DriverEarnings,
  DriverBaseSalary,
  SetDriverBaseSalaryInput,
} from './salary.api'
export type {
  MonthlyPnL,
  ClientRevenueBreakdown,
  VehiclePnLRow,
  VehiclePnLResponse,
  VehicleExpenseSummary,
  TripDailyStats,
  TripDayBucket,
} from './pnl.api'
export type {
  VehicleExpense,
  VehicleExpenseCreate,
  VehicleExpenseCategory,
} from './vehicleExpenses.api'
