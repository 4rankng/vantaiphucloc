import { useState, useMemo } from 'react'
import { usePricings, useClients, useRoutes, useCreatePricing, useUpdatePricing, useDeletePricing, useCreateClient } from '@/hooks/use-queries'
import { formatCurrencyFull, WORK_TYPES, type Pricing, type PricingLine, type WorkType } from '@/data/domain'
import { ContBadge } from '@/components/shared/ContBadge'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { CreateClientDialog } from '@/components/shared/CreateClientDialog'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'

// ─── Line editor ──────────────────────────────────────────────────────────────
function LineEditor({ lines, onChange }: {
  lines: PricingLine[]; onChange: (lines: PricingLine[]) => void
}) {
  const addLine = () => onChange([...lines, { workType: 'E20', quantity: 1, unitPrice: 0, driverSalary: 0, allowance: 0 }])
  const removeLine = (idx: number) => onChange(lines.filter((_, i) => i !== idx))
  const updateLine = (idx: number, field: keyof PricingLine, value: WorkType | number) => {
    const updated = lines.map((l, i) => i === idx ? { ...l, [field]: value } : l)
    // Auto-reset qty to 1 when switching to 40ft
    if (field === 'workType' && typeof value === 'string' && value.endsWith('40')) {
      updated[idx] = { ...updated[idx], quantity: 1 }
    }
    onChange(updated)
  }

  const is40ft = (wt: WorkType) => wt === 'E40' || wt === 'F40'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Công</Label>
        <button onClick={addLine} className="flex items-center gap-1 text-xs font-medium touch-manipulation" style={{ color: 'var(--theme-brand-primary)' }}>
          <Plus className="w-3.5 h-3.5" /> Thêm loại
        </button>
      </div>
      {lines.map((line, i) => (
        <div key={i} className="rounded-xl p-2 space-y-2"
          style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)' }}>
          <div className="flex items-center gap-2">
            {/* Type selector */}
            <div className="flex gap-0.5 shrink-0">
              {WORK_TYPES.map(w => (
                <button key={w} onClick={() => updateLine(i, 'workType', w)}
                  className="px-1.5 py-1 rounded text-xs font-bold touch-manipulation"
                  style={{
                    background: line.workType === w ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                    color: line.workType === w ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                  }}>
                  {w}
                </button>
              ))}
            </div>
            {/* Quantity */}
            <div className="flex items-center gap-1">
              {is40ft(line.workType) ? (
                <button className="px-2 py-1 rounded text-xs font-bold"
                  style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
                  ×1
                </button>
              ) : (
                [1, 2].map(q => (
                  <button key={q} onClick={() => updateLine(i, 'quantity', q)}
                    className="px-2 py-1 rounded text-xs font-bold touch-manipulation"
                    style={{
                      background: line.quantity === q ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                      color: line.quantity === q ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                    }}>
                    ×{q}
                  </button>
                ))
              )}
            </div>
            {/* Remove */}
            {lines.length > 1 && (
              <button onClick={() => removeLine(i)} className="touch-manipulation shrink-0" style={{ color: 'var(--theme-status-error)' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Tiered pricing fields */}
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Đơn giá</span>
              <Input type="number" min={0} value={line.unitPrice || ''} onChange={e => updateLine(i, 'unitPrice', Math.max(0, Number(e.target.value)))}
                placeholder="0" className="text-xs font-mono h-7" />
            </div>
            <div>
              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Lương tài xế</span>
              <Input type="number" min={0} value={line.driverSalary || ''} onChange={e => updateLine(i, 'driverSalary', Math.max(0, Number(e.target.value)))}
                placeholder="0" className="text-xs font-mono h-7" />
            </div>
            <div>
              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Phụ cấp</span>
              <Input type="number" min={0} value={line.allowance || ''} onChange={e => updateLine(i, 'allowance', Math.max(0, Number(e.target.value)))}
                placeholder="0" className="text-xs font-mono h-7" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Pricing Form ─────────────────────────────────────────────────────────────
function PricingForm({ initial, clients, routes, onSave, onCancel, onCreateClient }: {
  initial?: Pricing
  clients: { id: number; name: string }[]; routes: { route: string; pickupLocation?: string; dropoffLocation?: string }[]
  onSave: (data: Omit<Pricing, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  onCreateClient: () => void
}) {
  const [clientId, setClientId] = useState(String(initial?.clientId ?? ''))
  const [pickupLocation, setPickupLocation] = useState(initial?.pickupLocation ?? '')
  const [dropoffLocation, setDropoffLocation] = useState(initial?.dropoffLocation ?? '')
  const [lines, setLines] = useState<PricingLine[]>(
    initial?.lines ?? [{ workType: 'E20' as WorkType, quantity: 1, unitPrice: 0, driverSalary: 0, allowance: 0 }]
  )
  const [unitPrice, setUnitPrice] = useState(initial?.unitPrice ?? 0)
  const [driverSalary, setDriverSalary] = useState(initial?.driverSalary ?? 0)
  const [allowance, setAllowance] = useState(initial?.allowance ?? 0)

  const clientOptions = useMemo(() => clients.map(c => ({ value: String(c.id), label: c.name })), [clients])
  const pickupOptions = useMemo(() =>
    [...new Set(routes.map(r => r.pickupLocation).filter(Boolean) as string[])].map(loc => ({ value: loc!, label: loc! })),
    [routes],
  )
  const dropoffOptions = useMemo(() =>
    routes.filter(r => r.pickupLocation === pickupLocation).map(r => ({ value: r.dropoffLocation ?? '', label: r.dropoffLocation ?? '' })),
    [routes, pickupLocation],
  )
  const clientName = clients.find(c => String(c.id) === clientId)?.name ?? ''
  const route = pickupLocation && dropoffLocation ? `${pickupLocation} - ${dropoffLocation}` : ''
  const workType = lines[0]?.workType ?? 'E20'

  const handleSubmit = () => {
    if (!clientId || !route || lines.length === 0) return
    onSave({ clientId: Number(clientId), clientName, workType, route, pickupLocation, dropoffLocation, lines, unitPrice, driverSalary, allowance })
  }

  return (
    <div className="rounded-2xl p-4 space-y-4"
      style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '2px solid var(--theme-brand-primary)' }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>
          {initial ? 'Sửa bảng giá' : 'Thêm bảng giá'}
        </p>
        <button onClick={onCancel} className="touch-manipulation" style={{ color: 'var(--theme-text-muted)' }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Khách hàng</Label>
          <InlineSelect
            options={clientOptions}
            value={clientId}
            onChange={setClientId}
            placeholder="Chọn khách hàng"
            onCreateNew={onCreateClient}
            createNewLabel="Tạo khách hàng mới"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Cung đường</Label>
          <div className="space-y-1.5">
            <InlineSelect options={pickupOptions} value={pickupLocation} onChange={v => { setPickupLocation(v); setDropoffLocation('') }} placeholder="Điểm lấy" />
            <InlineSelect options={dropoffOptions} value={dropoffLocation} onChange={setDropoffLocation} placeholder="Điểm trả" />
          </div>
        </div>
      </div>

      <LineEditor lines={lines} onChange={setLines} />

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Đơn giá</Label>
          <Input type="number" value={unitPrice || ''} onChange={e => setUnitPrice(Number(e.target.value))}
            placeholder="0" className="text-xs font-mono h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Lương tài xế</Label>
          <Input type="number" value={driverSalary || ''} onChange={e => setDriverSalary(Number(e.target.value))}
            placeholder="0" className="text-xs font-mono h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Phụ cấp</Label>
          <Input type="number" value={allowance || ''} onChange={e => setAllowance(Number(e.target.value))}
            placeholder="0" className="text-xs font-mono h-9" />
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={!clientId || !route || lines.length === 0}
        className="w-full h-10 font-bold rounded-xl text-sm"
        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
        <Check className="w-4 h-4 mr-1.5" /> {initial ? 'Lưu' : 'Thêm'}
      </Button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function PricingList() {
  const { data: pricings = [], isLoading: loading } = usePricings()
  const { data: clients = [] } = useClients()
  const { data: routes = [] } = useRoutes()
  const createPricing = useCreatePricing()
  const updatePricing = useUpdatePricing()
  const deletePricing = useDeletePricing()
  const createClient = useCreateClient()

  const [showForm, setShowForm] = useState(false)
  const [editingPricing, setEditingPricing] = useState<Pricing | undefined>()
  const [createClientOpen, setCreateClientOpen] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<string, Pricing[]>()
    pricings.forEach(p => {
      const list = map.get(p.clientName) ?? []
      list.push(p)
      map.set(p.clientName, list)
    })
    return Array.from(map.entries())
  }, [pricings])

  const handleSave = (data: Omit<Pricing, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingPricing) {
      updatePricing.mutate({ id: editingPricing.id, data }, {
        onSuccess: () => {
          setShowForm(false)
          setEditingPricing(undefined)
        },
      })
    } else {
      createPricing.mutate(data, {
        onSuccess: () => {
          setShowForm(false)
          setEditingPricing(undefined)
        },
      })
    }
  }

  const handleDelete = (id: number) => {
    deletePricing.mutate(id)
  }

  if (loading) {
    return <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}</div>
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        {showForm && (
          <PricingForm initial={editingPricing} clients={clients} routes={routes}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingPricing(undefined) }}
            onCreateClient={() => setCreateClientOpen(true)}
          />
        )}

        {grouped.map(([clientName, items]) => {
          const rows = items.flatMap((p) =>
            p.lines.map((line, lIdx, lines) => ({
              pricing: p,
              line,
              lIdx,
              linesCount: lines.length,
            }))
          )
          return (
            <div key={clientName} className="mt-4 first:mt-0">
              <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--theme-text-muted)' }}>{clientName}</p>
              <div className="overflow-x-auto rounded-xl"
                style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--theme-bg-tertiary)' }}>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>STT</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Điểm đến</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Điểm trả</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Loại cont</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>SL</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Đơn giá</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Lương tài</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Phụ cấp</th>
                      <th className="px-2 py-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={`${row.pricing.id}-${row.lIdx}`}
                        style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
                        <td className="px-3 py-2 text-xs tabular-nums" style={{ color: 'var(--theme-text-muted)' }}>{idx + 1}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--theme-text-primary)' }}>{row.pricing.pickupLocation}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: 'var(--theme-text-primary)' }}>{row.pricing.dropoffLocation}</td>
                        <td className="px-3 py-2"><ContBadge type={row.line.workType} /></td>
                        <td className="px-3 py-2 text-xs text-right tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{row.line.quantity}</td>
                        <td className="px-3 py-2 text-xs text-right tabular-nums font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrencyFull(row.line.unitPrice)}</td>
                        <td className="px-3 py-2 text-xs text-right tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyFull(row.line.driverSalary)}</td>
                        <td className="px-3 py-2 text-xs text-right tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyFull(row.line.allowance)}</td>
                        {row.lIdx === 0 && (
                          <td rowSpan={row.linesCount} className="px-2 py-2">
                            <div className="flex items-center gap-0.5">
                              <button onClick={() => { setEditingPricing(row.pricing); setShowForm(true) }}
                                className="p-1 rounded-md touch-manipulation" style={{ color: 'var(--theme-text-muted)' }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(row.pricing.id)}
                                className="p-1 rounded-md touch-manipulation" style={{ color: 'var(--theme-status-error)' }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

        {grouped.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              {'Chưa có bảng giá'}
            </p>
          </div>
        )}
      </div>

      <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={() => { setEditingPricing(undefined); setShowForm(true) }} />

      <CreateClientDialog
        open={createClientOpen}
        onClose={() => setCreateClientOpen(false)}
        onConfirm={(data) => {
          createClient.mutate(
            { ...data, outstandingDebt: 0 },
            { onSuccess: () => setCreateClientOpen(false) },
          )
        }}
      />
    </div>
  )
}
