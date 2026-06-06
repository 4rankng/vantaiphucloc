import { useState, useRef, useEffect, useCallback } from 'react'
import { Truck, Plus, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui'
import { DangerConfirmDialog } from '@/components/shared/overlays/DangerConfirmDialog/DangerConfirmDialog'
import { Panel } from '@/components/shared/overlays/Panel'
import { EmptyState } from '@/components/shared/feedback/EmptyState'
import { useInfiniteScroll, LoadMoreSentinel, SearchInput, FieldActions } from '@/components/shared/data-display/ListUtils'
import { useInlineEditForm } from '@/components/shared/forms/useInlineEditForm'
import { useActiveField } from '@/components/shared/forms/useActiveField'
import { tdActive, tdDimmed } from '@/components/shared/forms/editCellStyles'
import { TableSkeleton } from '@/components/shared/data-display/TableSkeleton/TableSkeleton'
import { StatPill } from '@/components/shared/data-display/StatPill'
import { PageHeader } from '@/components/shared/layouts/PageHeader'
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
                style={{ padding: '3px 0', background: form.type === t ? 'var(--accent)' : 'var(--surface-3)', color: form.type === t ? 'var(--theme-text-on-brand)' : 'var(--ink-2)' }}
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
          { }
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
          { }
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
          { }
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
          { }
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

function VendorMobileCard({ vendor, onEdit, onDelete }: {
  vendor: Vendor
  onEdit: () => void
  onDelete: () => void
}) {
  const isCompany = vendor.type === 'company'
  return (
    <div
      onClick={onEdit}
      className="p-4 rounded-xl border flex flex-col gap-3 transition-colors active:scale-[0.99] touch-manipulation cursor-pointer"
      style={{
        background: 'var(--theme-bg-secondary, #ffffff)',
        borderColor: 'var(--theme-border-default, #e4e4e7)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: isCompany ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--surface-3)',
              color: isCompany ? 'var(--accent)' : 'var(--ink-3)',
            }}
          >
            <Truck className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1 leading-normal">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                {vendor.name}
              </span>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
              >
                {vendor.type === 'company' ? 'Công ty' : 'Cá nhân'}
              </span>
            </div>
            {vendor.phone && (
              <a
                href={`tel:${vendor.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-medium block mt-1 hover:underline tabular-nums"
                style={{ color: 'var(--accent)' }}
              >
                {vendor.phone}
              </a>
            )}
            {vendor.address && (
              <p className="text-xs mt-1 truncate" style={{ color: 'var(--ink-2)' }}>
                {vendor.address}
              </p>
            )}
            {vendor.contactPerson && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
                LH: {vendor.contactPerson}
              </p>
            )}
            {vendor.taxCode && (
              <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: 'var(--ink-3)' }}>
                MST: {vendor.taxCode}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="w-9 h-9 flex items-center justify-center rounded-lg border touch-target"
            style={{ borderColor: 'var(--theme-border-default)', color: 'var(--ink-2)' }}
            title="Sửa"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="w-9 h-9 flex items-center justify-center rounded-lg border touch-target"
            style={{ borderColor: 'var(--theme-border-default)', color: 'var(--theme-status-error, #E32434)' }}
            title="Xoá"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function VendorMobileEditCard({ initial, onSave, onCancel, saving }: {
  initial: FormData
  onSave: (data: FormData) => void
  onCancel: () => void
  saving?: boolean
}) {
  const [name, setName] = useState(initial.name)
  const [type, setType] = useState(initial.type)
  const [phone, setPhone] = useState(initial.phone)
  const [taxCode, setTaxCode] = useState(initial.taxCode)
  const [address, setAddress] = useState(initial.address)
  const [contactPerson, setContactPerson] = useState(initial.contactPerson)

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSave = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Bắt buộc'
    if (taxCode && !VN_TAX_RE.test(taxCode)) errs.taxCode = 'MST không hợp lệ'
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    onSave({ name, type, phone, taxCode, address, contactPerson })
  }

  return (
    <div
      className="p-4 rounded-xl border flex flex-col gap-4 animate-scale-pop text-left"
      style={{
        background: 'var(--accent-soft)',
        borderColor: 'var(--accent)',
      }}
    >
      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-ink)' }}>
        {initial.name ? 'Chỉnh sửa nhà thầu' : 'Thêm nhà thầu mới'}
      </h3>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--ink-2)' }}>Tên nhà thầu *</label>
          <input
            className="nepo-input text-xs w-full"
            style={{ borderColor: errors.name ? 'var(--theme-status-error, #E32434)' : undefined }}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Tên nhà thầu"
          />
          {errors.name && <p className="text-[10px]" style={{ color: 'var(--theme-status-error, #E32434)' }}>{errors.name}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--ink-2)' }}>Loại</label>
          <div className="flex gap-2">
            {(['company', 'individual'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className="flex-1 rounded py-1.5 text-xs font-medium transition-colors border"
                style={{
                  background: type === t ? 'var(--accent)' : 'var(--surface)',
                  color: type === t ? 'var(--theme-text-on-brand)' : 'var(--ink-2)',
                  borderColor: type === t ? 'var(--accent)' : 'var(--theme-border-default)',
                }}
              >
                {t === 'company' ? 'Công ty' : 'Cá nhân'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--ink-2)' }}>Số điện thoại</label>
          <input
            className="nepo-input text-xs w-full"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Số điện thoại"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--ink-2)' }}>Địa chỉ</label>
          <input
            className="nepo-input text-xs w-full"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Địa chỉ"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--ink-2)' }}>Người liên hệ</label>
          <input
            className="nepo-input text-xs w-full"
            value={contactPerson}
            onChange={e => setContactPerson(e.target.value)}
            placeholder="Người liên hệ"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--ink-2)' }}>Mã số thuế</label>
          <input
            className="nepo-input text-xs w-full"
            style={{ borderColor: errors.taxCode ? 'var(--theme-status-error, #E32434)' : undefined }}
            value={taxCode}
            onChange={e => setTaxCode(e.target.value)}
            placeholder="Mã số thuế"
          />
          {errors.taxCode && <p className="text-[10px]" style={{ color: 'var(--theme-status-error, #E32434)' }}>{errors.taxCode}</p>}
        </div>
      </div>

      <div className="flex gap-2 justify-end mt-1 pt-3 border-t" style={{ borderColor: 'var(--theme-border-default)' }}>
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>Hủy</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Xác nhận'}
        </Button>
      </div>
    </div>
  )
}

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
  const [editingField, setEditingField] = useState<FocusableField>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)

  useEffect(() => {  
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
                    initial={EMPTY_FORM}
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
