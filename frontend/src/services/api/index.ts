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
import * as routesApi from './routes.api'
import * as locationsApi from './locations.api'
import * as locationAliasesApi from './locationAliases.api'
import * as pricingsApi from './pricings.api'
import * as workOrdersApi from './workOrders.api'
import * as tripOrdersApi from './tripOrders.api'
import * as salaryApi from './salary.api'
import * as driversApi from './drivers.api'
import * as dashboardApi from './dashboard.api'
import * as usersApi from './users.api'
import * as reportsApi from './reports.api'
import * as importsApi from './imports.api'
import * as auditApi from './audit.api'
import * as pnlApi from './pnl.api'
import * as vehicleExpensesApi from './vehicleExpenses.api'
import * as vehiclesApi from './vehicles.api'
import * as reconciliationImportsApi from './reconciliationImports.api'
import * as vehicleDriversApi from './vehicleDrivers.api'

export const apiClient = {
  // Clients
  getClients: clientsApi.getClients,
  createClient: clientsApi.createClient,
  updateClient: clientsApi.updateClient,
  deleteClient: clientsApi.deleteClient,

  // Vendors
  getVendors: vendorsApi.getVendors,
  createVendor: vendorsApi.createVendor,
  updateVendor: vendorsApi.updateVendor,
  deleteVendor: vendorsApi.deleteVendor,
  getVendorSummary: vendorsApi.getVendorSummary,

  // Routes (DEPRECATED — returns empty)
  getRoutes: routesApi.getRoutes,
  createRoute: routesApi.createRoute,
  updateRoute: routesApi.updateRoute,
  deleteRoute: routesApi.deleteRoute,

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
  getWorkOrder: workOrdersApi.getWorkOrder,
  getWorkOrders: workOrdersApi.getWorkOrders,
  createWorkOrder: workOrdersApi.createWorkOrder,
  updateWorkOrder: workOrdersApi.updateWorkOrder,
  ocrContainer: workOrdersApi.ocrContainer,
  validateContainer: workOrdersApi.validateContainer,
  getSuggestedRoutes: workOrdersApi.getSuggestedRoutes,
  bulkImportAndMatch: workOrdersApi.bulkImportAndMatch,
  aiParsePreview: workOrdersApi.aiParsePreview,

  // Trip Orders
  getTripOrders: tripOrdersApi.getTripOrders,
  createTripOrder: tripOrdersApi.createTripOrder,
  updateTripOrder: tripOrdersApi.updateTripOrder,
  reconcile: tripOrdersApi.reconcile,
  unmatch: tripOrdersApi.unmatch,
  suggestMatches: tripOrdersApi.suggestMatches,
  suggestWosForTrip: tripOrdersApi.suggestWosForTrip,
  toggleTripConfirmation: tripOrdersApi.toggleTripConfirmation,
  uploadCustomerExcel: tripOrdersApi.uploadCustomerExcel,
  getDistinctTripPartners: tripOrdersApi.getDistinctTripPartners,
  exportReconciliationExcel: tripOrdersApi.exportReconciliationExcel,
  exportDoiSoatExcel: tripOrdersApi.exportDoiSoatExcel,
  importTripOrders: tripOrdersApi.importTripOrders,
  exportTripOrdersExcel: tripOrdersApi.exportTripOrdersExcel,
  autoMatch: tripOrdersApi.autoMatch,
  autoMatchPreview: tripOrdersApi.autoMatchPreview,
  autoMatchConfirm: tripOrdersApi.autoMatchConfirm,
  getMatchScores: tripOrdersApi.getMatchScores,
  bulkMatch: tripOrdersApi.bulkMatch,
  batchReconcileForWO: tripOrdersApi.batchReconcileForWO,
  batchReconcileForTO: tripOrdersApi.batchReconcileForTO,
  searchTripOrders: tripOrdersApi.searchTripOrders,

  // Salary
  calculateSalary: salaryApi.calculateSalary,
  getJobStatus: salaryApi.getJobStatus,
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

  // Customer reconciliation imports
  previewReconciliationImport: reconciliationImportsApi.previewReconciliationImport,
  commitReconciliationImport: reconciliationImportsApi.commitReconciliationImport,
  listReconciliationImports: reconciliationImportsApi.listReconciliationImports,
  getReconciliationImport: reconciliationImportsApi.getReconciliationImport,
  updateRowVerdict: reconciliationImportsApi.updateRowVerdict,
  uploadCustomerResponse: reconciliationImportsApi.uploadCustomerResponse,
  getExportDoiSoatUrl: reconciliationImportsApi.getExportDoiSoatUrl,

  // Work Order Export
  exportWorkOrdersExcel: workOrdersApi.exportWorkOrdersExcel,

  // Drivers
  getDrivers: driversApi.getDrivers,
  createDriver: driversApi.createDriver,
  updateDriver: driversApi.updateDriver,

  // Dashboard & Notifications
  getDashboardSummary: dashboardApi.getDashboardSummary,
  getKpiTrends: dashboardApi.getKpiTrends,
  getNotifications: dashboardApi.getNotifications,

  // Users
  getUsers: usersApi.getUsers,
  createUser: usersApi.createUser,
  updateUser: usersApi.updateUser,
  deleteUser: usersApi.deleteUser,
  getProfile: usersApi.getProfile,
  updateProfile: usersApi.updateProfile,
  changePassword: usersApi.changePassword,

  // Reports
  exportCustomerSettlement: reportsApi.exportCustomerSettlement,

  // Customer-Excel imports
  getCanonicalSchema: importsApi.getCanonicalSchema,
  listExcelSheets: importsApi.listExcelSheets,
  previewCustomerExcel: importsApi.previewCustomerExcel,
  commitCustomerExcel: importsApi.commitCustomerExcel,
  listImportTemplates: importsApi.listImportTemplates,
  applyPricingToTripIds: importsApi.applyPricingToTripIds,

  // Customer-Pricing imports
  previewCustomerPricing: importsApi.previewCustomerPricing,
  commitCustomerPricing: importsApi.commitCustomerPricing,

  // Audit Logs
  getAuditLogs: auditApi.getAuditLogs,
}

// Re-export types from salary.api
export type {
  AsyncJobResult,
  JobStatus,
  DriverEarnings,
  DriverBaseSalary,
  SetDriverBaseSalaryInput,
} from './salary.api'
export type {
  MonthlyPnL,
  PartnerRevenueBreakdown,
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
  CustomerVerdict,
  ImportStatus,
  RowApplyStatus,
  DiffClassification,
  ParsedRowInput,
  ImportPreviewRequest,
  ReconciliationRow,
  ReconciliationImport,
  RowVerdictPayload,
} from './reconciliationImports.api'
