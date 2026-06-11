import { useState, useEffect, useCallback } from 'react'
import { Truck, Plus } from 'lucide-react'
import { Button } from '@/components/ui'
import { DangerConfirmDialog } from '@/components/shared/overlays/DangerConfirmDialog/DangerConfirmDialog'
import { Panel } from '@/components/shared/overlays/Panel'
import { EmptyState } from '@/components/shared/feedback/EmptyState'
import { useInfiniteScroll, LoadMoreSentinel, SearchInput } from '@/components/shared/data-display/ListUtils'
import { TableSkeleton } from '@/components/shared/data-display/TableSkeleton/TableSkeleton'
import { StatPill } from '@/components/shared/data-display/StatPill'
import { PageHeader } from '@/components/shared/layouts/PageHeader'
import { VendorEditRow, VendorRow, VendorMobileCard, VendorMobileEditCard } from '@/components/shared/cards/VendorCard'
import { EMPTY_VENDOR_FORM } from '@/components/shared/cards/VendorCard'
import type { VendorFormData, VendorFocusableField } from '@/components/shared/cards/VendorCard'
import {
  useVendors,
  useVendorsPaged,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
} from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { useDebounce } from '@/hooks/use-debounce'
import type { Vendor } from '@/data/domain'
import { useIsMobile } from '@/hooks/use-mobile'

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH = 15

// ─── Main page ────────────────────────────────────────────────────────────────

