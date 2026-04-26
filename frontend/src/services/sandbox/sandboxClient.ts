import {
  type Client, type RoutePrice, type Pricing, type WorkOrder, type TripOrder,
  type SalaryPeriod, type Job, type Invoice, type ExpenseItem, type Driver,
  type ApiResponse, type WorkType,
  mockClients, mockRoutePrices, mockPricings, mockWorkOrders, mockTripOrders,
  mockSalaryPeriods, mockJobs, mockInvoices, mockExpenses, mockDrivers, mockMonthlyRevenue,
  mockAlerts,
} from '@/data/mockData'
import { getStore, setStore, generateId, delay } from './storage'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok<T>(data: T, message?: string): ApiResponse<T> {
  return { data, success: true, message }
}

function now(): string {
  return new Date().toISOString()
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function getClients(): Promise<ApiResponse<Client[]>> {
  await delay()
  return ok(getStore('clients', mockClients))
}

export async function createClient(data: Omit<Client, 'id'>): Promise<ApiResponse<Client>> {
  await delay()
  const clients = getStore('clients', mockClients)
  const item: Client = { ...data, id: generateId('CLT') }
  clients.push(item)
  setStore('clients', clients)
  return ok(item)
}

export async function updateClient(id: string, data: Partial<Client>): Promise<ApiResponse<Client>> {
  await delay()
  const clients = getStore('clients', mockClients)
  const idx = clients.findIndex(c => c.id === id)
  if (idx === -1) return { data: null as unknown as Client, success: false, message: 'Không tìm thấy khách hàng' }
  clients[idx] = { ...clients[idx], ...data }
  setStore('clients', clients)
  return ok(clients[idx])
}

export async function deleteClient(id: string): Promise<ApiResponse<{ success: boolean }>> {
  await delay()
  const clients = getStore('clients', mockClients)
  setStore('clients', clients.filter(c => c.id !== id))
  return ok({ success: true })
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function getRoutes(): Promise<ApiResponse<RoutePrice[]>> {
  await delay()
  return ok(getStore('routes', mockRoutePrices))
}

export async function createRoute(data: Omit<RoutePrice, never>): Promise<ApiResponse<RoutePrice>> {
  await delay()
  const routes = getStore('routes', mockRoutePrices)
  const item: RoutePrice = { ...data }
  routes.push(item)
  setStore('routes', routes)
  return ok(item)
}

export async function updateRoute(idx: number, data: Partial<RoutePrice>): Promise<ApiResponse<RoutePrice>> {
  await delay()
  const routes = getStore('routes', mockRoutePrices)
  if (idx < 0 || idx >= routes.length) return { data: null as unknown as RoutePrice, success: false, message: 'Không tìm thấy cung đường' }
  routes[idx] = { ...routes[idx], ...data }
  setStore('routes', routes)
  return ok(routes[idx])
}

export async function deleteRoute(idx: number): Promise<ApiResponse<{ success: boolean }>> {
  await delay()
  const routes = getStore('routes', mockRoutePrices)
  routes.splice(idx, 1)
  setStore('routes', routes)
  return ok({ success: true })
}

// ─── Pricings ─────────────────────────────────────────────────────────────────

export async function getPricings(filters?: { clientId?: string; workType?: WorkType; route?: string }): Promise<ApiResponse<Pricing[]>> {
  await delay()
  let items = getStore('pricings', mockPricings)
  if (filters?.clientId) items = items.filter(p => p.clientId === filters.clientId)
  if (filters?.workType) items = items.filter(p => p.workType === filters.workType)
  if (filters?.route) items = items.filter(p => p.route === filters.route)
  return ok(items)
}

export async function createPricing(data: Omit<Pricing, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Pricing>> {
  await delay()
  const items = getStore('pricings', mockPricings)
  const item: Pricing = { ...data, id: generateId('PRC'), createdAt: now(), updatedAt: now() }
  items.push(item)
  setStore('pricings', items)
  return ok(item)
}

export async function updatePricing(id: string, data: Partial<Pricing>): Promise<ApiResponse<Pricing>> {
  await delay()
  const items = getStore('pricings', mockPricings)
  const idx = items.findIndex(p => p.id === id)
  if (idx === -1) return { data: null as unknown as Pricing, success: false, message: 'Không tìm thấy đơn giá' }
  items[idx] = { ...items[idx], ...data, updatedAt: now() }
  setStore('pricings', items)
  return ok(items[idx])
}

export async function deletePricing(id: string): Promise<ApiResponse<{ success: boolean }>> {
  await delay()
  const items = getStore('pricings', mockPricings)
  setStore('pricings', items.filter(p => p.id !== id))
  return ok({ success: true })
}

// ─── Work Orders ──────────────────────────────────────────────────────────────

interface WorkOrderFilters {
  driverId?: string
  tractorPlate?: string
  dateFrom?: string
  dateTo?: string
  status?: WorkOrder['status']
}

export async function getWorkOrders(filters?: WorkOrderFilters): Promise<ApiResponse<WorkOrder[]>> {
  await delay()
  let items = getStore('work_orders', mockWorkOrders)
  if (filters?.driverId) items = items.filter(w => w.driverId === filters.driverId)
  if (filters?.tractorPlate) items = items.filter(w => w.tractorPlate === filters.tractorPlate)
  if (filters?.dateFrom) items = items.filter(w => w.createdAt >= filters.dateFrom!)
  if (filters?.dateTo) items = items.filter(w => w.createdAt <= filters.dateTo! + 'T23:59:59Z')
  if (filters?.status) items = items.filter(w => w.status === filters.status)
  return ok(items)
}

export async function createWorkOrder(data: Omit<WorkOrder, 'id' | 'createdAt' | 'status' | 'unitPrice' | 'driverSalary' | 'allowance' | 'earning' | 'pricingId' | 'gpsAddress'>): Promise<ApiResponse<WorkOrder>> {
  await delay()

  let items: WorkOrder[]
  try {
    items = getStore('work_orders', mockWorkOrders)
  } catch {
    items = [...mockWorkOrders]
  }

  const pricings = getStore('pricings', mockPricings)
  const firstType = data.containers?.[0]?.workType ?? 'E20'
  const pricing = pricings.find(p =>
    p.clientId === data.clientId && p.workType === firstType && p.route === data.route,
  )

  const unitPrice = pricing?.unitPrice ?? 0
  const driverSalary = pricing?.driverSalary ?? 0
  const allowance = pricing?.allowance ?? 0
  const earning = driverSalary + allowance
  const status: WorkOrder['status'] = pricing ? 'PRICED' : 'PENDING'

  const item: WorkOrder = {
    ...data,
    id: generateId('WO'),
    gpsAddress: 'Cảng Chùa Vẽ, Ngô Quyền, Hải Phòng',
    unitPrice,
    driverSalary,
    allowance,
    earning,
    pricingId: pricing?.id,
    createdAt: now(),
    status,
  }
  items.push(item)
  setStore('work_orders', items)
  return ok(item)
}

export async function updateWorkOrder(id: string, data: Partial<WorkOrder>): Promise<ApiResponse<WorkOrder>> {
  await delay()
  const items = getStore('work_orders', mockWorkOrders)
  const idx = items.findIndex(w => w.id === id)
  if (idx === -1) return { data: null as unknown as WorkOrder, success: false, message: 'Không tìm thấy số công' }
  items[idx] = { ...items[idx], ...data }
  setStore('work_orders', items)
  return ok(items[idx])
}

// ─── Trip Orders ──────────────────────────────────────────────────────────────

interface TripOrderFilters {
  clientId?: string
  driverId?: string
  status?: TripOrder['status']
  dateFrom?: string
  dateTo?: string
}

export async function getTripOrders(filters?: TripOrderFilters): Promise<ApiResponse<TripOrder[]>> {
  await delay()
  let items = getStore('trip_orders', mockTripOrders)
  if (filters?.clientId) items = items.filter(t => t.clientId === filters.clientId)
  if (filters?.driverId) items = items.filter(t => t.driverId === filters.driverId)
  if (filters?.status) items = items.filter(t => t.status === filters.status)
  if (filters?.dateFrom) items = items.filter(t => t.tripDate >= filters.dateFrom!)
  if (filters?.dateTo) items = items.filter(t => t.tripDate <= filters.dateTo!)
  return ok(items)
}

export async function createTripOrder(data: Omit<TripOrder, 'id' | 'createdAt' | 'status'>): Promise<ApiResponse<TripOrder>> {
  await delay()
  const items = getStore('trip_orders', mockTripOrders)
  const item: TripOrder = { ...data, id: generateId('TRP'), createdAt: now(), status: 'DRAFT' }
  items.push(item)

  // Mark matched work orders
  if (data.matchedWorkOrderIds.length > 0) {
    const workOrders = getStore('work_orders', mockWorkOrders)
    data.matchedWorkOrderIds.forEach(woId => {
      const wo = workOrders.find(w => w.id === woId)
      if (wo) wo.status = 'MATCHED'
    })
    setStore('work_orders', workOrders)
  }

  setStore('trip_orders', items)
  return ok(item)
}

export async function updateTripOrder(id: string, data: Partial<TripOrder>): Promise<ApiResponse<TripOrder>> {
  await delay()
  const items = getStore('trip_orders', mockTripOrders)
  const idx = items.findIndex(t => t.id === id)
  if (idx === -1) return { data: null as unknown as TripOrder, success: false, message: 'Không tìm thấy chuyến' }
  items[idx] = { ...items[idx], ...data }
  setStore('trip_orders', items)
  return ok(items[idx])
}

// ─── Salary ───────────────────────────────────────────────────────────────────

export async function calculateSalary(
  driverId: string,
  startDate: string,
  endDate: string,
): Promise<ApiResponse<SalaryPeriod>> {
  await delay()
  const workOrders = getStore('work_orders', mockWorkOrders)
  const matched = workOrders.filter(
    w => w.driverId === driverId && w.status !== 'PENDING'
      && w.createdAt >= startDate + 'T00:00:00Z'
      && w.createdAt <= endDate + 'T23:59:59Z',
  )

  let totalSalary = 0
  let totalAllowance = 0

  matched.forEach(wo => {
    totalSalary += wo.driverSalary
    totalAllowance += wo.allowance
  })

  const driver = getStore('drivers', mockDrivers).find(d => d.id === driverId)
  const period: SalaryPeriod = {
    id: generateId('SAL'),
    driverId,
    driverName: driver?.name ?? '',
    startDate,
    endDate,
    workOrderCount: matched.length,
    pricePerOrder: matched.length > 0 ? Math.round(totalSalary / matched.length) : 0,
    totalSalary,
    totalAllowance,
    totalDeduction: 0,
    netPay: totalSalary + totalAllowance,
    status: 'CALCULATED',
  }

  const periods = getStore('salary_periods', mockSalaryPeriods)
  periods.push(period)
  setStore('salary_periods', periods)
  return ok(period)
}

export async function getSalaryPeriods(driverId?: string): Promise<ApiResponse<SalaryPeriod[]>> {
  await delay()
  let items = getStore('salary_periods', mockSalaryPeriods)
  if (driverId) items = items.filter(s => s.driverId === driverId)
  return ok(items)
}

export async function updateSalaryPeriod(id: string, data: Partial<SalaryPeriod>): Promise<ApiResponse<SalaryPeriod>> {
  await delay()
  const items = getStore('salary_periods', mockSalaryPeriods)
  const idx = items.findIndex(s => s.id === id)
  if (idx === -1) return { data: null as unknown as SalaryPeriod, success: false, message: 'Không tìm thấy kỳ lương' }
  items[idx] = { ...items[idx], ...data }
  setStore('salary_periods', items)
  return ok(items[idx])
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export async function getJobs(filters?: { driverId?: string; status?: Job['status'] }): Promise<ApiResponse<Job[]>> {
  await delay()
  let items = getStore('jobs', mockJobs)
  if (filters?.driverId) items = items.filter(j => j.driverId === filters.driverId)
  if (filters?.status) items = items.filter(j => j.status === filters.status)
  return ok(items)
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function getInvoices(filters?: { clientId?: string; status?: Invoice['status'] }): Promise<ApiResponse<Invoice[]>> {
  await delay()
  let items = getStore('invoices', mockInvoices)
  if (filters?.clientId) items = items.filter(i => i.clientId === filters.clientId)
  if (filters?.status) items = items.filter(i => i.status === filters.status)
  return ok(items)
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function getExpenses(filters?: { tractorPlate?: string; dateFrom?: string; dateTo?: string }): Promise<ApiResponse<ExpenseItem[]>> {
  await delay()
  let items = getStore('expenses', mockExpenses)
  if (filters?.tractorPlate) items = items.filter(e => e.tractorPlate === filters.tractorPlate)
  if (filters?.dateFrom) items = items.filter(e => e.date >= filters.dateFrom!)
  if (filters?.dateTo) items = items.filter(e => e.date <= filters.dateTo!)
  return ok(items)
}

// ─── Drivers ──────────────────────────────────────────────────────────────────

export async function getDrivers(): Promise<ApiResponse<Driver[]>> {
  await delay()
  return ok(getStore('drivers', mockDrivers))
}

export async function createDriver(data: { name: string; phone: string; tractorPlate: string }): Promise<ApiResponse<Driver>> {
  await delay()
  const drivers = getStore('drivers', mockDrivers)
  const item: Driver = {
    ...data,
    id: generateId('DRV'),
    fixedFeePerTrip: 800000,
    totalTrips: 0,
    monthlyTrips: 0,
    monthlyRevenue: 0,
    rating: 5.0,
  }
  drivers.push(item)
  setStore('drivers', drivers)
  return ok(item)
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardSummary(): Promise<ApiResponse<{
  totalRevenue: number
  totalExpense: number
  tripCount: number
  activeTrips: number
  outstandingDebt: number
  monthlyRevenue: { month: string; revenue: number; expense: number }[]
  alerts: typeof mockAlerts
}>> {
  await delay()
  const jobs = getStore('jobs', mockJobs)
  const clients = getStore('clients', mockClients)
  const revenue = mockMonthlyRevenue
  const totalRevenue = revenue.length > 0 ? revenue[revenue.length - 1].revenue : 0
  const totalExpense = revenue.length > 0 ? revenue[revenue.length - 1].expense : 0
  const outstandingDebt = clients.reduce((sum, c) => sum + c.outstandingDebt, 0)

  return ok({
    totalRevenue,
    totalExpense,
    tripCount: jobs.length,
    activeTrips: jobs.filter(j => j.status === 'IN_PROGRESS').length,
    outstandingDebt,
    monthlyRevenue: revenue,
    alerts: mockAlerts,
  })
}

export async function resetAllData(): Promise<ApiResponse<{ success: boolean }>> {
  await delay()
  const keys = ['clients', 'routes', 'pricings', 'work_orders', 'trip_orders', 'salary_periods', 'jobs', 'invoices', 'expenses', 'drivers']
  keys.forEach(k => localStorage.removeItem('ttransport_' + k))
  return ok({ success: true })
}
