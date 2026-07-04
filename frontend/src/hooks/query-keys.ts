import type { DriverEarnings } from '@/services/api/salary.api'
import type { DeliveredTripCreatePayload, DeliveredTripUpdatePayload } from '@/services/api/deliveredTrips.api'
import type { BookedTripCreatePayload, BookedTripUpdatePayload } from '@/services/api/bookedTrips.api'
import type { PricingFormat, PricingCommitRequest } from '@/services/api/imports.api'

export type {
  DeliveredTripCreatePayload,
  DeliveredTripUpdatePayload,
  BookedTripCreatePayload,
  BookedTripUpdatePayload,
  DriverEarnings,
  PricingFormat,
  PricingCommitRequest,
}
import type { UserAccount, UserProfile } from '@/services/api/users.api'

export type { UserAccount, UserProfile }

// ─── Query key factories ─────────────────────────────────────────────────────

import type { QueryClient } from '@tanstack/react-query'

export const queryKeys = {
  // ─── Clients & Vendors ──────────────────────────────────────────────────────
  clients: ['clients'] as const,
  client: (id: number) => ['clients', id] as const,
  clientsInfinite: (search = '', sortBy = '', sortOrder = 'asc') =>
    ['clients-infinite', search, sortBy, sortOrder] as const,
  vendors: ['vendors'] as const,
  vendor: (id: number) => ['vendors', id] as const,
  vendorsPaged: (search = '', sortBy = '', sortOrder = 'asc', page = 1, pageSize = 100) =>
    ['vendors-paged', search, sortBy, sortOrder, page, pageSize] as const,

  // ─── Locations ──────────────────────────────────────────────────────────────
  locations: ['locations'] as const,
  locationAliases: ['location-aliases'] as const,
  locationAliasesFiltered: (locationId?: number) =>
    ['location-aliases', locationId ?? 'all'] as const,
  pendingReviewLocations: ['pending-review-locations'] as const,

  // ─── Trips ──────────────────────────────────────────────────────────────────
  deliveredTrips: ['delivered-trips'] as const,
  deliveredTrip: (id: number) => ['delivered-trips', id] as const,
  deliveredTripsFiltered: (filters?: Record<string, string>) =>
    ['delivered-trips', filters] as const,
  deliveredTripsInfinite: ['delivered-trips-infinite'] as const,
  duplicateContainers: (filters?: Record<string, string | number | undefined>) =>
    ['delivered-trips', 'duplicate-containers', filters] as const,
  bookedTrips: ['booked-trips'] as const,
  bookedTrip: (id: number) => ['booked-trips', id] as const,
  bookedTripsFiltered: (filters?: Record<string, string>) =>
    ['booked-trips', filters] as const,
  suggestMatches: ['suggest-matches'] as const,
  suggestWos: ['suggest-wos'] as const,
  contTypeStats: (driverId?: number | null, dateFrom?: string | null, dateTo?: string | null) =>
    ['cont-type-stats', driverId ?? null, dateFrom ?? null, dateTo ?? null] as const,

  // ─── Fleet ──────────────────────────────────────────────────────────────────
  drivers: ['drivers'] as const,
  driversPaged: ['drivers-paged'] as const,
  vehicles: (activeOnly = true) => ['vehicles', activeOnly] as const,
  vehicleDrivers: ['vehicle-drivers'] as const,
  vehicleExpenses: (params?: object) =>
    ['vehicle-expenses', params ?? {}] as const,
  vehicleExpensesInfinite: (vehicleId = '', category = '', dateFrom = '', dateTo = '') =>
    ['vehicle-expenses-infinite', vehicleId, category, dateFrom, dateTo] as const,

  // ─── Salary & Payroll ───────────────────────────────────────────────────────
  driverEarnings: (driverId: number, startDate: string, endDate: string) =>
    ['driver-earnings', driverId, startDate, endDate] as const,
  myEarnings: (startDate: string, endDate: string) =>
    ['my-earnings', startDate, endDate] as const,
  salaryDashboard: (periodStart: string, periodEnd: string) =>
    ['salary-dashboard', periodStart, periodEnd] as const,
  salaryConfig: ['salary/config'] as const,
  driverBaseSalary: (driverId: number) => ['driver-base-salary', driverId] as const,
  salaryPeriod: (fromDate: string, toDate: string) => ['salary-period', fromDate, toDate] as const,

  // ─── Dashboard & KPIs ───────────────────────────────────────────────────────
  dashboard: ['dashboard'] as const,
  dashboardSummary: (dateFrom: string, dateTo: string) =>
    ['dashboard-summary', dateFrom, dateTo] as const,
  directorDashboard: (dateFrom: string, dateTo: string) =>
    ['director-dashboard', dateFrom, dateTo] as const,
  directorDashboardDrilldown: (dateFrom: string, dateTo: string) =>
    ['director-dashboard-drilldown', dateFrom, dateTo] as const,
  kpiTrends: (days: number, endDate?: string) =>
    ['kpi-trends', days, endDate] as const,
  ocrStats: (days: number, includeHourly = false) =>
    ['ocr-stats', days, includeHourly] as const,
  monthlyPnL: (startDate: string, endDate: string) =>
    ['monthly-pnl', startDate, endDate] as const,
  vehiclePnL: (dateFrom: string, dateTo: string, vehicleId?: number) =>
    ['vehicle-pnl', dateFrom, dateTo, vehicleId ?? 'all'] as const,
  tripDailyStats: (dateFrom: string, dateTo: string, clientId?: number | null, driverId?: number | null, matched?: boolean | null) =>
    ['trip-daily-stats', dateFrom, dateTo, clientId ?? null, driverId ?? null, matched ?? null] as const,

  // ─── Route Pricing ──────────────────────────────────────────────────────────
  routePricings: ['route-pricings'] as const,
  routePricingsFiltered: (filters?: { clientId?: number; workType?: string }) =>
    ['route-pricings', filters] as const,
  vendorRoutePricings: ['vendor-route-pricings'] as const,
  vendorRoutePricingsFiltered: (filters?: { vendorId?: number; workType?: string }) =>
    ['vendor-route-pricings', filters] as const,

  // ─── Operation Types ────────────────────────────────────────────────────────
  operationTypes: ['operation-types'] as const,
  operationTypeAliases: (operationTypeId?: number) =>
    ['operation-type-aliases', operationTypeId ?? 'all'] as const,

  // ─── Imports ────────────────────────────────────────────────────────────────
  importExcelPreview: (jobId: string) =>
    ['import-excel-preview', jobId] as const,

  // ─── Users & Auth ───────────────────────────────────────────────────────────
  users: ['users'] as const,
  usersPaged: ['users-paged'] as const,
  profile: ['profile'] as const,
  notifications: ['notifications'] as const,
}

