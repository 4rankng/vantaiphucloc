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
  type Pricing,
  type PricingLine,
} from '@/data/domain'
import { PageHeader } from '@/components/shared/PageHeader'
import { ContBadge } from '@/components/shared/ContBadge'
import { InlineCell } from '@/components/shared/InlineCell'
import { CreateClientDialog } from '@/components/shared/CreateClientDialog'
import { PricingForm } from './PricingForm'
import { Plus, Pencil, Trash2, ChevronLeft, MapPin } from 'lucide-react'

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

  const clientName = clients.find(c => c.id === clientId)?.name ?? pricings[0]?.client.name ?? ''

  const grouped = useMemo(() => {
    const map = new Map<string, Pricing[]>()
    pricings.forEach(p => {
      const routeKey = `${p.pickupLocation.name} - ${p.dropoffLocation.name}`
      const list = map.get(routeKey) ?? []
      list.push(p)
      map.set(routeKey, list)
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
          clientId: pricing.client.id,
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
    setDraftLines(prev => [...prev, { quantity: 1, unitPrice: 0, driverSalary: 0, allowance: 0, _new: true }])
  }, [])

  const removeDraftLine = useCallback((idx: number) => {
    setDraftLines(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const handleCreateSave = (data: PricingCreatePayload) => {
    createPricing.mutate(data, { onSuccess: () => setShowForm(false) })
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
          {filteredGroups.map(([route, items]) => {
            const [pickup, dropoff] = route.split(' - ')

            return (
              <div key={route}>
                {/* Route header */}
                <div className="card p-4 mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} style={{ color: 'var(--theme-brand-primary)' }} />
                    <span className="typo-h2">{pickup}</span>
                    <span className="typo-body-sm">→</span>
                    <span className="typo-h2">{dropoff}</span>
                    <span
                      className="ml-auto text-xs font-semibold px-2 py-1 rounded-md"
                      style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
                    >
                      {items.length} mức
                    </span>
                  </div>
                </div>

                {/* Pricing tables for this route — one per work_type */}
                <div className="space-y-3">
                  {items.map(pricing => {
                    const isEditing = editingPricingId === pricing.id
                    const lines = isEditing ? draftLines : pricing.lines

                    // Skip if no lines and not being edited
                    if (!isEditing && lines.length === 0) return null

                    return (
                      <div
                        key={pricing.id}
                        className="card overflow-hidden"
                        style={{
                          borderColor: isEditing ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)',
                          borderWidth: isEditing ? '2px' : '1px',
                        }}
                      >
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[var(--theme-border-light)]">
                            <ContBadge type={pricing.workType} />
                            <span className="typo-label flex-1">Mức giá theo số lượng container</span>
                          </div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr>
                                <th className="px-0 py-2 text-left typo-label">SL</th>
                                <th className="px-0 py-2 text-right typo-label">Đơn giá</th>
                                <th className="px-0 py-2 text-right typo-label">Lương tài xế</th>
                                <th className="px-0 py-2 text-right typo-label">Phụ cấp</th>
                                <th className="px-0 py-2 w-10" />
                              </tr>
                            </thead>
                            <tbody>
                              {lines.map((line, lIdx) => (
                                <tr
                                  key={lIdx}
                                  style={{
                                    borderBottom: lIdx < lines.length - 1 ? '1px solid var(--theme-border-light)' : undefined,
                                    background: isEditing ? 'color-mix(in srgb, var(--theme-brand-primary) 5%, transparent)' : undefined,
                                  }}
                                >
                                  {/* Quantity */}
                                  <td className="px-0 py-3">
                                    {isEditing ? (
                                      <div className="flex items-center gap-1">
                                        {[1, 2].map(q => (
                                          <button
                                            key={q}
                                            onClick={e => { e.stopPropagation(); updateDraftLine(lIdx, 'quantity', q) }}
                                            className="px-2 py-1 rounded-md text-xs font-bold"
                                            style={{
                                              background: line.quantity === q ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                                              color: line.quantity === q ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                                            }}
                                          >
                                            ×{q}
                                          </button>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="font-mono-num">{line.quantity}</span>
                                    )}
                                  </td>

                                  {/* Unit price */}
                                  <td className="px-0 py-3 text-right">
                                    {isEditing ? (
                                      <InlineCell value={line.unitPrice} onChange={v => updateDraftLine(lIdx, 'unitPrice', v)} editing />
                                    ) : (
                                      <span className="font-mono-num font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>
                                        {formatCurrencyFull(line.unitPrice)}
                                      </span>
                                    )}
                                  </td>

                                  {/* Driver salary */}
                                  <td className="px-0 py-3 text-right">
                                    {isEditing ? (
                                      <InlineCell value={line.driverSalary} onChange={v => updateDraftLine(lIdx, 'driverSalary', v)} editing />
                                    ) : (
                                      <span className="font-mono-num">{formatCurrencyFull(line.driverSalary)}</span>
                                    )}
                                  </td>

                                  {/* Allowance */}
                                  <td className="px-0 py-3 text-right">
                                    {isEditing ? (
                                      <InlineCell value={line.allowance} onChange={v => updateDraftLine(lIdx, 'allowance', v)} editing />
                                    ) : (
                                      <span className="font-mono-num">{formatCurrencyFull(line.allowance)}</span>
                                    )}
                                  </td>

                                  {/* Row actions */}
                                  <td className="px-0 py-3 text-right">
                                    {isEditing ? (
                                      lines.length > 1 ? (
                                        <button
                                          onClick={() => removeDraftLine(lIdx)}
                                          className="p-1 rounded-md hover:bg-[var(--theme-bg-tertiary)]"
                                          style={{ color: 'var(--theme-status-error)' }}
                                          title="Xoá dòng"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      ) : null
                                    ) : (
                                      <div className="flex items-center gap-1 justify-end">
                                        <button
                                          onClick={() => startEdit(pricing)}
                                          className="p-1 rounded-md hover:bg-[var(--theme-bg-tertiary)]"
                                          style={{ color: 'var(--theme-text-muted)' }}
                                          title="Chỉnh sửa"
                                        >
                                          <Pencil size={16} />
                                        </button>
                                        <button
                                          onClick={() => deletePricing.mutate(pricing.id)}
                                          className="p-1 rounded-md hover:bg-[var(--theme-bg-tertiary)]"
                                          style={{ color: 'var(--theme-status-error)' }}
                                          title="Xoá"
                                        >
                                          <Trash2 size={16} />
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
                                    <td colSpan={3} className="px-0 py-3">
                                      <button
                                        onClick={() => addDraftLine()}
                                        className="flex items-center gap-1.5 text-xs font-medium"
                                        style={{ color: 'var(--theme-brand-primary)' }}
                                      >
                                        <Plus size={14} />
                                        Thêm dòng
                                      </button>
                                    </td>
                                    <td colSpan={2} className="px-0 py-3 text-right">
                                      <div className="flex items-center gap-2 justify-end">
                                        <button
                                          onClick={() => cancelEdit()}
                                          className="btn-secondary text-xs h-8"
                                        >
                                          Huỷ
                                        </button>
                                        <button
                                          onClick={() => saveEdit(pricing)}
                                          className="btn-primary text-xs h-8"
                                        >
                                          Lưu
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <td colSpan={5} className="px-0 py-3">
                                    <button
                                      onClick={() => { startEdit(pricing); addDraftLine() }}
                                      className="flex items-center gap-1.5 text-xs font-medium"
                                      style={{ color: 'var(--theme-text-muted)' }}
                                    >
                                      <Plus size={14} />
                                      Thêm dòng
                                    </button>
                                  </td>
                                )}
                              </tr>
                            </tbody>
                          </table>
                        </div>
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
