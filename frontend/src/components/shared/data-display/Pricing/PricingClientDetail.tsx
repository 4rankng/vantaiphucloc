import { useMemo, useState, useCallback, Fragment } from 'react'
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
  type ContType,
} from '@/data/domain'
import { PageHeader } from '@/components/shared/layouts/PageHeader'
import { InlineCell } from '@/components/shared/forms/InlineCell'
import { CreateClientDialog } from '@/components/shared/overlays/CreateClientDialog'
import { fuzzyMatch } from '@/lib/search-utils'
import { ConfirmDialog } from '@/components/shared/overlays/ConfirmDialog'
import { PricingForm } from './PricingForm'
import { Plus, Pencil, Trash2, ChevronLeft, X, Check } from 'lucide-react'

/** Column order for the table */
const COL_ORDER: ContType[] = ['F20', 'F40', 'E20', 'E40']

interface Props {
  clientId: number
  basePath: string
}

type DraftLine = PricingLine

/** Extract the display price for a work-type column */
function cellPrice(pricing: Pricing | undefined): string {
  if (!pricing || pricing.lines.length === 0) return '—'
  const first = pricing.lines[0]
  return formatCurrencyFull(first.unitPrice)
}

export function PricingClientDetail({ clientId, basePath }: Props) {
  const navigate = useNavigate()
  const { data: pricings = [], isLoading } = usePricings({ clientId })
  const { data: clients = [] } = useClients()
  const createPricing = useCreatePricing()
  const updatePricing = useUpdatePricing()
  const deletePricing = useDeletePricing()
  const createClient = useCreateClient()

  const [showForm, setShowForm] = useState(false)
  const [createClientOpen, setCreateClientOpen] = useState(false)
  const [routeSearch, setRouteSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; desc: string } | null>(null)

  // Inline editing: keyed by pricing.id
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draftLines, setDraftLines] = useState<DraftLine[]>([])

  // Group by route, build workType map
  const grouped = useMemo(() => {
    const map = new Map<string, {
      pickup: string
      dropoff: string
      workTypeMap: Map<ContType, Pricing>
    }>()
    pricings.forEach(p => {
      const groupKey = `${p.pickupLocation.name}|${p.dropoffLocation.name}`
      if (!map.has(groupKey)) {
        map.set(groupKey, {
          pickup: p.pickupLocation.name,
          dropoff: p.dropoffLocation.name,
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
    return grouped.filter(([, g]) => fuzzyMatch(`${g.pickup} ${g.dropoff}`, q))
  }, [grouped, routeSearch])

  const startEdit = useCallback((pricing: Pricing) => {
    setEditingId(pricing.id)
    setDraftLines(pricing.lines.map(l => ({ ...l })))
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setDraftLines([])
  }, [])

  const saveEdit = useCallback((pricing: Pricing) => {
    updatePricing.mutate(
      {
        id: pricing.id,
        data: {
          clientId: pricing.client.id,
          workType: pricing.workType,
          pickupLocationId: pricing.pickupLocation.id,
          dropoffLocationId: pricing.dropoffLocation.id,
          lines: draftLines,
        },
      },
      { onSuccess: () => cancelEdit() },
    )
  }, [draftLines, updatePricing, cancelEdit])

  const updateDraftLine = useCallback((idx: number, field: keyof PricingLine, value: number) => {
    setDraftLines(prev => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }, [])

  const addDraftLine = useCallback(() => {
    setDraftLines(prev => [...prev, { quantity: 1, unitPrice: 0, driverSalary: 0 }])
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

  const clientName = clients.find(c => c.id === clientId)?.name ?? pricings[0]?.client.name ?? ''

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
            <ChevronLeft size={14} /> Bảng giá
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
            placeholder="Tìm cung đường..."
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
        /* ── TABLE ── */
        <div
          className="rounded-xl overflow-hidden border"
          style={{ borderColor: 'var(--theme-border-default)' }}
        >
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--theme-bg-secondary)' }}>
                <th
                  className="text-left text-[11px] font-bold uppercase tracking-wider px-4 py-3"
                  style={{ color: 'var(--theme-text-muted)', width: 280 }}
                >
                  Tuyến đường
                </th>
                {COL_ORDER.map(wt => (
                  <th
                    key={wt}
                    className="text-right text-[11px] font-bold uppercase tracking-wider px-4 py-3"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    {wt}
                  </th>
                ))}
                <th
                  className="text-center text-[11px] font-bold uppercase tracking-wider px-3 py-3"
                  style={{ color: 'var(--theme-text-muted)', width: 80 }}
                >
                  Tác vụ
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map(([groupKey, { pickup, dropoff, workTypeMap }], rowIdx) => {
                // Collect all pricings for actions
                const allPricings = Array.from(workTypeMap.values())

                // Check if ANY pricing in this row is being edited
                const editingPricing = allPricings.find(p => p.id === editingId)
                const isEditing = !!editingPricing

                return (
                  <Fragment key={groupKey}>
                    {/* ── Main price row ── */}
                    <tr
                      style={{
                        background: rowIdx % 2 === 0 ? 'var(--theme-bg-primary)' : 'var(--theme-bg-secondary)',
                        borderTop: '1px solid var(--theme-border-light)',
                      }}
                    >
                      {/* Route column */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{pickup}</span>
                          <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>→</span>
                          <span className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{dropoff}</span>
                        </div>
                      </td>

                      {/* Price columns */}
                      {COL_ORDER.map(wt => {
                        const pricing = workTypeMap.get(wt)
                        const isThisEditing = editingId === pricing?.id

                        return (
                          <td key={wt} className="px-4 py-3 text-right">
                            {isThisEditing ? (
                              <InlineCell
                                value={draftLines[0]?.unitPrice ?? 0}
                                onChange={v => updateDraftLine(0, 'unitPrice', v)}
                                editing
                                className="text-sm"
                              />
                            ) : (
                              <span className="font-mono-num font-semibold tabular-nums" style={{ color: pricing ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)' }}>
                                {cellPrice(pricing)}
                              </span>
                            )}
                          </td>
                        )
                      })}

                      {/* Actions column */}
                      <td className="px-3 py-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => editingPricing && saveEdit(editingPricing)}
                              className="p-1.5 rounded-lg"
                              style={{ color: 'var(--theme-status-success)' }}
                              title="Lưu"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 rounded-lg"
                              style={{ color: 'var(--theme-text-muted)' }}
                              title="Huỷ"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-0.5">
                            {allPricings.map(p => (
                              <Fragment key={p.id}>
                                <button
                                  onClick={() => startEdit(p)}
                                  className="p-1.5 rounded-lg hover:bg-[var(--theme-bg-tertiary)]"
                                  style={{ color: 'var(--theme-text-muted)' }}
                                  title="Sửa"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget({
                                    id: p.id,
                                    desc: `${p.workType} · ${pickup} → ${dropoff}`,
                                  })}
                                  className="p-1.5 rounded-lg hover:bg-[var(--theme-bg-tertiary)]"
                                  style={{ color: 'var(--theme-status-error)' }}
                                  title="Xoá"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </Fragment>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* ── Expanded edit row (salary details) ── */}
                    {isEditing && editingPricing && (
                      <tr
                        style={{
                          background: 'color-mix(in srgb, var(--theme-brand-primary) 4%, var(--theme-bg-primary))',
                        }}
                      >
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex items-center gap-6 flex-wrap">
                            <span className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                              {editingPricing.workType} · Chi tiết:
                            </span>
                            {draftLines.map((line, lIdx) => (
                              <div key={lIdx} className="flex items-center gap-4">
                                {draftLines.length > 1 && (
                                  <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}>
                                    x{line.quantity}
                                  </span>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] uppercase font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Đơn giá</span>
                                  <InlineCell value={line.unitPrice} onChange={v => updateDraftLine(lIdx, 'unitPrice', v)} editing className="text-xs" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] uppercase font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Lương TX</span>
                                  <InlineCell value={line.driverSalary} onChange={v => updateDraftLine(lIdx, 'driverSalary', v)} editing className="text-xs" />
                                </div>
                                {draftLines.length > 1 && (
                                  <button onClick={() => removeDraftLine(lIdx)} className="p-0.5" style={{ color: 'var(--theme-status-error)' }}>
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              onClick={addDraftLine}
                              className="flex items-center gap-1 text-[10px] font-medium"
                              style={{ color: 'var(--theme-brand-primary)' }}
                            >
                              <Plus size={11} /> Thêm dòng
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
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
