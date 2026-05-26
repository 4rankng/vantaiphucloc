import { useState, useCallback, useRef, useEffect } from 'react'
import { Trash2, MapPin } from 'lucide-react'
import { formatCurrency, WORK_TYPE_LABELS } from '@/data/domain'
import type { RoutePricing, WorkType } from '@/data/domain'
import { useInlineEditForm } from '@/components/shared/useInlineEditForm'
import { tdActive, tdDimmed } from '@/components/shared/editCellStyles'
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
  'XUẤT HÀNG':       { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444' },
  'CHẠY SÀ LAN':     { bg: '#faf5ff', text: '#7e22ce', dot: '#a855f7' },
  'CHUYỂN BÃI':      { bg: '#fff7ed', text: '#c2410c', dot: '#f97316' },
  'ĐÓNG KHO':        { bg: '#fefce8', text: '#a16207', dot: '#eab308' },
  'LẤY VỎ HẠ HÀNG': { bg: '#fdf2f8', text: '#a21caf', dot: '#d946ef' },
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
      {formatCurrency(value)}
    </span>
  )
}

type PriceField = 'f20Price' | 'f40Price' | 'e20Price' | 'e40Price' | 'f20DriverSalary' | 'f40DriverSalary' | 'e20DriverSalary' | 'e40DriverSalary'

// ─── Salary column visual treatment ──────────────────────────────────────────
const SALARY_TINT = 'rgba(217, 119, 6, 0.055)'  // subtle amber overlay
const SALARY_BORDER = '1px solid rgba(217, 119, 6, 0.22)'
const SALARY_FIELDS: PriceField[] = ['f20DriverSalary', 'f40DriverSalary', 'e20DriverSalary', 'e40DriverSalary']

