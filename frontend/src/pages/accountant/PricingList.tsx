import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '@/hooks/use-app-store'
import { apiClient } from '@/services/api'
import { getPricings, createPricing, updatePricing, deletePricing } from '@/services/sandbox/sandboxClient'
import { formatCurrencyFull, WORK_TYPES, WORK_TYPE_LABELS, type Pricing, type WorkType, type Client, type RoutePrice } from '@/data/mockData'
import { ContBadge } from '@/components/shared/ContBadge'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'
import { SheetPicker } from '@/components/shared/SheetPicker'
import { Plus, Pencil, Trash2, X, Check, Search } from 'lucide-react'

// ─── Pricing Card ─────────────────────────────────────────────────────────────
function PricingCard({
  pricing,
  onEdit,
  onDelete,
}: {
  pricing: Pricing
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="rounded-2xl p-3 space-y-2"
      style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ContBadge type={pricing.workType} />
          <span className="text-[10px] font-medium" style={{ color: 'var(--theme-text-muted)' }}>
            {WORK_TYPE_LABELS[pricing.workType]}
          </span>
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
      <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>{pricing.route}</p>
      <div className="grid grid-cols-3 gap-2 pt-1" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
        <div>
          <p className="text-[9px]" style={{ color: 'var(--theme-text-muted)' }}>Đơn giá</p>
          <p className="text-xs font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>{formatCurrencyFull(pricing.unitPrice)}</p>
        </div>
        <div>
          <p className="text-[9px]" style={{ color: 'var(--theme-text-muted)' }}>Lương TX</p>
          <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyFull(pricing.driverSalary)}</p>
        </div>
        <div>
          <p className="text-[9px]" style={{ color: 'var(--theme-text-muted)' }}>Phụ cấp</p>
          <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyFull(pricing.allowance)}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Pricing Form (add / edit) ────────────────────────────────────────────────
function PricingForm({
  initial,
  clients,
  routes,
  onSave,
  onCancel,
}: {
  initial?: Pricing
  clients: Client[]
  routes: RoutePrice[]
  onSave: (data: Omit<Pricing, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}) {
  const [clientId, setClientId] = useState(initial?.clientId ?? '')
  const [workType, setWorkType] = useState<WorkType>(initial?.workType ?? 'E20')
  const [route, setRoute] = useState(initial?.route ?? '')
  const [unitPrice, setUnitPrice] = useState(initial?.unitPrice ?? 0)
  const [driverSalary, setDriverSalary] = useState(initial?.driverSalary ?? 0)
  const [allowance, setAllowance] = useState(initial?.allowance ?? 0)

  const clientOptions = useMemo(() => clients.map(c => ({ value: c.id, label: c.name })), [clients])
  const routeOptions = useMemo(() => routes.map(r => ({ value: r.route, label: r.route })), [routes])
  const clientName = clients.find(c => c.id === clientId)?.name ?? ''

  const handleSubmit = () => {
    if (!clientId || !route) return
    onSave({ clientId, clientName, workType, route, unitPrice, driverSalary, allowance })
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

      {/* Client */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Khách hàng</Label>
        <SheetPicker options={clientOptions} value={clientId} onChange={setClientId} placeholder="Chọn khách hàng" />
      </div>

      {/* Route */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Cung đường</Label>
        <SheetPicker options={routeOptions} value={route} onChange={setRoute} placeholder="Chọn cung đường" />
      </div>

      {/* Work type */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Loại công</Label>
        <div className="flex flex-wrap gap-1.5">
          {WORK_TYPES.map(w => (
            <button key={w} onClick={() => setWorkType(w)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors touch-manipulation"
              style={{
                background: workType === w ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                color: workType === w ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
              }}>
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Đơn giá</Label>
          <Input type="number" value={unitPrice || ''} onChange={e => setUnitPrice(Number(e.target.value))}
            placeholder="0" className="text-xs font-mono h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Lương TX</Label>
          <Input type="number" value={driverSalary || ''} onChange={e => setDriverSalary(Number(e.target.value))}
            placeholder="0" className="text-xs font-mono h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Phụ cấp</Label>
          <Input type="number" value={allowance || ''} onChange={e => setAllowance(Number(e.target.value))}
            placeholder="0" className="text-xs font-mono h-9" />
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={!clientId || !route}
        className="w-full h-10 font-bold rounded-xl text-sm"
        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
        <Check className="w-4 h-4 mr-1.5" /> {initial ? 'Lưu' : 'Thêm'}
      </Button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function PricingList() {
  const [pricings, setPricings] = useState<Pricing[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [routes, setRoutes] = useState<RoutePrice[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPricing, setEditingPricing] = useState<Pricing | undefined>()
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([getPricings(), apiClient.getClients(), apiClient.getRoutes()])
      .then(([p, c, r]) => {
        if (!cancelled) {
          if (p.success) setPricings(p.data)
          if (c.success) setClients(c.data)
          if (r.success) setRoutes(r.data)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return pricings
    const q = searchQuery.toLowerCase()
    return pricings.filter(p =>
      p.clientName.toLowerCase().includes(q) ||
      p.route.toLowerCase().includes(q) ||
      p.workType.toLowerCase().includes(q)
    )
  }, [pricings, searchQuery])

  // Group by client for display
  const grouped = useMemo(() => {
    const map = new Map<string, Pricing[]>()
    filtered.forEach(p => {
      const list = map.get(p.clientName) ?? []
      list.push(p)
      map.set(p.clientName, list)
    })
    return Array.from(map.entries())
  }, [filtered])

  const handleSave = async (data: Omit<Pricing, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingPricing) {
      const res = await updatePricing(editingPricing.id, data)
      if (res.success) {
        setPricings(prev => prev.map(p => p.id === editingPricing.id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p))
      }
    } else {
      const res = await createPricing(data)
      if (res.success) {
        setPricings(prev => [...prev, res.data])
      }
    }
    setShowForm(false)
    setEditingPricing(undefined)
  }

  const handleDelete = async (id: string) => {
    const res = await deletePricing(id)
    if (res.success) {
      setPricings(prev => prev.filter(p => p.id !== id))
    }
  }

  if (loading) {
    return <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}</div>
  }

  return (
    <div className="space-y-4">
      {/* Search + Add */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm khách hàng, cung đường..."
            className="text-xs h-9 pl-8"
          />
        </div>
        <button onClick={() => { setEditingPricing(undefined); setShowForm(true) }}
          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 touch-manipulation"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <PricingForm
          initial={editingPricing}
          clients={clients}
          routes={routes}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingPricing(undefined) }}
        />
      )}

      {/* List grouped by client */}
      {grouped.map(([clientName, items]) => (
        <div key={clientName}>
          <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--theme-text-muted)' }}>
            {clientName}
          </p>
          <div className="space-y-2">
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
  )
}
