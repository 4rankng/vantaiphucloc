import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { searchTripOrders } from '@/services/api/tripOrders.api'
import type { ApiResponse, Pricing, WorkOrder, TripOrder, WorkType, Partner, BulkMatchPair } from '@/data/domain'
import type { DriverEarnings } from '@/services/api/salary.api'

/** Reject on failed ApiResponse so React Query onError fires. */
function unwrap<T>(res: ApiResponse<T>): T {
  if (res.success) return res.data
  throw new Error(res.message ?? 'Lỗi hệ thống')
}
import type { RouteCreatePayload, RouteUpdatePayload } from '@/services/api/routes.api'
import type { PricingCreatePayload, PricingUpdatePayload } from '@/services/api/pricings.api'
import type { WorkOrderCreatePayload, WorkOrderUpdatePayload } from '@/services/api/workOrders.api'
import type { TripOrderCreatePayload, TripOrderUpdatePayload } from '@/services/api/tripOrders.api'

export type {
  PricingCreatePayload,
  PricingUpdatePayload,
  RouteCreatePayload,
  RouteUpdatePayload,
  WorkOrderCreatePayload,
  WorkOrderUpdatePayload,
  TripOrderCreatePayload,
  TripOrderUpdatePayload,
  DriverEarnings,
}
import type { UserAccount, UserProfile } from '@/services/api/users.api'

export type { UserAccount, UserProfile }

// ─── Query key factories ─────────────────────────────────────────────────────

export const queryKeys = {
  partners: ['partners'] as const,
  partner: (id: number) => ['partners', id] as const,
  // Legacy aliases for backward compat
  clients: ['partners'] as const,
  client: (id: number) => ['partners', id] as const,
  routes: ['routes'] as const,
  locations: ['locations'] as const,
  pricings: ['pricings'] as const,
  pricingsFiltered: (filters?: { partnerId?: number; workType?: WorkType }) =>
    ['pricings', filters] as const,
  workOrders: ['work-orders'] as const,
  workOrder: (id: number) => ['work-orders', id] as const,
  workOrdersFiltered: (filters?: Record<string, string>) =>
    ['work-orders', filters] as const,
  tripOrders: ['trip-orders'] as const,
  tripOrdersFiltered: (filters?: Record<string, string>) =>
    ['trip-orders', filters] as const,
  driverEarnings: (driverId: number, startDate: string, endDate: string) =>
    ['driver-earnings', driverId, startDate, endDate] as const,
  myEarnings: (startDate: string, endDate: string) =>
    ['my-earnings', startDate, endDate] as const,
  drivers: ['drivers'] as const,
  dashboard: ['dashboard'] as const,
  users: ['users'] as const,
  notifications: ['notifications'] as const,
  salaryConfig: ['salary/config'] as const,
  vendors: ['partners'] as const,
  suggestMatches: (woId: number) => ['suggest-matches', woId] as const,
  suggestWos: (toId: number) => ['suggest-wos', toId] as const,
  matchScores: (dateFrom?: string, dateTo?: string) => ['match-scores', dateFrom, dateTo] as const,
  driverBaseSalary: (driverId: number) => ['driver-base-salary', driverId] as const,
  monthlyPnL: (startDate: string, endDate: string) =>
    ['monthly-pnl', startDate, endDate] as const,
  reconciliationImports: (partnerId?: number) =>
    ['reconciliation-imports', partnerId ?? 'all'] as const,
  reconciliationImport: (id: number) =>
    ['reconciliation-imports', id] as const,
}

// ─── Query hooks (GET) ───────────────────────────────────────────────────────

// Partners (replaces Clients + Vendors)
export function usePartners(params?: { partnerType?: Partner['partnerType'] }) {
  return useQuery({
    queryKey: [...queryKeys.partners, params],
    queryFn: async () => {
      const res = await apiClient.getPartners(params)
      return res.success ? res.data : []
    },
  })
}

// Backward compat: useClients → usePartners
export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients,
    queryFn: async () => {
      const res = await apiClient.getClients()
      return res.success ? res.data : []
    },
  })
}

// Backward compat: useVendors → usePartners
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

