import { useCallback } from 'react'
import {
  useRoutePricings,
  useCreateRoutePricing,
  useUpdateRoutePricing,
  useDeleteRoutePricing,
  useClients,
  useLocations,
} from '@/hooks/use-queries'
import { parsePrice } from '@/lib/parse-price'
import { usePricingManager } from '@/lib/pricing-manager'
import type { WorkType } from '@/data/domain'
import type {
  RoutePricingCreatePayload,
  RoutePricingUpdatePayload,
} from '@/services/api/routePricings.api'

export interface RoutePricingFormData {
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

export const EMPTY_FORM: RoutePricingFormData = {
  clientId: 0,
  pickupLocationId: 0,
  dropoffLocationId: 0,
  workType: 'XUẤT/NHẬP TÀU',
  f20Price: '',
  f40Price: '',
  e20Price: '',
  e40Price: '',
  f20DriverSalary: '',
  f40DriverSalary: '',
  e20DriverSalary: '',
  e40DriverSalary: '',
}

const PRICE_FIELDS = ['f20Price', 'f40Price', 'e20Price', 'e40Price'] as const

type RoutePricingEntity = {
  id: number
  client: { id: number }
  pickupLocation: { id: number }
  dropoffLocation: { id: number }
  workType: WorkType
  f20Price: number | null
  f40Price: number | null
  e20Price: number | null
  e40Price: number | null
  f20DriverSalary: number | null
  f40DriverSalary: number | null
  e20DriverSalary: number | null
  e40DriverSalary: number | null
}

export function useRoutePricing() {
  const mgr = usePricingManager({
    useQuery: useRoutePricings as unknown as (params: Record<string, unknown>) => {
      data?: { items?: unknown[]; total?: number; totalPages?: number } | null
      isLoading: boolean
    },
    useCreateMutation: useCreateRoutePricing as () => { mutate: (arg: unknown, opts?: { onSuccess?: () => void; onError?: (err: Error) => void }) => void; isPending: boolean },
    useUpdateMutation: useUpdateRoutePricing as () => { mutate: (arg: unknown, opts?: { onSuccess?: () => void; onError?: (err: Error) => void }) => void; isPending: boolean },
    useDeleteMutation: useDeleteRoutePricing as () => { mutate: (id: number, opts?: { onSuccess?: () => void; onError?: (err: Error) => void }) => void },
    labels: {
      createSuccess: 'Đã thêm cước tuyến',
      updateSuccess: 'Đã cập nhật cước tuyến',
      deleteSuccess: 'Đã xoá cước tuyến',
      createError: 'Không thể thêm',
      updateError: 'Không thể cập nhật',
      deleteError: 'Không thể xoá',
    },
    formDefaults: EMPTY_FORM as unknown as Record<string, unknown>,
    priceFields: [...PRICE_FIELDS],
    requiredPayloadFields: ['clientId', 'pickupLocationId', 'dropoffLocationId'],
    formToPayload: (form) => ({
      clientId: form.clientId,
      pickupLocationId: form.pickupLocationId,
      dropoffLocationId: form.dropoffLocationId,
      workType: form.workType,
      f20Price: parsePrice(form.f20Price as string),
      f40Price: parsePrice(form.f40Price as string),
      e20Price: parsePrice(form.e20Price as string),
      e40Price: parsePrice(form.e40Price as string),
      f20DriverSalary: parsePrice(form.f20DriverSalary as string),
      f40DriverSalary: parsePrice(form.f40DriverSalary as string),
      e20DriverSalary: parsePrice(form.e20DriverSalary as string),
      e40DriverSalary: parsePrice(form.e40DriverSalary as string),
    }),
    entityToForm: (entity) => {
      const rp = entity as unknown as RoutePricingEntity
      return {
        clientId: rp.client.id,
        pickupLocationId: rp.pickupLocation.id,
        dropoffLocationId: rp.dropoffLocation.id,
        workType: rp.workType,
        f20Price: rp.f20Price?.toString() ?? '',
        f40Price: rp.f40Price?.toString() ?? '',
        e20Price: rp.e20Price?.toString() ?? '',
        e40Price: rp.e40Price?.toString() ?? '',
        f20DriverSalary: rp.f20DriverSalary?.toString() ?? '',
        f40DriverSalary: rp.f40DriverSalary?.toString() ?? '',
        e20DriverSalary: rp.e20DriverSalary?.toString() ?? '',
        e40DriverSalary: rp.e40DriverSalary?.toString() ?? '',
      }
    },
    buildQueryParams: (clientId, workType, pagination) => ({
      clientId,
      workType,
      ...pagination,
    }),
    paginationEnabled: false,
    defaultPageSize: 1000,
  })

  const { data: clientsData } = useClients()
  const { data: locationsData } = useLocations()

  const updateItem = useCallback(
    (id: number, data: RoutePricingUpdatePayload, callbacks?: { onSuccess?: () => void; onError?: () => void }) => {
      mgr.updateItem(id, data, callbacks)
    },
    [mgr],
  )

  const setForm = useCallback(
    (form: RoutePricingFormData) => mgr.setForm(form as unknown as Record<string, unknown>),
    [mgr],
  )

  return {
    routePricings: mgr.items as RoutePricingEntity[],
    total: mgr.total,
    isLoading: mgr.isLoading,
    clients: clientsData ?? [],
    locations: locationsData ?? [],
    clientId: mgr.filterValue,
    setClientId: mgr.setFilterValue,
    workType: mgr.workType,
    setWorkType: mgr.setWorkType,
    dialogOpen: mgr.dialogOpen,
    setDialogOpen: mgr.setDialogOpen,
    editingId: mgr.editingId,
    form: mgr.form as unknown as RoutePricingFormData,
    setForm,
    deleteId: mgr.deleteId,
    setDeleteId: mgr.setDeleteId,
    openCreate: mgr.openCreate,
    openEdit: mgr.openEdit as (entity: RoutePricingEntity) => void,
    handleSubmit: mgr.handleSubmit,
    handleDelete: mgr.handleDelete,
    updateItem,
    isSubmitting: mgr.isSubmitting,
    isUpdating: mgr.isUpdating,
  }
}
