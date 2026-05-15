import { useState, useMemo } from 'react'
import { type Pricing, type PricingLine, type WorkType, OPERATION_TYPE_LABELS, type OperationType } from '@/data/domain'
import { useLocations } from '@/hooks/use-queries'
import type { PricingCreatePayload } from '@/services/api/pricings.api'
import { Label } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { LocationSelect } from '@/components/shared/LocationSelect/LocationSelect'
import { ContBadge } from '@/components/shared/ContBadge'
import { X, Check } from 'lucide-react'

const OPERATION_TYPE_OPTIONS = [
  { value: '', label: '— Không chọn —' },
  ...(Object.entries(OPERATION_TYPE_LABELS) as [OperationType, string][]).map(
    ([value, label]) => ({ value, label })
  ),
]

/** Grid order: full containers first, then empty */
const GRID_ORDER: WorkType[] = ['F20', 'F40', 'E20', 'E40']
const WORK_TYPE_LABELS: Record<WorkType, string> = {
  F20: 'Hàng 20ft',
  F40: 'Hàng 40ft',
  E20: 'Rỗng 20ft',
  E40: 'Rỗng 40ft',
}

/** One line editor per work type */
interface WorkTypeLine {
  enabled: boolean
  lines: PricingLine[]
}

interface Props {
  initial?: Pricing
  clients: { id: number; name: string }[]
  /** If provided, locks the form to this client (used from detail page) */
  lockedClientId?: number
  /** Called for each enabled work type (supports batch creation) */
  onSave: (data: PricingCreatePayload) => void
  /** Called once after all enabled work types are saved */
  onSaveComplete?: () => void
  onCancel: () => void
  onCreateClient: () => void
}

function initWorkTypeLines(initial?: Pricing): Record<WorkType, WorkTypeLine> {
  const result: Record<WorkType, WorkTypeLine> = {
    F20: { enabled: false, lines: [{ quantity: 1, unitPrice: 0, driverSalary: 0, allowance: 0 }] },
    F40: { enabled: false, lines: [{ quantity: 1, unitPrice: 0, driverSalary: 0, allowance: 0 }] },
    E20: { enabled: false, lines: [{ quantity: 1, unitPrice: 0, driverSalary: 0, allowance: 0 }] },
    E40: { enabled: false, lines: [{ quantity: 1, unitPrice: 0, driverSalary: 0, allowance: 0 }] },
  }
  if (initial) {
    result[initial.workType] = {
      enabled: true,
      lines: initial.lines.length > 0 ? initial.lines : [{ quantity: 1, unitPrice: 0, driverSalary: 0, allowance: 0 }],
    }
  }
  return result
}

