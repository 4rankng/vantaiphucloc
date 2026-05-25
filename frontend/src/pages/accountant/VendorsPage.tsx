import { useState, useRef, useEffect, useCallback } from 'react'
import { Truck, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { DangerConfirmDialog } from '@/components/shared/DangerConfirmDialog/DangerConfirmDialog'
import { Panel } from '@/components/shared/Panel'
import { EmptyState } from '@/components/shared/EmptyState'
import { useInfiniteScroll, LoadMoreSentinel, SearchInput, FieldActions } from '@/components/shared/ListUtils'
import { useInlineEditForm } from '@/components/shared/useInlineEditForm'
import { useActiveField } from '@/components/shared/useActiveField'
import { tdActive, tdDimmed } from '@/components/shared/editCellStyles'
import { TableSkeleton } from '@/components/shared/TableSkeleton/TableSkeleton'
import { StatPill } from '@/components/shared/StatPill'
import { PageHeader } from '@/components/shared/PageHeader'
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

// ─── Constants ────────────────────────────────────────────────────────────────

const VN_TAX_RE = /^\d{10}(\d{3})?$/
const BATCH = 15

type FormData = {
  name: string
  type: 'company' | 'individual'
  phone: string
  taxCode: string
  address: string
  contactPerson: string
}

const EMPTY_FORM: FormData = {
  name: '', type: 'company', phone: '', taxCode: '', address: '', contactPerson: '',
}

type FocusableField = 'name' | 'type' | 'phone' | 'address' | 'contactPerson' | 'taxCode' | null

// ─── Inline edit row ──────────────────────────────────────────────────────────

function VendorEditRow({ initial, onSave, onCancel, saving, initialFocus = 'name', globalKeyboard = true }: {
  initial: FormData
  onSave: (data: FormData) => void
  onCancel: () => void
  saving?: boolean
  initialFocus?: FocusableField
  globalKeyboard?: boolean
}) {
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const taxCodeRef = useRef<HTMLInputElement>(null)
  const addressRef = useRef<HTMLInputElement>(null)
  const contactPersonRef = useRef<HTMLInputElement>(null)

  const { activeField, setActiveField } = useActiveField<Exclude<FocusableField, null>>(
    initialFocus ?? 'name',
    { name: nameRef, phone: phoneRef, taxCode: taxCodeRef, address: addressRef, contactPerson: contactPersonRef },
  )

  const { form, errors, set, handleSave } = useInlineEditForm<FormData>({
    initial,
    validate: (f) => {
      const errs: Record<string, string> = {}
      if (!f.name.trim()) errs.name = 'Bắt buộc'
      if (f.taxCode && !VN_TAX_RE.test(f.taxCode)) errs.taxCode = 'MST không hợp lệ'
      return errs
    },
    onSave: (f) => onSave({ ...f, name: f.name.trim() }),
    onCancel,
    globalKeyboard,
  })

  const isLastColumn = activeField === 'taxCode'
  const floatingActions = (
    <div style={{
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 20,
      ...(isLastColumn
        ? { right: '100%', paddingRight: 6 }
        : { left: '100%', paddingLeft: 6 }),
    }}>
      <FieldActions onSave={handleSave} onCancel={onCancel} saving={saving} hintAlign={isLastColumn ? 'right' : 'left'} />
    </div>
  )

  return (
    <tr style={{ background: 'var(--accent-soft)' }}>
      {/* Tên */}
      {activeField === 'name' ? (
        <td style={tdActive}>
          <input ref={nameRef}
            className="nepo-input text-[12px]"
            style={{ width: '100%', borderColor: errors.name ? 'var(--status-error, #e53)' : undefined }}
            value={form.name} onChange={e => set('name', e.target.value)} placeholder="Tên nhà thầu *"
          />
          {errors.name && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.name}</p>}
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('name')}>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{form.name || '—'}</span>
        </td>
      )}

      {/* Loại */}
      {activeField === 'type' ? (
        <td style={tdActive}>
          <div className="flex gap-1" style={{ minWidth: 90 }}>
            {(['company', 'individual'] as const).map(t => (
              <button key={t} type="button" onClick={() => set('type', t)}
                className="flex-1 rounded text-[11px] font-medium transition-colors"
                style={{ padding: '3px 0', background: form.type === t ? 'var(--accent)' : 'var(--surface-3)', color: form.type === t ? '#fff' : 'var(--ink-2)' }}
              >
                {t === 'company' ? 'Cty' : 'CN'}
              </button>
            ))}
          </div>
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('type')}>
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
            {form.type === 'company' ? 'Công ty' : 'Cá nhân'}
          </span>
        </td>
      )}

      {/* SĐT */}
      {activeField === 'phone' ? (
        <td style={tdActive}>
          {/* eslint-disable-next-line react-hooks/refs */}
          <input ref={phoneRef} className="nepo-input text-[12px]" style={{ minWidth: 90, width: '100%' }}
            type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="SĐT"
          />
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('phone')}>
          <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{form.phone || '—'}</span>
        </td>
      )}

      {/* Địa chỉ */}
      {activeField === 'address' ? (
        <td style={tdActive}>
          {/* eslint-disable-next-line react-hooks/refs */}
          <input ref={addressRef} className="nepo-input text-[12px]" style={{ minWidth: 100, width: '100%' }}
            value={form.address} onChange={e => set('address', e.target.value)} placeholder="Địa chỉ"
          />
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('address')}>
          <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{form.address || '—'}</span>
        </td>
      )}

      {/* Liên hệ */}
      {activeField === 'contactPerson' ? (
        <td style={tdActive}>
          {/* eslint-disable-next-line react-hooks/refs */}
          <input ref={contactPersonRef} className="nepo-input text-[12px]" style={{ minWidth: 80, width: '100%' }}
            value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} placeholder="Người liên hệ"
          />
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('contactPerson')}>
          <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{form.contactPerson || '—'}</span>
        </td>
      )}

      {/* MST */}
      {activeField === 'taxCode' ? (
        <td style={tdActive}>
          {/* eslint-disable-next-line react-hooks/refs */}
          <input ref={taxCodeRef} className="nepo-input text-[12px]"
            style={{ width: '100%', borderColor: errors.taxCode ? 'var(--status-error, #e53)' : undefined }}
            value={form.taxCode} onChange={e => set('taxCode', e.target.value)} placeholder="MST"
          />
          {errors.taxCode && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.taxCode}</p>}
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('taxCode')}>
          <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>{form.taxCode || '—'}</span>
        </td>
      )}

      {/* Trash placeholder */}
      <td style={{ width: 32 }} />
    </tr>
  )
}

