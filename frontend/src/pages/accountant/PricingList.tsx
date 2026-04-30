import { useState, useMemo } from 'react'
import { usePricings, useClients, useRoutes, useCreatePricing, useUpdatePricing, useDeletePricing, useCreateClient } from '@/hooks/use-queries'
import { formatCurrencyFull, WORK_TYPES, type Pricing, type PricingLine, type WorkType } from '@/data/domain'
import { ContBadge } from '@/components/shared/ContBadge'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { QuickCreateDialog } from '@/components/shared/QuickCreateDialog'
import { Plus, Pencil, Trash2, X, Check, Search } from 'lucide-react'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'

// ─── Pricing Card ─────────────────────────────────────────────────────────────
function PricingCard({ pricing, onEdit, onDelete }: {
  pricing: Pricing; onEdit: () => void; onDelete: () => void
}) {
  return (
    <div className="rounded-2xl p-3 space-y-2"
      style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {pricing.lines.map((line, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>+</span>}
              <ContBadge type={line.workType} />
              <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>×{line.quantity}</span>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-1.5 rounded-lg touch-manipulation" style={{ color: 'var(--theme-text-muted)' }}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg touch-manipulation" style={{ color: 'var(--theme-status-error)' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{pricing.clientName}</p>
      <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{pricing.route}</p>
      <div className="grid grid-cols-3 gap-2 pt-1" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
        <div>
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Đơn giá</p>
          <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrencyFull(pricing.unitPrice)}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Lương TX</p>
          <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyFull(pricing.driverSalary)}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Phụ cấp</p>
          <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyFull(pricing.allowance)}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Line editor ──────────────────────────────────────────────────────────────
function LineEditor({ lines, onChange }: {
  lines: PricingLine[]; onChange: (lines: PricingLine[]) => void
}) {
  const addLine = () => onChange([...lines, { workType: 'E20', quantity: 1 }])
  const removeLine = (idx: number) => onChange(lines.filter((_, i) => i !== idx))
  const updateLine = (idx: number, field: keyof PricingLine, value: WorkType | number) => {
    onChange(lines.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Công</Label>
        <button onClick={addLine} className="flex items-center gap-1 text-xs font-medium touch-manipulation" style={{ color: 'var(--theme-brand-primary)' }}>
          <Plus className="w-3.5 h-3.5" /> Thêm loại
        </button>
      </div>
      {lines.map((line, i) => (
        <div key={i} className="flex items-center gap-2 rounded-xl p-2"
          style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)' }}>
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
            <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>×‌</span>
            <Input type="number" min={1} value={line.quantity} onChange={e => updateLine(i, 'quantity', Math.max(1, Number(e.target.value)))}
              className="text-xs font-bold h-8 w-14 text-center" />
          </div>
          {/* Remove */}
          {lines.length > 1 && (
            <button onClick={() => removeLine(i)} className="touch-manipulation shrink-0" style={{ color: 'var(--theme-status-error)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Pricing Form ─────────────────────────────────────────────────────────────
function PricingForm({ initial, clients, routes, onSave, onCancel, onCreateClient }: {
  initial?: Pricing
  clients: { id: number; name: string }[]; routes: { route: string }[]
  onSave: (data: Omit<Pricing, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  onCreateClient: () => void
}) {
  const [clientId, setClientId] = useState(String(initial?.clientId ?? ''))
  const [route, setRoute] = useState(initial?.route ?? '')
  const [lines, setLines] = useState<PricingLine[]>(
    initial?.lines ?? [{ workType: 'E20' as WorkType, quantity: 1 }]
  )
  const [unitPrice, setUnitPrice] = useState(initial?.unitPrice ?? 0)
  const [driverSalary, setDriverSalary] = useState(initial?.driverSalary ?? 0)
  const [allowance, setAllowance] = useState(initial?.allowance ?? 0)

  const clientOptions = useMemo(() => clients.map(c => ({ value: String(c.id), label: c.name })), [clients])
  const routeOptions = useMemo(() => routes.map(r => ({ value: r.route, label: r.route })), [routes])
  const clientName = clients.find(c => String(c.id) === clientId)?.name ?? ''
  // Derive primary workType from first line for compatibility
  const workType = lines[0]?.workType ?? 'E20'

  const handleSubmit = () => {
    if (!clientId || !route || lines.length === 0) return
    onSave({ clientId: Number(clientId), clientName, workType, route, lines, unitPrice, driverSalary, allowance })
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
        <InlineSelect options={routeOptions} value={route} onChange={setRoute} placeholder="Chọn cung đường" />
      </div>

      <LineEditor lines={lines} onChange={setLines} />

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Đơn giá</Label>
          <Input type="number" value={unitPrice || ''} onChange={e => setUnitPrice(Number(e.target.value))}
            placeholder="0" className="text-xs font-mono h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Lương TX</Label>
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
  const [searchQuery, setSearchQuery] = useState('')
  const [createClientOpen, setCreateClientOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return pricings
    const q = searchQuery.toLowerCase()
    return pricings.filter(p =>
      p.clientName.toLowerCase().includes(q) ||
      p.route.toLowerCase().includes(q) ||
      p.lines.some(l => l.workType.toLowerCase().includes(q))
    )
  }, [pricings, searchQuery])

  const grouped = useMemo(() => {
    const map = new Map<string, Pricing[]>()
    filtered.forEach(p => {
      const list = map.get(p.clientName) ?? []
      list.push(p)
      map.set(p.clientName, list)
    })
    return Array.from(map.entries())
  }, [filtered])

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
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm khách hàng, cung đường..." className="text-xs h-9 pl-8" />
          </div>
        </div>

        {showForm && (
          <PricingForm initial={editingPricing} clients={clients} routes={routes}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingPricing(undefined) }}
            onCreateClient={() => setCreateClientOpen(true)}
          />
        )}

        {grouped.map(([clientName, items]) => (
          <div key={clientName} className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--theme-text-muted)' }}>{clientName}</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2 lg:gap-3">
              {items.map(p => (
                <PricingCard key={p.id} pricing={p}
                  onEdit={() => { setEditingPricing(p); setShowForm(true) }}
                  onDelete={() => handleDelete(p.id)} />
              ))}
            </div>
          </div>
        ))}

        {grouped.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              {searchQuery ? 'Không tìm thấy bảng giá' : 'Chưa có bảng giá'}
            </p>
          </div>
        )}
      </div>

      <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={() => { setEditingPricing(undefined); setShowForm(true) }} label="Thêm bảng giá" />

      <QuickCreateDialog
        open={createClientOpen}
        onClose={() => setCreateClientOpen(false)}
        title="Thêm khách hàng"
        label="Tên khách hàng"
        placeholder="Tên khách hàng"
        onConfirm={(name) => {
          createClient.mutate(
            { name, type: 'company', phone: '', taxCode: '', address: '', contactPerson: '' },
            { onSuccess: () => setCreateClientOpen(false) },
          )
        }}
      />
    </div>
  )
}
