import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { RoutePricingTable } from '@/components/route-pricing/RoutePricingTable'
import type { RoutePricing } from '@/data/domain'
import '@/index.css'

const routes: RoutePricing[] = [
  {
    id: 1,
    client: { id: 1, code: 'HẢI AN', name: 'Công ty TNHH Cảng Hải An' },
    pickupLocation: { id: 1, name: 'Nam Hải Đình Vũ' },
    dropoffLocation: { id: 2, name: 'Green Port' },
    workType: 'XUẤT/NHẬP TÀU',
    f20Price: 500000,
    f40Price: 700000,
    e20Price: 300000,
    e40Price: 425000,
    f20DriverSalary: 250000,
    f40DriverSalary: 350000,
    e20DriverSalary: 150000,
    e40DriverSalary: 210000,
    isActive: true,
    createdAt: '2026-08-20T08:00:00Z',
    updatedAt: '2026-08-22T05:00:00Z',
  },
  {
    id: 2,
    client: { id: 2, code: 'GLORY', name: 'Công ty Cổ phần Glory Logistics' },
    pickupLocation: { id: 2, name: 'Green Port' },
    dropoffLocation: { id: 1, name: 'Nam Hải Đình Vũ' },
    workType: 'CHUYỂN BÃI',
    f20Price: 480000,
    f40Price: 670000,
    e20Price: 288000,
    e40Price: 407000,
    f20DriverSalary: 240000,
    f40DriverSalary: 335000,
    e20DriverSalary: 144000,
    e40DriverSalary: 204000,
    isActive: true,
    createdAt: '2026-08-20T08:00:00Z',
    updatedAt: '2026-08-21T05:00:00Z',
  },
]

const params = new URLSearchParams(window.location.search)
const loadFailed = params.get('error') === '1'

const groups = [
  {
    clientId: 1,
    clientName: routes[0].client.name,
    clientCode: routes[0].client.code ?? null,
    routeCount: 1,
    routes: [routes[0]],
  },
  {
    clientId: 2,
    clientName: routes[1].client.name,
    clientCode: routes[1].client.code ?? null,
    routeCount: 1,
    routes: [routes[1]],
  },
]

const tableProps = {
  data: loadFailed ? [] : routes,
  isLoading: false,
  error: loadFailed ? new Error('Lỗi máy chủ, vui lòng thử lại sau') : null,
  onRetry: () => {
    document.body.dataset.retried = 'true'
  },
  editingId: null,
  onStartEdit: () => undefined,
  onSave: () => undefined,
  onCancelEdit: () => undefined,
  onDelete: () => undefined,
  clients: routes.map(route => route.client),
  locations: [routes[0].pickupLocation, routes[0].dropoffLocation],
  groups: loadFailed ? [] : groups,
  expandedClients: new Set([1, 2]),
  onToggleClient: () => undefined,
  onExpandAll: () => undefined,
  onCollapseAll: () => undefined,
  selectedClientId: 1,
  onSelectClient: () => undefined,
}

createRoot(document.getElementById('root')!).render(
  createElement(RoutePricingTable, tableProps),
)
