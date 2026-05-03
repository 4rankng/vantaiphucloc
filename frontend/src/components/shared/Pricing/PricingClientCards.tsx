import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePricings, useClients, useCreatePricing, useCreateClient } from '@/hooks/use-queries'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Pricing } from '@/data/domain'
import { CreateClientDialog } from '@/components/shared/CreateClientDialog'
import { PricingForm } from './PricingForm'
import { Plus, Tag } from 'lucide-react'

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
      <div className="space-y-4">
        <PageHeader
          title="Bảng giá"
          onAdd={() => setShowForm(true)}
          addLabel="Thêm bảng giá"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 rounded-lg animate-pulse skeleton-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảng giá"
        onAdd={() => setShowForm(true)}
        addLabel="Thêm bảng giá"
      />

      {showForm && (
        <PricingForm
          clients={clients}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          onCreateClient={() => setCreateClientOpen(true)}
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
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary"
              >
                <Plus size={16} />
                Tạo bảng giá mới
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientSummaries.map(({ clientId, clientName, pricingCount, routeSet }) => (
            <button
              key={clientId}
              onClick={() => navigate(`${basePath}/pricing/${clientId}`)}
              className="card-interactive p-4 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="typo-h2 truncate">{clientName}</h3>
                  <div className="flex flex-col gap-2 mt-3">
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--theme-text-secondary)' }}>
                      <Tag size={14} />
                      <span>{routeSet.size} cung đường</span>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                      {pricingCount} mức giá
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
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
