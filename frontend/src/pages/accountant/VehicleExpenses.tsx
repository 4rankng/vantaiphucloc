/**
 * Chi phí xe — Monthly vehicle expense entry.
 *
 * Accountant picks a month/year, then enters expenses in a grid:
 *   Rows = vehicles, Columns = Xăng dầu, Sửa chữa, Chi phí chung
 * All amounts are for the whole month.
 */

import { useState, useMemo, useCallback } from 'react'
import { Save, Loader2, Car, ChevronLeft, ChevronRight } from 'lucide-react'
import { useToast } from '@/components/atoms/Toast'
import { formatCurrencyFull } from '@/data/domain'
import {
  useVehicleExpenses,
  useCreateVehicleExpense,
  useUpdateVehicleExpense,
  useDeleteVehicleExpense,
  useDrivers,
} from '@/hooks/use-queries'
import type { VehicleExpense } from '@/services/api/vehicleExpenses.api'
import { EXPENSE_CATEGORY_LABELS } from '@/services/api/vehicleExpenses.api'

const CATEGORIES = ['XANG_DAU', 'SUA_CHUA', 'CHUNG'] as const
type ExpenseCat = typeof CATEGORIES[number]

const CATEGORY_SHORT: Record<ExpenseCat, string> = {
  XANG_DAU: 'Xăng dầu',
  SUA_CHUA: 'Sửa chữa',
  CHUNG: 'Chi phí chung',
}

// Get month key from date
function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  return `Tháng ${parseInt(m)}/${y}`
}

function monthStart(key: string): string {
  return `${key}-01`
}

function monthEnd(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `${key}-${String(lastDay).padStart(2, '0')}`
}

function prevMonth(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1, 0)
  return toMonthKey(d)
}

function nextMonth(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m, 1)
  return toMonthKey(d)
}

