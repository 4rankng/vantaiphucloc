import { useCallback, useRef } from 'react'
import { MapPin } from 'lucide-react'
import { compactCurrency, WORK_TYPE_LABELS } from '@/data/domain'
import type { VendorRoutePricing, WorkType } from '@/data/domain'
export type { VendorRoutePricingFormData } from './useVendorRoutePricing'
import { useInlineEditForm } from '@/components/shared/useInlineEditForm'
import { useActiveField } from '@/components/shared/useActiveField'
import { tdActive, tdDimmed } from '@/components/shared/editCellStyles'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
import { FieldActions } from '@/components/shared/ListUtils'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/TableSkeleton/TableSkeleton'
import { Route } from 'lucide-react'

type FocusableField =
  | 'vendorId'
  | 'pickupLocationId'
  | 'dropoffLocationId'
  | 'workType'
  | 'f20Price'
  | 'f40Price'
  | 'e20Price'
  | 'e40Price'

export type { FocusableField }

export interface VendorRoutePricingTableProps {
  data: VendorRoutePricing[]
  isLoading: boolean
  editingId: number | null
  editingField?: FocusableField
  onStartEdit: (rp: VendorRoutePricing, field?: FocusableField) => void
  onSave: (id: number, data: import('./useVendorRoutePricing').VendorRoutePricingFormData) => void
  onCancelEdit: () => void
  onDelete: (id: number) => void
  editInitial?: import('./useVendorRoutePricing').VendorRoutePricingFormData
  isSaving?: boolean
  vendors: Array<{ id: number; name: string; code?: string | null }>
  locations: Array<{ id: number; name: string }>
}

const OP_BADGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'NHẬP HÀNG':       { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  'XUẤT HÀNG':       { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  'CHẠY SÀ LAN':     { bg: '#faf5ff', text: '#7e22ce', dot: '#a855f7' },
  'CHUYỂN BÃI':      { bg: '#fff7ed', text: '#c2410c', dot: '#f97316' },
  'ĐÓNG KHO':        { bg: '#fefce8', text: '#a16207', dot: '#eab308' },
  'LẤY VỎ HẠ HÀNG': { bg: '#f0fdfa', text: '#0f766e', dot: '#14b8a6' },
  'XUẤT/NHẬP TÀU':   { bg: '#eef2ff', text: '#4338ca', dot: '#6366f1' },
}
const DEFAULT_BADGE = { bg: '#f4f4f5', text: '#52525b', dot: '#a1a1aa' }

function OpBadge({ type }: { type: string }) {
  const label = WORK_TYPE_LABELS[type as WorkType] ?? type
  const colors = OP_BADGE_COLORS[type] ?? DEFAULT_BADGE
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: colors.bg, color: colors.text }}
    >
      <span
        className="inline-block rounded-full"
        style={{ width: 6, height: 6, background: colors.dot, flexShrink: 0 }}
      />
      {label}
    </span>
  )
}

function PriceCell({ value }: { value: number | null }) {
  if (value == null) {
    return (
      <span className="font-mono-num text-xs" style={{ color: 'var(--ink-4)', letterSpacing: '0.05em' }}>
        —
      </span>
    )
  }
  return (
    <span className="font-mono-num text-xs tabular-nums" style={{ color: 'var(--ink-1)' }}>
      {compactCurrency(value)}
    </span>
  )
}

type VendorRoutePricingFormData = import('./useVendorRoutePricing').VendorRoutePricingFormData

