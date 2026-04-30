/**
 * API client barrel — re-exports from per-domain modules.
 *
 * Usage:  import { apiClient } from '@/services/api'
 *         apiClient.getClients()
 *
 * The `apiClient` object gathers all methods so existing call-sites
 * (apiClient.getXxx / apiClient.createXxx) keep working unchanged.
 */

// Shared utilities — also available for direct import
export { toCamel, toSnake, ok, fail, isNetworkError } from './utils'

// Domain modules
import * as clientsApi from './clients.api'
import * as routesApi from './routes.api'
import * as pricingsApi from './pricings.api'
import * as workOrdersApi from './workOrders.api'
import * as tripOrdersApi from './tripOrders.api'
import * as salaryApi from './salary.api'
import * as driversApi from './drivers.api'
import * as dashboardApi from './dashboard.api'
import * as vendorsApi from './vendors.api'

export const apiClient = {
  // Clients
  getClients: clientsApi.getClients,
  createClient: clientsApi.createClient,
  updateClient: clientsApi.updateClient,
  deleteClient: clientsApi.deleteClient,

  // Routes
  getRoutes: routesApi.getRoutes,
  createRoute: routesApi.createRoute,
  updateRoute: routesApi.updateRoute,
  deleteRoute: routesApi.deleteRoute,

  // Pricings
  getPricings: pricingsApi.getPricings,
  createPricing: pricingsApi.createPricing,
  updatePricing: pricingsApi.updatePricing,
  deletePricing: pricingsApi.deletePricing,

  // Work Orders
  getWorkOrders: workOrdersApi.getWorkOrders,
  createWorkOrder: workOrdersApi.createWorkOrder,
  updateWorkOrder: workOrdersApi.updateWorkOrder,

  // Trip Orders
  getTripOrders: tripOrdersApi.getTripOrders,
  createTripOrder: tripOrdersApi.createTripOrder,
  updateTripOrder: tripOrdersApi.updateTripOrder,
  reconcile: tripOrdersApi.reconcile,

  // Salary
  calculateSalary: salaryApi.calculateSalary,
  getJobStatus: salaryApi.getJobStatus,
  getSalaryPeriods: salaryApi.getSalaryPeriods,
  updateSalaryPeriod: salaryApi.updateSalaryPeriod,

  // Drivers
  getDrivers: driversApi.getDrivers,
  createDriver: driversApi.createDriver,

  // Vendors
  getVendors: vendorsApi.getVendors,
  createVendor: vendorsApi.createVendor,
  updateVendor: vendorsApi.updateVendor,
  deleteVendor: vendorsApi.deleteVendor,

  // Dashboard & Notifications
  getDashboardSummary: dashboardApi.getDashboardSummary,
  getNotifications: dashboardApi.getNotifications,
}

// Re-export types from salary.api
export type { AsyncJobResult, JobStatus } from './salary.api'
