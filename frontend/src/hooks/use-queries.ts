import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { searchBookedTrips } from '@/services/api/bookedTrips.api'
import type { ApiResponse, Pricing, DeliveredTrip, BookedTrip, ContType, Client, Vendor, VendorSummary, BulkMatchPair, LocationAlias, MergeLocationsResponse } from '@/data/domain'
import type { DriverEarnings } from '@/services/api/salary.api'
import type { VehicleExpenseCategory } from '@/services/api/vehicleExpenses.api'
import type { Vehicle } from '@/services/api/vehicles.api'
import {
  listVendorReconciliationImports,
  getVendorReconciliationImport,
  uploadVendorReconciliation,
  exportVendorTripsExcel,
  updateVendorReconRow,
  applyVendorReconciliation,
  discardVendorReconciliation,
} from '@/services/api/vendorReconciliation.api'
import type { RowUpdatePayload } from '@/services/api/vendorReconciliation.api'

/** Reject on failed ApiResponse so React Query onError fires. */
function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}
import type { RouteCreatePayload, RouteUpdatePayload } from '@/services/api/routes.api'
import type { PricingCreatePayload, PricingUpdatePayload } from '@/services/api/pricings.api'
import type { DeliveredTripCreatePayload, DeliveredTripUpdatePayload } from '@/services/api/deliveredTrips.api'
import type { BookedTripCreatePayload, BookedTripUpdatePayload } from '@/services/api/bookedTrips.api'
import type { PricingFormat, PricingCommitRequest } from '@/services/api/imports.api'

export type {
  PricingCreatePayload,
  PricingUpdatePayload,
  RouteCreatePayload,
  RouteUpdatePayload,
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

export const queryKeys = {
  clients: ['clients'] as const,
  client: (id: number) => ['clients', id] as const,
  vendors: ['vendors'] as const,
  vendor: (id: number) => ['vendors', id] as const,
  vendorSummary: (id: number) => ['vendor-summary', id] as const,
  routes: ['routes'] as const,
  locations: ['locations'] as const,
  pricings: ['pricings'] as const,
  pricingsFiltered: (filters?: { clientId?: number; workType?: ContType }) =>
    ['pricings', filters] as const,
  deliveredTrips: ['delivered-trips'] as const,
  deliveredTrip: (id: number) => ['delivered-trips', id] as const,
  deliveredTripsFiltered: (filters?: Record<string, string>) =>
    ['delivered-trips', filters] as const,
  bookedTrips: ['booked-trips'] as const,
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
  suggestMatches: (woId: number) => ['suggest-matches', woId] as const,
  suggestWos: (toId: number) => ['suggest-wos', toId] as const,
  matchScores: (dateFrom?: string, dateTo?: string) => ['match-scores', dateFrom, dateTo] as const,
  driverBaseSalary: (driverId: number) => ['driver-base-salary', driverId] as const,
  monthlyPnL: (startDate: string, endDate: string) =>
    ['monthly-pnl', startDate, endDate] as const,
  vehiclePnL: (dateFrom: string, dateTo: string, vehicleId?: number) =>
    ['vehicle-pnl', dateFrom, dateTo, vehicleId ?? 'all'] as const,
  vehicleExpenses: (params?: object) =>
    ['vehicle-expenses', params ?? {}] as const,
  reconciliationImports: (clientId?: number) =>
    ['reconciliation-imports', clientId ?? 'all'] as const,
  reconciliationImport: (id: number) =>
    ['reconciliation-imports', id] as const,
  vendorReconImports: (vendorId?: number) =>
    ['vendor-recon-imports', vendorId ?? 'all'] as const,
  vendorReconImport: (id: number) =>
    ['vendor-recon-imports', id] as const,
}

// ─── Query hooks (GET) ───────────────────────────────────────────────────────

// Clients
export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients,
    queryFn: async () => {
      const res = await apiClient.getClients()
      return res.success ? res.data : []
    },
  })
}

// Vendors
export function useVendors() {
  return useQuery({
    queryKey: queryKeys.vendors,
    queryFn: async () => {
      const res = await apiClient.getVendors()
      return res.success ? res.data : []
    },
  })
}

export function useRoutes() {
  return useQuery({
    queryKey: queryKeys.routes,
    queryFn: async () => {
      const res = await apiClient.getRoutes()
      return res.success ? res.data : []
    },
  })
}