// ─── Fixed column widths (used by both <colgroup> and the label band above) ──
const COL = {
  index: 40,
  client: 240,
  pickup: 140,
  dropoff: 140,
  price: 130,   // each of the 4 cước columns
  salary: 130,  // each of the 4 lương columns
  workType: 160,
  actions: 40,
} as const
const FARE_GROUP_WIDTH = COL.price * 4
const SALARY_GROUP_WIDTH = COL.salary * 4
const LEFT_GROUP_WIDTH = COL.index + COL.client + COL.pickup + COL.dropoff
const RIGHT_GROUP_WIDTH = COL.workType + COL.actions
const TABLE_MIN_WIDTH = LEFT_GROUP_WIDTH + FARE_GROUP_WIDTH + SALARY_GROUP_WIDTH + RIGHT_GROUP_WIDTH

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

  // Last 2 editable columns — flip save/cancel buttons to the LEFT to avoid overflowing the table
  const isLastCol = activeField === 'e40DriverSalary' || activeField === 'workType'

  // Compact size for inline-edit dropdowns — overrides InlineSelect's default 44px / text-sm trigger
  const compactSelectStyle: React.CSSProperties = {
    height: 30,
    fontSize: 12,
    padding: '0 10px',
    borderRadius: 6,
  }
  const floatingActions = (
    <div style={{
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 20,
      ...(isLastCol
        ? { right: '100%', paddingRight: 4 }
        : { left: '100%', paddingLeft: 4 }),
    }}>
      <FieldActions onSave={handleSave} onCancel={onCancel} saving={saving} />
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

  const priceInput = (field: PriceField, color: string) => {
    const isSalary = SALARY_FIELDS.includes(field)
    const isFirstSalary = field === 'f20DriverSalary'
    const salaryBg = isSalary ? { background: SALARY_TINT } : null
    const salaryLeft = isFirstSalary ? { borderLeft: SALARY_BORDER } : null
    if (activeField === field) {
      return (
        <td style={{ ...tdActive, textAlign: 'right', ...salaryBg, ...salaryLeft }}>
          <div style={{ position: 'relative' }}>
            <input
              ref={(el) => { fieldRefs.current[field] = el }}
              type="text"
              inputMode="numeric"
              className="nepo-input text-[12px] tabular-nums"
              style={{
                width: '100%',
                textAlign: 'right',
                borderColor: errors[field] ? 'var(--status-error, #e53)' : undefined,
              }}
              value={form[field]}
              onChange={e => set(field, e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="—"
            />
          </div>
          {floatingActions}
        </td>
      )
    }
    return (
      <td style={{ ...tdDimmed, textAlign: 'right', ...salaryBg, ...salaryLeft }} onClick={() => setActiveField(field)}>
        <span className="tabular-nums text-xs" style={{ color: form[field] ? color : 'var(--ink-4)', fontFamily: 'var(--theme-font-mono)' }}>
          {form[field] ? formatCurrency(Number(form[field])) : '—'}
        </span>
      </td>
    )
  }

  return (
    <tr style={{ background: '#FFFBEB' /* soft amber — signals edit mode without using brand-green */ }}>
      <td style={{ ...tdDimmed, color: 'var(--ink-4)', fontSize: 12 }} />

      {activeField === 'clientId' ? (
        <td style={tdActive}>
          <InlineSelect
            placeholder="— Chủ hàng —"
            value={form.clientId ? String(form.clientId) : ''}
            options={clientOptions}
            onChange={v => set('clientId', Number(v) || 0)}
            style={compactSelectStyle}
          />
          {errors.clientId && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.clientId}</p>}
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('clientId')}>
          {clients.find(c => c.id === form.clientId)
            ? <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: 'color-mix(in srgb, var(--ink-1) 7%, transparent)', color: 'var(--ink-1)' }}>
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
            style={compactSelectStyle}
          />
          {errors.pickupLocationId && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-error, #e53)' }}>{errors.pickupLocationId}</p>}
          {floatingActions}
        </td>
      ) : (
        <td style={tdDimmed} onClick={() => setActiveField('pickupLocationId')}>
          <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--ink-1)' }}>
            <MapPin className="h-3 w-3 shrink-0" style={{ color: '#2563eb' }} />
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
            style={compactSelectStyle}
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

      {priceInput('f20Price', '#3b82f6')}
      {priceInput('f40Price', '#3b82f6')}
      {priceInput('e20Price', '#6366f1')}
      {priceInput('e40Price', '#6366f1')}

      {priceInput('f20DriverSalary', '#d97706')}
      {priceInput('f40DriverSalary', '#d97706')}
      {priceInput('e20DriverSalary', '#b45309')}
      {priceInput('e40DriverSalary', '#b45309')}

      {activeField === 'workType' ? (
        <td
          style={{
            ...tdActive,
            position: 'sticky',
            right: COL.actions,
            background: '#FFFBEB',
            zIndex: 1,
            borderLeft: '1px solid var(--line)',
          }}
        >
          <InlineSelect
            placeholder="Tác nghiệp"
            value={form.workType}
            options={workTypeOptions}
            onChange={v => set('workType', v as WorkType)}
            style={compactSelectStyle}
          />
          {floatingActions}
        </td>
      ) : (
        <td
          style={{
            ...tdDimmed,
            position: 'sticky',
            right: COL.actions,
            background: '#FFFBEB',
            zIndex: 1,
            borderLeft: '1px solid var(--line)',
          }}
          onClick={() => setActiveField('workType')}
        >
          <OpBadge type={form.workType} />
        </td>
      )}

      <td
        style={{
          width: 32,
          position: 'sticky',
          right: 0,
          background: '#FFFBEB',
          zIndex: 1,
        }}
      />
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

      <td onClick={cell('clientId')} style={{ overflow: 'hidden' }}>
        <span
          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
          style={{
            background: 'color-mix(in srgb, var(--ink-1) 7%, transparent)',
            color: 'var(--ink-1)',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'inline-block',
          }}
          title={rp.client.name}
        >
          {rp.client.name}
        </span>
      </td>

      <td onClick={cell('pickupLocationId')}>
        <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--ink-1)' }}>
          <MapPin className="h-3 w-3 shrink-0" style={{ color: '#2563eb' }} />
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

      <td style={{ textAlign: 'right', background: SALARY_TINT, borderLeft: SALARY_BORDER }} onClick={cell('f20DriverSalary')}><PriceCell value={rp.f20DriverSalary} /></td>
      <td style={{ textAlign: 'right', background: SALARY_TINT }} onClick={cell('f40DriverSalary')}><PriceCell value={rp.f40DriverSalary} /></td>
      <td style={{ textAlign: 'right', background: SALARY_TINT }} onClick={cell('e20DriverSalary')}><PriceCell value={rp.e20DriverSalary} /></td>
      <td style={{ textAlign: 'right', background: SALARY_TINT }} onClick={cell('e40DriverSalary')}><PriceCell value={rp.e40DriverSalary} /></td>

      <td
        onClick={cell('workType')}
        style={{
          position: 'sticky',
          right: COL.actions,
          background: 'var(--surface)',
          zIndex: 1,
          borderLeft: '1px solid var(--line)',
        }}
      >
        <OpBadge type={rp.workType} />
      </td>

      <td
        style={{
          width: 32,
          position: 'sticky',
          right: 0,
          background: 'var(--surface)',
          zIndex: 1,
        }}
      >
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
    <div className="space-y-1.5">
      <div className="px-4 pt-3.5 text-[11px] font-medium flex items-center gap-1.5" style={{ color: 'var(--ink-3)' }}>
        <span>💡 Cuộn sang phải để xem đầy đủ cột cước & lương sản lượng</span>
      </div>
      <div className="nepo-table-scroll overflow-x-auto">

      <table
        className="nepo-table"
        style={{ minWidth: TABLE_MIN_WIDTH, width: TABLE_MIN_WIDTH, tableLayout: 'fixed', borderCollapse: 'collapse' }}
      >
        <colgroup>
          <col style={{ width: COL.index }} />
          <col style={{ width: COL.client }} />
          <col style={{ width: COL.pickup }} />
          <col style={{ width: COL.dropoff }} />
          <col style={{ width: COL.price }} />
          <col style={{ width: COL.price }} />
          <col style={{ width: COL.price }} />
          <col style={{ width: COL.price }} />
          <col style={{ width: COL.salary }} />
          <col style={{ width: COL.salary }} />
          <col style={{ width: COL.salary }} />
          <col style={{ width: COL.salary }} />
          <col style={{ width: COL.workType }} />
          <col style={{ width: COL.actions }} />
        </colgroup>
        <thead>
          <tr>
            <th>#</th>
            <th className="text-left">Chủ hàng</th>
            <th className="text-left">Điểm đi</th>
            <th className="text-left">Điểm đến</th>
            <th className="text-right" title="Cước chủ hàng" style={{ color: '#3b82f6' }}>Cước F20</th>
            <th className="text-right" title="Cước chủ hàng" style={{ color: '#3b82f6' }}>Cước F40</th>
            <th className="text-right" title="Cước chủ hàng" style={{ color: '#6366f1' }}>Cước E20</th>
            <th className="text-right" title="Cước chủ hàng" style={{ color: '#6366f1' }}>Cước E40</th>
            <th className="text-right" title="Lương sản lượng" style={{ color: '#d97706', background: SALARY_TINT, borderLeft: SALARY_BORDER }}>Lương F20</th>
            <th className="text-right" title="Lương sản lượng" style={{ color: '#d97706', background: SALARY_TINT }}>Lương F40</th>
            <th className="text-right" title="Lương sản lượng" style={{ color: '#b45309', background: SALARY_TINT }}>Lương E20</th>
            <th className="text-right" title="Lương sản lượng" style={{ color: '#b45309', background: SALARY_TINT }}>Lương E40</th>
            <th className="text-left" style={{ position: 'sticky', right: COL.actions, background: 'var(--surface-2)', zIndex: 2, borderLeft: '1px solid var(--line)' }}>Tác nghiệp</th>
            <th style={{ position: 'sticky', right: 0, background: 'var(--surface-2)', zIndex: 2 }} />
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
    </div>
  )
}
