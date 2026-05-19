import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePricings, useClients, useCreatePricing, useCreateClient, type PricingCreatePayload } from '@/hooks/use-queries'
import { EmptyState } from '@/components/shared/EmptyState'
import { CreateClientDialog } from '@/components/shared/CreateClientDialog'
import { PricingForm } from './PricingForm'
import { PricingImportDialog } from './PricingImportDialog'
import { Plus, FileSpreadsheet } from 'lucide-react'

interface Props {
  basePath: string
}

export function PricingClientCards({ basePath }: Props) {
  const navigate = useNavigate()
  const { data: pricings = [], isLoading } = usePricings()
  const { data: clients = [] } = useClients()
  const createPricing = useCreatePricing()
  const createClient = useCreateClient()

  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [createClientOpen, setCreateClientOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Group pricings by clientId
  const clientSummaries = useMemo(() => {
    const map = new Map<number, { clientId: number; clientName: string; clientCode: string; pricingCount: number; routeSet: Set<string> }>()
    pricings.forEach(p => {
      const routeKey = `${p.pickupLocation.id}-${p.dropoffLocation.id}`
      const existing = map.get(p.partner.id)
      if (existing) {
        existing.pricingCount++
        existing.routeSet.add(routeKey)
      } else {
        map.set(p.partner.id, {
          clientId: p.partner.id,
          clientName: p.partner.name,
          clientCode: p.partner.code ?? '',
          pricingCount: 1,
          routeSet: new Set([routeKey]),
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.clientName.localeCompare(b.clientName, 'vi'))
  }, [pricings])

  const filtered = useMemo(() => {
    if (!search.trim()) return clientSummaries
    const q = search.toLowerCase()
    return clientSummaries.filter(s =>
      s.clientName.toLowerCase().includes(q) || s.clientCode.toLowerCase().includes(q)
    )
  }, [clientSummaries, search])

  const handleSave = (data: PricingCreatePayload) => {
    createPricing.mutate(data)
  }

  const handleSaveComplete = () => {
    setShowForm(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" disabled>
            <FileSpreadsheet size={16} /> <span className="hidden sm:inline">Nạp Excel</span>
          </button>
          <button className="btn-primary" disabled>
            <Plus size={16} /> <span className="hidden sm:inline">Thêm bảng giá</span>
          </button>
        </div>
        <div className="h-64 rounded-lg animate-pulse skeleton-shimmer" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 justify-end">
        {clientSummaries.length > 0 && (
          <input
            type="text"
            placeholder="Tìm khách hàng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-pill flex-1 max-w-xs"
          />
        )}
        <button onClick={() => setShowImport(true)} className="btn-secondary shrink-0">
          <FileSpreadsheet size={16} strokeWidth={2.25} /> <span className="hidden sm:inline">Nạp Excel</span>
        </button>
        <button onClick={() => setShowForm(true)} className="btn-primary shrink-0">
          <Plus size={16} strokeWidth={2.25} /> <span className="hidden sm:inline">Thêm mức giá</span>
        </button>
      </div>

      {showForm && (
        <PricingForm
          clients={clients}
          onSave={handleSave}
          onSaveComplete={handleSaveComplete}
          onCancel={() => setShowForm(false)}
          onCreateClient={() => setCreateClientOpen(true)}
        />
      )}

      {showImport && (
        <PricingImportDialog
          open={showImport}
          onClose={() => setShowImport(false)}
          clients={clients}
        />
      )}

      {clientSummaries.length === 0 && !showForm ? (
        <div className="card p-8">
          <EmptyState
            icon={<img src="/illustrations/empty-pricing.svg" alt="" className="h-28 w-auto" />}
            title="Chưa có bảng giá"
            description="Tạo bảng giá đầu tiên để bắt đầu quản lý giá cước."
            illustration
            action={
              <button onClick={() => setShowForm(true)} className="btn-primary">
                <Plus size={16} />
                Tạo bảng giá mới
              </button>
            }
          />
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden border"
          style={{ borderColor: 'var(--theme-border-default)' }}
        >
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--theme-bg-secondary)' }}>
                <th className="text-left text-[11px] font-bold uppercase tracking-wider px-4 py-3" style={{ color: 'var(--theme-text-muted)' }}>
                  Khách hàng
                </th>
                <th className="text-center text-[11px] font-bold uppercase tracking-wider px-4 py-3" style={{ color: 'var(--theme-text-muted)' }}>
                  Cung đường
                </th>
                <th className="text-center text-[11px] font-bold uppercase tracking-wider px-4 py-3" style={{ color: 'var(--theme-text-muted)' }}>
                  Mức giá
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ clientId, clientName, clientCode, pricingCount, routeSet }, idx) => (
                <tr
                  key={clientId}
                  onClick={() => navigate(`${basePath}/pricing/${clientId}`)}
                  className="cursor-pointer transition-colors"
                  style={{
                    background: idx % 2 === 0 ? 'var(--theme-bg-primary)' : 'var(--theme-bg-secondary)',
                    borderTop: '1px solid var(--theme-border-light)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--theme-bg-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'var(--theme-bg-primary)' : 'var(--theme-bg-secondary)')}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)',
                          color: 'var(--theme-brand-primary)',
                        }}
                      >
                        {(clientCode || clientName).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
                          {clientName}
                        </p>
                        {clientCode && (
                          <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>{clientCode}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
                      {routeSet.size}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono-num tabular-nums" style={{ color: 'var(--theme-text-secondary)' }}>
                      {pricingCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