export function useLocations() {
  return useQuery({
    queryKey: queryKeys.locations,
    queryFn: async () => {
      const res = await apiClient.getLocations()
      return res.success ? res.data : []
    },
  })
}

export function useCreateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string }) => apiClient.createLocation(data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.locations }) },
  })
}

export function useUpdateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string } }) => apiClient.updateLocation(id, data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.locations }) },
  })
}

export function useDeleteLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteLocation(id).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.locations }) },
  })
}

export function usePricings(filters?: { clientId?: number; workType?: ContType; route?: string; pickupLocationId?: number; dropoffLocationId?: number }) {
  return useQuery({
    queryKey: queryKeys.pricingsFiltered(filters),
    queryFn: async () => {
      const res = await apiClient.getPricings(filters)
      return res.success ? res.data : []
    },
  })
}

export function useDeliveredTrips(filters?: { driverId?: number; dateFrom?: string; dateTo?: string; status?: DeliveredTrip['status'] }) {
  const flatFilters: Record<string, string> = {}
  if (filters?.driverId) flatFilters.driverId = String(filters.driverId)
  if (filters?.dateFrom) flatFilters.dateFrom = filters.dateFrom
  if (filters?.dateTo) flatFilters.dateTo = filters.dateTo
  if (filters?.status) flatFilters.status = filters.status

  return useQuery({
    queryKey: queryKeys.deliveredTripsFiltered(Object.keys(flatFilters).length > 0 ? flatFilters : undefined),
    queryFn: async () => {
      const res = await apiClient.getDeliveredTrips(filters)
      return res.success ? res.data : []
    },
  })
}

export function useDeliveredTrip(id: number) {
  return useQuery({
    queryKey: queryKeys.deliveredTrip(id),
    queryFn: async () => {
      const res = await apiClient.getDeliveredTrip(id)
      return res.success ? res.data : null
    },
    enabled: !!id,
  })
}

export function useBookedTrips(filters?: { clientId?: number; driverId?: number; status?: BookedTrip['status']; dateFrom?: string; dateTo?: string; pageSize?: number }) {
  const flatFilters: Record<string, string> = {}
  if (filters?.clientId) flatFilters.clientId = String(filters.clientId)
  if (filters?.driverId) flatFilters.driverId = String(filters.driverId)
  if (filters?.status) flatFilters.status = filters.status
  if (filters?.dateFrom) flatFilters.dateFrom = filters.dateFrom
  if (filters?.dateTo) flatFilters.dateTo = filters.dateTo
  if (filters?.pageSize) flatFilters.pageSize = String(filters.pageSize)

  return useQuery({
    queryKey: queryKeys.bookedTripsFiltered(Object.keys(flatFilters).length > 0 ? flatFilters : undefined),
    queryFn: async () => {
      const res = await apiClient.getBookedTrips(filters)
      return res.success ? res.data : []
    },
  })
}

// Salary: Driver earnings (on-the-fly, replaces SalaryPeriod)
export function useDriverEarnings(driverId: number, startDate: string, endDate: string) {
  return useQuery({
    queryKey: queryKeys.driverEarnings(driverId, startDate, endDate),
    queryFn: async () => {
      const res = await apiClient.getDriverEarnings(driverId, startDate, endDate)
      return res.success ? res.data : null
    },
    enabled: !!driverId && !!startDate && !!endDate,
  })
}

// Salary: My earnings (driver self-service)
export function useMyEarnings(startDate: string, endDate: string) {
  return useQuery({
    queryKey: queryKeys.myEarnings(startDate, endDate),
    queryFn: async () => {
      const res = await apiClient.getMyEarnings(startDate, endDate)
      return res.success ? res.data : null
    },
    enabled: !!startDate && !!endDate,
  })
}

export function useDrivers() {
  return useQuery({
    queryKey: queryKeys.drivers,
    queryFn: async () => {
      const res = await apiClient.getDrivers()
      return res.success ? res.data : []
    },
  })
}

export function useVehicles(activeOnly = true) {
  return useQuery({
    queryKey: queryKeys.vehicles(activeOnly),
    queryFn: async () => {
      const res = await apiClient.getVehicles(activeOnly)
      return res.success ? res.data : []
    },
  })
}

