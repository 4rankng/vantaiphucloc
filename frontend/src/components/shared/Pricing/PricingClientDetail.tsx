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
  type Pricing,
  type PricingLine,
} from '@/data/domain'
import { ContBadge } from '@/components/shared/ContBadge'
import { InlineCell } from '@/components/shared/InlineCell'
import { SearchBar } from '@/components/shared/SearchBar'
import { CreateClientDialog } from '@/components/shared/CreateClientDialog'
import { PricingForm } from './PricingForm'
import { Plus, Pencil, Trash2, ArrowLeft, MapPin } from 'lucide-react'

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
  const [routeSearch, setRouteSearch] = useState('')

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

  const filteredGroups = useMemo(() => {
    if (!routeSearch.trim()) return grouped
    const q = routeSearch.toLowerCase()
    return grouped.filter(([route]) => route.toLowerCase().includes(q))
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
    const cleanLines = draftLines.map(({ _new, ...rest }) => rest)
    updatePricing.mutate(
      {
        id: pricing.id,
        data: {
          clientId: pricing.clientId,
          clientName: pricing.clientName,
          workType: pricing.workType,
          route: pricing.route,
          pickupLocation: pricing.pickupLocation,
          dropoffLocation: pricing.dropoffLocation,
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
    setDraftLines(prev => [...prev, { quantity: 1, unitPrice: 0, driverSalary: 0, allowance: 0, _new: true }])
  }, [])

  const removeDraftLine = useCallback((idx: number) => {
    setDraftLines(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const handleCreateSave = (data: Omit<Pricing, 'id' | 'createdAt' | 'updatedAt'>) => {
    createPricing.mutate(data, { onSuccess: () => setShowForm(false) })
  }

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
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(`${basePath}/pricing`)}
          className="p-1.5 rounded-lg touch-manipulation hover:bg-[var(--theme-bg-tertiary)] transition-colors"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-semibold flex-1" style={{ color: 'var(--theme-text-primary)' }}>{clientName}</p>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold touch-manipulation transition-colors"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm
        </button>
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

      {grouped.length > 0 && (
        <SearchBar
          placeholder="Tìm kiếm cung đường..."
          value={routeSearch}
          onChange={setRouteSearch}
        />
      )}

      {filteredGroups.length === 0 && !showForm ? (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            {grouped.length === 0 ? 'Chưa có bảng giá cho khách hàng này' : 'Không tìm thấy cung đường'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredGroups.map(([route, items]) => {
            const [pickup, dropoff] = route.split(' - ')

            return (
              <div key={route}>
                {/* Route header */}
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-t-xl"
                  style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)', borderBottom: 'none' }}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--theme-brand-primary)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>{pickup}</span>
                  <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>→</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--theme-text-primary)' }}>{dropoff}</span>
                  <span
                    className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
                  >
                    {items.length} mức giá
                  </span>
                </div>

                {/* Pricing tables for this route — one per work_type */}
                <div className="space-y-2">
                  {items.map(pricing => {
                    const isEditing = editingPricingId === pricing.id
                    const lines = isEditing ? draftLines : pricing.lines

                    // Skip if no lines and not being edited
                    if (!isEditing && lines.length === 0) return null

                    return (
                      <div
                        key={pricing.id}
                        className="overflow-x-auto"
                        style={{
                          background: 'var(--theme-bg-secondary)',
                          border: isEditing
                            ? '2px solid var(--theme-brand-primary)'
                            : '1px solid var(--theme-border-default)',
                          borderRadius: '0 0 0.75rem 0.75rem',
                        }}
                      >
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ background: 'var(--theme-bg-tertiary)' }}>
                              <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
                                <ContBadge type={pricing.workType} />
                              </th>
                              <th className="px-3 py-2 text-center font-semibold w-16" style={{ color: 'var(--theme-text-muted)' }}>SL</th>
                              <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Đơn giá</th>
                              <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Lương tài</th>
                              <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Phụ cấp</th>
                              <th className="px-2 py-2 w-16" />
                            </tr>
                          </thead>
                          <tbody>
                            {lines.map((line, lIdx) => (
                              <tr
                                key={lIdx}
                                style={{
                                  borderBottom: lIdx < lines.length - 1 ? '1px solid var(--theme-border-light)' : undefined,
                                  background: isEditing ? 'rgba(0, 150, 62, 0.03)' : undefined,
                                }}
                              >
                                {/* Work type label (read-only — from parent pricing) */}
                                <td className="px-3 py-2.5">
                                  <ContBadge type={pricing.workType} />
                                </td>

                                {/* Quantity */}
                                <td className="px-3 py-2.5 text-center">
                                  {isEditing ? (
                                    <div className="flex items-center gap-0.5 justify-center">
                                      {[1, 2].map(q => (
                                        <button
                                          key={q}
                                          onClick={e => { e.stopPropagation(); updateDraftLine(lIdx, 'quantity', q) }}
                                          className="px-1.5 py-0.5 rounded text-xs font-bold touch-manipulation"
                                          style={{
                                            background: line.quantity === q ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                                            color: line.quantity === q ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                                          }}
                                        >
                                          ×{q}
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
                                      {line.quantity}
                                    </span>
                                  )}
                                </td>

                                {/* Unit price */}
                                <td className="px-3 py-2.5 text-right">
                                  {isEditing ? (
                                    <InlineCell value={line.unitPrice} onChange={v => updateDraftLine(lIdx, 'unitPrice', v)} editing />
                                  ) : (
                                    <span className="tabular-nums font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>
                                      {formatCurrencyFull(line.unitPrice)}
                                    </span>
                                  )}
                                </td>

                                {/* Driver salary */}
                                <td className="px-3 py-2.5 text-right">
                                  {isEditing ? (
                                    <InlineCell value={line.driverSalary} onChange={v => updateDraftLine(lIdx, 'driverSalary', v)} editing />
                                  ) : (
                                    <span className="tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
                                      {formatCurrencyFull(line.driverSalary)}
                                    </span>
                                  )}
                                </td>

                                {/* Allowance */}
                                <td className="px-3 py-2.5 text-right">
                                  {isEditing ? (
                                    <InlineCell value={line.allowance} onChange={v => updateDraftLine(lIdx, 'allowance', v)} editing />
                                  ) : (
                                    <span className="tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>
                                      {formatCurrencyFull(line.allowance)}
                                    </span>
                                  )}
                                </td>

                                {/* Row actions */}
                                <td className="px-2 py-2.5 text-right">
                                  {isEditing ? (
                                    lines.length > 1 ? (
                                      <button
                                        onClick={() => removeDraftLine(lIdx)}
                                        className="p-1 rounded touch-manipulation"
                                        style={{ color: 'var(--theme-status-error)' }}
                                        title="Xoá dòng"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <span className="w-6 inline-block" />
                                    )
                                  ) : (
                                    <div className="flex items-center gap-0.5 justify-end">
                                      <button
                                        onClick={() => startEdit(pricing)}
                                        className="p-1 rounded touch-manipulation"
                                        style={{ color: 'var(--theme-text-muted)' }}
                                        title="Chỉnh sửa"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => deletePricing.mutate(pricing.id)}
                                        className="p-1 rounded touch-manipulation"
                                        style={{ color: 'var(--theme-status-error)' }}
                                        title="Xoá"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}

                            {/* Add row / Save-Cancel row */}
                            <tr style={{ borderTop: '1px solid var(--theme-border-light)' }}>
                              {isEditing ? (
                                <>
                                  <td colSpan={4} className="px-3 py-1.5">
                                    <button
                                      onClick={() => addDraftLine()}
                                      className="flex items-center gap-1 p-1 rounded-lg touch-manipulation text-xs"
                                      style={{ color: 'var(--theme-brand-primary)' }}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Thêm dòng</span>
                                    </button>
                                  </td>
                                  <td colSpan={2} className="px-2 py-1.5 text-right">
                                    <div className="flex items-center gap-1 justify-end">
                                      <button
                                        onClick={() => cancelEdit()}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold touch-manipulation"
                                        style={{ color: 'var(--theme-text-muted)', background: 'var(--theme-bg-tertiary)' }}
                                      >
                                        Huỷ
                                      </button>
                                      <button
                                        onClick={() => saveEdit(pricing)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold touch-manipulation"
                                        style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
                                      >
                                        Lưu
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <td colSpan={6} className="px-3 py-1.5">
                                  <button
                                    onClick={() => { startEdit(pricing); addDraftLine() }}
                                    className="flex items-center gap-1 p-1 rounded-lg touch-manipulation text-xs"
                                    style={{ color: 'var(--theme-text-muted)' }}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Thêm dòng</span>
                                  </button>
                                </td>
                              )}
                            </tr>
                          </tbody>
                        </table>
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