export function usePricings(filters?: { clientId?: number; workType?: WorkType; route?: string; pickupLocationId?: number; dropoffLocationId?: number }) {
  return useQuery({
    queryKey: queryKeys.pricingsFiltered(filters),
    queryFn: async () => {
      const res = await apiClient.getPricings(filters)
      return res.success ? res.data : []
    },
  })
}

export function useWorkOrders(filters?: { driverId?: number; dateFrom?: string; dateTo?: string; status?: WorkOrder['status'] }) {
  const flatFilters: Record<string, string> = {}
  if (filters?.driverId) flatFilters.driverId = String(filters.driverId)
  if (filters?.dateFrom) flatFilters.dateFrom = filters.dateFrom
  if (filters?.dateTo) flatFilters.dateTo = filters.dateTo
  if (filters?.status) flatFilters.status = filters.status

  return useQuery({
    queryKey: queryKeys.workOrdersFiltered(Object.keys(flatFilters).length > 0 ? flatFilters : undefined),
    queryFn: async () => {
      const res = await apiClient.getWorkOrders(filters)
      return res.success ? res.data : []
    },
  })
}

export function useWorkOrder(id: number) {
  return useQuery({
    queryKey: queryKeys.workOrder(id),
    queryFn: async () => {
      const res = await apiClient.getWorkOrder(id)
      return res.success ? res.data : null
    },
    enabled: !!id,
  })
}

export function useTripOrders(filters?: { clientId?: number; driverId?: number; status?: TripOrder['status']; dateFrom?: string; dateTo?: string }) {
  const flatFilters: Record<string, string> = {}
  if (filters?.clientId) flatFilters.clientId = String(filters.clientId)
  if (filters?.driverId) flatFilters.driverId = String(filters.driverId)
  if (filters?.status) flatFilters.status = filters.status
  if (filters?.dateFrom) flatFilters.dateFrom = filters.dateFrom
  if (filters?.dateTo) flatFilters.dateTo = filters.dateTo

  return useQuery({
    queryKey: queryKeys.tripOrdersFiltered(Object.keys(flatFilters).length > 0 ? flatFilters : undefined),
    queryFn: async () => {
      const res = await apiClient.getTripOrders(filters)
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

export function useDashboardSummary(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['dashboard-summary', dateFrom, dateTo],
    queryFn: async () => {
      const res = await apiClient.getDashboardSummary(dateFrom, dateTo)
      return res.success ? res.data : null
    },
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

export function useSuggestMatches(workOrderId: number | null) {
  return useQuery({
    queryKey: queryKeys.suggestMatches(workOrderId!),
    queryFn: async () => {
      const res = await apiClient.suggestMatches(workOrderId!)
      return res.success ? res.data : null
    },
    enabled: workOrderId !== null,
  })
}

export function useSuggestWosForTrip(tripOrderId: number | null) {
  return useQuery({
    queryKey: queryKeys.suggestWos(tripOrderId!),
    queryFn: async () => {
      const res = await apiClient.suggestWosForTrip(tripOrderId!)
      return res.success ? res.data : null
    },
    enabled: tripOrderId !== null,
  })
}

// ─── Mutation hooks ──────────────────────────────────────────────────────────

// Partners (replaces Clients + Vendors)
export function useCreatePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Partner, 'id'>) => apiClient.createPartner(data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.partners }) },
  })
}

export function useUpdatePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Partner> }) => apiClient.updatePartner(id, data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.partners }) },
  })
}

export function useDeletePartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deletePartner(id).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.partners }) },
  })
}

// Backward compat: Client mutations
export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Partner, 'id'>) => apiClient.createPartner(data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.partners }) },
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Partner> }) => apiClient.updatePartner(id, data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.partners }) },
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deletePartner(id).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.partners }) },
  })
}

// Backward compat: Vendor mutations
export function useCreateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Partner, 'id'>) => apiClient.createPartner(data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.partners }) },
  })
}

export function useUpdateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Partner> }) => apiClient.updatePartner(id, data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.partners }) },
  })
}

export function useDeleteVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deletePartner(id).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.partners }) },
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

export function useCreateWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof apiClient.createWorkOrder>[0]) => apiClient.createWorkOrder(data).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-orders'] }) },
  })
}