// ─── Vendor row (read mode) ───────────────────────────────────────────────────

function VendorRow({ vendor, onEdit, onDelete }: {
  vendor: Vendor
  onEdit: (field: FocusableField) => void
  onDelete: () => void
}) {
  const cell = (field: FocusableField) => (e: React.MouseEvent) => { e.stopPropagation(); onEdit(field) }
  return (
    <tr className="cursor-pointer group">
      <td onClick={cell('name')}>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{vendor.name}</span>
      </td>
      <td onClick={cell('type')}>
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
          {vendor.type === 'company' ? 'Công ty' : 'Cá nhân'}
        </span>
      </td>
      <td onClick={cell('phone')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{vendor.phone || '—'}</span>
      </td>
      <td onClick={cell('address')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)', whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 220 }}>{vendor.address || '—'}</span>
      </td>
      <td onClick={cell('contactPerson')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{vendor.contactPerson || '—'}</span>
      </td>
      <td onClick={cell('taxCode')}>
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>{vendor.taxCode || '—'}</span>
      </td>
      <td style={{ width: 32 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity"
          style={{ width: 24, height: 24, color: 'var(--ink-3)' }}
          title="Xoá"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function VendorsPage() {
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
  const [editingField, setEditingField] = useState<FocusableField>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)

  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
 setLimit(BATCH) }, [debouncedSearch])

  const visible = vendors.slice(0, limit)
  const hasMore = limit < vendors.length
  const loadMore = useCallback(() => setLimit(n => n + BATCH), [])
  const sentinel = useInfiniteScroll(loadMore)

  const companyCount = allVendors.filter(v => v.type === 'company').length
  const individualCount = allVendors.filter(v => v.type !== 'company').length

  const handleCreate = useCallback((data: FormData) => {
    createVendor.mutate(data, {
      onSuccess: () => { toast.success('Đã thêm nhà thầu'); setEditingId(null) },
      onError: () => toast.error('Không thể thêm nhà thầu'),
    })
  }, [createVendor, toast])

  const handleUpdate = useCallback((id: number, data: FormData) => {
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
                        initial={EMPTY_FORM}
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