/**
 * Invalidate all query caches that depend on delivered-trip data.
 * Call this after any mutation that changes delivered trips (create, update,
 * delete, match, unmatch, import).
 */
export function invalidateDeliveredTripDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.deliveredTrips })
  qc.invalidateQueries({ queryKey: queryKeys.deliveredTripsInfinite })
  qc.invalidateQueries({ queryKey: queryKeys.bookedTrips })
  qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
  qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
  qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
}

export function invalidateClientDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.clients })
  qc.invalidateQueries({ queryKey: ['clients-infinite'] })
  qc.invalidateQueries({ queryKey: queryKeys.deliveredTrips })
  qc.invalidateQueries({ queryKey: queryKeys.bookedTrips })
  qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
}

export function invalidateVendorDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.vendors })
  qc.invalidateQueries({ queryKey: queryKeys.vendorsPaged() })
}

export function invalidateDriverDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.drivers })
  qc.invalidateQueries({ queryKey: queryKeys.driversPaged })
  qc.invalidateQueries({ queryKey: queryKeys.vehicleDrivers })
  qc.invalidateQueries({ queryKey: ['driver-earnings'] })
  qc.invalidateQueries({ queryKey: ['salary-dashboard'] })
}

export function invalidateBookedTripDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.bookedTrips })
  qc.invalidateQueries({ queryKey: queryKeys.deliveredTrips })
  qc.invalidateQueries({ queryKey: queryKeys.deliveredTripsInfinite })
  qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
  qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
  qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
}

export function invalidateLocationDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.locations })
  qc.invalidateQueries({ queryKey: queryKeys.locationAliases })
  qc.invalidateQueries({ queryKey: ['routes'] })
  qc.invalidateQueries({ queryKey: queryKeys.routePricings })
  qc.invalidateQueries({ queryKey: queryKeys.deliveredTrips })
  qc.invalidateQueries({ queryKey: queryKeys.deliveredTripsInfinite })
  qc.invalidateQueries({ queryKey: queryKeys.bookedTrips })
}

export function invalidateSalaryDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['driver-earnings'] })
  qc.invalidateQueries({ queryKey: ['my-earnings'] })
  qc.invalidateQueries({ queryKey: ['salary-dashboard'] })
  qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
}

export function invalidateVehicleExpenseDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['vehicle-expenses'] })
  qc.invalidateQueries({ queryKey: queryKeys.vehicleExpensesInfinite() })
  qc.invalidateQueries({ queryKey: ['vehicle-pnl'] })
  qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
  qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
}

export function invalidateOperationTypeDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.operationTypes })
  qc.invalidateQueries({ queryKey: ['operation-type-aliases'] })
  qc.invalidateQueries({ queryKey: queryKeys.routePricings })
  qc.invalidateQueries({ queryKey: queryKeys.vendorRoutePricings })
}