export function useVehicleDrivers() {
  return useQuery({
    queryKey: queryKeys.vehicleDrivers,
    queryFn: async () => {
      const res = await apiClient.getVehicleDrivers({ activeOnly: true })
      return res.success ? res.data : []
    },
  })
}

export function useAddVehicleDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ vehicleId, driverId }: { vehicleId: number; driverId: number }) => {
      const res = await apiClient.addVehicleDriver(vehicleId, driverId)
      return unwrap(res)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.vehicleDrivers }) },
  })
}

export function useRemoveVehicleDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.removeVehicleDriver(id)
      return unwrap(res)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.vehicleDrivers }) },
  })
}

export function useCreateVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (plate: string) => {
      const res = await apiClient.createVehicle(plate)
      return unwrap(res)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.vehicles() })
      qc.invalidateQueries({ queryKey: queryKeys.vehicleDrivers })
    },
  })
}

export function useDashboardSummary(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['dashboard-summary', dateFrom, dateTo],
    queryFn: async () => {
      const res = await apiClient.getDashboardSummary(dateFrom, dateTo)
      return res.success ? res.data : null
    },
  })
}

export function useKpiTrends(days = 12, endDate?: string) {
  return useQuery({
    queryKey: ['kpi-trends', days, endDate],
    queryFn: async () => {
      const res = await apiClient.getKpiTrends(days, endDate)
      return res.success ? res.data : null
    },
    // KPI trends are activity stats; 1-minute stale time is plenty.
    staleTime: 60_000,
  })
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
      const res = await apiClient.getUsers()
      return res.success ? res.data : []
    },
  })
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'] as const,
    queryFn: async () => {
      const res = await apiClient.getProfile()
      return res.success ? res.data : null
    },
  })
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const res = await apiClient.getNotifications()
      return res.success ? res.data : []
    },
  })
}

export function useSalaryConfig() {
  return useQuery({
    queryKey: queryKeys.salaryConfig,
    queryFn: async () => {
      const res = await apiClient.getSalaryConfig()
      return res.success ? res.data : null
    },
  })
}

export function useSuggestMatches(deliveredTripId: number | null) {
  return useQuery({
    queryKey: queryKeys.suggestMatches(deliveredTripId!),
    queryFn: async () => {
      const res = await apiClient.suggestMatches(deliveredTripId!)
      return res.success ? res.data : null
    },
    enabled: deliveredTripId !== null,
  })
}

export function useSuggestWosForTrip(bookedTripId: number | null) {
  return useQuery({
    queryKey: queryKeys.suggestWos(bookedTripId!),
    queryFn: async () => {
      const res = await apiClient.suggestWosForTrip(bookedTripId!)
      return res.success ? res.data : null
    },
    enabled: bookedTripId !== null,
  })
}

// ─── Mutation hooks ──────────────────────────────────────────────────────────

// Client mutations
export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Client, 'id'>) => apiClient.createClient(data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.clients }) },
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Client> }) => apiClient.updateClient(id, data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.clients }) },
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteClient(id).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.clients }) },
  })
}

// Vendor mutations
export function useCreateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Vendor, 'id'>) => apiClient.createVendor(data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.vendors }) },
  })
}

export function useUpdateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Vendor> }) => apiClient.updateVendor(id, data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.vendors }) },
  })
}

export function useDeleteVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteVendor(id).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.vendors }) },
  })
}

// Vendor summary
export function useVendorSummary(vendorId: number | null, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: [...queryKeys.vendorSummary(vendorId ?? 0), dateFrom, dateTo],
    queryFn: async () => {
      const res = await apiClient.getVendorSummary(vendorId!, { dateFrom, dateTo })
      return res.success ? res.data : null
    },
    enabled: !!vendorId,
  })
}

export function useCreateRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RouteCreatePayload) => apiClient.createRoute(data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.routes }) },
  })
}

export function useUpdateRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: RouteUpdatePayload }) => apiClient.updateRoute(id, data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.routes }) },
  })
}

export function useDeleteRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => apiClient.deleteRoute(id).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.routes }) },
  })
}

export function useCreatePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PricingCreatePayload) => apiClient.createPricing(data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pricings'] }) },
  })
}

export function useUpdatePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PricingUpdatePayload }) => apiClient.updatePricing(id, data).then(unwrap),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['pricings'] })
      const previous = qc.getQueriesData<Pricing[]>({ queryKey: ['pricings'] })
      qc.setQueriesData<Pricing[]>({ queryKey: ['pricings'] }, (old) =>
        old?.map(p => p.id === id ? { ...p, ...data } : p),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          qc.setQueryData(key, data)
        }
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pricings'] }) },
  })
}