export function useUpdateWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: WorkOrderUpdatePayload }) => apiClient.updateWorkOrder(id, data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-orders'] })
      qc.invalidateQueries({ queryKey: ['suggest-matches'] })
      qc.invalidateQueries({ queryKey: ['suggest-wos'] })
    },
  })
}

export function useCreateTripOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TripOrderCreatePayload) => apiClient.createTripOrder(data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trip-orders'] })
      qc.invalidateQueries({ queryKey: ['work-orders'] })
    },
  })
}

export function useUpdateTripOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TripOrderUpdatePayload }) => apiClient.updateTripOrder(id, data).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trip-orders'] })
      qc.invalidateQueries({ queryKey: ['suggest-matches'] })
      qc.invalidateQueries({ queryKey: ['suggest-wos'] })
    },
  })
}

export function useReconcile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workOrderId, tripOrderId }: { workOrderId: number; tripOrderId: number }) =>
      apiClient.reconcile(workOrderId, tripOrderId).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trip-orders'] })
      qc.invalidateQueries({ queryKey: ['work-orders'] })
    },
  })
}

export function useToggleTripConfirmation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tripOrderId: number) => apiClient.toggleTripConfirmation(tripOrderId).then(unwrap),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trip-orders'] }) },
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

export function useExportReconciliationExcel() {
  return useMutation({
    mutationFn: ({ clientId, dateFrom, dateTo }: {
      clientId: number
      dateFrom?: string
      dateTo?: string
    }) => apiClient.exportReconciliationExcel(clientId, dateFrom, dateTo),
  })
}

export function useImportTripOrders() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => apiClient.importTripOrders(file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trip-orders'] }) },
  })
}

export function useExportTripOrdersExcel() {
  return useMutation({
    mutationFn: (filters?: { dateFrom?: string; dateTo?: string; status?: string }) =>
      apiClient.exportTripOrdersExcel(filters),
  })
}

export function useExportDoiSoatExcel() {
  return useMutation({
    mutationFn: (params: { partnerId: number; dateFrom: string; dateTo: string }) =>
      apiClient.exportDoiSoatExcel(params.partnerId, params.dateFrom, params.dateTo),
  })
}

export function useExportWorkOrdersExcel() {
  return useMutation({
    mutationFn: (filters?: { dateFrom?: string; dateTo?: string; status?: string }) =>
      apiClient.exportWorkOrdersExcel(filters),
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
    mutationFn: ({ workOrderId, tripOrderId, reason }: { workOrderId: number; tripOrderId: number; reason: string }) =>
      apiClient.unmatch(workOrderId, tripOrderId, reason).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tripOrders })
      qc.invalidateQueries({ queryKey: queryKeys.workOrders })
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
    mutationFn: (pairs: { workOrderId: number; tripOrderId: number }[]) =>
      apiClient.autoMatchConfirm(pairs).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workOrders })
      qc.invalidateQueries({ queryKey: queryKeys.tripOrders })
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
      qc.invalidateQueries({ queryKey: queryKeys.workOrders })
      qc.invalidateQueries({ queryKey: queryKeys.tripOrders })
    },
  })
}

export function useBatchReconcileForWO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workOrderId, tripOrderIds }: { workOrderId: number; tripOrderIds: number[] }) =>
      apiClient.batchReconcileForWO(workOrderId, tripOrderIds).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workOrders })
      qc.invalidateQueries({ queryKey: queryKeys.tripOrders })
    },
  })
}

export function useBatchReconcileForTO() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripOrderId, workOrderIds }: { tripOrderId: number; workOrderIds: number[] }) =>
      apiClient.batchReconcileForTO(tripOrderId, workOrderIds).then(unwrap),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workOrders })
      qc.invalidateQueries({ queryKey: queryKeys.tripOrders })
    },
  })
}

export function useSearchTripOrders(q: string, workOrderId: number | null) {
  return useQuery({
    queryKey: ['trip-orders-search', q, workOrderId],
    queryFn: async () => {
      const res = await searchTripOrders(q, workOrderId!)
      return res.success ? res.data : null
    },
    enabled: !!workOrderId && q.trim().length >= 2,
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

export function useReconciliationImports(partnerId?: number) {
  return useQuery({
    queryKey: queryKeys.reconciliationImports(partnerId),
    queryFn: async () => {
      const res = await apiClient.listReconciliationImports(partnerId)
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