function VendorRoutePricingEditRow({
  initial,
  onSave,
  onCancel,
  saving,
  vendors,
  locations,
  initialFocus = 'f20Price',
}: {
  initial: VendorRoutePricingFormData
  onSave: (data: VendorRoutePricingFormData) => void
  onCancel: () => void
  saving?: boolean
  vendors: Array<{ id: number; name: string; code?: string | null }>
  locations: Array<{ id: number; name: string }>
  initialFocus?: FocusableField
}) {
  const f20Ref = useRef<HTMLInputElement>(null)
  const f40Ref = useRef<HTMLInputElement>(null)
  const e20Ref = useRef<HTMLInputElement>(null)
  const e40Ref = useRef<HTMLInputElement>(null)

  const { activeField, setActiveField } = useActiveField<FocusableField>(initialFocus, {
    f20Price: f20Ref,
    f40Price: f40Ref,
    e20Price: e20Ref,
    e40Price: e40Ref,
  })

  const { form, errors, set, handleSave } = useInlineEditForm<VendorRoutePricingFormData>({
    initial,
    validate: (f) => {
      const errs: Record<string, string> = {}
      if (!f.vendorId) errs.vendorId = 'Chọn nhà thầu'
      if (!f.pickupLocationId) errs.pickupLocationId = 'Chọn nơi lấy'
      if (!f.dropoffLocationId) errs.dropoffLocationId = 'Chọn nơi hạ'
      if (!f.f20Price && !f.f40Price && !f.e20Price && !f.e40Price)
        errs.f20Price = 'Nhập ít nhất 1 giá'
      return errs
    },
    onSave,
    onCancel,
  })

  const isLastPriceCol = activeField === 'e40Price'
  const floatingActions = (
    <div style={{
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 20,
      ...(isLastPriceCol
        ? { right: '100%', paddingRight: 6 }
        : { left: '100%', paddingLeft: 6 }),
    }}>
      <FieldActions onSave={handleSave} onCancel={onCancel} saving={saving} hintAlign={isLastPriceCol ? 'right' : 'left'} />
    </div>
  )

  const vendorOptions = [
    { value: '', label: '— Nhà thầu —' },
    ...vendors.map(v => ({ value: String(v.id), label: v.code ? `${v.code} – ${v.name}` : v.name })),
  ]
  const locationOptions = [
    { value: '', label: '— Địa điểm —' },
    ...locations.map(l => ({ value: String(l.id), label: l.name })),
  ]
  const workTypeOptions = (Object.entries(WORK_TYPE_LABELS) as [WorkType, string][])
    .filter(([key]) => !['E20', 'E40', 'F20', 'F40'].includes(key))
    .map(([key, label]) => ({ value: key, label }))

  const priceInput = (field: 'f20Price' | 'f40Price' | 'e20Price' | 'e40Price', ref: React.RefObject<HTMLInputElement | null>, color: string) => {
    if (activeField === field) {
      return (
        <td style={{ ...tdActive, textAlign: 'right' }}>
          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            className="nepo-input text-[12px] tabular-nums"
            style={{ width: '100%', textAlign: 'right', borderColor: errors[field] ? 'var(--status-error, #e53)' : undefined }}
            value={form[field]}
            onChange={e => set(field, e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="—"
          />
          {floatingActions}
        </td>
      )
    }
    return (
      <td style={{ ...tdDimmed, textAlign: 'right' }} onClick={() => setActiveField(field)}>
        <span className="tabular-nums text-xs" style={{ color: form[field] ? color : 'var(--ink-4)', fontFamily: 'var(--theme-font-mono)' }}>
          {form[field] ? compactCurrency(Number(form[field])) : '—'}
        </span>
      </td>
    )
  }

  return (
    <tr style={{ background: 'var(--accent-soft)' }}>
      <td style={{ ...tdDimmed, color: 'var(--ink-4)', fontSize: 12 }} />

      {activeField === 'vendorId' ? (
        <td style={tdActive}>
          <InlineSelect
            placeholder="— Nhà thầu —"
            value={form.vendorId ? String(form.vendorId) : ''}
            options={vendorOptions}
            onChange={v => set('vendorId', Number(v) || 0)}
          />
          {errors.vendorId && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.vendorId}</p>}
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('vendorId')}>
          {vendors.find(v => v.id === form.vendorId)
            ? <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)', color: 'var(--theme-brand-primary)' }}>
                {vendors.find(v => v.id === form.vendorId)?.name}
              </span>
            : <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>— Nhà thầu —</span>}
        </td>
      )}

      {activeField === 'pickupLocationId' ? (
        <td style={tdActive}>
          <InlineSelect
            placeholder="— Điểm đi —"
            value={form.pickupLocationId ? String(form.pickupLocationId) : ''}
            options={locationOptions}
            onChange={v => { set('pickupLocationId', Number(v) || 0); setActiveField('dropoffLocationId') }}
          />
          {errors.pickupLocationId && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.pickupLocationId}</p>}
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('pickupLocationId')}>
          <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--ink-1)' }}>
            <MapPin className="h-3 w-3 shrink-0" style={{ color: '#16a34a' }} />
            {locations.find(l => l.id === form.pickupLocationId)?.name ?? '—'}
          </span>
        </td>
      )}

      {activeField === 'dropoffLocationId' ? (
        <td style={tdActive}>
          <InlineSelect
            placeholder="— Điểm đến —"
            value={form.dropoffLocationId ? String(form.dropoffLocationId) : ''}
            options={locationOptions}
            onChange={v => set('dropoffLocationId', Number(v) || 0)}
          />
          {errors.dropoffLocationId && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.dropoffLocationId}</p>}
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('dropoffLocationId')}>
          <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--ink-1)' }}>
            <MapPin className="h-3 w-3 shrink-0" style={{ color: '#ea580c' }} />
            {locations.find(l => l.id === form.dropoffLocationId)?.name ?? '—'}
          </span>
        </td>
      )}

      {priceInput('f20Price', f20Ref, '#3b82f6')}
      {priceInput('f40Price', f40Ref, '#3b82f6')}
      {priceInput('e20Price', e20Ref, '#6366f1')}
      {priceInput('e40Price', e40Ref, '#6366f1')}

      {activeField === 'workType' ? (
        <td style={tdActive}>
          <InlineSelect
            placeholder="Tác nghiệp"
            value={form.workType}
            options={workTypeOptions}
            onChange={v => set('workType', v as WorkType)}
          />
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('workType')}>
          <OpBadge type={form.workType} />
        </td>
      )}
    </tr>
  )
}

