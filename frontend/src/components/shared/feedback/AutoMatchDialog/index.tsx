 
export { AutoMatchDateDialog } from './AutoMatchDateDialog'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { RobotDialogHero, useTypewriter } from '@/components/shared/feedback/RobotHead'
import { cn } from '@/lib/utils'
import { Loader2, Zap, CheckCircle2, AlertCircle, XCircle, Check, ArrowRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/Dialog'
import type { MatchCandidate } from '@/services/api/autoMatch.api'

const CONFIDENCE_CONFIG = {
  full: { label: 'Khớp đầy đủ', color: 'var(--success)', icon: CheckCircle2 },
  partial: { label: 'Khớp một phần', color: 'var(--warning)', icon: AlertCircle },
  none: { label: 'Yếu', color: 'var(--danger)', icon: XCircle },
}

const WORK_TYPE_LABELS: Record<string, string> = {
  CHUYEN_BAI: 'Chuyển bãi',
  XUAT_TAU: 'Xuất tàu',
  NHAP_TAU: 'Nhập tàu',
  'CHUYỂN BÃI': 'Chuyển bãi',
  'XUẤT TÀU': 'Xuất tàu',
  'NHẬP TÀU': 'Nhập tàu',
}

type CriterionKey = 'tripDate' | 'contNumber' | 'clientName' | 'pickupName' | 'dropoffName' | 'workType' | 'vessel' | 'vehiclePlate'

const CRITERIA: Array<{ key: CriterionKey; label: string; matchField: string }> = [
  { key: 'contNumber', label: 'Số Cont', matchField: 'container_number' },
  { key: 'clientName', label: 'Chủ hàng', matchField: 'client' },
  { key: 'pickupName', label: 'Điểm đi', matchField: 'pickup_location' },
  { key: 'dropoffName', label: 'Điểm đến', matchField: 'dropoff_location' },
  { key: 'workType', label: 'Tác nghiệp', matchField: 'work_type' },
  { key: 'vessel', label: 'Số tàu', matchField: 'vessel' },
  { key: 'vehiclePlate', label: 'Số xe', matchField: 'vehicle_plate' },
  { key: 'tripDate', label: 'Ngày đi', matchField: 'trip_date' },
]

function fmtWorkType(wt: string | null): string {
  if (!wt) return '—'
  return WORK_TYPE_LABELS[wt] || wt
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  const parts = d.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`
  return d
}

function fmtVal(key: CriterionKey, val: string | null): string {
  if (!val) return '—'
  if (key === 'tripDate') return fmtDate(val)
  if (key === 'workType') return fmtWorkType(val)
  return val
}

function isSyncableField(): boolean {
  return true
}

function hasDifferences(c: MatchCandidate): boolean {
  const matchedSet = new Set(c.matchedFields)
  return CRITERIA.some(({ key, matchField }) => {
    const d = fmtVal(key, c.delivered[key] as string | null)
    const b = fmtVal(key, c.booked[key] as string | null)
    return d !== b && d !== '—' && b !== '—' && !matchedSet.has(matchField)
  })
}

function getUnresolvedFieldsCount(c: MatchCandidate, choices: Record<string, 'delivered' | 'booked'> = {}): number {
  let count = 0
  const matchedSet = new Set(c.matchedFields)
  CRITERIA.forEach(({ key, matchField }) => {
    const d = fmtVal(key, c.delivered[key] as string | null)
    const b = fmtVal(key, c.booked[key] as string | null)
    if (d !== b && d !== '—' && b !== '—' && !matchedSet.has(matchField)) {
      if (!choices[key]) {
        count++
      }
    }
  })
  return count
}

/* ── AI Loading state components ────────────────────────── */
const SCAN_MSGS = [
  'Đang quét dữ liệu chuyến xe…',
  'Phân tích tuyến đường & chủ hàng…',
  'Đối chiếu số container…',
  'Tìm kiếm các cặp phù hợp…',
  'Đang hoàn tất kết quả…',
]

function AILoadingState() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % SCAN_MSGS.length); setVisible(true) }, 350)
    }, 1800)
    return () => clearInterval(id)
  }, [])

  return (
    <RobotDialogHero title="Đang tìm chuyến khớp..." thinking>
      <p style={{
        color: 'rgba(196,181,253,0.85)', fontSize: 13, fontWeight: 500,
        margin: '8px 0 0', minHeight: 20,
        transition: 'opacity 0.3s, transform 0.3s',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(5px)',
      }}>
        {SCAN_MSGS[idx]}
      </p>
    </RobotDialogHero>
  )
}

/* ── No-result state ─────────────────────────────────────── */
const NO_RESULT_BODY = 'Hệ thống chưa tìm thấy cặp chuyến nào đủ tiêu chí tự động ghép trong khoảng thời gian đã chọn.'
const ALL_MATCHED_BODY = 'Tất cả chuyến trong khoảng thời gian đã chọn đều đã được đối chiếu. Không còn chuyến nào cần ghép thêm.'

function NoResultState({ onClose, allMatched = false }: { onClose: () => void; allMatched?: boolean }) {
  const body = allMatched ? ALL_MATCHED_BODY : NO_RESULT_BODY
  const title = allMatched ? 'Tất cả đã ghép xong' : 'Không tìm thấy kết quả'
  const { displayed, done } = useTypewriter(body, 28)
  const isTyping = !!displayed && !done

  return (
    <div style={{ borderRadius: 20, overflow: 'hidden' }}>
      {/* ── Hero ── */}
      <RobotDialogHero title={title} _externalTyping={isTyping} />

      {/* ── Body ── */}
      <div style={{ background: 'white', padding: '20px 24px 4px' }}>
         <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--theme-text-secondary)', margin: 0, minHeight: 60 }}>
          {displayed}
          {!done && displayed && (
             <span className="ai-cursor" style={{ color: 'var(--theme-ai-accent-light)', fontWeight: 700 }}>▋</span>
          )}
        </p>
      </div>

      {/* ── Footer ── */}
      <div style={{
        background: 'white', borderTop: '1px solid rgba(0,0,0,0.06)',
        padding: '14px 20px', display: 'flex', justifyContent: 'flex-end',
      }}>
        <button
          onClick={onClose}
          className="text-sm font-medium px-5 py-2 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
        >
          Đóng
        </button>
      </div>
    </div>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  candidates: MatchCandidate[]
  unmatchedCount: number
  scannedCount: number
  isLoading?: boolean
  isConfirming: boolean
  onConfirm: (pairs: Array<{
    deliveredTripId: number
    bookedTripId: number
    syncSource?: string | null
    fieldChoices?: Record<string, 'delivered' | 'booked'> | null
  }>) => void
}

export function AutoMatchDialog({
  open,
  onClose,
  candidates,
  unmatchedCount,
  isLoading = false,
  isConfirming,
  onConfirm,
}: Props) {
  const allKeys = useMemo(() => candidates.map((c) => `${c.deliveredTripId}-${c.bookedTripId}`), [candidates])
  const [deselected, setDeselected] = useState<Set<string>>(new Set())
  const [fieldChoices, setFieldChoices] = useState<Record<string, Record<string, 'delivered' | 'booked'>>>({})
  const [allSelected, setAllSelected] = useState(true)

  const fullMatches = useMemo(
    () => candidates.filter((c) => c.confidence === 'full'),
    [candidates]
  )
  const partialMatches = useMemo(
    () => candidates.filter((c) => c.confidence === 'partial'),
    [candidates]
  )
  const noneMatches = useMemo(
    () => candidates.filter((c) => c.confidence === 'none'),
    [candidates]
  )

  useEffect(() => {
    const initialChoices: Record<string, Record<string, 'delivered' | 'booked'>> = {}
    if (!isLoading && candidates.length > 0) {
      const noneKeys = candidates
        .filter((c) => c.confidence === 'none')
        .map((c) => `${c.deliveredTripId}-${c.bookedTripId}`)
      const noneKeysSet = new Set(noneKeys)
      setDeselected(noneKeysSet)
      setAllSelected(noneKeys.length === 0)

      candidates.forEach((c) => {
        const key = `${c.deliveredTripId}-${c.bookedTripId}`
        if (!noneKeysSet.has(key)) {
          const matchedSet = new Set(c.matchedFields)
          CRITERIA.forEach(({ key: cKey, matchField }) => {
            const dStr = fmtVal(cKey, c.delivered[cKey] as string | null)
            const bStr = fmtVal(cKey, c.booked[cKey] as string | null)
            const hasConflict = dStr !== bStr && dStr !== '—' && bStr !== '—' && !matchedSet.has(matchField)
            if (hasConflict) {
              if (!initialChoices[key]) initialChoices[key] = {}
              initialChoices[key][cKey] = 'booked'
            }
          })
        }
      })
    } else {
      setDeselected(new Set())
      setAllSelected(true)
    }
    setFieldChoices(initialChoices)
  }, [candidates, isLoading])

  const selectedCandidates = useMemo(
    () => candidates.filter((c) => !deselected.has(`${c.deliveredTripId}-${c.bookedTripId}`)),
    [candidates, deselected]
  )

  const unresolvedCount = useMemo(() => {
    return selectedCandidates.reduce((acc, c) => {
      const key = `${c.deliveredTripId}-${c.bookedTripId}`
      return acc + (getUnresolvedFieldsCount(c, fieldChoices[key]) > 0 ? 1 : 0)
    }, 0)
  }, [selectedCandidates, fieldChoices])

  const selectedPairs = useMemo(() => {
    return selectedCandidates.map((c) => ({
      deliveredTripId: c.deliveredTripId,
      bookedTripId: c.bookedTripId,
    }))
  }, [selectedCandidates])

  const togglePair = useCallback((deliveredTripId: number, bookedTripId: number) => {
    const key = `${deliveredTripId}-${bookedTripId}`
    const isNowSelecting = deselected.has(key)

    setDeselected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

    if (isNowSelecting) {
      const candidate = candidates.find(c => c.deliveredTripId === deliveredTripId && c.bookedTripId === bookedTripId)
      if (candidate) {
        const matchedSet = new Set(candidate.matchedFields)
        const defaults: Record<string, 'delivered' | 'booked'> = {}
        CRITERIA.forEach(({ key: cKey, matchField }) => {
          const dStr = fmtVal(cKey, candidate.delivered[cKey] as string | null)
          const bStr = fmtVal(cKey, candidate.booked[cKey] as string | null)
          const hasConflict = dStr !== bStr && dStr !== '—' && bStr !== '—' && !matchedSet.has(matchField)
          if (hasConflict) {
            defaults[cKey] = 'booked'
          }
        })
        if (Object.keys(defaults).length > 0) {
          setFieldChoices(prev => {
            const next = { ...prev }
            next[key] = { ...defaults, ...next[key] }
            return next
          })
        }
      }
    }

    setAllSelected(false)
  }, [deselected, candidates])

  const doConfirm = useCallback(() => {
    const pairs = selectedCandidates.map((c) => {
      const key = `${c.deliveredTripId}-${c.bookedTripId}`
      const choices = fieldChoices[key] || {}
      return {
        deliveredTripId: c.deliveredTripId,
        bookedTripId: c.bookedTripId,
        syncSource: null,
        fieldChoices: choices,
      }
    })
    onConfirm(pairs)
  }, [selectedCandidates, fieldChoices, onConfirm])

  const handleConfirm = useCallback(() => {
    doConfirm()
  }, [doConfirm])

  const renderCandidate = (c: MatchCandidate) => {
    const key = `${c.deliveredTripId}-${c.bookedTripId}`
    const isSelected = !deselected.has(key)
    const conf = CONFIDENCE_CONFIG[c.confidence as keyof typeof CONFIDENCE_CONFIG] || CONFIDENCE_CONFIG.none
    const ConfIcon = conf.icon
    const displayScore = Math.round(c.score * 100)
    const matchedSet = new Set(c.matchedFields)
    const hasDiff = hasDifferences(c)

    return (
      <div
        key={key}
        onClick={() => togglePair(c.deliveredTripId, c.bookedTripId)}
        className="rounded-xl cursor-pointer transition-all border p-4 flex flex-col justify-between"
        style={{
          background: isSelected ? 'rgba(0,177,79,0.03)' : 'var(--surface)',
          borderColor: isSelected ? 'rgba(0,177,79,0.35)' : 'var(--line-2)',
          opacity: isSelected ? 1 : 0.9,
          boxShadow: isSelected ? 'var(--sh-sm)' : 'none',
        }}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isSelected ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: 'var(--ink-4)' }} />
              )}
              <span className="inline-flex items-center gap-1 text-[11.5px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${conf.color}1a`, color: conf.color }}>
                <ConfIcon className="h-3 w-3" />
                {displayScore}%
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2">
            {CRITERIA.map(({ key: cKey, matchField }) => {
              const dStr = fmtVal(cKey, c.delivered[cKey] as string | null)
              const bStr = fmtVal(cKey, c.booked[cKey] as string | null)
              
              const bothEmpty = dStr === '—' && bStr === '—'
              if (bothEmpty) return null

              const isMatch = matchedSet.has(matchField)
              const same = dStr === bStr

              // No conflict if same, matched, or one of them is empty ('—')
              const hasConflict = !same && !isMatch && dStr !== '—' && bStr !== '—'
              const activeChoice = fieldChoices[key]?.[cKey]
              const isSyncable = isSyncableField(cKey)

              return (
                <div key={cKey} className="flex items-start gap-2 text-[12px] leading-snug">
                  {same ? (
                    <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--theme-status-success)' }} />
                  ) : !hasConflict ? (
                    <div className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 rounded-sm border" style={{ borderColor: 'var(--ink-4)' }} />
                  )}
                  <span style={{ color: 'var(--ink-3)', minWidth: 54 }} className="text-[11px]">{CRITERIA.find(cr => cr.key === cKey)?.label}</span>
                  {same ? (
                    <span className="font-medium truncate" style={{ color: 'var(--ink)' }}>{dStr}</span>
                  ) : !hasConflict ? (
                    <span className="flex items-center gap-1 truncate text-xs" style={{ color: 'var(--ink-2)' }}>
                      <span className={cn("px-1 py-0.5 text-[11.5px] text-gray-600", (cKey === 'contNumber' || cKey === 'vehiclePlate') ? "font-mono" : "font-sans")}>
                        {dStr}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                      <span className={cn("px-1 py-0.5 text-[11.5px] text-gray-600 bg-gray-50 rounded border border-gray-100", (cKey === 'contNumber' || cKey === 'vehiclePlate') ? "font-mono" : "font-sans")}>
                        {bStr}
                      </span>
                    </span>
                  ) : isSyncable && isSelected ? (
                    <span className="flex items-center gap-1.5 flex-wrap truncate text-xs" style={{ color: 'var(--ink-2)' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setFieldChoices(prev => {
                            const next = { ...prev }
                            if (!next[key]) next[key] = {}
                            next[key] = { ...next[key], [cKey]: 'delivered' }
                            return next
                          })
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[11.5px] border transition-all duration-200 cursor-pointer",
                          (cKey === 'contNumber' || cKey === 'vehiclePlate') ? "font-mono" : "font-sans font-medium",
                          activeChoice === 'delivered'
                            ? "bg-[var(--success)] text-white border-[var(--success)] font-bold shadow-sm"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 opacity-60 hover:opacity-100"
                        )}
                      >
                        {dStr}
                      </button>
                      <ArrowRight className="h-3 w-3 flex-shrink-0 text-gray-400" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setFieldChoices(prev => {
                            const next = { ...prev }
                            if (!next[key]) next[key] = {}
                            next[key] = { ...next[key], [cKey]: 'booked' }
                            return next
                          })
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[11.5px] border transition-all duration-200 cursor-pointer",
                          (cKey === 'contNumber' || cKey === 'vehiclePlate') ? "font-mono" : "font-sans font-medium",
                          activeChoice === 'booked'
                            ? "bg-[var(--warning)] text-white border-[var(--warning)] font-bold shadow-sm"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 opacity-60 hover:opacity-100"
                        )}
                      >
                        {bStr}
                      </button>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 truncate text-xs" style={{ color: 'var(--ink-2)' }}>
                      <span className={cn("px-1 py-0.5 text-[11px] text-[var(--success)] font-semibold bg-[var(--success-soft)] rounded", (cKey === 'contNumber' || cKey === 'vehiclePlate') ? "font-mono" : "font-sans")}>
                        {dStr}
                      </span>
                      <ArrowRight className="h-3 w-3 flex-shrink-0 text-gray-400" />
                      <span className={cn("px-1 py-0.5 text-[11px] text-[var(--warning)] font-semibold bg-[var(--warning-soft)] rounded", (cKey === 'contNumber' || cKey === 'vehiclePlate') ? "font-mono" : "font-sans")}>
                        {bStr}
                      </span>
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {hasDiff && isSelected && (() => {
          const unresolvedFields = getUnresolvedFieldsCount(c, fieldChoices[key])
          if (unresolvedFields === 0) return null
          return (
            <div className="mt-3 pt-2.5 border-t border-dashed flex justify-between items-center" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                Chọn nguồn cho {unresolvedFields} trường lệch
              </span>
            </div>
          )
        })()}
      </div>
    )
  }

  const isEmptyResult = !isLoading && candidates.length === 0

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isLoading) { onClose() } }}>
      <DialogContent
        hideCloseButton={isLoading || isEmptyResult}
        className={cn(
          (isLoading || isEmptyResult)
            ? 'sm:max-w-[440px]'
            : 'absolute inset-0 w-full h-full max-w-none max-h-none rounded-none border-none flex flex-col p-4 gap-0',
          (isLoading || isEmptyResult) && 'p-0'
        )}
        style={(isLoading || isEmptyResult) ? {
          background: 'linear-gradient(145deg, var(--accent) 0%, var(--accent) 45%, var(--accent) 80%, var(--accent) 100%)',
          border: '1px solid var(--accent)',
          overflow: 'hidden',
        } : undefined}
      >
        <DialogTitle style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
          Đối chiếu tự động
        </DialogTitle>
        {isLoading ? <AILoadingState /> : isEmptyResult ? <NoResultState onClose={onClose} allMatched={unmatchedCount === 0} /> : <>
        {/* Gradient accent strip */}
        <div style={{
          margin: '-16px -16px 12px -16px',
          height: 3,
          background: 'var(--gradient-primary)',
          borderRadius: '12px 12px 0 0',
        }} />
        {/* Header and Legend combined row */}
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b pr-8" style={{ borderColor: 'var(--line-2)' }}>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Title */}
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg"
                style={{ background: 'var(--accent-soft)' }}
              >
                <Zap className="h-4 w-4" style={{ color: 'var(--accent)' }} />
              </span>
              <span className="text-[14.5px] font-bold" style={{ color: 'var(--ink)' }}>
                Đối chiếu tự động
              </span>
            </div>

            {/* Divider */}
            <span className="h-4 w-px bg-gray-200 hidden sm:inline" />

            {/* Legend */}
            {candidates.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[10.5px]">
                  <span className="inline-block w-2.5 h-1.5 rounded-sm" style={{ background: 'var(--success)' }} />
                  <span style={{ color: 'var(--ink-3)' }}>Lái xe</span>
                </span>
                <ArrowRight className="h-2.5 w-2.5 text-gray-400" />
                <span className="flex items-center gap-1.5 text-[10.5px]">
                   <span className="inline-block w-2.5 h-1.5 rounded-sm" style={{ background: 'var(--warning)' }} />
                   <span style={{ color: 'var(--ink-3)' }}>Chủ hàng</span>
                </span>
              </div>
            )}
          </div>

          {/* Actions on the Right */}
          {candidates.length > 0 && (
            <div className="flex items-center gap-2.5">
              {/* Alert message if unresolved conflicts exist */}
              {unresolvedCount > 0 && (
                <span className="hidden md:inline-flex text-[11px] font-medium items-center gap-1 border px-2.5 py-1 rounded-full"
                  style={{ color: 'var(--warning)', backgroundColor: 'var(--warning-soft)', borderColor: 'rgba(245, 166, 35, 0.25)' }}>
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  Cần chọn nguồn lệch ({unresolvedCount} cặp)
                </span>
              )}

              {/* Select/Deselect All buttons */}
              <button
                className="text-[10.5px] font-medium px-2.5 py-1 rounded-full transition-all duration-150 hover:scale-105 active:scale-95"
                 style={{
                   color: allSelected ? 'var(--accent)' : 'var(--ink-3)',
                   background: allSelected ? 'var(--accent-soft)' : 'transparent',
                   border: `1px solid ${allSelected ? 'rgba(0, 177, 79, 0.25)' : 'transparent'}`,
                 }}
                onClick={() => {
                  setDeselected(new Set())
                  setAllSelected(true)
                  setFieldChoices(prev => {
                    const next = { ...prev }
                    candidates.forEach((c) => {
                      const key = `${c.deliveredTripId}-${c.bookedTripId}`
                      const matchedSet = new Set(c.matchedFields)
                      CRITERIA.forEach(({ key: cKey, matchField }) => {
                        const dStr = fmtVal(cKey, c.delivered[cKey] as string | null)
                        const bStr = fmtVal(cKey, c.booked[cKey] as string | null)
                        const hasConflict = dStr !== bStr && dStr !== '—' && bStr !== '—' && !matchedSet.has(matchField)
                        if (hasConflict) {
                          if (!next[key]) next[key] = {}
                          if (!next[key][cKey]) next[key][cKey] = 'booked'
                        }
                      })
                    })
                    return next
                  })
                }}
              >
                Chọn tất cả
              </button>
              <button
                className="text-[10.5px] font-medium px-2.5 py-1 rounded-full transition-all duration-150 hover:scale-105 active:scale-95"
                 style={{
                   color: !allSelected ? 'var(--accent)' : 'var(--ink-3)',
                   background: !allSelected ? 'var(--accent-soft)' : 'transparent',
                   border: `1px solid ${!allSelected ? 'rgba(0, 177, 79, 0.25)' : 'transparent'}`,
                 }}
                onClick={() => { setDeselected(new Set(allKeys)); setAllSelected(false) }}
              >
                Bỏ tất cả
              </button>

              {/* Match/Ghep button */}
              <button
                onClick={handleConfirm}
                disabled={selectedPairs.length === 0 || unresolvedCount > 0 || isConfirming}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white text-[12px] font-bold bg-[var(--accent)] hover:bg-[var(--accent-2)] transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[rgba(0,177,79,0.3)] shadow-[0_4px_10px_-3px_rgba(0,177,79,0.32)]"
              >
                {isConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Ghép {selectedPairs.length} cặp
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-1 my-4">
          {candidates.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-4 text-center">
              <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="60" cy="50" r="42" fill="var(--theme-brand-primary, #059669)" fillOpacity="0.06" />
                <circle cx="60" cy="50" r="30" fill="var(--theme-brand-primary, #059669)" fillOpacity="0.08" />
                <rect x="12" y="30" width="36" height="40" rx="6" fill="white" stroke="#E2E8F0" strokeWidth="1.5" />
                <rect x="18" y="38" width="20" height="2.5" rx="1.25" fill="#CBD5E1" />
                <rect x="18" y="44" width="14" height="2" rx="1" fill="#E2E8F0" />
                <rect x="18" y="49" width="16" height="2" rx="1" fill="#E2E8F0" />
                <rect x="18" y="54" width="12" height="2" rx="1" fill="#E2E8F0" />
                <rect x="18" y="60" width="18" height="5" rx="2.5" fill="var(--theme-brand-primary, #059669)" fillOpacity="0.15" />
                <text x="27" y="64.5" textAnchor="middle" fontSize="4" fontFamily="monospace" fill="var(--theme-brand-primary, #059669)" fontWeight="600">WO#</text>
                <rect x="72" y="30" width="36" height="40" rx="6" fill="white" stroke="#E2E8F0" strokeWidth="1.5" />
                <rect x="78" y="38" width="20" height="2.5" rx="1.25" fill="#CBD5E1" />
                <rect x="78" y="44" width="14" height="2" rx="1" fill="#E2E8F0" />
                <rect x="78" y="49" width="16" height="2" rx="1" fill="#E2E8F0" />
                <rect x="78" y="54" width="12" height="2" rx="1" fill="#E2E8F0" />
                <rect x="78" y="60" width="18" height="5" rx="2.5" fill="var(--theme-status-warning)" fillOpacity="0.2" />
                <text x="87" y="64.5" textAnchor="middle" fontSize="4" fontFamily="monospace" fill="var(--theme-status-warning)" fontWeight="600">TO#</text>
                <circle cx="60" cy="50" r="10" fill="white" stroke="#E2E8F0" strokeWidth="1.5" />
                <path d="M55 48.5 C55 46.5 56.5 45 58.5 45 L60 45" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M65 51.5 C65 53.5 63.5 55 61.5 55 L60 55" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="59" y1="47" x2="61" y2="53" stroke="#E2E8F0" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="48" y1="50" x2="50" y2="50" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
                <line x1="70" y1="50" x2="72" y2="50" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
                <circle cx="60" cy="50" r="2.5" fill="var(--theme-status-warning)" fillOpacity="0.9" />
              </svg>
              <div className="space-y-2 mt-2">
                <p className="text-[15px] font-medium" style={{ color: 'var(--theme-text-primary, #09090B)' }}>
                  Không có đề xuất ghép tự động
                </p>
                <p className="text-[13px] leading-relaxed max-w-[280px]" style={{ color: 'var(--theme-text-muted, #64748B)' }}>
                  Hệ thống chưa tìm thấy cặp chuyến nào phù hợp. Có <strong style={{ color: 'var(--theme-text-primary, #09090B)', fontWeight: 500 }}>{unmatchedCount.toLocaleString()}</strong> chuyến cần được đối chiếu thủ công.
                </p>
              </div>
            </div>
          ) : (
            <>
              {fullMatches.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--ink-2)' }}>
                     <span style={{ display: 'inline-block', width: 3, height: 12, borderRadius: 2, background: 'linear-gradient(to bottom,var(--theme-ai-accent),var(--theme-ai-accent-light))', flexShrink: 0 }} />
                    Khớp đầy đủ ({fullMatches.length})
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {fullMatches.map(renderCandidate)}
                  </div>
                </div>
              )}
              {partialMatches.length > 0 && (
                <div className={noneMatches.length > 0 ? "mb-6" : ""}>
                  <h3 className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--ink-2)' }}>
                     <span style={{ display: 'inline-block', width: 3, height: 12, borderRadius: 2, background: 'linear-gradient(to bottom,var(--theme-status-warning),#f97316)', flexShrink: 0 }} />
                    Khớp một phần ({partialMatches.length})
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {partialMatches.map(renderCandidate)}
                  </div>
                </div>
              )}
              {noneMatches.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--ink-2)' }}>
                     <span style={{ display: 'inline-block', width: 3, height: 12, borderRadius: 2, background: 'linear-gradient(to bottom,var(--theme-status-error),#ef4444)', flexShrink: 0 }} />
                    Khớp yếu ({noneMatches.length})
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {noneMatches.map(renderCandidate)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>


        </>}
      </DialogContent>
    </Dialog>
  )
}
