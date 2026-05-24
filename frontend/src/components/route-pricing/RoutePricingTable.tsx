import { useState, useCallback, useRef, useEffect } from 'react'
import { Trash2, MapPin } from 'lucide-react'
import { compactCurrency, WORK_TYPE_LABELS } from '@/data/domain'
import type { RoutePricing, WorkType } from '@/data/domain'
import { useInlineEditForm } from '@/components/shared/useInlineEditForm'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
import { FieldActions } from '@/components/shared/ListUtils'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/TableSkeleton/TableSkeleton'
import { Route } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type FocusableField =
  | 'clientId'
  | 'pickupLocationId'
  | 'dropoffLocationId'
  | 'workType'
  | 'f20Price'
  | 'f40Price'
  | 'e20Price'
  | 'e40Price'
  | 'f20DriverSalary'
  | 'f40DriverSalary'
  | 'e20DriverSalary'
  | 'e40DriverSalary'

export type RoutePricingFormData = {
  clientId: number
  pickupLocationId: number
  dropoffLocationId: number
  workType: WorkType
  f20Price: string
  f40Price: string
  e20Price: string
  e40Price: string
  f20DriverSalary: string
  f40DriverSalary: string
  e20DriverSalary: string
  e40DriverSalary: string
}

export interface RoutePricingTableProps {
  data: RoutePricing[]
  isLoading: boolean
  editingId: number | null
  editingField?: FocusableField
  onStartEdit: (rp: RoutePricing, field?: FocusableField) => void
  onSave: (id: number, data: RoutePricingFormData) => void
  onCancelEdit: () => void
  onDelete: (id: number) => void
  editInitial?: RoutePricingFormData
  isSaving?: boolean
  clients: Array<{ id: number; name: string; code?: string | null }>
  locations: Array<{ id: number; name: string }>
}

// ─── Color map for operation type badges ─────────────────────────────────────

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

type PriceField = 'f20Price' | 'f40Price' | 'e20Price' | 'e40Price' | 'f20DriverSalary' | 'f40DriverSalary' | 'e20DriverSalary' | 'e40DriverSalary'

// ─── Inline edit row ─────────────────────────────────────────────────────────

