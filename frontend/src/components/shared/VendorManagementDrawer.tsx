import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Plus, Building2, Trash2, AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from '@/components/ui'
import { Panel } from '@/components/shared/Panel'
import { EmptyState } from '@/components/shared/EmptyState'
import { Drawer } from '@/components/shared/Drawer'
import {
  useVendors,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
} from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import type { Vendor } from '@/data/domain'
import { fuzzyMatch } from '@/lib/search-utils'
import { StatPill } from './StatPill'
import { useInfiniteScroll, LoadMoreSentinel, SearchInput, FieldActions } from './ListUtils'

const BATCH = 15
const VN_TAX_RE = /^\d{10}(\d{3})?$/

type VendorFormData = {
  name: string; type: 'company' | 'individual'
  phone: string; taxCode: string; address: string; contactPerson: string
}
type VendorFocusableField = 'name' | 'phone' | 'taxCode' | 'address' | 'contactPerson' | null

const EMPTY_VENDOR_FORM: VendorFormData = {
  name: '', type: 'company', phone: '', taxCode: '', address: '', contactPerson: '',
}

export function VendorManagementDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const { data: vendors = [], isLoading } = useVendors()
  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()
  const deleteVendor = useDeleteVendor()

  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [editingField, setEditingField] = useState<VendorFocusableField>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)

  const [limit, setLimit] = useState(BATCH)
  useEffect(() => { setLimit(BATCH) }, [search])

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
            <Button variant="default" onClick={() => { setEditingId('new') }}>
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
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--surface-3)' }} />
                ))}
              </div>
            ) : filtered.length === 0 && editingId !== 'new' ? (
              <div className="py-10">
                <EmptyState
                  icon={<Building2 className="h-5 w-5" />}
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
        </div>
      </Drawer>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xoá nhà thầu?</DialogTitle></DialogHeader>
          <div
            className="flex items-start gap-3 rounded-lg px-3 py-2.5"
            style={{
              background: 'color-mix(in srgb, var(--status-error, #e53) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--status-error, #e53) 15%, transparent)',
            }}
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--status-error, #e53)' }} />
            <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
              <strong style={{ color: 'var(--ink)' }}>{deleteTarget?.name}</strong> sẽ bị xoá vĩnh viễn và không thể khôi phục.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Huỷ</Button>
            <Button onClick={handleDelete} variant="destructive" className="flex-1">Xoá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const [form, setForm] = useState<VendorFormData>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const refs: Record<Exclude<VendorFocusableField, null>, React.RefObject<HTMLInputElement | null>> = {
    name: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    taxCode: useRef<HTMLInputElement>(null),
    address: useRef<HTMLInputElement>(null),
    contactPerson: useRef<HTMLInputElement>(null),
  }

  const isDirty = (key: keyof VendorFormData) => form[key] !== initial[key]
  const anyDirty = (Object.keys(form) as (keyof VendorFormData)[]).some(k => isDirty(k))

  const set = <K extends keyof VendorFormData>(key: K, val: VendorFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: val }))
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Bắt buộc'
    if (form.taxCode && !VN_TAX_RE.test(form.taxCode)) errs.taxCode = 'MST không hợp lệ'
    return errs
  }

  const handleSave = useCallback(() => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSave({ ...form, name: form.name.trim() })
  }, [form, onSave])

  useEffect(() => {
    if (initialFocus) refs[initialFocus]?.current?.focus()
  }, []) 

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onCancel() }
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleSave() }
  }, [onCancel, handleSave])

  const actions = anyDirty ? <FieldActions onSave={handleSave} onCancel={onCancel} saving={saving} /> : null

  return (
    <tr style={{ background: 'var(--accent-soft)' }}>
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <div style={{ flex: 1 }}>
            <input ref={refs.name} className="nepo-input text-[12px]"
              style={{ width: '100%', borderColor: errors.name ? 'var(--status-error, #e53)' : undefined }}
              value={form.name} onChange={e => set('name', e.target.value)} placeholder="Tên nhà thầu *"
              onKeyDown={handleInputKeyDown} />
            {errors.name && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.name}</p>}
          </div>
          {isDirty('name') && actions}
        </div>
      </td>
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center gap-1">
          <div className="flex gap-1" style={{ minWidth: 90 }}>
            {(['company', 'individual'] as const).map(t => (
              <button key={t} type="button" onClick={() => set('type', t)}
                className="flex-1 rounded text-[11px] font-medium transition-colors"
                style={{ padding: '3px 0', background: form.type === t ? 'var(--accent)' : 'var(--surface-3)', color: form.type === t ? '#fff' : 'var(--ink-2)' }}>
                {t === 'company' ? 'Cty' : 'CN'}
              </button>
            ))}
          </div>
          {isDirty('type') && actions}
        </div>
      </td>
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <input ref={refs.phone} className="nepo-input text-[12px]" style={{ minWidth: 90, flex: 1 }}
            type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="SĐT"
            onKeyDown={handleInputKeyDown} />
          {isDirty('phone') && actions}
        </div>
      </td>
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <input ref={refs.address} className="nepo-input text-[12px]" style={{ minWidth: 100, flex: 1 }}
            value={form.address} onChange={e => set('address', e.target.value)} placeholder="Địa chỉ"
            onKeyDown={handleInputKeyDown} />
          {isDirty('address') && actions}
        </div>
      </td>
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <input ref={refs.contactPerson} className="nepo-input text-[12px]" style={{ minWidth: 80, flex: 1 }}
            value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} placeholder="Người liên hệ"
            onKeyDown={handleInputKeyDown} />
          {isDirty('contactPerson') && actions}
        </div>
      </td>
      <td style={{ padding: '5px 8px' }}>
        <div className="flex items-center">
          <div style={{ flex: 1 }}>
            <input ref={refs.taxCode} className="nepo-input text-[12px]"
              style={{ width: '100%', borderColor: errors.taxCode ? 'var(--status-error, #e53)' : undefined }}
              value={form.taxCode} onChange={e => set('taxCode', e.target.value)} placeholder="MST"
              onKeyDown={handleInputKeyDown} />
            {errors.taxCode && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.taxCode}</p>}
          </div>
          {isDirty('taxCode') && actions}
        </div>
      </td>
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
      <td onClick={() => onEdit(null)}>
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