export function useDeletePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deletePricing(id).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pricings'] }) },
  })
}

export function usePreviewPricing() {
  return useMutation({
    mutationFn: (args: { file: File; format?: PricingFormat; clientId?: number }) =>
      apiClient.previewCustomerPricing(args),
  })
}

export function useCommitPricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PricingCommitRequest) => apiClient.commitCustomerPricing(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pricings'] })
    },
  })
}

export function useCreateDeliveredTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof apiClient.createDeliveredTrip>[0]) => apiClient.createDeliveredTrip(data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['delivered-trips'] }) },
  })
}

export function useUpdateDeliveredTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DeliveredTripUpdatePayload }) => apiClient.updateDeliveredTrip(id, data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['suggest-matches'] })
      qc.invalidateQueries({ queryKey: ['suggest-wos'] })
    },
  })
}

export function useCreateBookedTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BookedTripCreatePayload) => apiClient.createBookedTrip(data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
    },
  })
}

export function useUpdateBookedTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: BookedTripUpdatePayload }) => apiClient.updateBookedTrip(id, data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
      qc.invalidateQueries({ queryKey: ['suggest-matches'] })
      qc.invalidateQueries({ queryKey: ['suggest-wos'] })
    },
  })
}

export function useReconcile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deliveredTripId, bookedTripId }: { deliveredTripId: number; bookedTripId: number }) =>
      apiClient.reconcile(deliveredTripId, bookedTripId).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
    },
  })
}

export function useToggleTripConfirmation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (bookedTripId: number) => apiClient.toggleTripConfirmation(bookedTripId).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['booked-trips'] }) },
  })
}

export function useUploadCustomerExcel() {
  return useMutation({
    mutationFn: ({ file, clientId, dateFrom, dateTo }: {
      file: File
      clientId: number
      dateFrom?: string
      dateTo?: string
    }) => apiClient.uploadCustomerExcel(file, clientId, dateFrom, dateTo),
  })
}

export function useBulkImportAndMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, clientId }: { file: File; clientId?: number }) =>
      apiClient.bulkImportAndMatch(file, clientId).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
    },
  })
}

export function useAIParsePreview() {
  return useMutation({
    mutationFn: ({ file }: { file: File }) =>
      apiClient.aiParsePreview(file).then(unwrap),
  })
}

export function useExportReconciliationExcel() {
  return useMutation({
    mutationFn: ({ clientId, dateFrom, dateTo }: {
      clientId: number
      dateFrom?: string
      dateTo?: string
    }) => apiClient.exportReconciliationExcel(clientId, dateFrom, dateTo),
  })
}

export function useImportBookedTrips() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => apiClient.importBookedTrips(file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['booked-trips'] }) },
  })
}

export function useExportBookedTripsExcel() {
  return useMutation({
    mutationFn: (filters?: { dateFrom?: string; dateTo?: string; status?: string }) =>
      apiClient.exportBookedTripsExcel(filters),
  })
}

export function useExportDoiSoatExcel() {
  return useMutation({
    mutationFn: (params: { clientId: number; dateFrom: string; dateTo: string }) =>
      apiClient.exportDoiSoatExcel(params.clientId, params.dateFrom, params.dateTo),
  })
}

export function useExportDeliveredTripsExcel() {
  return useMutation({
    mutationFn: (filters?: { dateFrom?: string; dateTo?: string; status?: string }) =>
      apiClient.exportDeliveredTripsExcel(filters),
  })
}

export function useUpdateContainerNumber() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripId, containerId, containerNumber }: {
      tripId: number
      containerId: number
      containerNumber: string
    }) => apiClient.updateContainerNumber(tripId, containerId, containerNumber).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booked-trips'] })
      qc.invalidateQueries({ queryKey: ['delivered-trips'] })
    },
  })
}

export function useSalaryDashboard(periodStart: string, periodEnd: string) {
  return useQuery({
    queryKey: ['salary-dashboard', periodStart, periodEnd],
    queryFn: async () => {
      const res = await apiClient.getSalaryDashboard(periodStart, periodEnd)
      return res.success ? res.data : []
    },
    enabled: !!periodStart && !!periodEnd,
  })
}

