import { useCallback } from 'react'
import {
  useVendorRoutePricings,
  useCreateVendorRoutePricing,
  useUpdateVendorRoutePricing,
  useDeleteVendorRoutePricing,
  useVendors,
  useLocations,
} from '@/hooks/use-queries'
import { parsePrice } from '@/lib/parse-price'
import { usePricingManager } from '@/lib/pricing-manager'
import type { WorkType } from '@/data/domain'
import type {
  VendorRoutePricingCreatePayload,
  VendorRoutePricingUpdatePayload,
} from '@/services/api/vendorRoutePricings.api'

export interface VendorRoutePricingFormData {
  vendorId: number
  pickupLocationId: number
  dropoffLocationId: number
  workType: WorkType
  f20Price: string
  f40Price: string
  e20Price: string
  e40Price: string
}

export const EMPTY_FORM: VendorRoutePricingFormData = {
  vendorId: 0,
  pickupLocationId: 0,
  dropoffLocationId: 0,
  workType: 'XUẤT/NHẬP TÀU',
  f20Price: '',
  f40Price: '',
  e20Price: '',
  e40Price: '',
}

type VendorRoutePricingEntity = {
  id: number
  vendor: { id: number }
  pickupLocation: { id: number }
  dropoffLocation: { id: number }
  workType: WorkType
  f20Price: number | null
  f40Price: number | null
  e20Price: number | null
  e40Price: number | null
}

export function useVendorRoutePricing() {
  const mgr = usePricingManager({
    useQuery: useVendorRoutePricings as unknown as (params: Record<string, unknown>) => {
      data?: { items?: unknown[]; total?: number; totalPages?: number } | null
      isLoading: boolean
    },
    useCreateMutation: useCreateVendorRoutePricing as () => { mutate: (arg: unknown, opts?: { onSuccess?: () => void; onError?: (err: Error) => void }) => void; isPending: boolean },
    useUpdateMutation: useUpdateVendorRoutePricing as () => { mutate: (arg: unknown, opts?: { onSuccess?: () => void; onError?: (err: Error) => void }) => void; isPending: boolean },
    useDeleteMutation: useDeleteVendorRoutePricing as () => { mutate: (id: number, opts?: { onSuccess?: () => void; onError?: (err: Error) => void }) => void },
    labels: {
      createSuccess: 'Đã thêm cước trả',
      updateSuccess: 'Đã cập nhật cước trả',
      deleteSuccess: 'Đã xoá cước trả',
      createError: 'Không thể thêm',
      updateError: 'Không thể cập nhật',
      deleteError: 'Không thể xoá',
    },
    formDefaults: EMPTY_FORM as unknown as Record<string, unknown>,
    priceFields: ['f20Price', 'f40Price', 'e20Price', 'e40Price'],
    requiredPayloadFields: ['vendorId', 'pickupLocationId', 'dropoffLocationId'],
    formToPayload: (form) => ({
      vendorId: form.vendorId,
      pickupLocationId: form.pickupLocationId,
      dropoffLocationId: form.dropoffLocationId,
      workType: form.workType,
      f20Price: parsePrice(form.f20Price as string),
      f40Price: parsePrice(form.f40Price as string),
      e20Price: parsePrice(form.e20Price as string),
      e40Price: parsePrice(form.e40Price as string),
    }),
    entityToForm: (entity) => {
      const rp = entity as unknown as VendorRoutePricingEntity
      return {
        vendorId: rp.vendor.id,
        pickupLocationId: rp.pickupLocation.id,
        dropoffLocationId: rp.dropoffLocation.id,
        workType: rp.workType,
        f20Price: rp.f20Price?.toString() ?? '',
        f40Price: rp.f40Price?.toString() ?? '',
        e20Price: rp.e20Price?.toString() ?? '',
        e40Price: rp.e40Price?.toString() ?? '',
      }
    },
    buildQueryParams: (vendorId, workType, pagination) => ({
      vendorId,
      workType,
      ...pagination,
    }),
    paginationEnabled: true,
    defaultPageSize: 100,
  })

  const { data: vendorsData } = useVendors()
  const { data: locationsData } = useLocations()

  const updateItem = useCallback(
    (id: number, data: VendorRoutePricingUpdatePayload, callbacks?: { onSuccess?: () => void; onError?: () => void }) => {
      mgr.updateItem(id, data, callbacks)
    },
    [mgr],
  )

  const setForm = useCallback(
    (form: VendorRoutePricingFormData) => mgr.setForm(form as unknown as Record<string, unknown>),
    [mgr],
  )

  return {
    vendorRoutePricings: mgr.items as VendorRoutePricingEntity[],
    total: mgr.total,
    page: mgr.page,
    setPage: mgr.setPage,
    pageSize: mgr.pageSize,
    setPageSize: mgr.setPageSize,
    totalPages: mgr.totalPages,
    isLoading: mgr.isLoading,
    vendors: vendorsData ?? [],
    locations: locationsData ?? [],
    vendorId: mgr.filterValue,
    setVendorId: mgr.setFilterValue,
    workType: mgr.workType,
    setWorkType: mgr.setWorkType,
    dialogOpen: mgr.dialogOpen,
    setDialogOpen: mgr.setDialogOpen,
    editingId: mgr.editingId,
    form: mgr.form as unknown as VendorRoutePricingFormData,
    setForm,
    deleteId: mgr.deleteId,
    setDeleteId: mgr.setDeleteId,
    openCreate: mgr.openCreate,
    openEdit: mgr.openEdit as (entity: VendorRoutePricingEntity) => void,
    handleSubmit: mgr.handleSubmit,
    handleDelete: mgr.handleDelete,
    updateItem,
    isSubmitting: mgr.isSubmitting,
    isUpdating: mgr.isUpdating,
  }
}
