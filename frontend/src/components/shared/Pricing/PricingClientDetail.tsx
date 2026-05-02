import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  usePricings,
  useClients,
  useCreatePricing,
  useUpdatePricing,
  useDeletePricing,
  useCreateClient,
} from '@/hooks/use-queries'
import {
  formatCurrencyFull,
  WORK_TYPES,
  type Pricing,
  type PricingLine,
  type WorkType,
} from '@/data/domain'
import { ContBadge } from '@/components/shared/ContBadge'
import { InlineCell } from '@/components/shared/InlineCell'
import { CreateClientDialog } from '@/components/shared/CreateClientDialog'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { PricingForm } from './PricingForm'
import { Plus, Pencil, Trash2, ArrowLeft, Check, X } from 'lucide-react'

interface Props {
  clientId: number
  basePath: string
}

type DraftLine = PricingLine & { _new?: boolean }

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

  const clientName = clients.find(c => c.id === clientId)?.name ?? pricings[0]?.clientName ?? ''

  const grouped = useMemo(() => {
    const map = new Map<string, Pricing[]>()
    pricings.forEach(p => {
      const list = map.get(p.route) ?? []
      list.push(p)
      map.set(p.route, list)
    })
    return Array.from(map.entries())
  }, [pricings])

  const startEdit = useCallback((pricing: Pricing) => {
    setEditingPricingId(pricing.id)
    setDraftLines(pricing.lines.map(l => ({ ...l })))
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingPricingId(null)
    setDraftLines([])
  }, [])

  const saveEdit = useCallback((pricing: Pricing) => {
    const cleanLines = draftLines.map(({ _new, ...rest }) => rest)
    updatePricing.mutate(
      {
        id: pricing.id,
        data: {
          clientId: pricing.clientId,
          clientName: pricing.clientName,
          route: pricing.route,
          pickupLocation: pricing.pickupLocation,
          dropoffLocation: pricing.dropoffLocation,
          lines: cleanLines,
          unitPrice: cleanLines[0]?.unitPrice ?? pricing.unitPrice,
          driverSalary: cleanLines[0]?.driverSalary ?? pricing.driverSalary,
          allowance: cleanLines[0]?.allowance ?? pricing.allowance,
          workType: cleanLines[0]?.workType ?? pricing.workType,
        },
      },
      { onSuccess: () => cancelEdit() },
    )
  }, [draftLines, updatePricing, cancelEdit])

  const updateDraftLine = useCallback((idx: number, field: keyof PricingLine, value: WorkType | number) => {
    setDraftLines(prev => {
      const updated = prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l))
      if (field === 'workType' && typeof value === 'string' && value.endsWith('40')) {
        updated[idx] = { ...updated[idx], quantity: 1 }
      }
      return updated
    })
  }, [])

  const addDraftLine = useCallback(() => {
    setDraftLines(prev => [...prev, { workType: 'E20' as WorkType, quantity: 1, unitPrice: 0, driverSalary: 0, allowance: 0, _new: true }])
  }, [])

  const removeDraftLine = useCallback((idx: number) => {
    setDraftLines(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const handleCreateSave = (data: Omit<Pricing, 'id' | 'createdAt' | 'updatedAt'>) => {
    createPricing.mutate(data, { onSuccess: () => setShowForm(false) })
  }

  const is40ft = (wt: WorkType) => wt === 'E40' || wt === 'F40'

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Desktop back button — mobile gets it from AppShell topbar */}
      <div className="hidden lg:flex items-center gap-2">
        <button
          onClick={() => navigate(`${basePath}/pricing`)}
          className="p-1.5 rounded-lg touch-manipulation hover:bg-[var(--theme-bg-tertiary)] transition-colors"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-muted)' }}>{clientName}</p>
      </div>

      {showForm && (
        <PricingForm
          clients={clients}
          lockedClientId={clientId}
          onSave={handleCreateSave}
          onCancel={() => setShowForm(false)}
          onCreateClient={() => setCreateClientOpen(true)}
        />
      )}

      {grouped.length === 0 && !showForm ? (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chưa có bảng giá cho khách hàng này</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {grouped.map(([route, items]) => {
            const [pickup, dropoff] = route.split(' - ')

            return (
              <div key={route} className="flex flex-col gap-2">
                {/* Route header */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold truncate" style={{ color: 'var(--theme-text-muted)' }}>
                    {pickup}
                  </span>
                  <span className="text-xs shrink-0" style={{ color: 'var(--theme-text-muted)' }}>→</span>
                  <span className="text-xs font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
                    {dropoff}
                  </span>
                </div>

                {items.map(pricing => {
                  const isEditing = editingPricingId === pricing.id
                  const lines = isEditing ? draftLines : pricing.lines

                  return (
                    <div
                      key={pricing.id}
                      className="overflow-x-auto rounded-xl"
                      style={{
                        background: 'var(--theme-bg-secondary)',
                        border: isEditing
                          ? '2px solid var(--theme-brand-primary)'
                          : '1px solid var(--theme-border-default)',
                      }}
                    >
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ background: 'var(--theme-bg-tertiary)' }}>
                            <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Loại cont</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>SL</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Đơn giá</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Lương tài</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Phụ cấp</th>
                            <th className="px-2 py-2 w-10" />
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map((line, lIdx) => (
                            <tr
                              key={lIdx}
                              className={isEditing ? undefined : 'cursor-pointer'}
                              style={{ borderBottom: lIdx < lines.length - 1 ? '1px solid var(--theme-border-light)' : undefined }}
                              onClick={!isEditing ? () => startEdit(pricing) : undefined}
                            >
                              {/* Work type */}
                              <td className="px-3 py-2">
                                {isEditing ? (
                                  <div className="flex gap-0.5">
                                    {WORK_TYPES.map(w => (
                                      <button
                                        key={w}
                                        onClick={e => { e.stopPropagation(); updateDraftLine(lIdx, 'workType', w) }}
                                        className="px-1.5 py-1 rounded text-xs font-bold touch-manipulation"
                                        style={{
                                          background: line.workType === w ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                                          color: line.workType === w ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                                        }}
                                      >
                                        {w}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <ContBadge type={line.workType} />
                                )}
                              </td>

                              {/* Quantity */}
                              <td className="px-3 py-2 text-xs text-right">
                                {isEditing ? (
                                  <div className="flex items-center gap-1 justify-end">
                                    {is40ft(line.workType) ? (
                                      <button
                                        className="px-2 py-1 rounded text-xs font-bold"
                                        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
                                      >
                                        ×1
                                      </button>
                                    ) : (
                                      [1, 2].map(q => (
                                        <button
                                          key={q}
                                          onClick={e => { e.stopPropagation(); updateDraftLine(lIdx, 'quantity', q) }}
                                          className="px-2 py-1 rounded text-xs font-bold touch-manipulation"
                                          style={{
                                            background: line.quantity === q ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                                            color: line.quantity === q ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                                          }}
                                        >
                                          ×{q}
                                        </button>
                                      ))
                                    )}
                                  </div>
                                ) : (
                                  <span className="tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
                                    {line.quantity}
                                  </span>
                                )}
                              </td>

                              {/* Unit price */}
                              <td className="px-3 py-2 text-xs text-right">
                                {isEditing ? (
                                  <InlineCell
                                    value={line.unitPrice}
                                    onChange={v => updateDraftLine(lIdx, 'unitPrice', v)}
                                    editing
                                  />
                                ) : (
                                  <span className="tabular-nums font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>
                                    {formatCurrencyFull(line.unitPrice)}
                                  </span>
                                )}
                              </td>

                              {/* Driver salary */}
                              <td className="px-3 py-2 text-xs text-right">
                                {isEditing ? (
                                  <InlineCell
                                    value={line.driverSalary}
                                    onChange={v => updateDraftLine(lIdx, 'driverSalary', v)}
                                    editing
                                  />
                                ) : (
                                  <span className="tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
                                    {formatCurrencyFull(line.driverSalary)}
                                  </span>
                                )}
                              </td>

                              {/* Allowance */}
                              <td className="px-3 py-2 text-xs text-right">
                                {isEditing ? (
                                  <InlineCell
                                    value={line.allowance}
                                    onChange={v => updateDraftLine(lIdx, 'allowance', v)}
                                    editing
                                  />
                                ) : (
                                  <span className="tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
                                    {formatCurrencyFull(line.allowance)}
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              {lIdx === 0 && (
                                <td rowSpan={lines.length} className="px-2 py-2">
                                  {isEditing ? (
                                    <div className="flex items-center gap-0.5">
                                      <button
                                        onClick={e => { e.stopPropagation(); saveEdit(pricing) }}
                                        className="p-1 rounded-md touch-manipulation"
                                        style={{ color: 'var(--theme-brand-primary)' }}
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={e => { e.stopPropagation(); cancelEdit() }}
                                        className="p-1 rounded-md touch-manipulation"
                                        style={{ color: 'var(--theme-text-muted)' }}
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={e => { e.stopPropagation(); addDraftLine() }}
                                        className="p-1 rounded-md touch-manipulation"
                                        style={{ color: 'var(--theme-text-muted)' }}
                                        title="Thêm dòng"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                      {lines.length > 1 && (
                                        <button
                                          onClick={e => { e.stopPropagation(); removeDraftLine(lines.length - 1) }}
                                          className="p-1 rounded-md touch-manipulation"
                                          style={{ color: 'var(--theme-status-error)' }}
                                          title="Xoá dòng cuối"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-0.5">
                                      <button
                                        onClick={e => { e.stopPropagation(); startEdit(pricing) }}
                                        className="p-1 rounded-md touch-manipulation"
                                        style={{ color: 'var(--theme-text-muted)' }}
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={e => { e.stopPropagation(); deletePricing.mutate(pricing.id) }}
                                        className="p-1 rounded-md touch-manipulation"
                                        style={{ color: 'var(--theme-status-error)' }}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* FAB — add new pricing for this client */}
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
