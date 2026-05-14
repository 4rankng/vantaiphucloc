import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  usePricings,
  useClients,
  useCreatePricing,
  useUpdatePricing,
  useDeletePricing,
  useCreateClient,
  type PricingCreatePayload,
} from '@/hooks/use-queries'
import {
  formatCurrencyFull,
  OPERATION_TYPE_LABELS,
  type OperationType,
  type Pricing,
  type PricingLine,
  type WorkType,
} from '@/data/domain'
import { PageHeader } from '@/components/shared/PageHeader'
import { ContBadge } from '@/components/shared/ContBadge'
import { InlineCell } from '@/components/shared/InlineCell'
import { CreateClientDialog } from '@/components/shared/CreateClientDialog'
import { fuzzyMatch } from '@/lib/search-utils'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PricingForm } from './PricingForm'
import { Plus, Pencil, Trash2, ChevronLeft, MapPin } from 'lucide-react'

/** Grid order: full containers first, then empty */
const GRID_ORDER: WorkType[] = ['F20', 'F40', 'E20', 'E40']
const WORK_TYPE_LABELS: Record<WorkType, string> = {
  F20: 'Hàng 20ft',
  F40: 'Hàng 40ft',
  E20: 'Rỗng 20ft',
  E40: 'Rỗng 40ft',
}

interface Props {
  clientId: number
  basePath: string
}

type DraftLine = PricingLine

