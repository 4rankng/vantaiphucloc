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
  clients: ['clients'] as const,
  client: (id: number) => ['clients', id] as const,
  vendors: ['vendors'] as const,
  vendor: (id: number) => ['vendors', id] as const,
  locations: ['locations'] as const,
  deliveredTrips: ['delivered-trips'] as const,
  deliveredTrip: (id: number) => ['delivered-trips', id] as const,
  deliveredTripsFiltered: (filters?: Record<string, string>) =>
    ['delivered-trips', filters] as const,
  bookedTrips: ['booked-trips'] as const,
  bookedTrip: (id: number) => ['booked-trips', id] as const,
  bookedTripsFiltered: (filters?: Record<string, string>) =>
    ['booked-trips', filters] as const,
  driverEarnings: (driverId: number, startDate: string, endDate: string) =>
    ['driver-earnings', driverId, startDate, endDate] as const,
  myEarnings: (startDate: string, endDate: string) =>
    ['my-earnings', startDate, endDate] as const,
  drivers: ['drivers'] as const,
  vehicles: (activeOnly = true) => ['vehicles', activeOnly] as const,
  vehicleDrivers: ['vehicle-drivers'] as const,
  dashboard: ['dashboard'] as const,
  users: ['users'] as const,
  notifications: ['notifications'] as const,
  salaryConfig: ['salary/config'] as const,
  driverBaseSalary: (driverId: number) => ['driver-base-salary', driverId] as const,
  salaryPeriod: (fromDate: string, toDate: string) => ['salary-period', fromDate, toDate] as const,
  monthlyPnL: (startDate: string, endDate: string) =>
    ['monthly-pnl', startDate, endDate] as const,
  vehiclePnL: (dateFrom: string, dateTo: string, vehicleId?: number) =>
    ['vehicle-pnl', dateFrom, dateTo, vehicleId ?? 'all'] as const,
  vehicleExpenses: (params?: object) =>
    ['vehicle-expenses', params ?? {}] as const,
  routePricings: ['route-pricings'] as const,
  routePricingsFiltered: (filters?: { clientId?: number; workType?: string }) =>
    ['route-pricings', filters] as const,
  vendorRoutePricings: ['vendor-route-pricings'] as const,
  vendorRoutePricingsFiltered: (filters?: { vendorId?: number; workType?: string }) =>
    ['vendor-route-pricings', filters] as const,
  operationTypes: ['operation-types'] as const,
}

/**
 * Invalidate all query caches that depend on delivered-trip data.
 * Call this after any mutation that changes delivered trips (create, update,
 * delete, match, unmatch, import).
 */
export function invalidateDeliveredTripDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.deliveredTrips })
  qc.invalidateQueries({ queryKey: ['delivered-trips-infinite'] })
  qc.invalidateQueries({ queryKey: queryKeys.bookedTrips })
  qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
  qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
  qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
}

export function invalidateClientDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['clients'] })
  qc.invalidateQueries({ queryKey: ['clients-infinite'] })
  qc.invalidateQueries({ queryKey: ['delivered-trips'] })
  qc.invalidateQueries({ queryKey: ['booked-trips'] })
  qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
}

export function invalidateVendorDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['vendors'] })
  qc.invalidateQueries({ queryKey: ['vendors-paged'] })
}

export function invalidateDriverDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['drivers'] })
  qc.invalidateQueries({ queryKey: ['drivers-paged'] })
  qc.invalidateQueries({ queryKey: ['vehicle-drivers'] })
  qc.invalidateQueries({ queryKey: ['driver-earnings'] })
  qc.invalidateQueries({ queryKey: ['salary-dashboard'] })
}

export function invalidateBookedTripDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['booked-trips'] })
  qc.invalidateQueries({ queryKey: ['delivered-trips'] })
  qc.invalidateQueries({ queryKey: ['delivered-trips-infinite'] })
  qc.invalidateQueries({ queryKey: ['trip-daily-stats'] })
  qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
  qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
}

export function invalidateLocationDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['locations'] })
  qc.invalidateQueries({ queryKey: ['location-aliases'] })
  qc.invalidateQueries({ queryKey: ['routes'] })
  qc.invalidateQueries({ queryKey: ['route-pricings'] })
  qc.invalidateQueries({ queryKey: ['delivered-trips'] })
  qc.invalidateQueries({ queryKey: ['delivered-trips-infinite'] })
  qc.invalidateQueries({ queryKey: ['booked-trips'] })
}

export function invalidateSalaryDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['driver-earnings'] })
  qc.invalidateQueries({ queryKey: ['my-earnings'] })
  qc.invalidateQueries({ queryKey: ['salary-dashboard'] })
  qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
}

export function invalidateVehicleExpenseDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['vehicle-expenses'] })
  qc.invalidateQueries({ queryKey: ['vehicle-expenses-infinite'] })
  qc.invalidateQueries({ queryKey: ['vehicle-pnl'] })
  qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
  qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
}

export function invalidateOperationTypeDeps(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: queryKeys.operationTypes })
  qc.invalidateQueries({ queryKey: queryKeys.routePricings })
  qc.invalidateQueries({ queryKey: queryKeys.vendorRoutePricings })
}