function VendorRoutePricingRow({ rp, idx, onEdit, onDelete }: {
  rp: VendorRoutePricing
  idx: number
  onEdit: (field: FocusableField) => void
  onDelete: () => void
}) {
  const cell = (field: FocusableField) => (e: React.MouseEvent) => { e.stopPropagation(); onEdit(field) }

  return (
    <tr className="cursor-pointer group">
      <td style={{ color: 'var(--ink-4)', fontSize: 12, fontFamily: 'var(--theme-font-mono)' }} onClick={cell('vendorId')}>
        {idx + 1}
      </td>

      <td onClick={cell('vendorId')}>
        <span
          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
          style={{
            background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)',
            color: 'var(--theme-brand-primary)',
          }}
        >
          {rp.vendor.name}
        </span>
      </td>

      <td onClick={cell('pickupLocationId')}>
        <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--ink-1)' }}>
          <MapPin className="h-3 w-3 shrink-0" style={{ color: '#16a34a' }} />
          {rp.pickupLocation.name}
        </span>
      </td>
      <td onClick={cell('dropoffLocationId')}>
        <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--ink-1)' }}>
          <MapPin className="h-3 w-3 shrink-0" style={{ color: '#ea580c' }} />
          {rp.dropoffLocation.name}
        </span>
      </td>

      <td style={{ textAlign: 'right' }} onClick={cell('f20Price')}><PriceCell value={rp.f20Price} /></td>
      <td style={{ textAlign: 'right' }} onClick={cell('f40Price')}><PriceCell value={rp.f40Price} /></td>
      <td style={{ textAlign: 'right' }} onClick={cell('e20Price')}><PriceCell value={rp.e20Price} /></td>
      <td style={{ textAlign: 'right' }} onClick={cell('e40Price')}><PriceCell value={rp.e40Price} /></td>

      <td onClick={cell('workType')}><OpBadge type={rp.workType} /></td>
    </tr>
  )
}

export function VendorRoutePricingTable({
  data,
  isLoading,
  editingId,
  editingField,
  onStartEdit,
  onSave,
  onCancelEdit,
  onDelete,
  editInitial,
  isSaving,
  vendors,
  locations,
}: VendorRoutePricingTableProps) {
  const handleStartEdit = useCallback(
    (rp: VendorRoutePricing, field: FocusableField = 'f20Price') => onStartEdit(rp, field),
    [onStartEdit],
  )

  if (isLoading) return <TableSkeleton rows={5} />

  if (!data.length) {
    return (
      <div className="py-10">
        <EmptyState
          icon={<Route className="h-5 w-5" />}
          title="Chưa có cước trả nào"
          description="Thêm cước trả mới hoặc nhập từ file Excel để bắt đầu"
          compact
        />
      </div>
    )
  }

  return (
    <div className="nepo-table-scroll overflow-x-auto">
      <table className="nepo-table w-full" style={{ minWidth: 900, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ width: 32 }}>#</th>
            <th className="text-left" style={{ width: 130 }}>Nhà thầu</th>
            <th className="text-left" style={{ minWidth: 140 }}>Điểm đi</th>
            <th className="text-left" style={{ minWidth: 140 }}>Điểm đến</th>
            <th className="text-right" style={{ width: 80, color: '#3b82f6' }}>F20</th>
            <th className="text-right" style={{ width: 80, color: '#3b82f6' }}>F40</th>
            <th className="text-right" style={{ width: 80, color: '#6366f1' }}>E20</th>
            <th className="text-right" style={{ width: 80, color: '#6366f1' }}>E40</th>
            <th className="text-left" style={{ width: 120 }}>Tác nghiệp</th>
          </tr>
        </thead>
        <tbody>
          {data.map((rp, idx) =>
            editingId === rp.id && editInitial ? (
              <VendorRoutePricingEditRow
                key={rp.id}
                initial={editInitial}
                onSave={(data) => onSave(rp.id, data)}
                onCancel={onCancelEdit}
                saving={isSaving}
                vendors={vendors}
                locations={locations}
                initialFocus={editingField ?? 'f20Price'}
              />
            ) : (
              <VendorRoutePricingRow
                key={rp.id}
                rp={rp}
                idx={idx}
                onEdit={(field) => handleStartEdit(rp, field)}
                onDelete={() => onDelete(rp.id)}
              />
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}
