import { useState, useCallback } from 'react'
import {
  useVendorRoutePricings,
  useCreateVendorRoutePricing,
  useUpdateVendorRoutePricing,
  useDeleteVendorRoutePricing,
  useVendors,
  useLocations,
} from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
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

function parsePrice(v: string): number | null {
  if (!v.trim()) return null
  const n = parseInt(v.replace(/[,.]/g, ''), 10)
  return isNaN(n) ? null : n
}

export function useVendorRoutePricing() {
  const toast = useToast()
  const [vendorId, setVendorIdState] = useState<number | undefined>()
  const [workType, setWorkTypeState] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<VendorRoutePricingFormData>(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data: vendorRoutePricingsData, isLoading } = useVendorRoutePricings({
    vendorId,
    workType,
    page,
    pageSize,
  })

  const setVendorId = useCallback((id?: number) => {
    setVendorIdState(id)
    setPage(1)
  }, [])

  const setWorkType = useCallback((wt?: string) => {
    setWorkTypeState(wt)
    setPage(1)
  }, [])
  const { data: vendorsData } = useVendors()
  const { data: locationsData } = useLocations()
  const createMutation = useCreateVendorRoutePricing()
  const updateMutation = useUpdateVendorRoutePricing()
  const deleteMutation = useDeleteVendorRoutePricing()

  const vendors = vendorsData ?? []
  const locations = locationsData ?? []

  const openCreate = useCallback(() => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback(
    (rp: { id: number; vendor: { id: number }; pickupLocation: { id: number }; dropoffLocation: { id: number }; workType: WorkType; f20Price: number | null; f40Price: number | null; e20Price: number | null; e40Price: number | null }) => {
      setEditingId(rp.id)
      setForm({
        vendorId: rp.vendor.id,
        pickupLocationId: rp.pickupLocation.id,
        dropoffLocationId: rp.dropoffLocation.id,
        workType: rp.workType,
        f20Price: rp.f20Price?.toString() ?? '',
        f40Price: rp.f40Price?.toString() ?? '',
        e20Price: rp.e20Price?.toString() ?? '',
        e40Price: rp.e40Price?.toString() ?? '',
      })
      setDialogOpen(true)
    },
    [],
  )

  const handleSubmit = useCallback(() => {
    const payload = {
      vendorId: form.vendorId,
      pickupLocationId: form.pickupLocationId,
      dropoffLocationId: form.dropoffLocationId,
      workType: form.workType,
      f20Price: parsePrice(form.f20Price),
      f40Price: parsePrice(form.f40Price),
      e20Price: parsePrice(form.e20Price),
      e40Price: parsePrice(form.e40Price),
    }

    if (!payload.vendorId || !payload.pickupLocationId || !payload.dropoffLocationId) {
      toast.error('Vui lòng điền đầy đủ thông tin')
      return
    }
    if (
      payload.f20Price === null &&
      payload.f40Price === null &&
      payload.e20Price === null &&
      payload.e40Price === null
    ) {
      toast.error('Phải có ít nhất một giá cước')
      return
    }

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: payload as VendorRoutePricingUpdatePayload },
        {
          onSuccess: () => {
            toast.success('Đã cập nhật cước trả')
            setDialogOpen(false)
          },
          onError: (err) => toast.error('Không thể cập nhật', err.message),
        },
      )
    } else {
      createMutation.mutate(payload as VendorRoutePricingCreatePayload, {
        onSuccess: () => {
          toast.success('Đã thêm cước trả')
          setDialogOpen(false)
        },
        onError: (err) => toast.error('Không thể thêm', err.message),
      })
    }
  }, [form, editingId, createMutation, updateMutation, toast])

  const handleDelete = useCallback(() => {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success('Đã xoá cước trả')
        setDeleteId(null)
      },
      onError: (err) => toast.error('Không thể xoá', err.message),
    })
  }, [deleteId, deleteMutation, toast])

  const updateItem = useCallback(
    (id: number, data: VendorRoutePricingUpdatePayload, callbacks?: { onSuccess?: () => void; onError?: () => void }) => {
      updateMutation.mutate(
        { id, data },
        {
          onSuccess: () => {
            toast.success('Đã cập nhật cước trả')
            callbacks?.onSuccess?.()
          },
          onError: (err) => {
            toast.error('Không thể cập nhật', err.message)
            callbacks?.onError?.()
          },
        },
      )
    },
    [updateMutation, toast],
  )

  return {
    vendorRoutePricings: vendorRoutePricingsData?.items ?? [],
    total: vendorRoutePricingsData?.total ?? 0,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages: vendorRoutePricingsData?.totalPages ?? 0,
    isLoading,
    vendors,
    locations,
    vendorId,
    setVendorId,
    workType,
    setWorkType,
    dialogOpen,
    setDialogOpen,
    editingId,
    form,
    setForm,
    deleteId,
    setDeleteId,
    openCreate,
    openEdit,
    handleSubmit,
    handleDelete,
    updateItem,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isUpdating: updateMutation.isPending,
  }
}