export function useExportSalaryExcel() {
  return useMutation({
    mutationFn: ({ startDate, endDate }: { startDate: string; endDate: string }) =>
      apiClient.exportSalaryExcel(startDate, endDate),
  })
}

export function useCalculateSalary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ driverId, startDate, endDate }: { driverId?: number; startDate: string; endDate: string }) =>
      apiClient.calculateSalary(driverId, startDate, endDate).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver-earnings'] })
      qc.invalidateQueries({ queryKey: ['my-earnings'] })
      qc.invalidateQueries({ queryKey: ['salary-dashboard'] })
    },
  })
}

export function useCreateDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { username: string; fullName?: string; phone: string }) =>
      apiClient.createDriver(data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.drivers }) },
  })
}

export function useUpdateDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ fullName: string; phone: string; username: string }> }) =>
      apiClient.updateDriver(id, data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.drivers }) },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof apiClient.createUser>[0]) => apiClient.createUser(data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.users }) },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Record<string, unknown> }) => apiClient.updateUser(id, data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.users }) },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) => apiClient.deleteUser(id).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.users }) },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ field, value }: { field: string; value: string }) => apiClient.updateProfile(field, value).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile'] }) },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      apiClient.changePassword(currentPassword, newPassword),
  })
}

export function useUnmatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deliveredTripId, bookedTripId, reason }: { deliveredTripId: number; bookedTripId: number; reason: string }) =>
      apiClient.unmatch(deliveredTripId, bookedTripId, reason).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bookedTrips })
      qc.invalidateQueries({ queryKey: queryKeys.deliveredTrips })
    },
  })
}

export function useUpdateSalaryConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { from_day: number; to_day: number }) => apiClient.updateSalaryConfig(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.salaryConfig }) },
  })
}

// ── Auto-match ────────────────────────────────────────────────

export function useAutoMatch() {
  return useMutation({
    mutationFn: ({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) =>
      apiClient.autoMatchPreview(dateFrom, dateTo).then(unwrap),
  })
}

export function useAutoMatchConfirm() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pairs: { deliveredTripId: number; bookedTripId: number }[]) =>
      apiClient.autoMatchConfirm(pairs).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveredTrips })
      qc.invalidateQueries({ queryKey: queryKeys.bookedTrips })
    },
  })
}

export function useMatchScores(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: queryKeys.matchScores(dateFrom, dateTo),
    queryFn: async () => {
      const res = await apiClient.getMatchScores(dateFrom, dateTo)
      return res.success ? res.data : null
    },
    enabled: !!dateFrom || !!dateTo,
  })
}

export function useBulkMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pairs: BulkMatchPair[]) => apiClient.bulkMatch(pairs).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveredTrips })
      qc.invalidateQueries({ queryKey: queryKeys.bookedTrips })
    },
  })
}

export function useBatchReconcileForWO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deliveredTripId, bookedTripIds }: { deliveredTripId: number; bookedTripIds: number[] }) =>
      apiClient.batchReconcileForWO(deliveredTripId, bookedTripIds).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveredTrips })
      qc.invalidateQueries({ queryKey: queryKeys.bookedTrips })
    },
  })
}

export function useBatchReconcileForTO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bookedTripId, deliveredTripIds }: { bookedTripId: number; deliveredTripIds: number[] }) =>
      apiClient.batchReconcileForTO(bookedTripId, deliveredTripIds).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.deliveredTrips })
      qc.invalidateQueries({ queryKey: queryKeys.bookedTrips })
    },
  })
}

export function useSearchBookedTrips(q: string, deliveredTripId: number | null) {
  return useQuery({
    queryKey: ['booked-trips-search', q, deliveredTripId],
    queryFn: async () => {
      const res = await searchBookedTrips(q, deliveredTripId!)
      return res.success ? res.data : null
    },
    enabled: !!deliveredTripId && q.trim().length >= 2,
  })
}

// ── Driver base salary ────────────────────────────────────────────────────

export function useDriverBaseSalaryHistory(driverId: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.driverBaseSalary(driverId ?? 0),
    queryFn: async () => {
      const res = await apiClient.getDriverBaseSalaryHistory(driverId!)
      return res.success ? res.data : []
    },
    enabled: !!driverId,
  })
}

