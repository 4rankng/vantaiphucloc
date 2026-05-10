/**
 * API client barrel — re-exports from per-domain modules.
 *
 * Usage:  import { apiClient } from '@/services/api'
 *         apiClient.getPartners()
 *
 * The `apiClient` object gathers all methods so existing call-sites
 * (apiClient.getXxx / apiClient.createXxx) keep working unchanged.
 */

// Shared utilities — also available for direct import
export { toCamel, toSnake, ok, fail, isNetworkError } from './utils'

// Domain modules
import * as partnersApi from './partners.api'
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

export const apiClient = {
  // Partners (replaces Clients + Vendors)
  getPartners: partnersApi.getPartners,
  createPartner: partnersApi.createPartner,
  updatePartner: partnersApi.updatePartner,
  deletePartner: partnersApi.deletePartner,

  // Clients (backward compat — delegates to partners)
  getClients: partnersApi.getPartners,
  createClient: partnersApi.createPartner,
  updateClient: partnersApi.updatePartner,
  deleteClient: partnersApi.deletePartner,

  // Vendors (backward compat — delegates to partners)
  getVendors: partnersApi.getPartners,
  createVendor: partnersApi.createPartner,
  updateVendor: partnersApi.updatePartner,
  deleteVendor: partnersApi.deletePartner,

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
  exportReconciliationExcel: tripOrdersApi.exportReconciliationExcel,
  importTripOrders: tripOrdersApi.importTripOrders,
  exportTripOrdersExcel: tripOrdersApi.exportTripOrdersExcel,
  autoMatch: tripOrdersApi.autoMatch,
  getMatchScores: tripOrdersApi.getMatchScores,
  bulkMatch: tripOrdersApi.bulkMatch,

  // Salary
  calculateSalary: salaryApi.calculateSalary,
  getJobStatus: salaryApi.getJobStatus,
  getDriverEarnings: salaryApi.getDriverEarnings,
  getMyEarnings: salaryApi.getMyEarnings,
  getSalaryConfig: salaryApi.getSalaryConfig,
  updateSalaryConfig: salaryApi.updateSalaryConfig,
  getSalaryDashboard: salaryApi.getSalaryDashboard,
  exportSalaryExcel: salaryApi.exportSalaryExcel,

  // Work Order Export
  exportWorkOrdersExcel: workOrdersApi.exportWorkOrdersExcel,

  // Drivers
  getDrivers: driversApi.getDrivers,
  createDriver: driversApi.createDriver,

  // Dashboard & Notifications
  getDashboardSummary: dashboardApi.getDashboardSummary,
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
export type { AsyncJobResult, JobStatus, DriverEarnings } from './salary.api'
