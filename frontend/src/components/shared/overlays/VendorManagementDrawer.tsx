import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Plus, Building2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { DangerConfirmDialog } from '@/components/shared/overlays/DangerConfirmDialog/DangerConfirmDialog'
import { CreateVendorDialog } from '@/components/shared/overlays/CreateVendorDialog/CreateVendorDialog'
import { Panel } from '@/components/shared/overlays/Panel'
import { EmptyState } from '@/components/shared/feedback/EmptyState'
import { Drawer } from '@/components/shared/overlays/Drawer'
import {
  useVendors,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
} from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import type { Vendor } from '@/data/domain'
import { fuzzyMatch } from '@/lib/search-utils'
import { StatPill } from '@/components/shared/data-display/StatPill'
import { useInlineEditForm } from '@/components/shared/forms/useInlineEditForm'
import { useActiveField } from '@/components/shared/forms/useActiveField'
import { tdActive, tdDimmed } from '@/components/shared/forms/editCellStyles'
import { TableSkeleton } from '@/components/shared/data-display/TableSkeleton/TableSkeleton'
import { useInfiniteScroll, LoadMoreSentinel, SearchInput, FieldActions } from '@/components/shared/data-display/ListUtils'

const BATCH = 15
const VN_TAX_RE = /^\d{10}(\d{3})?$/

type VendorFormData = {
  name: string; type: 'company' | 'individual'
  phone: string; taxCode: string; address: string; contactPerson: string
}
type VendorFocusableField = 'name' | 'type' | 'phone' | 'address' | 'contactPerson' | 'taxCode' | null


export function VendorManagementDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const { data: vendors = [], isLoading } = useVendors()
  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()
  const deleteVendor = useDeleteVendor()

  const [search, setSearch] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingField, setEditingField] = useState<VendorFocusableField>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)

  const [limit, setLimit] = useState(BATCH)
  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
 setLimit(BATCH) }, [search])

  const filtered = useMemo(() => {
    const q = search.trim()
    if (!q) return vendors
    return vendors.filter(p => fuzzyMatch(p.name, q) || fuzzyMatch(p.phone ?? '', q) || fuzzyMatch(p.taxCode ?? '', q))
  }, [vendors, search])

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit])
  const hasMore = limit < filtered.length
  const loadMore = useCallback(() => setLimit(n => n + BATCH), [])
  const sentinel = useInfiniteScroll(loadMore)

  const companyCount = vendors.filter(v => v.type === 'company').length
  const individualCount = vendors.filter(v => v.type !== 'company').length

  const handleCreate = useCallback((data: VendorFormData) => {
    return new Promise<void>((resolve, reject) => {
      createVendor.mutate(data, {
        onSuccess: () => { toast.success('Đã thêm nhà thầu'); setShowCreateDialog(false); resolve() },
        onError: () => { toast.error('Không thể thêm nhà thầu'); reject() },
      })
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
    <>
      <Drawer
        open={open}
        onOpenChange={(o) => { if (!o) onClose() }}
        breadcrumb="Vận tải"
        title="Quản lý nhà thầu"
        width="820px"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5">
              <StatPill count={vendors.length} label=" nhà thầu" accent />
              <StatPill count={companyCount} label=" công ty" />
              <StatPill count={individualCount} label=" cá nhân" />
            </div>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4" /> Thêm nhà thầu
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <SearchInput value={search} onChange={setSearch} placeholder="Tìm tên, MST, SĐT…" />
          </div>

          <Panel flush>
            {isLoading ? (
              <TableSkeleton />
            ) : filtered.length === 0 ? (
              <div className="py-10">
                <EmptyState
                  icon={<Building2 className="h-5 w-5" />}
                  title={search.trim() ? 'Không tìm thấy nhà thầu' : 'Chưa có nhà thầu nào'}
                  compact
                  action={!search.trim() ? (
                    <button onClick={() => setShowCreateDialog(true)} className="btn-primary text-xs">
                      <Plus size={14} strokeWidth={2.25} /><span>Thêm nhà thầu</span>
                    </button>
                  ) : undefined}
                />
              </div>
            ) : (
              <>
                <div className="nepo-table-scroll overflow-x-auto">
                  <table className="nepo-table w-full" style={{ minWidth: 600, borderCollapse: 'collapse' }}>
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
        </div>
      </Drawer>

      <CreateVendorDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onConfirm={handleCreate}
      />

      <DangerConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xoá nhà thầu?"
        entityName={deleteTarget?.name ?? ''}
        loading={deleteVendor.isPending}
      />
    </>
  )
}

function VendorEditRow({ initial, onSave, onCancel, saving, initialFocus = 'name' }: {
  initial: VendorFormData
  onSave: (data: VendorFormData) => void
  onCancel: () => void
  saving?: boolean
  initialFocus?: VendorFocusableField
}) {
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const taxCodeRef = useRef<HTMLInputElement>(null)
  const addressRef = useRef<HTMLInputElement>(null)
  const contactPersonRef = useRef<HTMLInputElement>(null)

  const { activeField, setActiveField } = useActiveField<Exclude<VendorFocusableField, null>>(
    initialFocus ?? 'name',
    { name: nameRef, phone: phoneRef, taxCode: taxCodeRef, address: addressRef, contactPerson: contactPersonRef },
  )

  const { form, errors, set, handleSave } = useInlineEditForm<VendorFormData>({
    initial,
    validate: (f) => {
      const errs: Record<string, string> = {}
      if (!f.name.trim()) errs.name = 'Bắt buộc'
      if (f.taxCode && !VN_TAX_RE.test(f.taxCode)) errs.taxCode = 'MST không hợp lệ'
      return errs
    },
    onSave: (f) => onSave({ ...f, name: f.name.trim() }),
    onCancel,
    globalKeyboard: false,
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
          <input ref={nameRef} className="nepo-input text-[12px]"
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
                 style={{ padding: '3px 0', background: form.type === t ? 'var(--accent)' : 'var(--surface-3)', color: form.type === t ? 'var(--theme-text-on-brand)' : 'var(--ink-2)' }}>
                {t === 'company' ? 'Cty' : 'CN'}
              </button>
            ))}
          </div>
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('type')}>
          <span className="text-[12px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
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
          <span className="text-[13px]" style={{ color: 'var(--ink-2)', whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 180 }}>{form.address || '—'}</span>
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

      <td style={{ width: 32 }} />
    </tr>
  )
}

function VendorRow({ vendor, onEdit, onDelete }: {
  vendor: Vendor; onEdit: (field: VendorFocusableField) => void; onDelete: () => void
}) {
  const cell = (field: VendorFocusableField) => (e: React.MouseEvent) => { e.stopPropagation(); onEdit(field) }
  return (
    <tr className="cursor-pointer group">
      <td onClick={cell('name')}>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{vendor.name}</span>
      </td>
      <td onClick={cell('type')}>
        <span className="text-[12px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
          {vendor.type === 'company' ? 'Công ty' : 'Cá nhân'}
        </span>
      </td>
      <td onClick={cell('phone')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{vendor.phone || '—'}</span>
      </td>
      <td onClick={cell('address')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)', whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 180 }}>{vendor.address || '—'}</span>
      </td>
      <td onClick={cell('contactPerson')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{vendor.contactPerson || '—'}</span>
      </td>
      <td onClick={cell('taxCode')}>
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>{vendor.taxCode || '—'}</span>
      </td>
      <td style={{ width: 32 }}>
        <button onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity"
          style={{ width: 24, height: 24, color: 'var(--ink-3)' }} title="Xoá">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}