export function useSetDriverBaseSalary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      driverId,
      baseSalary,
      effectiveFrom,
      note,
    }: {
      driverId: number
      baseSalary: number
      effectiveFrom: string
      note?: string | null
    }) =>
      apiClient
        .setDriverBaseSalary(driverId, { baseSalary, effectiveFrom, note })
        .then(unwrap),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.driverBaseSalary(vars.driverId) })
      qc.invalidateQueries({ queryKey: ['driver-earnings'] })
      qc.invalidateQueries({ queryKey: ['salary-dashboard'] })
      qc.invalidateQueries({ queryKey: ['monthly-pnl'] })
    },
  })
}

// ── Monthly P&L ───────────────────────────────────────────────────────────

export function useMonthlyPnL(startDate: string, endDate: string) {
  return useQuery({
    queryKey: queryKeys.monthlyPnL(startDate, endDate),
    queryFn: async () => {
      const res = await apiClient.getMonthlyPnL(startDate, endDate)
      return res.success ? res.data : null
    },
    enabled: !!startDate && !!endDate,
  })
}

// ── Customer reconciliation imports ───────────────────────────────────────

export function useReconciliationImports(clientId?: number) {
  return useQuery({
    queryKey: queryKeys.reconciliationImports(clientId),
    queryFn: async () => {
      const res = await apiClient.listReconciliationImports(clientId)
      return res.success ? res.data : []
    },
  })
}

export function useReconciliationImport(importId: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.reconciliationImport(importId ?? 0),
    queryFn: async () => {
      const res = await apiClient.getReconciliationImport(importId!)
      return res.success ? res.data : null
    },
    enabled: !!importId,
  })
}

export function usePreviewReconciliationImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      payload: Parameters<typeof apiClient.previewReconciliationImport>[0],
    ) => apiClient.previewReconciliationImport(payload).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reconciliation-imports'] })
    },
  })
}

export function useCommitReconciliationImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (importId: number) =>
      apiClient.commitReconciliationImport(importId).then(unwrap),
    onSuccess: (_data, importId) => {
      qc.invalidateQueries({ queryKey: ['reconciliation-imports'] })
      qc.invalidateQueries({ queryKey: queryKeys.reconciliationImport(importId) })
    },
  })
}

export function useUpdateRowVerdict() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      importId,
      rowId,
      payload,
    }: {
      importId: number
      rowId: number
      payload: { action: 'accept' | 'dispute' | 'edit'; amount?: number | null; note?: string | null }
    }) => apiClient.updateRowVerdict(importId, rowId, payload).then(unwrap),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.reconciliationImport(vars.importId) })
    },
  })
}

export function useUploadCustomerResponse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      clientId,
      periodStart,
      periodEnd,
      file,
    }: {
      clientId: number
      periodStart: string
      periodEnd: string
      file: File
    }) =>
      apiClient.uploadCustomerResponse(clientId, periodStart, periodEnd, file).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reconciliation-imports'] })
    },
  })
}

// ── Vehicle P&L ──────────────────────────────────────────────────────────────

export function useVehiclePnL(dateFrom: string, dateTo: string, vehicleId?: number) {
  return useQuery({
    queryKey: ['vehicle-pnl', dateFrom, dateTo, vehicleId],
    queryFn: async () => {
      const res = await apiClient.getVehiclePnL(dateFrom, dateTo, vehicleId)
      return res.success ? res.data : null
    },
    enabled: !!dateFrom && !!dateTo,
  })
}

export function useTripDailyStats(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['trip-daily-stats', dateFrom, dateTo],
    queryFn: async () => {
      const res = await apiClient.getTripDailyStats(dateFrom, dateTo)
      return res.success ? res.data : null
    },
    enabled: !!dateFrom && !!dateTo,
  })
}

// ── Vehicle Expenses ─────────────────────────────────────────────────────────

export function useVehicleExpenses(params?: {
  vehicleId?: number
  category?: VehicleExpenseCategory
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: queryKeys.vehicleExpenses(params),
    queryFn: async () => {
      const res = await apiClient.listVehicleExpenses(params)
      return res.success ? res.data : null
    },
  })
}

export function useCreateVehicleExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof apiClient.createVehicleExpense>[0]) =>
      apiClient.createVehicleExpense(payload).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-expenses'] })
      qc.invalidateQueries({ queryKey: ['vehicle-pnl'] })
    },
  })
}