function MiniLineEditor({
  lines,
  onChange,
}: {
  lines: PricingLine[]
  onChange: (lines: PricingLine[]) => void
}) {
  const addLine = () =>
    onChange([...lines, { quantity: 1, unitPrice: 0, driverSalary: 0, allowance: 0 }])

  const removeLine = (idx: number) =>
    onChange(lines.filter((_, i) => i !== idx))

  const updateLine = (idx: number, field: keyof PricingLine, value: number) =>
    onChange(lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))

  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <div key={i}>
          {/* Quantity + remove */}
          <div className="flex items-center gap-1.5 mb-1.5">
            {[1, 2].map(q => (
              <button
                key={q}
                onClick={() => updateLine(i, 'quantity', q)}
                className="px-2 py-0.5 rounded text-xs font-bold transition-colors"
                style={{
                  background: line.quantity === q ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                  color: line.quantity === q ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                  border: '1px solid var(--theme-border-default)',
                }}
              >
                x{q}
              </button>
            ))}
            {lines.length > 1 && (
              <button
                onClick={() => removeLine(i)}
                className="p-0.5 rounded hover:bg-[var(--theme-bg-tertiary)]"
                style={{ color: 'var(--theme-status-error)' }}
                title="Xoá mức giá"
              >
                <X size={12} />
              </button>
            )}
          </div>
          {/* Price inputs */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="typo-label mb-0.5" style={{ fontSize: '10px' }}>Đơn giá</div>
              <input
                type="number"
                min={0}
                value={line.unitPrice || ''}
                onChange={e => updateLine(i, 'unitPrice', Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full px-2 py-1.5 rounded-md text-xs font-mono-num"
                style={{
                  background: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border-default)',
                  color: 'var(--theme-text-primary)',
                }}
              />
            </div>
            <div>
              <div className="typo-label mb-0.5" style={{ fontSize: '10px' }}>Lương TX</div>
              <input
                type="number"
                min={0}
                value={line.driverSalary || ''}
                onChange={e => updateLine(i, 'driverSalary', Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full px-2 py-1.5 rounded-md text-xs font-mono-num"
                style={{
                  background: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border-default)',
                  color: 'var(--theme-text-primary)',
                }}
              />
            </div>
            <div>
              <div className="typo-label mb-0.5" style={{ fontSize: '10px' }}>Phụ cấp</div>
              <input
                type="number"
                min={0}
                value={line.allowance || ''}
                onChange={e => updateLine(i, 'allowance', Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full px-2 py-1.5 rounded-md text-xs font-mono-num"
                style={{
                  background: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border-default)',
                  color: 'var(--theme-text-primary)',
                }}
              />
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={addLine}
        className="flex items-center gap-1 text-xs font-medium"
        style={{ color: 'var(--theme-brand-primary)' }}
      >
        <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span> Thêm mức
      </button>
    </div>
  )
}

export function PricingForm({ initial, clients, lockedClientId, onSave, onSaveComplete, onCancel, onCreateClient }: Props) {
  const { data: locations = [] } = useLocations()

  const [clientId, setClientId] = useState(
    String(lockedClientId ?? initial?.partner.id ?? ''),
  )
  const [pickupLocationName, setPickupLocationName] = useState(initial?.pickupLocation.name ?? '')
  const [dropoffLocationName, setDropoffLocationName] = useState(initial?.dropoffLocation.name ?? '')
  const [operationType, setOperationType] = useState(initial?.operationType ?? '')
  const [workTypeLines, setWorkTypeLines] = useState<Record<WorkType, WorkTypeLine>>(() => initWorkTypeLines(initial))

  const clientOptions = useMemo(
    () => clients.map(c => ({ value: String(c.id), label: c.name })),
    [clients],
  )

  const toggleWorkType = (wt: WorkType) => {
    setWorkTypeLines(prev => ({
      ...prev,
      [wt]: { ...prev[wt], enabled: !prev[wt].enabled },
    }))
  }

  const updateWorkTypeLines = (wt: WorkType, lines: PricingLine[]) => {
    setWorkTypeLines(prev => ({
      ...prev,
      [wt]: { ...prev[wt], lines },
    }))
  }

  /** Collect all enabled work types in grid order */
  const enabledWorkTypes = GRID_ORDER.filter(wt => workTypeLines[wt].enabled)
  const hasAnyEnabled = enabledWorkTypes.length > 0

  /** Save all enabled work types (one API call each via parent) */
  const handleSubmit = () => {
    const pickupId = locations.find(l => l.name === pickupLocationName)?.id
    const dropoffId = locations.find(l => l.name === dropoffLocationName)?.id
    if (!clientId || !pickupId || !dropoffId || !hasAnyEnabled) return

    const extraFields = {
      operationType: operationType || null,
    }

    // When editing, save only the single initial work type
    if (initial) {
      onSave({
        clientId: Number(clientId),
        workType: initial.workType,
        pickupLocationId: pickupId,
        dropoffLocationId: dropoffId,
        lines: workTypeLines[initial.workType].lines,
        ...extraFields,
      })
      onSaveComplete?.()
      return
    }

    // When creating, call onSave for each enabled work type
    enabledWorkTypes.forEach(wt => {
      onSave({
        clientId: Number(clientId),
        workType: wt,
        pickupLocationId: pickupId,
        dropoffLocationId: dropoffId,
        lines: workTypeLines[wt].lines,
        ...extraFields,
      })
    })
    onSaveComplete?.()
  }

  const canSubmit = !!clientId && !!pickupLocationName && !!dropoffLocationName && hasAnyEnabled

  return (
    <div
      className="card p-6 space-y-6"
      style={{
        borderColor: 'var(--theme-brand-primary)',
        borderWidth: '2px',
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="typo-h2">
          {initial ? 'Chỉnh sửa bảng giá' : 'Tạo bảng giá mới'}
        </h2>
        <button onClick={onCancel} className="p-1 rounded-md hover:bg-[var(--theme-bg-tertiary)]" style={{ color: 'var(--theme-text-muted)' }}>
          <X size={20} />
        </button>
      </div>

      <div className="space-y-6">
        {/* Client Section */}
        <div>
          <div className="typo-label mb-4">THÔNG TIN CƠ BẢN</div>
          {!lockedClientId && (
            <div className="space-y-2 max-w-md">
              <Label className="typo-form-label">Khách hàng</Label>
              <InlineSelect
                options={clientOptions}
                value={clientId}
                onChange={setClientId}
                placeholder="Chọn khách hàng"
                onCreateNew={onCreateClient}
                createNewLabel="Tạo khách hàng mới"
              />
            </div>
          )}
        </div>

        {/* Route Section */}
        <div>
          <div className="typo-label mb-4">CUNG ĐƯỜNG</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="typo-form-label">Điểm lấy hàng</Label>
              <LocationSelect
                value={pickupLocationName}
                onChange={v => { setPickupLocationName(v); setDropoffLocationName('') }}
                placeholder="Chọn điểm lấy"
              />
            </div>
            <div className="space-y-2">
              <Label className="typo-form-label">Điểm trả hàng</Label>
              <LocationSelect
                value={dropoffLocationName}
                onChange={setDropoffLocationName}
                placeholder="Chọn điểm trả"
              />
            </div>
          </div>
        </div>

        {/* Operation type — optional override */}
        <div>
          <div className="typo-label mb-1">TÁC NGHIỆP (tuỳ chọn)</div>
          <p className="text-[11px] mb-3" style={{ color: 'var(--theme-text-muted)' }}>
            Để trống = giá mặc định cho tuyến. Chọn tác nghiệp để tạo mức giá riêng.
          </p>
          <div className="max-w-md">
            <div className="space-y-2">
              <Label className="typo-form-label">Tác nghiệp</Label>
              <select
                value={operationType}
                onChange={e => setOperationType(e.target.value)}
                className="w-full h-10 rounded-xl px-3 text-sm"
                style={{
                  background: 'var(--theme-bg-tertiary)',
                  border: '1.5px solid transparent',
                  color: operationType ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
                }}
              >
                {OPERATION_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 2x2 Grid of Work Types */}
        <div>
          <div className="typo-label mb-4">BẢNG GIÁ</div>
          <div
            className="grid grid-cols-2 gap-px rounded-lg overflow-hidden"
            style={{ background: 'var(--theme-border-light)' }}
          >
            {GRID_ORDER.map(wt => {
              const wtData = workTypeLines[wt]
              return (
                <div
                  key={wt}
                  className="p-4"
                  style={{
                    background: wtData.enabled
                      ? 'var(--theme-bg-primary)'
                      : 'var(--theme-bg-secondary)',
                    opacity: wtData.enabled ? 1 : 0.6,
                    transition: 'opacity 0.15s, background 0.15s',
                  }}
                >
                  {/* Toggle header */}
                  <button
                    onClick={() => toggleWorkType(wt)}
                    className="flex items-center gap-2 w-full text-left mb-3"
                  >
                    <span
                      className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0"
                      style={{
                        borderColor: wtData.enabled ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)',
                        background: wtData.enabled ? 'var(--theme-brand-primary)' : 'transparent',
                      }}
                    >
                      {wtData.enabled && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="var(--theme-text-on-brand)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <ContBadge type={wt} />
                    <span className="typo-body-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
                      {WORK_TYPE_LABELS[wt]}
                    </span>
                  </button>

                  {/* Line editors (only when enabled) */}
                  {wtData.enabled && (
                    <MiniLineEditor
                      lines={wtData.lines}
                      onChange={newLines => updateWorkTypeLines(wt, newLines)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="flex gap-2 justify-end pt-4 border-t border-[var(--theme-border-default)]">
        <button
          onClick={onCancel}
          className="btn-secondary"
        >
          Hủy
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn-primary"
        >
          <Check size={16} className="mr-1.5" />
          {initial ? 'Lưu' : 'Tạo'}
        </button>
      </div>
    </div>
  )
}
