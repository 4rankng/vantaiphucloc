import { useState, useCallback } from 'react'
import { useToast } from '@/components/atoms/Toast'
import { parsePrice } from '@/lib/parse-price'

export interface PricingManagerConfig {
  /** Hook that fetches the list */
  useQuery: (params: Record<string, unknown>) => {
    data?: { items?: unknown[]; total?: number; totalPages?: number } | null
    isLoading: boolean
  }
  /** Hook that creates */
  useCreateMutation: () => UseMutationResult
  /** Hook that updates */
  useUpdateMutation: () => UseMutationResult
  /** Hook that deletes */
  useDeleteMutation: () => UseSimpleMutationResult
  /** Labels for toast messages */
  labels: {
    createSuccess: string
    updateSuccess: string
    deleteSuccess: string
    createError: string
    updateError: string
    deleteError: string
  }
  /** Default form values */
  formDefaults: Record<string, unknown>
  /** Form fields that are price inputs (parsed via parsePrice) */
  priceFields: string[]
  /** Form fields that are required (must be truthy after payload conversion) */
  requiredPayloadFields: string[]
  /** Convert form to API payload */
  formToPayload: (form: Record<string, unknown>) => Record<string, unknown>
  /** Convert entity to form values */
  entityToForm: (entity: { id: number; [key: string]: unknown }) => Record<string, unknown>
  /** Build query params from filter + pagination state */
  buildQueryParams: (
    filterValue: number | undefined,
    workType: string | undefined,
    pagination: { page?: number; pageSize: number },
  ) => Record<string, unknown>
  /** Whether pagination controls are exposed */
  paginationEnabled: boolean
  defaultPageSize: number
}

export interface UseMutationResult {
  mutate: (
    arg: unknown,
    opts?: { onSuccess?: () => void; onError?: (err: Error) => void },
  ) => void
  isPending: boolean
}

export interface UseSimpleMutationResult {
  mutate: (
    id: number,
    opts?: { onSuccess?: () => void; onError?: (err: Error) => void },
  ) => void
}

export interface PricingManagerResult {
  items: unknown[]
  total: number
  totalPages: number
  isLoading: boolean
  filterValue: number | undefined
  setFilterValue: (id?: number) => void
  workType: string | undefined
  setWorkType: (wt?: string) => void
  page: number
  setPage: (p: number) => void
  pageSize: number
  setPageSize: (s: number) => void
  dialogOpen: boolean
  setDialogOpen: (open: boolean) => void
  editingId: number | null
  form: Record<string, unknown>
  setForm: (form: Record<string, unknown>) => void
  deleteId: number | null
  setDeleteId: (id: number | null) => void
  openCreate: () => void
  openEdit: (entity: { id: number; [key: string]: unknown }) => void
  handleSubmit: () => void
  handleDelete: () => void
  updateItem: (
    id: number,
    data: unknown,
    callbacks?: { onSuccess?: () => void; onError?: () => void },
  ) => void
  createMutation: UseMutationResult
  updateMutation: UseMutationResult
  isSubmitting: boolean
  isUpdating: boolean
}

export function usePricingManager(config: PricingManagerConfig): PricingManagerResult {
  const {
    useQuery,
    useCreateMutation,
    useUpdateMutation,
    useDeleteMutation,
    labels,
    formDefaults,
    priceFields,
    requiredPayloadFields,
    formToPayload,
    buildQueryParams,
    paginationEnabled,
    defaultPageSize,
  } = config

  const toast = useToast()
  const [filterValue, setFilterValueState] = useState<number | undefined>()
  const [workType, setWorkTypeState] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<Record<string, unknown>>(formDefaults)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const pagination = paginationEnabled ? { page, pageSize } : { pageSize }
  const { data: queryData, isLoading } = useQuery(
    buildQueryParams(filterValue, workType, pagination),
  )

  const setFilterValue = useCallback(
    (id?: number) => {
      setFilterValueState(id)
      if (paginationEnabled) setPage(1)
    },
    [paginationEnabled],
  )

  const setWorkType = useCallback(
    (wt?: string) => {
      setWorkTypeState(wt)
      if (paginationEnabled) setPage(1)
    },
    [paginationEnabled],
  )

  const createMutation = useCreateMutation()
  const updateMutation = useUpdateMutation()
  const deleteMutation = useDeleteMutation()

  const openCreate = useCallback(() => {
    setEditingId(null)
    setForm(formDefaults)
    setDialogOpen(true)
  }, [formDefaults])

  const openEdit = useCallback(
    (entity: { id: number; [key: string]: unknown }) => {
      setEditingId(entity.id)
      setForm(config.entityToForm(entity))
      setDialogOpen(true)
    },
    [config],
  )

  const handleSubmit = useCallback(() => {
    const payload = formToPayload(form)

    for (const field of requiredPayloadFields) {
      if (payload[field] == null || payload[field] === '') {
        toast.error('Vui lòng điền đầy đủ thông tin')
        return
      }
    }

    const hasPrice = priceFields.some(
      (field) => parsePrice(form[field] as string) !== null,
    )
    if (!hasPrice) {
      toast.error('Phải có ít nhất một giá cước')
      return
    }

    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            toast.success(labels.updateSuccess)
            setDialogOpen(false)
          },
          onError: (err: Error) => toast.error(labels.updateError, err.message),
        },
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(labels.createSuccess)
          setDialogOpen(false)
        },
        onError: (err: Error) => toast.error(labels.createError, err.message),
      })
    }
  }, [form, editingId, createMutation, updateMutation, toast, labels, requiredPayloadFields, priceFields, formToPayload])

  const handleDelete = useCallback(() => {
    if (!deleteId) return
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success(labels.deleteSuccess)
        setDeleteId(null)
      },
      onError: (err: Error) => toast.error(labels.deleteError, err.message),
    })
  }, [deleteId, deleteMutation, toast, labels])

  const updateItem = useCallback(
    (
      id: number,
      data: unknown,
      callbacks?: { onSuccess?: () => void; onError?: () => void },
    ) => {
      updateMutation.mutate(
        { id, data },
        {
          onSuccess: () => {
            toast.success(labels.updateSuccess)
            callbacks?.onSuccess?.()
          },
          onError: (err: Error) => {
            toast.error(labels.updateError, err.message)
            callbacks?.onError?.()
          },
        },
      )
    },
    [updateMutation, toast, labels],
  )

  return {
    items: (queryData?.items as unknown[]) ?? [],
    total: queryData?.total ?? 0,
    totalPages: queryData?.totalPages ?? 0,
    isLoading,
    filterValue,
    setFilterValue,
    workType,
    setWorkType,
    page,
    setPage,
    pageSize,
    setPageSize,
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
    createMutation,
    updateMutation,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    isUpdating: updateMutation.isPending,
  }
}