export function useUpdateVehicleExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof apiClient.updateVehicleExpense>[1] }) =>
      apiClient.updateVehicleExpense(id, payload).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-expenses'] })
      qc.invalidateQueries({ queryKey: ['vehicle-pnl'] })
    },
  })
}

export function useDeleteVehicleExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.deleteVehicleExpense(id).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-expenses'] })
      qc.invalidateQueries({ queryKey: ['vehicle-pnl'] })
    },
  })
}

// ── Vendor Reconciliation ────────────────────────────────────────────────────

export function useVendorReconImports(vendorId?: number) {
  return useQuery({
    queryKey: queryKeys.vendorReconImports(vendorId),
    queryFn: () => listVendorReconciliationImports(vendorId).then(r => r.success ? r.data : []),
  })
}

export function useVendorReconImport(importId: number | null) {
  return useQuery({
    queryKey: queryKeys.vendorReconImport(importId ?? 0),
    queryFn: () => getVendorReconciliationImport(importId!).then(r => r.success ? r.data : null),
    enabled: importId != null,
  })
}

export function useUploadVendorReconciliation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: {
      file: File
      vendorId: number
      periodFrom: string
      periodTo: string
      notes?: string
    }) => uploadVendorReconciliation(args.file, args.vendorId, args.periodFrom, args.periodTo, args.notes).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor-recon-imports'] })
    },
  })
}

export function useUpdateVendorReconRow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ importId, rowId, payload }: { importId: number; rowId: number; payload: RowUpdatePayload }) =>
      updateVendorReconRow(importId, rowId, payload).then(unwrap),
    onSuccess: (_data, { importId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.vendorReconImport(importId) })
      qc.invalidateQueries({ queryKey: ['vendor-recon-imports'] })
    },
  })
}

export function useApplyVendorReconciliation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (importId: number) => applyVendorReconciliation(importId).then(unwrap),
    onSuccess: (_data, importId) => {
      qc.invalidateQueries({ queryKey: queryKeys.vendorReconImport(importId) })
      qc.invalidateQueries({ queryKey: ['vendor-recon-imports'] })
    },
  })
}

export function useDiscardVendorReconciliation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (importId: number) => discardVendorReconciliation(importId).then(unwrap),
    onSuccess: (_data, importId) => {
      qc.invalidateQueries({ queryKey: queryKeys.vendorReconImport(importId) })
      qc.invalidateQueries({ queryKey: ['vendor-recon-imports'] })
    },
  })
}

export function useExportVendorTrips() {
  return useMutation({
    mutationFn: async (args: { vendorId: number; dateFrom: string; dateTo: string }) => {
      const blob = await exportVendorTripsExcel(args.vendorId, args.dateFrom, args.dateTo)
      // Trigger download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `DoiSoat_NhaXe_${args.vendorId}_${args.dateFrom}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
  })
}

// ── Location Aliases ──────────────────────────────────────────────────────────

export function useLocationAliases(locationId?: number) {
  return useQuery({
    queryKey: ['location-aliases', locationId ?? 'all'],
    queryFn: async () => {
      const res = await apiClient.listAliases(locationId ? { locationId } : undefined)
      return res.success ? res.data : []
    },
  })
}

export function useCreateAlias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ locationId, alias }: { locationId: number; alias: string }) =>
      apiClient.createAlias(locationId, alias).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['location-aliases'] }) },
  })
}

export function usePromoteAlias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (aliasId: number) =>
      apiClient.confirmAlias(aliasId).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['location-aliases'] })
      qc.invalidateQueries({ queryKey: queryKeys.locations })
    },
  })
}

export function useDeleteAlias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (aliasId: number) => {
      const res = await apiClient.rejectAlias(aliasId)
      return unwrap(res)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['location-aliases'] }) },
  })
}

export function useMergeLocations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sourceLocationId, targetLocationId }: { sourceLocationId: number; targetLocationId: number }) =>
      apiClient.mergeLocations(sourceLocationId, targetLocationId).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['location-aliases'] })
      qc.invalidateQueries({ queryKey: queryKeys.locations })
    },
  })
}

export function usePendingReviewLocations() {
  return useQuery({
    queryKey: ['pending-review-locations'],
    queryFn: async () => {
      const res = await apiClient.getPendingReviewLocations()
      return res.success ? res.data : []
    },
  })
}