function RoutePricingEditRow({
  initial,
  onSave,
  onCancel,
  saving,
  clients,
  locations,
  initialFocus = 'f20Price',
}: {
  initial: RoutePricingFormData
  onSave: (data: RoutePricingFormData) => void
  onCancel: () => void
  saving?: boolean
  clients: Array<{ id: number; name: string; code?: string | null }>
  locations: Array<{ id: number; name: string }>
  initialFocus?: FocusableField
}) {
  const [activeField, setActiveField] = useState<FocusableField>(initialFocus)
  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const { form, errors, set, handleSave } = useInlineEditForm<RoutePricingFormData>({
    initial,
    validate: (f) => {
      const errs: Record<string, string> = {}
      if (!f.clientId) errs.clientId = 'Chọn chủ hàng'
      if (!f.pickupLocationId) errs.pickupLocationId = 'Chọn nơi lấy'
      if (!f.dropoffLocationId) errs.dropoffLocationId = 'Chọn nơi hạ'
      if (!f.f20Price && !f.f40Price && !f.e20Price && !f.e40Price)
        errs.f20Price = 'Nhập ít nhất 1 giá'
      return errs
    },
    onSave,
    onCancel,
  })

  useEffect(() => {
    fieldRefs.current[activeField]?.focus()
  }, [activeField])

  const isLastCol = activeField === 'e40DriverSalary'
  const floatingActions = (
    <div style={{
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 20,
      ...(isLastCol
        ? { right: '100%', paddingRight: 6 }
        : { left: '100%', paddingLeft: 6 }),
    }}>
      <FieldActions onSave={handleSave} onCancel={onCancel} saving={saving} hintAlign={isLastCol ? 'right' : 'left'} />
    </div>
  )

  const clientOptions = [
    { value: '', label: '— Chủ hàng —' },
    ...clients.map(c => ({ value: String(c.id), label: c.code ? `${c.code} – ${c.name}` : c.name })),
  ]
  const locationOptions = [
    { value: '', label: '— Địa điểm —' },
    ...locations.map(l => ({ value: String(l.id), label: l.name })),
  ]
  const workTypeOptions = (Object.entries(WORK_TYPE_LABELS) as [WorkType, string][])
    .filter(([key]) => !['E20', 'E40', 'F20', 'F40'].includes(key))
    .map(([key, label]) => ({ value: key, label }))

  const tdActive: React.CSSProperties = { padding: '5px 8px', position: 'relative' }
  const tdInactive = (): React.CSSProperties => ({ padding: '5px 8px', cursor: 'pointer', opacity: 0.45, transition: 'opacity 0.15s' })

  const priceInput = (field: PriceField, color: string) => {
    if (activeField === field) {
      return (
        <td style={{ ...tdActive, textAlign: 'right' }}>
          <input
            ref={(el) => { fieldRefs.current[field] = el }}
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
      <td style={{ ...tdInactive(), textAlign: 'right' }} onClick={() => setActiveField(field)}>
        <span className="tabular-nums text-xs" style={{ color: form[field] ? color : 'var(--ink-4)', fontFamily: 'var(--theme-font-mono)' }}>
          {form[field] ? compactCurrency(Number(form[field])) : '—'}
        </span>
      </td>
    )
  }

  return (
    <tr style={{ background: 'var(--accent-soft)' }}>
      <td style={{ ...tdInactive(), color: 'var(--ink-4)', fontSize: 12 }} />

      {activeField === 'clientId' ? (
        <td style={tdActive}>
          <InlineSelect
            placeholder="— Chủ hàng —"
            value={form.clientId ? String(form.clientId) : ''}
            options={clientOptions}
            onChange={v => set('clientId', Number(v) || 0)}
          />
          {errors.clientId && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.clientId}</p>}
          {floatingActions}
        </td>
      ) : (
        <td style={tdInactive()} onClick={() => setActiveField('clientId')}>
          {clients.find(c => c.id === form.clientId)
            ? <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)', color: 'var(--theme-brand-primary)' }}>
                {clients.find(c => c.id === form.clientId)?.name}
              </span>
            : <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>— Chủ hàng —</span>}
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
        <td style={tdInactive()} onClick={() => setActiveField('pickupLocationId')}>
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
        <td style={tdInactive()} onClick={() => setActiveField('dropoffLocationId')}>
          <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--ink-1)' }}>
            <MapPin className="h-3 w-3 shrink-0" style={{ color: '#ea580c' }} />
            {locations.find(l => l.id === form.dropoffLocationId)?.name ?? '—'}
          </span>
        </td>
      )}

      {priceInput('f20Price', '#3b82f6')}
      {priceInput('f40Price', '#3b82f6')}
      {priceInput('e20Price', '#6366f1')}
      {priceInput('e40Price', '#6366f1')}

      {priceInput('f20DriverSalary', '#059669')}
      {priceInput('f40DriverSalary', '#059669')}
      {priceInput('e20DriverSalary', '#0d9488')}
      {priceInput('e40DriverSalary', '#0d9488')}

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
        <td style={tdInactive()} onClick={() => setActiveField('workType')}>
          <OpBadge type={form.workType} />
        </td>
      )}

      <td style={{ width: 32 }} />
    </tr>
  )
}

// ─── Read row ─────────────────────────────────────────────────────────────────

