/**
 * API client barrel — re-exports from per-domain modules.
 *
 * Usage:  import { apiClient } from '@/services/api'
 *         apiClient.getClients()
 */

// Shared utilities — also available for direct import
export { toCamel, toSnake, ok, fail } from './utils'

// Domain modules
import * as clientsApi from './clients.api'
import * as vendorsApi from './vendors.api'
import * as locationsApi from './locations.api'
import * as locationAliasesApi from './locationAliases.api'
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
import * as operationTypesApi from './operationTypes.api'
import * as ocrStatsApi from './ocrStats.api'

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
  previewLocationImport: locationsApi.previewLocationImport,
  commitLocationImport: locationsApi.commitLocationImport,

  // Location Aliases
  listAliases: locationAliasesApi.listAliases,
  createAlias: locationAliasesApi.createAlias,
  confirmAlias: locationAliasesApi.confirmAlias,
  rejectAlias: locationAliasesApi.rejectAlias,
  reopenAlias: locationAliasesApi.reopenAlias,
  mergeLocations: locationAliasesApi.mergeLocations,
  getPendingReviewLocations: locationAliasesApi.getPendingReviewLocations,

  // Work Orders
  getDeliveredTrip: deliveredTripsApi.getDeliveredTrip,
  getDeliveredTrips: deliveredTripsApi.getDeliveredTrips,
  createDeliveredTrip: deliveredTripsApi.createDeliveredTrip,
  updateDeliveredTrip: deliveredTripsApi.updateDeliveredTrip,
  deleteDeliveredTrip: deliveredTripsApi.deleteDeliveredTrip,
  ocrContainer: deliveredTripsApi.ocrContainer,
  validateContainer: deliveredTripsApi.validateContainer,
  getSuggestedRoutes: deliveredTripsApi.getSuggestedRoutes,
  bulkImportAndMatch: deliveredTripsApi.bulkImportAndMatch,
  parsePreview: deliveredTripsApi.parsePreview,
  uploadDeliveredTripPhoto: deliveredTripsApi.uploadDeliveredTripPhoto,
  getContTypeStats: deliveredTripsApi.getContTypeStats,
  getDuplicateContainers: deliveredTripsApi.getDuplicateContainers,
  checkDeliveredTripDuplicate: deliveredTripsApi.checkDeliveredTripDuplicate,

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
  getSalaryPeriod: salaryApi.getSalaryPeriod,
  upsertDriverSalary: salaryApi.upsertDriverSalary,
  initializeSalaryPeriod: salaryApi.initializeSalaryPeriod,

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
  updateVehicle: vehiclesApi.updateVehicle,
  deleteVehicle: vehiclesApi.deleteVehicle,

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
  deleteDriver: driversApi.deleteDriver,

  // Dashboard & Notifications
  getDashboardSummary: dashboardApi.getDashboardSummary,
  getKpiTrends: dashboardApi.getKpiTrends,
  getNotifications: dashboardApi.getNotifications,
  getOcrStats: ocrStatsApi.getOcrStats,
  getOcrFailures: ocrStatsApi.getOcrFailures,

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
  enqueueCustomerExcelPreview: importsApi.enqueueCustomerExcelPreview,
  getCustomerExcelPreviewStatus: importsApi.getCustomerExcelPreviewStatus,
  isTerminalStatus: importsApi.isTerminalStatus,
  uploadVendorReconciliation: importsApi.uploadVendorReconciliation,
  previewVendorReconciliation: importsApi.previewVendorReconciliation,
  commitVendorReconciliation: importsApi.commitVendorReconciliation,
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

  // Operation Types (Loại tác nghiệp)
  getOperationTypes: operationTypesApi.getOperationTypes,
  createOperationType: operationTypesApi.createOperationType,
  updateOperationType: operationTypesApi.updateOperationType,
  deleteOperationType: operationTypesApi.deleteOperationType,

  // Operation Type Aliases
  listOperationTypeAliases: operationTypesApi.listOperationTypeAliases,
  createOperationTypeAlias: operationTypesApi.createOperationTypeAlias,
  promoteOperationTypeAlias: operationTypesApi.promoteOperationTypeAlias,
  deleteOperationTypeAlias: operationTypesApi.deleteOperationTypeAlias,
}

// Re-export types from salary.api
export type {
  AsyncJobResult,
  DriverEarnings,
  DriverBaseSalary,
  SetDriverBaseSalaryInput,
  DriverSalaryRecord,
  DriverSalaryUpdateInput,
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
export type {
  OcrStats,
  OcrDailyPoint,
  OcrMonthlyPoint,
} from './ocrStats.api'
