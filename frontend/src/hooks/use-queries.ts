import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import { api } from '@/services/api/client'
import type { Pricing, WorkOrder, TripOrder, WorkType, Client, RoutePrice, SalaryPeriod, SuggestMatchesResponse, SuggestWosResponse, Location } from '@/data/domain'
import type { Vendor, VendorFormData } from '@/services/api/vendors.api'
import type { UserAccount, UserProfile } from '@/services/api/users.api'

export type { UserAccount, UserProfile }

// ─── Query key factories ─────────────────────────────────────────────────────

export const queryKeys = {
  clients: ['clients'] as const,
  client: (id: number) => ['clients', id] as const,
  routes: ['routes'] as const,
  locations: ['locations'] as const,
  pricings: ['pricings'] as const,
  pricingsFiltered: (filters?: { clientId?: number; workType?: WorkType; route?: string }) =>
    ['pricings', filters] as const,
  workOrders: ['work-orders'] as const,
  workOrder: (id: number) => ['work-orders', id] as const,
  workOrdersFiltered: (filters?: Record<string, string>) =>
    ['work-orders', filters] as const,
  tripOrders: ['trip-orders'] as const,
  tripOrdersFiltered: (filters?: Record<string, string>) =>
    ['trip-orders', filters] as const,
  salaryPeriods: ['salary-periods'] as const,
  salaryPeriodsByDriver: (driverId?: number) =>
    ['salary-periods', driverId] as const,
  drivers: ['drivers'] as const,
  dashboard: ['dashboard'] as const,
  users: ['users'] as const,
  notifications: ['notifications'] as const,
  salaryConfig: ['salary-config'] as const,
  vendors: ['vendors'] as const,
  suggestMatches: (woId: number) => ['suggest-matches', woId] as const,
  suggestWos: (toId: number) => ['suggest-wos', toId] as const,
}

// ─── Query hooks (GET) ───────────────────────────────────────────────────────

export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients,
    queryFn: async () => {
      const res = await apiClient.getClients()
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
    mutationFn: (data: { name: string }) => apiClient.createLocation(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.locations }) },
  })
}

export function useUpdateLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string } }) => apiClient.updateLocation(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.locations }) },
  })
}

export function useDeleteLocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteLocation(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.locations }) },
  })
}

export function usePricings(filters?: { clientId?: number; workType?: WorkType; route?: string }) {
  return useQuery({
    queryKey: queryKeys.pricingsFiltered(filters),
    queryFn: async () => {
      const res = await apiClient.getPricings(filters)
      return res.success ? res.data : []
    },
  })
}

export function useWorkOrders(filters?: { driverId?: number; tractorPlate?: string; dateFrom?: string; dateTo?: string; status?: WorkOrder['status'] }) {
  const flatFilters: Record<string, string> = {}
  if (filters?.driverId) flatFilters.driverId = String(filters.driverId)
  if (filters?.tractorPlate) flatFilters.tractorPlate = filters.tractorPlate
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

export function useSalaryPeriods(driverId?: number) {
  return useQuery({
    queryKey: queryKeys.salaryPeriodsByDriver(driverId),
    queryFn: async () => {
      const res = await apiClient.getSalaryPeriods(driverId)
      return res.success ? res.data : []
    },
  })
}

export function useMySalaryPeriods() {
  return useQuery({
    queryKey: queryKeys.salaryPeriodsByDriver('me'),
    queryFn: async () => {
      const res = await apiClient.getMySalaryPeriods()
      return res.success ? res.data : []
    },
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

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const res = await apiClient.getDashboardSummary()
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
      const res = await api.get('/salary-config')
      return res.data as { from_day: number; to_day: number } | null
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

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Client, 'id'>) => apiClient.createClient(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.clients }) },
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Client> }) => apiClient.updateClient(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.clients }) },
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteClient(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.clients }) },
  })
}

export function useCreateRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<RoutePrice, never>) => apiClient.createRoute(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.routes }) },
  })
}

export function useUpdateRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: Partial<RoutePrice> }) => apiClient.updateRoute(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.routes }) },
  })
}

export function useDeleteRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => apiClient.deleteRoute(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.routes }) },
  })
}

export function useCreatePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Pricing, 'id' | 'createdAt' | 'updatedAt'>) => apiClient.createPricing(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pricings'] }) },
  })
}

export function useUpdatePricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Pricing> }) => apiClient.updatePricing(id, data),
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
    mutationFn: (id: number) => apiClient.deletePricing(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pricings'] }) },
  })
}

export function useCreateWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof apiClient.createWorkOrder>[0]) => apiClient.createWorkOrder(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-orders'] }) },
  })
}

export function useUpdateWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<WorkOrder> }) => apiClient.updateWorkOrder(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-orders'] }) },
  })
}

export function useCreateTripOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<TripOrder, 'id' | 'createdAt' | 'status'>) => apiClient.createTripOrder(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trip-orders'] })
      qc.invalidateQueries({ queryKey: ['work-orders'] })
    },
  })
}

export function useUpdateTripOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TripOrder> }) => apiClient.updateTripOrder(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trip-orders'] }) },
  })
}

export function useReconcile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workOrderId, tripOrderId }: { workOrderId: number; tripOrderId: number }) =>
      apiClient.reconcile(workOrderId, tripOrderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trip-orders'] })
      qc.invalidateQueries({ queryKey: ['work-orders'] })
    },
  })
}

export function useToggleTripConfirmation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tripOrderId: number) => apiClient.toggleTripConfirmation(tripOrderId),
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
      apiClient.calculateSalary(driverId, startDate, endDate),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['salary-periods'] }) },
  })
}

export function useCreateDriver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { username: string; phone: string; tractorPlate?: string; vendor?: string }) =>
      apiClient.createDriver(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.drivers }) },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof apiClient.createUser>[0]) => apiClient.createUser(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.users }) },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: Record<string, unknown> }) => apiClient.updateUser(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.users }) },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string | number) => apiClient.deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.users }) },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ field, value }: { field: string; value: string }) => apiClient.updateProfile(field, value),
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
    mutationFn: ({ tripOrderId, reason }: { tripOrderId: number; reason: string }) =>
      apiClient.unmatch(tripOrderId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tripOrders })
      qc.invalidateQueries({ queryKey: queryKeys.workOrders })
    },
  })
}

export function useUpdateSalaryConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { from_day: number; to_day: number }) => api.put('/salary-config', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.salaryConfig }) },
  })
}

export function useUpdateSalaryPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SalaryPeriod> }) => apiClient.updateSalaryPeriod(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['salary-periods'] }) },
  })
}

export function useVendors() {
  return useQuery({
    queryKey: queryKeys.vendors,
    queryFn: async () => {
      const res = await apiClient.getVendors()
      return res.success ? res.data : []
    },
  })
}

export function useCreateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: VendorFormData) => apiClient.createVendor(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.vendors }) },
  })
}

export function useUpdateVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: VendorFormData }) => apiClient.updateVendor(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.vendors }) },
  })
}

export function useDeleteVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteVendor(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.vendors }) },
  })
}
