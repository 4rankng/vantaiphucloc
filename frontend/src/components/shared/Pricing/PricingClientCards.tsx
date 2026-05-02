import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePricings, useClients, useCreatePricing, useCreateClient } from '@/hooks/use-queries'
import type { Pricing } from '@/data/domain'
import { Button } from '@/components/ui'
import { CreateClientDialog } from '@/components/shared/CreateClientDialog'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { PricingForm } from './PricingForm'
import { Plus, ChevronRight, Tag } from 'lucide-react'

interface Props {
  /** Base path for the role, e.g. "/accountant" or "/director" */
  basePath: string
}

export function PricingClientCards({ basePath }: Props) {
  const navigate = useNavigate()
  const { data: pricings = [], isLoading } = usePricings()
  const { data: clients = [] } = useClients()
  const createPricing = useCreatePricing()
  const createClient = useCreateClient()

  const [showForm, setShowForm] = useState(false)
  const [createClientOpen, setCreateClientOpen] = useState(false)

  // Group pricings by clientId → { clientId, clientName, count, routeCount }
  const clientSummaries = useMemo(() => {
    const map = new Map<number, { clientId: number; clientName: string; pricingCount: number; routeSet: Set<string> }>()
    pricings.forEach((p: Pricing) => {
      const existing = map.get(p.clientId)
      if (existing) {
        existing.pricingCount++
        existing.routeSet.add(p.route)
      } else {
        map.set(p.clientId, {
          clientId: p.clientId,
          clientName: p.clientName,
          pricingCount: 1,
          routeSet: new Set([p.route]),
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.clientName.localeCompare(b.clientName, 'vi'))
  }, [pricings])

  const handleSave = (data: Omit<Pricing, 'id' | 'createdAt' | 'updatedAt'>) => {
    createPricing.mutate(data, {
      onSuccess: () => setShowForm(false),
    })
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showForm && (
        <PricingForm
          clients={clients}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          onCreateClient={() => setCreateClientOpen(true)}
        />
      )}

      {clientSummaries.length === 0 && !showForm ? (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có bảng giá</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clientSummaries.map(({ clientId, clientName, pricingCount, routeSet }) => (
            <button
              key={clientId}
              onClick={() => navigate(`${basePath}/pricing/${clientId}`)}
              className="text-left rounded-2xl p-4 transition-all touch-manipulation hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'var(--theme-bg-secondary)',
                border: '1px solid var(--theme-border-default)',
                boxShadow: 'var(--theme-shadow-card)',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--theme-text-primary)' }}>
                    {clientName}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                      <Tag className="w-3 h-3" />
                      {routeSet.size} cung đường
                    </span>
                    <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                      {pricingCount} mức giá
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--theme-text-muted)' }} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Desktop add button */}
      <div className="hidden lg:flex justify-end">
        <Button
          onClick={() => { setShowForm(true) }}
          className="h-9 px-4 font-semibold rounded-xl text-sm"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          <Plus className="w-4 h-4 mr-1.5" /> Thêm bảng giá
        </Button>
      </div>

      {/* Mobile FAB */}
      <FloatingActionButton
        icon={<Plus className="w-6 h-6" />}
        onClick={() => setShowForm(true)}
      />

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