function RoutePricingRow({ rp, idx, onEdit, onDelete }: {
  rp: RoutePricing
  idx: number
  onEdit: (field: FocusableField) => void
  onDelete: () => void
}) {
  const cell = (field: FocusableField) => (e: React.MouseEvent) => { e.stopPropagation(); onEdit(field) }

  return (
    <tr className="cursor-pointer group">
      <td style={{ color: 'var(--ink-4)', fontSize: 12, fontFamily: 'var(--theme-font-mono)' }} onClick={cell('clientId')}>
        {idx + 1}
      </td>

      <td onClick={cell('clientId')}>
        <span
          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
          style={{
            background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)',
            color: 'var(--theme-brand-primary)',
          }}
        >
          {rp.client.name}
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

      <td style={{ textAlign: 'right' }} onClick={cell('f20DriverSalary')}><PriceCell value={rp.f20DriverSalary} /></td>
      <td style={{ textAlign: 'right' }} onClick={cell('f40DriverSalary')}><PriceCell value={rp.f40DriverSalary} /></td>
      <td style={{ textAlign: 'right' }} onClick={cell('e20DriverSalary')}><PriceCell value={rp.e20DriverSalary} /></td>
      <td style={{ textAlign: 'right' }} onClick={cell('e40DriverSalary')}><PriceCell value={rp.e40DriverSalary} /></td>

      <td onClick={cell('workType')}><OpBadge type={rp.workType} /></td>

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

// ─── Main component ──────────────────────────────────────────────────────────

export function RoutePricingTable({
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
  clients,
  locations,
}: RoutePricingTableProps) {
  const handleStartEdit = useCallback(
    (rp: RoutePricing, field: FocusableField = 'f20Price') => onStartEdit(rp, field),
    [onStartEdit],
  )

  if (isLoading) return <TableSkeleton rows={5} />

  if (!data.length) {
    return (
      <div className="py-10">
        <EmptyState
          icon={<Route className="h-5 w-5" />}
          title="Chưa có cước tuyến nào"
          description="Thêm cước tuyến mới hoặc nhập từ file Excel để bắt đầu"
          compact
        />
      </div>
    )
  }

  return (
    <div className="nepo-table-scroll overflow-x-auto">
      <table className="nepo-table w-full" style={{ minWidth: 1200, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ width: 32 }}>#</th>
            <th rowSpan={2} className="text-left" style={{ width: 130 }}>Chủ hàng</th>
            <th rowSpan={2} className="text-left" style={{ minWidth: 140 }}>Điểm đi</th>
            <th rowSpan={2} className="text-left" style={{ minWidth: 140 }}>Điểm đến</th>
            <th colSpan={4} className="text-center text-xs" style={{ color: 'var(--ink-3)', borderBottom: '1px solid var(--border-2)' }}>Cước (Khách)</th>
            <th colSpan={4} className="text-center text-xs" style={{ color: '#059669', borderBottom: '1px solid var(--border-2)' }}>Lương (Tài xế)</th>
            <th rowSpan={2} className="text-left" style={{ minWidth: 130 }}>Tác nghiệp</th>
            <th rowSpan={2} style={{ width: 32 }} />
          </tr>
          <tr>
            <th className="text-right" style={{ width: 80, color: '#3b82f6' }}>F20</th>
            <th className="text-right" style={{ width: 80, color: '#3b82f6' }}>F40</th>
            <th className="text-right" style={{ width: 80, color: '#6366f1' }}>E20</th>
            <th className="text-right" style={{ width: 80, color: '#6366f1' }}>E40</th>
            <th className="text-right" style={{ width: 80, color: '#059669' }}>F20</th>
            <th className="text-right" style={{ width: 80, color: '#059669' }}>F40</th>
            <th className="text-right" style={{ width: 80, color: '#0d9488' }}>E20</th>
            <th className="text-right" style={{ width: 80, color: '#0d9488' }}>E40</th>
          </tr>
        </thead>
        <tbody>
          {data.map((rp, idx) =>
            editingId === rp.id && editInitial ? (
              <RoutePricingEditRow
                key={rp.id}
                initial={editInitial}
                onSave={(data) => onSave(rp.id, data)}
                onCancel={onCancelEdit}
                saving={isSaving}
                clients={clients}
                locations={locations}
                initialFocus={editingField ?? 'f20Price'}
              />
            ) : (
              <RoutePricingRow
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