export function VendorsPage() {
  const isMobile = useIsMobile(768)
  const toast = useToast()
  // Keep useVendors for accurate stat counts (no search filter)
  const { data: allVendors = [] } = useVendors()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const { data: pagedData, isLoading } = useVendorsPaged({
    search: debouncedSearch || undefined,
    pageSize: 500,
  })
  const vendors = pagedData?.items ?? []

  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()
  const deleteVendor = useDeleteVendor()

  const [limit, setLimit] = useState(BATCH)
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [editingField, setEditingField] = useState<VendorFocusableField>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)

  useEffect(() => { setLimit(BATCH) }, [debouncedSearch])

  const visible = vendors.slice(0, limit)
  const hasMore = limit < vendors.length
  const loadMore = useCallback(() => setLimit(n => n + BATCH), [])
  const sentinel = useInfiniteScroll(loadMore)

  const companyCount = allVendors.filter(v => v.type === 'company').length
  const individualCount = allVendors.filter(v => v.type !== 'company').length

  const handleCreate = useCallback((data: VendorFormData) => {
    createVendor.mutate(data, {
      onSuccess: () => { toast.success('Đã thêm nhà thầu'); setEditingId(null) },
      onError: () => toast.error('Không thể thêm nhà thầu'),
    })
  }, [createVendor, toast])

  const handleUpdate = useCallback((id: number, data: VendorFormData) => {
    updateVendor.mutate({ id, data }, {
      onSuccess: () => { toast.success('Đã cập nhật'); setEditingId(null) },
      onError: () => toast.error('Không thể cập nhật'),
    })
  }, [updateVendor, toast])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteVendor.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Đã xoá'); setDeleteTarget(null); setEditingId(null) },
      onError: () => toast.error('Không thể xoá'),
    })
  }, [deleteTarget, deleteVendor, toast])

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <PageHeader
        title="Nhà thầu"
        subtitle="Danh sách nhà thầu vận chuyển và thông tin hợp đồng"
        lucideIcon={Truck}
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatPill count={vendors.length} label=" nhà thầu" accent />
            <StatPill count={companyCount} label=" công ty" />
            <StatPill count={individualCount} label=" cá nhân" />
          </div>
        }
      />

      {/* ── Table section ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm tên, MST, SĐT…" />
          <Button size="sm" onClick={() => { setEditingId('new'); setSearch('') }}>
            <Plus className="h-4 w-4" /> Thêm
          </Button>
        </div>

        <Panel flush>
          {isLoading ? (
            <TableSkeleton />
          ) : vendors.length === 0 && editingId !== 'new' ? (
            <div className="py-10">
              <EmptyState
                icon={<Truck className="h-5 w-5" />}
                title={search.trim() ? 'Không tìm thấy nhà thầu' : 'Chưa có nhà thầu nào'}
                compact
                action={!search.trim() ? (
                  <button onClick={() => setEditingId('new')} className="btn-primary text-xs">
                    <Plus size={14} strokeWidth={2.25} /><span>Thêm nhà thầu</span>
                  </button>
                ) : undefined}
              />
            </div>
          ) : isMobile ? (
            <>
              <div className="px-4 py-1.5 animate-fade-in" style={{ borderBottom: '1px solid var(--line)' }}>
                <span className="text-[11.5px]" style={{ color: 'var(--ink-4)' }}>
                  Nhấp vào thẻ để sửa
                </span>
              </div>
              <div className="flex flex-col gap-3 p-4">
                {editingId === 'new' && (
                  <VendorMobileEditCard
                    initial={EMPTY_VENDOR_FORM}
                    onSave={handleCreate}
                    onCancel={() => setEditingId(null)}
                    saving={createVendor.isPending}
                  />
                )}
                {visible.map((v) =>
                  editingId === v.id ? (
                    <VendorMobileEditCard
                      key={v.id}
                      initial={{
                        name: v.name,
                        type: v.type ?? 'company',
                        phone: v.phone ?? '',
                        taxCode: v.taxCode ?? '',
                        address: v.address ?? '',
                        contactPerson: v.contactPerson ?? '',
                      }}
                      onSave={(data) => handleUpdate(v.id, data)}
                      onCancel={() => setEditingId(null)}
                      saving={updateVendor.isPending}
                    />
                  ) : (
                    <VendorMobileCard
                      key={v.id}
                      vendor={v}
                      onEdit={() => setEditingId(v.id)}
                      onDelete={() => setDeleteTarget(v)}
                    />
                  )
                )}
              </div>
              <LoadMoreSentinel sentinelRef={sentinel} hasMore={hasMore} />
            </>
          ) : (
            <>
              <div className="nepo-table-scroll overflow-x-auto">
                <table className="nepo-table w-full" style={{ minWidth: 680, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th className="text-left">Tên nhà thầu</th>
                      <th className="text-left">Loại</th>
                      <th className="text-left">SĐT</th>
                      <th className="text-left">Địa chỉ</th>
                      <th className="text-left">Liên hệ</th>
                      <th className="text-left">MST</th>
                      <th style={{ width: 32 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {editingId === 'new' && (
                      <VendorEditRow
                        initial={EMPTY_VENDOR_FORM}
                        onSave={handleCreate}
                        onCancel={() => setEditingId(null)}
                        saving={createVendor.isPending}
                      />
                    )}
                    {visible.map((v) =>
                      editingId === v.id ? (
                        <VendorEditRow
                          key={v.id}
                          initial={{
                            name: v.name,
                            type: v.type ?? 'company',
                            phone: v.phone ?? '',
                            taxCode: v.taxCode ?? '',
                            address: v.address ?? '',
                            contactPerson: v.contactPerson ?? '',
                          }}
                          onSave={(data) => handleUpdate(v.id, data)}
                          onCancel={() => setEditingId(null)}
                          saving={updateVendor.isPending}
                          initialFocus={editingField}
                        />
                      ) : (
                        <VendorRow
                          key={v.id}
                          vendor={v}
                          onEdit={(field) => { setEditingId(v.id); setEditingField(field) }}
                          onDelete={() => setDeleteTarget(v)}
                        />
                      )
                    )}
                  </tbody>
                </table>
              </div>
              <LoadMoreSentinel sentinelRef={sentinel} hasMore={hasMore} />
            </>
          )}
        </Panel>
      </section>

      {/* ── Delete confirmation ── */}
      <DangerConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xoá nhà thầu?"
        entityName={deleteTarget?.name ?? ''}
        loading={deleteVendor.isPending}
      />
    </div>
  )
}
