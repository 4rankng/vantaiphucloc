import type { RoutePricing, WorkType } from '@/data/domain'

export type FocusableField =
  | 'clientId'
  | 'pickupLocationId'
  | 'dropoffLocationId'
  | 'workType'
  | 'f20Price'
  | 'f40Price'
  | 'e20Price'
  | 'e40Price'
  | 'f20DriverSalary'
  | 'f40DriverSalary'
  | 'e20DriverSalary'
  | 'e40DriverSalary'

export type RoutePricingFormData = {
  clientId: number
  pickupLocationId: number
  dropoffLocationId: number
  workType: WorkType
  f20Price: string
  f40Price: string
  e20Price: string
  e40Price: string
  f20DriverSalary: string
  f40DriverSalary: string
  e20DriverSalary: string
  e40DriverSalary: string
}

export interface ClientGroup {
  clientId: number
  clientName: string
  clientCode: string | null
  routeCount: number
  routes: RoutePricing[]
}

export interface RoutePricingTableProps {
  data: RoutePricing[]
  isLoading: boolean
  editingId: number | null
  editingField?: FocusableField
  onStartEdit: (rp: RoutePricing, field?: FocusableField) => void
  onSave: (id: number, data: RoutePricingFormData) => void
  onCancelEdit: () => void
  onDelete: (id: number) => void
  editInitial?: RoutePricingFormData
  isSaving?: boolean
  clients: Array<{ id: number; name: string; code?: string | null }>
  locations: Array<{ id: number; name: string }>
  // Grouping props
  groups: ClientGroup[]
  expandedClients: Set<number>
  onToggleClient: (clientId: number) => void
  onExpandAll: () => void
  onCollapseAll: () => void
  // Mobile
  isMobile?: boolean
  onEditOpenDialog?: (rp: RoutePricing) => void
}
