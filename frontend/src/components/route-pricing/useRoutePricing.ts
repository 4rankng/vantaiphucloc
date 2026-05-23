import { useState, useCallback } from 'react'
import {
  useRoutePricings,
  useCreateRoutePricing,
  useUpdateRoutePricing,
  useDeleteRoutePricing,
  useClients,
  useLocations,
} from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
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
}

function parsePrice(v: string): number | null {
  if (!v.trim()) return null
  const n = parseInt(v.replace(/[,.]/g, ''), 10)
  return isNaN(n) ? null : n
}

export function useRoutePricing() {
  const toast = useToast()
  const [clientId, setClientId] = useState<number | undefined>()
  const [workType, setWorkType] = useState<string | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<RoutePricingFormData>(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data: routePricings = [], isLoading } = useRoutePricings({
    clientId,
    workType,
  })
  const { data: clientsData } = useClients()
  const { data: locationsData } = useLocations()
  const createMutation = useCreateRoutePricing()
  const updateMutation = useUpdateRoutePricing()
  const deleteMutation = useDeleteRoutePricing()

  const clients = clientsData ?? []
  const locations = locationsData ?? []

  const openCreate = useCallback(() => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback(
    (rp: { id: number; client: { id: number }; pickupLocation: { id: number }; dropoffLocation: { id: number }; workType: WorkType; f20Price: number | null; f40Price: number | null; e20Price: number | null; e40Price: number | null }) => {
      setEditingId(rp.id)
      setForm({
        clientId: rp.client.id,
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
      clientId: form.clientId,
      pickupLocationId: form.pickupLocationId,
      dropoffLocationId: form.dropoffLocationId,
      workType: form.workType,
      f20Price: parsePrice(form.f20Price),
      f40Price: parsePrice(form.f40Price),
      e20Price: parsePrice(form.e20Price),
      e40Price: parsePrice(form.e40Price),
    }

    if (!payload.clientId || !payload.pickupLocationId || !payload.dropoffLocationId) {
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
        { id: editingId, data: payload as RoutePricingUpdatePayload },
        {
          onSuccess: () => {
            toast.success('Đã cập nhật cước tuyến')
            setDialogOpen(false)
          },
          onError: () => toast.error('Không thể cập nhật'),
        },
      )
    } else {
      createMutation.mutate(payload as RoutePricingCreatePayload, {
        onSuccess: () => {
          toast.success('Đã thêm cước tuyến')
          setDialogOpen(false)
        },
        onError: () => toast.error('Không thể thêm'),
      })
    }
  }, [form, editingId, createMutation, updateMutation, toast])

  const handleDelete = useCallback(() => {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success('Đã xoá cước tuyến')
        setDeleteId(null)
      },
      onError: () => toast.error('Không thể xoá'),
    })
  }, [deleteId, deleteMutation, toast])

  return {
    routePricings,
    isLoading,
    clients,
    locations,
    clientId,
    setClientId,
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
    isSubmitting: createMutation.isPending || updateMutation.isPending,
  }
}