export function VehicleExpenses() {
  const toast = useToast()
  const [monthKey, setMonthKey] = useState(toMonthKey(new Date()))
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const df = monthStart(monthKey)
  const dt = monthEnd(monthKey)

  const { data: expensePage, isLoading, refetch } = useVehicleExpenses({
    dateFrom: df,
    dateTo: dt,
  })
  const { data: driverPage } = useDrivers()

  const createExpense = useCreateVehicleExpense()
  const updateExpense = useUpdateVehicleExpense()
  const deleteExpense = useDeleteVehicleExpense()

  // Build vehicle list from drivers
  const vehicles = useMemo(() => {
    const map = new Map<number, string>()
    for (const d of driverPage?.items ?? []) {
      if (d.vehiclePlate && d.vehicleId) {
        map.set(d.vehicleId, d.vehiclePlate)
      }
    }
    return Array.from(map.entries())
      .map(([id, plate]) => ({ id, plate }))
      .sort((a, b) => a.plate.localeCompare(b.plate))
  }, [driverPage])

  // Build lookup: `${vehicleId}-${category}` → existing expense
  const existingMap = useMemo(() => {
    const map = new Map<string, VehicleExpense>()
    for (const exp of expensePage?.items ?? []) {
      const key = exp.category === 'CHUNG' ? `chung-${exp.id}` : `${exp.vehicleId}-${exp.category}`
      // Keep the first match per vehicle-category combo
      if (!map.has(`${exp.vehicleId ?? 'chung'}-${exp.category}`)) {
        map.set(`${exp.vehicleId ?? 'chung'}-${exp.category}`, exp)
      }
    }
    return map
  }, [expensePage])

  // Get display value for a cell
  const getCellValue = useCallback((vehicleId: number | null, cat: ExpenseCat): string => {
    const lookupKey = `${vehicleId ?? 'chung'}-${cat}`
    const draftKey = `${vehicleId ?? 'chung'}-${cat}`
    if (draft[draftKey] !== undefined) return draft[draftKey]
    const existing = existingMap.get(lookupKey)
    return existing ? String(existing.amount) : ''
  }, [draft, existingMap])

  const setCellValue = useCallback((vehicleId: number | null, cat: ExpenseCat, value: string) => {
    const key = `${vehicleId ?? 'chung'}-${cat}`
    setDraft(prev => ({ ...prev, [key]: value }))
  }, [])

  // Calculate totals
  const totals = useMemo(() => {
    const result: Record<ExpenseCat, number> = { XANG_DAU: 0, SUA_CHUA: 0, CHUNG: 0 }
    for (const v of vehicles) {
      for (const cat of CATEGORIES) {
        const val = parseInt(getCellValue(v.id, cat)) || 0
        result[cat] += val
      }
    }
    // Also count chung separately
    const chungVal = parseInt(getCellValue(null, 'CHUNG')) || 0
    if (chungVal > 0 && vehicles.length === 0) result.CHUNG = chungVal
    return result
  }, [vehicles, getCellValue])

  // Save all changes
  const handleSave = useCallback(async () => {
    setSaving(true)
    let errorCount = 0

    for (const v of vehicles) {
      for (const cat of CATEGORIES) {
        if (cat === 'CHUNG') continue // handled separately
        const lookupKey = `${v.id}-${cat}`
        const rawVal = draft[lookupKey]
        if (rawVal === undefined) continue // unchanged
        const amount = parseInt(rawVal) || 0
        const existing = existingMap.get(lookupKey)

        try {
          if (existing) {
            if (amount === 0) {
              await deleteExpense.mutateAsync(existing.id)
            } else if (amount !== existing.amount) {
              await updateExpense.mutateAsync({
                id: existing.id,
                payload: {
                  vehicleId: v.id,
                  category: cat,
                  amount,
                  expenseDate: df,
                  description: null,
                },
              })
            }
          } else if (amount > 0) {
            await createExpense.mutateAsync({
              vehicleId: v.id,
              category: cat,
              amount,
              expenseDate: df,
              description: null,
            })
          }
        } catch {
          errorCount++
        }
      }
    }

    // Handle CHUNG row (no vehicle)
    const chungKey = `chung-CHUNG`
    const chungRaw = draft[chungKey]
    if (chungRaw !== undefined) {
      const amount = parseInt(chungRaw) || 0
      // Find existing chung expense for this month
      const existingChung = (expensePage?.items ?? []).find(e => e.category === 'CHUNG')
      try {
        if (existingChung) {
          if (amount === 0) {
            await deleteExpense.mutateAsync(existingChung.id)
          } else if (amount !== existingChung.amount) {
            await updateExpense.mutateAsync({
              id: existingChung.id,
              payload: { vehicleId: null, category: 'CHUNG', amount, expenseDate: df, description: null },
            })
          }
        } else if (amount > 0) {
          await createExpense.mutateAsync({ vehicleId: null, category: 'CHUNG', amount, expenseDate: df, description: null })
        }
      } catch {
        errorCount++
      }
    }

    setSaving(false)
    setDraft({})

    if (errorCount === 0) {
      toast.success('Đã lưu chi phí', monthLabel(monthKey))
    } else {
      toast.error('Lỗi', `${errorCount} khoản không thể lưu`)
    }
    refetch()
  }, [draft, vehicles, existingMap, df, monthKey, createExpense, updateExpense, deleteExpense, toast, refetch, expensePage])

  const hasChanges = Object.keys(draft).length > 0

  return (
    <div className="space-y-6">
      {/* Unified header: title + month navigator + save action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="typo-display">Chi phí xe</h1>
          <p className="typo-body-sm mt-1" style={{ color: 'var(--theme-text-muted)' }}>
            Nhập chi phí theo tháng cho từng xe
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Month navigator */}
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{
              background: 'var(--theme-bg-secondary)',
              border: '1px solid var(--theme-border-default)',
            }}
          >
            <button
              type="button"
              onClick={() => { setMonthKey(prevMonth(monthKey)); setDraft({}) }}
              className="h-9 w-9 flex items-center justify-center transition-colors hover:bg-[var(--theme-bg-tertiary)]"
              style={{ color: 'var(--theme-text-muted)' }}
              aria-label="Tháng trước"
            >
              <ChevronLeft size={16} />
            </button>
            <span
              className="text-[13px] font-semibold min-w-[112px] text-center tabular-nums"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              {monthLabel(monthKey)}
            </span>
            <button
              type="button"
              onClick={() => { setMonthKey(nextMonth(monthKey)); setDraft({}) }}
              className="h-9 w-9 flex items-center justify-center transition-colors hover:bg-[var(--theme-bg-tertiary)]"
              style={{ color: 'var(--theme-text-muted)' }}
              aria-label="Tháng sau"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {monthKey !== toMonthKey(new Date()) && (
            <button
              type="button"
              onClick={() => { setMonthKey(toMonthKey(new Date())); setDraft({}) }}
              className="h-9 px-3 text-[12px] font-medium rounded-lg transition-colors"
              style={{
                color: 'var(--theme-brand-primary)',
                background: 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)',
              }}
            >
              Tháng này
            </button>
          )}

          {hasChanges && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-1.5 h-9"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="card p-12 text-center">
          <Car className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)', opacity: 0.4 }} />
          <p className="typo-h3 mb-1">Chưa có xe nào</p>
          <p className="typo-body-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Thêm xe và gán lái xe trước khi nhập chi phí
          </p>
        </div>
      ) : (
        <>
          {/* Monthly expense grid */}
          <div
            className="rounded-xl overflow-hidden border"
            style={{ borderColor: 'var(--theme-border-default)' }}
          >
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--theme-bg-secondary)' }}>
                  <th
                    className="text-left text-[11px] font-bold uppercase tracking-wider px-4 py-3"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    Xe
                  </th>
                  {CATEGORIES.filter(c => c !== 'CHUNG').map(cat => (
                    <th
                      key={cat}
                      className="text-right text-[11px] font-bold uppercase tracking-wider px-4 py-3"
                      style={{ color: 'var(--theme-text-muted)' }}
                    >
                      {CATEGORY_SHORT[cat]}
                    </th>
                  ))}
                  <th
                    className="text-right text-[11px] font-bold uppercase tracking-wider px-4 py-3"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    Tổng
                  </th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v, idx) => {
                  const xangDau = parseInt(getCellValue(v.id, 'XANG_DAU')) || 0
                  const suaChua = parseInt(getCellValue(v.id, 'SUA_CHUA')) || 0
                  const rowTotal = xangDau + suaChua

                  return (
                    <tr
                      key={v.id}
                      style={{
                        background: idx % 2 === 0 ? 'var(--theme-bg-primary)' : 'var(--theme-bg-secondary)',
                        borderTop: '1px solid var(--theme-border-light)',
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Car size={14} style={{ color: 'var(--theme-text-muted)' }} />
                          <span className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{v.plate}</span>
                        </div>
                      </td>
                      {(['XANG_DAU', 'SUA_CHUA'] as const).map(cat => (
                        <td key={cat} className="px-4 py-3 text-right">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={getCellValue(v.id, cat)}
                            onChange={e => {
                              const val = e.target.value.replace(/[^\d]/g, '')
                              setCellValue(v.id, cat, val)
                            }}
                            placeholder="0"
                            className="w-full text-right font-mono-num tabular-nums text-sm bg-transparent border-b border-transparent focus:border-[var(--theme-brand-primary)] outline-none py-1 transition-colors"
                            style={{ color: 'var(--theme-text-primary)' }}
                          />
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono-num font-semibold tabular-nums" style={{ color: rowTotal > 0 ? 'var(--theme-status-error)' : 'var(--theme-text-muted)' }}>
                          {rowTotal > 0 ? formatCurrencyFull(rowTotal) : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}

                {/* Chi phí chung row */}
                <tr
                  style={{
                    background: 'var(--theme-bg-tertiary)',
                    borderTop: '2px solid var(--theme-border-default)',
                  }}
                >
                  <td className="px-4 py-3">
                    <span className="font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
                      Chi phí chung
                    </span>
                  </td>
                  <td colSpan={2} className="px-4 py-3 text-right">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={getCellValue(null, 'CHUNG')}
                      onChange={e => {
                        const val = e.target.value.replace(/[^\d]/g, '')
                        setCellValue(null, 'CHUNG', val)
                      }}
                      placeholder="0"
                      className="w-40 ml-auto text-right font-mono-num tabular-nums text-sm bg-transparent border-b border-transparent focus:border-[var(--theme-brand-primary)] outline-none py-1 transition-colors"
                      style={{ color: 'var(--theme-text-primary)' }}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(() => {
                      const chungVal = parseInt(getCellValue(null, 'CHUNG')) || 0
                      return (
                        <span className="font-mono-num font-semibold tabular-nums" style={{ color: chungVal > 0 ? 'var(--theme-status-error)' : 'var(--theme-text-muted)' }}>
                          {chungVal > 0 ? formatCurrencyFull(chungVal) : '—'}
                        </span>
                      )
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer: totals summary */}
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Tổng CP xe</p>
              <p className="font-mono-num font-bold text-sm" style={{ color: 'var(--theme-status-error)' }}>
                {formatCurrencyFull(totals.XANG_DAU + totals.SUA_CHUA)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>CP Chung</p>
              <p className="font-mono-num font-bold text-sm" style={{ color: 'var(--theme-status-error)' }}>
                {formatCurrencyFull(totals.CHUNG)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
