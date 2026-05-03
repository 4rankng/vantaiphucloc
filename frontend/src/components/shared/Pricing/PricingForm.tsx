import { useState, useMemo } from 'react'
import { useRoutes } from '@/hooks/use-queries'
import { type Pricing, type PricingLine } from '@/data/domain'
import { Button } from '@/components/ui'
import { Label } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { LineEditor } from './LineEditor'
import { X, Check } from 'lucide-react'

interface Props {
  initial?: Pricing
  clients: { id: number; name: string }[]
  /** If provided, locks the form to this client (used from detail page) */
  lockedClientId?: number
  onSave: (data: Omit<Pricing, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  onCreateClient: () => void
}

export function PricingForm({ initial, clients, lockedClientId, onSave, onCancel, onCreateClient }: Props) {
  const { data: routes = [] } = useRoutes()

  const [clientId, setClientId] = useState(
    String(lockedClientId ?? initial?.clientId ?? ''),
  )
  const [workType, setWorkType] = useState(initial?.workType ?? 'E20')
  const [pickupLocation, setPickupLocation] = useState(initial?.pickupLocation ?? '')
  const [dropoffLocation, setDropoffLocation] = useState(initial?.dropoffLocation ?? '')
  const [lines, setLines] = useState<PricingLine[]>(
    initial?.lines?.length
      ? initial.lines
      : [{ quantity: 1, unitPrice: 0, driverSalary: 0, allowance: 0 }],
  )

  const clientOptions = useMemo(
    () => clients.map(c => ({ value: String(c.id), label: c.name })),
    [clients],
  )
  const workTypeOptions = [
    { value: 'E20', label: 'E20' },
    { value: 'E40', label: 'E40' },
    { value: 'F20', label: 'F20' },
    { value: 'F40', label: 'F40' },
  ]
  const pickupOptions = useMemo(
    () =>
      [...new Set(routes.map(r => r.pickupLocation).filter(Boolean) as string[])].map(loc => ({
        value: loc,
        label: loc,
      })),
    [routes],
  )
  const dropoffOptions = useMemo(
    () =>
      routes
        .filter(r => r.pickupLocation === pickupLocation)
        .map(r => ({ value: r.dropoffLocation ?? '', label: r.dropoffLocation ?? '' })),
    [routes, pickupLocation],
  )

  const clientName = clients.find(c => String(c.id) === clientId)?.name ?? ''
  const route = pickupLocation && dropoffLocation ? `${pickupLocation} - ${dropoffLocation}` : ''

  const handleSubmit = () => {
    if (!clientId || !route || lines.length === 0) return
    onSave({
      clientId: Number(clientId),
      clientName,
      workType: workType as Pricing['workType'],
      route,
      pickupLocation,
      dropoffLocation,
      lines,
    })
  }

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
        {/* Client & Work Type Section */}
        <div>
          <div className="typo-label mb-4">THÔNG TIN CƠ BẢN</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client selector — hidden when locked */}
            {!lockedClientId && (
              <div className="space-y-2">
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

            {/* Work type */}
            <div className="space-y-2">
              <Label className="typo-form-label">Loại container</Label>
              <div className="flex gap-2">
                {workTypeOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setWorkType(opt.value)}
                    className="px-3 py-2 rounded-md text-xs font-bold transition-colors"
                    style={{
                      background: workType === opt.value ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                      color: workType === opt.value ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                      border: '1px solid var(--theme-border-default)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Route Section */}
        <div>
          <div className="typo-label mb-4">CUNG ĐƯỜNG</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="typo-form-label">Điểm lấy hàng</Label>
              <InlineSelect
                options={pickupOptions}
                value={pickupLocation}
                onChange={v => { setPickupLocation(v); setDropoffLocation('') }}
                placeholder="Chọn điểm lấy"
              />
            </div>
            <div className="space-y-2">
              <Label className="typo-form-label">Điểm trả hàng</Label>
              <InlineSelect
                options={dropoffOptions}
                value={dropoffLocation}
                onChange={setDropoffLocation}
                placeholder="Chọn điểm trả"
              />
            </div>
          </div>
        </div>

        {/* Line Editor Section */}
        <div>
          <div className="typo-label mb-4">BẢNG GIÁ</div>
          <LineEditor lines={lines} onChange={setLines} />
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
          disabled={!clientId || !route || lines.length === 0}
          className="btn-primary"
        >
          <Check size={16} className="mr-1.5" />
          {initial ? 'Lưu' : 'Tạo'}
        </button>
      </div>
    </div>
  )
}