export function PricingClientDetail({ clientId, basePath }: Props) {
  const navigate = useNavigate()
  const { data: pricings = [], isLoading } = usePricings({ clientId })
  const { data: clients = [] } = useClients()
  const createPricing = useCreatePricing()
  const updatePricing = useUpdatePricing()
  const deletePricing = useDeletePricing()
  const createClient = useCreateClient()

  const [showForm, setShowForm] = useState(false)
  const [editingPricingId, setEditingPricingId] = useState<number | null>(null)
  const [draftLines, setDraftLines] = useState<DraftLine[]>([])
  const [createClientOpen, setCreateClientOpen] = useState(false)
  const [routeSearch, setRouteSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; desc: string } | null>(null)

  const clientName = clients.find(c => c.id === clientId)?.name ?? pricings[0]?.partner.name ?? ''

  // Group by route+shipper+op key, then build a map of workType -> Pricing per group
  const grouped = useMemo(() => {
    const map = new Map<string, { route: string; shipperPartnerId: number | null; operationType: OperationType | null; workTypeMap: Map<WorkType, Pricing> }>()
    pricings.forEach(p => {
      const shipperId = p.shipperPartnerId ?? null
      const opType = (p.operationType ?? null) as OperationType | null
      const groupKey = `${p.pickupLocation.name}|${p.dropoffLocation.name}|${shipperId ?? ''}|${opType ?? ''}`
      if (!map.has(groupKey)) {
        map.set(groupKey, {
          route: `${p.pickupLocation.name} - ${p.dropoffLocation.name}`,
          shipperPartnerId: shipperId,
          operationType: opType,
          workTypeMap: new Map(),
        })
      }
      map.get(groupKey)!.workTypeMap.set(p.workType, p)
    })
    return Array.from(map.entries())
  }, [pricings])

  const filteredGroups = useMemo(() => {
    if (!routeSearch.trim()) return grouped
    const q = routeSearch
    return grouped.filter(([, g]) => fuzzyMatch(g.route, q))
  }, [grouped, routeSearch])

  const startEdit = useCallback((pricing: Pricing) => {
    setEditingPricingId(pricing.id)
    setDraftLines(pricing.lines.map(l => ({ ...l })))
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingPricingId(null)
    setDraftLines([])
  }, [])

  const saveEdit = useCallback((pricing: Pricing) => {
    const cleanLines = draftLines.map((rest) => rest)
    updatePricing.mutate(
      {
        id: pricing.id,
        data: {
          clientId: pricing.partner.id,
          workType: pricing.workType,
          pickupLocationId: pricing.pickupLocation.id,
          dropoffLocationId: pricing.dropoffLocation.id,
          lines: cleanLines,
        },
      },
      { onSuccess: () => cancelEdit() },
    )
  }, [draftLines, updatePricing, cancelEdit])

  const updateDraftLine = useCallback((idx: number, field: keyof PricingLine, value: number) => {
    setDraftLines(prev => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }, [])

  const addDraftLine = useCallback(() => {
    setDraftLines(prev => [...prev, { quantity: 1, unitPrice: 0, driverSalary: 0, allowance: 0 }])
  }, [])

  const removeDraftLine = useCallback((idx: number) => {
    setDraftLines(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const handleCreateSave = (data: PricingCreatePayload) => {
    createPricing.mutate(data)
  }

  const handleCreateComplete = () => {
    setShowForm(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Bảng giá" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-lg animate-pulse skeleton-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={clientName}
        breadcrumbs={
          <button
            onClick={() => navigate(`${basePath}/pricing`)}
            className="flex items-center gap-1 text-sm"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            <ChevronLeft size={14} /> Quay lại
          </button>
        }
        onAdd={() => setShowForm(true)}
        addLabel="Thêm mức giá"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deletePricing.mutate(deleteTarget.id)
          setDeleteTarget(null)
        }}
        title="Xoá mức giá?"
        description={deleteTarget ? `Sẽ xoá: ${deleteTarget.desc}. Hành động này không thể hoàn tác.` : ''}
        confirmLabel="Xoá"
      />

      {showForm && (
        <PricingForm
          clients={clients}
          lockedClientId={clientId}
          onSave={handleCreateSave}
          onSaveComplete={handleCreateComplete}
          onCancel={() => setShowForm(false)}
          onCreateClient={() => setCreateClientOpen(true)}
        />
      )}

      {grouped.length > 0 && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Tìm kiếm cung đường..."
            value={routeSearch}
            onChange={e => setRouteSearch(e.target.value)}
            className="search-pill flex-1"
          />
        </div>
      )}

      {filteredGroups.length === 0 && !showForm ? (
        <div className="card p-8">
          <div className="text-center">
            <p className="typo-body-sm" style={{ color: 'var(--theme-text-muted)' }}>
              {grouped.length === 0 ? 'Chưa có bảng giá cho khách hàng này' : 'Không tìm thấy cung đường'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map(([groupKey, { route, shipperPartnerId, operationType, workTypeMap }]) => {
            const [pickup, dropoff] = route.split(' - ')
            const totalLines = Array.from(workTypeMap.values()).reduce((sum, p) => sum + p.lines.length, 0)
            const editingPricing = editingPricingId
              ? workTypeMap.get(
                  Array.from(workTypeMap.keys()).find(wt => workTypeMap.get(wt)?.id === editingPricingId) ?? 'F20'
                ) ?? null
              : null

            return (
              <div key={groupKey}>
                {/* Route header */}
                <div className="card p-4 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <MapPin size={16} style={{ color: 'var(--theme-brand-primary)' }} />
                    <span className="typo-h2">{pickup}</span>
                    <span className="typo-body-sm">→</span>
                    <span className="typo-h2">{dropoff}</span>
                    {operationType && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-md"
                        style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)', color: 'var(--theme-brand-primary)' }}
                      >
                        {OPERATION_TYPE_LABELS[operationType] ?? operationType}
                      </span>
                    )}
                    {shipperPartnerId && (
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-md"
                        style={{ background: 'color-mix(in srgb, var(--theme-status-warning) 10%, transparent)', color: 'var(--theme-status-warning)' }}
                      >
                        Chủ hàng #{shipperPartnerId}
                      </span>
                    )}
                    <span
                      className="ml-auto text-xs font-semibold px-2 py-1 rounded-md"
                      style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
                    >
                      {totalLines} mức
                    </span>
                  </div>
                </div>

                {/* 2x2 grid of work types */}
                <div
                  className="grid grid-cols-2 gap-px"
                  style={{ background: 'var(--theme-border-light)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}
                >
                  {GRID_ORDER.map(wt => {
                    const pricing = workTypeMap.get(wt)
                    const isEditing = editingPricingId === pricing?.id
                    const lines = isEditing ? draftLines : (pricing?.lines ?? [])

                    return (
                      <div
                        key={wt}
                        className="p-4"
                        style={{
                          background: isEditing
                            ? 'color-mix(in srgb, var(--theme-brand-primary) 5%, var(--theme-bg-primary))'
                            : 'var(--theme-bg-primary)',
                        }}
                      >
                        {/* Work type header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <ContBadge type={wt} />
                            <span className="typo-body-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
                              {WORK_TYPE_LABELS[wt]}
                            </span>
                          </div>
                          {pricing && (
                            <div className="flex items-center gap-1">
                              {!isEditing && (
                                <>
                                  <button
                                    onClick={() => startEdit(pricing)}
                                    className="p-1 rounded-md hover:bg-[var(--theme-bg-tertiary)]"
                                    style={{ color: 'var(--theme-text-muted)' }}
                                    title="Chỉnh sửa"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteTarget({
                                      id: pricing.id,
                                      desc: `${wt} · ${pickup} → ${dropoff}`,
                                    })}
                                    className="p-1 rounded-md hover:bg-[var(--theme-bg-tertiary)]"
                                    style={{ color: 'var(--theme-status-error)' }}
                                    title="Xoá"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Lines */}
                        {pricing ? (
                          <div className="space-y-2">
                            {lines.map((line, lIdx) => (
                              <div key={lIdx}>
                                {/* Quantity badge row */}
                                <div className="flex items-center gap-2 mb-1.5">
                                  {isEditing ? (
                                    <div className="flex items-center gap-1">
                                      {[1, 2].map(q => (
                                        <button
                                          key={q}
                                          onClick={() => updateDraftLine(lIdx, 'quantity', q)}
                                          className="px-2 py-0.5 rounded text-xs font-bold"
                                          style={{
                                            background: line.quantity === q ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                                            color: line.quantity === q ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                                          }}
                                        >
                                          x{q}
                                        </button>
                                      ))}
                                      {lines.length > 1 && (
                                        <button
                                          onClick={() => removeDraftLine(lIdx)}
                                          className="p-0.5 rounded hover:bg-[var(--theme-bg-tertiary)]"
                                          style={{ color: 'var(--theme-status-error)' }}
                                          title="Xoá dòng"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    lines.length > 1 && (
                                      <span className="text-xs font-mono-num" style={{ color: 'var(--theme-text-muted)' }}>
                                        x{line.quantity}
                                      </span>
                                    )
                                  )}
                                </div>

                                {/* Price fields */}
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <div className="typo-label mb-0.5" style={{ fontSize: '10px' }}>Đơn giá</div>
                                    {isEditing ? (
                                      <InlineCell value={line.unitPrice} onChange={v => updateDraftLine(lIdx, 'unitPrice', v)} editing />
                                    ) : (
                                      <span className="font-mono-num font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>
                                        {formatCurrencyFull(line.unitPrice)}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="typo-label mb-0.5" style={{ fontSize: '10px' }}>Lương TX</div>
                                    {isEditing ? (
                                      <InlineCell value={line.driverSalary} onChange={v => updateDraftLine(lIdx, 'driverSalary', v)} editing />
                                    ) : (
                                      <span className="font-mono-num">{formatCurrencyFull(line.driverSalary)}</span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="typo-label mb-0.5" style={{ fontSize: '10px' }}>Phụ cấp</div>
                                    {isEditing ? (
                                      <InlineCell value={line.allowance} onChange={v => updateDraftLine(lIdx, 'allowance', v)} editing />
                                    ) : (
                                      <span className="font-mono-num">{formatCurrencyFull(line.allowance)}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* Edit actions */}
                            {isEditing && (
                              <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
                                <button
                                  onClick={() => addDraftLine()}
                                  className="flex items-center gap-1 text-xs font-medium"
                                  style={{ color: 'var(--theme-brand-primary)' }}
                                >
                                  <Plus size={12} />
                                  Thêm dòng
                                </button>
                                <div className="flex gap-1 ml-auto">
                                  <button onClick={() => cancelEdit()} className="btn-secondary text-xs h-7">Huỷ</button>
                                  <button onClick={() => editingPricing && saveEdit(editingPricing)} className="btn-primary text-xs h-7">Lưu</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs py-2" style={{ color: 'var(--theme-text-muted)' }}>
                            Chưa có giá
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
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
