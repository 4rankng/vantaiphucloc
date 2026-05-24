export { AutoMatchDateDialog } from './AutoMatchDateDialog'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { RobotDialogHero, useTypewriter } from '@/components/shared/RobotHead'
import { cn } from '@/lib/utils'
import { Loader2, Zap, CheckCircle2, AlertCircle, XCircle, Check, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui'
import type { MatchCandidate } from '@/services/api/autoMatch.api'

const CONFIDENCE_CONFIG = {
  full: { label: 'Khớp đầy đủ', color: '#16a34a', icon: CheckCircle2 },
  partial: { label: 'Khớp một phần', color: '#d97706', icon: AlertCircle },
  none: { label: 'Yếu', color: '#dc2626', icon: XCircle },
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
  { key: 'tripDate', label: 'Ngày', matchField: 'trip_date' },
  { key: 'contNumber', label: 'Số Cont', matchField: 'container_number' },
  { key: 'clientName', label: 'Chủ hàng', matchField: 'client' },
  { key: 'pickupName', label: 'Điểm đi', matchField: 'pickup_location' },
  { key: 'dropoffName', label: 'Điểm đến', matchField: 'dropoff_location' },
  { key: 'workType', label: 'Tác nghiệp', matchField: 'work_type' },
  { key: 'vessel', label: 'Số tàu', matchField: 'vessel' },
  { key: 'vehiclePlate', label: 'Số xe', matchField: 'vehicle_plate' },
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

function hasDifferences(c: MatchCandidate): boolean {
  return CRITERIA.some(({ key }) => {
    const d = fmtVal(key, c.delivered[key] as string | null)
    const b = fmtVal(key, c.booked[key] as string | null)
    return d !== b && d !== '—' && b !== '—'
  })
}

function getDiffFields(c: MatchCandidate): Array<{ key: CriterionKey; label: string; delivered: string; booked: string }> {
  return CRITERIA
    .map(({ key, label }) => ({
      key,
      label,
      delivered: fmtVal(key, c.delivered[key] as string | null),
      booked: fmtVal(key, c.booked[key] as string | null),
    }))
    .filter((r) => r.delivered !== r.booked && r.delivered !== '—' && r.booked !== '—')
}

/** Fields where one side is empty — auto-filled, no user choice needed */
function getAutoFillFields(c: MatchCandidate): Array<{ key: CriterionKey; label: string; value: string; from: 'delivered' | 'booked' }> {
  return CRITERIA
    .map(({ key, label }) => {
      const d = fmtVal(key, c.delivered[key] as string | null)
      const b = fmtVal(key, c.booked[key] as string | null)
      if (d !== b && (d === '—' || b === '—')) {
        return { key, label, value: d !== '—' ? d : b, from: (d !== '—' ? 'delivered' : 'booked') as 'delivered' | 'booked' }
      }
      return null
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
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
    <RobotDialogHero title="AI đang quét chuyến xe" thinking>
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

function NoResultState({ onClose }: { onClose: () => void }) {
  const { displayed, done } = useTypewriter(NO_RESULT_BODY, 28)
  const isTyping = !!displayed && !done

  return (
    <div style={{ borderRadius: 20, overflow: 'hidden' }}>
      {/* ── Hero ── */}
      <RobotDialogHero title="Không tìm thấy kết quả" _externalTyping={isTyping} />

      {/* ── Body ── */}
      <div style={{ background: 'white', padding: '20px 24px 4px' }}>
        <p className="text-sm text-center leading-relaxed" style={{ color: '#4b5563', margin: 0, minHeight: 60 }}>
          {displayed}
          {!done && displayed && (
            <span className="ai-cursor" style={{ color: '#a78bfa', fontWeight: 700 }}>▋</span>
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
          className="text-sm font-medium px-5 py-2 rounded-full transition-all hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(to right,#6366f1,#a855f7)', color: 'white', border: 'none', cursor: 'pointer' }}
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
  onConfirm: (pairs: Array<{ deliveredTripId: number; bookedTripId: number; syncSource?: string | null }>) => void
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
  const [syncChoices, setSyncChoices] = useState<Record<string, 'delivered' | 'booked'>>({})
  const [allSelected, setAllSelected] = useState(true)

  // Resolution stepper state
  const [resolving, setResolving] = useState(false)
  const [resolveIndex, setResolveIndex] = useState(0)
  const [localChoice, setLocalChoice] = useState<'delivered' | 'booked' | null>(null)

  const fullMatches = useMemo(
    () => candidates.filter((c) => c.confidence === 'full'),
    [candidates]
  )
  const partialMatches = useMemo(
    () => candidates.filter((c) => c.confidence === 'partial'),
    [candidates]
  )

  const selectedCandidates = useMemo(
    () => candidates.filter((c) => !deselected.has(`${c.deliveredTripId}-${c.bookedTripId}`)),
    [candidates, deselected]
  )

  const diffPairs = useMemo(
    () => selectedCandidates.filter(hasDifferences),
    [selectedCandidates]
  )

  const selectedPairs = useMemo(() => {
    return selectedCandidates.map((c) => ({
      deliveredTripId: c.deliveredTripId,
      bookedTripId: c.bookedTripId,
    }))
  }, [selectedCandidates])

  const togglePair = useCallback((deliveredTripId: number, bookedTripId: number) => {
    const key = `${deliveredTripId}-${bookedTripId}`
    setDeselected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setAllSelected(false)
  }, [])

  const doConfirm = useCallback(() => {
    const pairs = selectedCandidates.map((c) => {
      const key = `${c.deliveredTripId}-${c.bookedTripId}`
      const choice = syncChoices[key]
      return {
        deliveredTripId: c.deliveredTripId,
        bookedTripId: c.bookedTripId,
        syncSource: choice || null,
      }
    })
    onConfirm(pairs)
  }, [selectedCandidates, syncChoices, onConfirm])

  const handleConfirm = useCallback(() => {
    if (diffPairs.length > 0 && !resolving) {
      setResolving(true)
      setResolveIndex(0)
      setLocalChoice(null)
      return
    }
    doConfirm()
  }, [diffPairs, resolving, doConfirm])

  const handleResolveChoice = useCallback((source: 'delivered' | 'booked') => {
    const c = diffPairs[resolveIndex]
    const key = `${c.deliveredTripId}-${c.bookedTripId}`
    setSyncChoices((prev) => ({ ...prev, [key]: source }))

    if (resolveIndex + 1 < diffPairs.length) {
      setResolveIndex(resolveIndex + 1)
      setLocalChoice(null)
    } else {
      setResolving(false)
      // Auto-confirm after last resolution
      setTimeout(() => {
        const pairs = selectedCandidates.map((sc) => {
          const sk = `${sc.deliveredTripId}-${sc.bookedTripId}`
          const choice = sk === key ? source : syncChoices[sk]
          return {
            deliveredTripId: sc.deliveredTripId,
            bookedTripId: sc.bookedTripId,
            syncSource: choice || null,
          }
        })
        onConfirm(pairs)
      }, 0)
    }
  }, [diffPairs, resolveIndex, selectedCandidates, syncChoices, onConfirm])

  const handleApplyChoice = useCallback(() => {
    if (!localChoice) return
    handleResolveChoice(localChoice)
  }, [localChoice, handleResolveChoice])

  const handleNavPrev = useCallback(() => {
    if (resolveIndex === 0) return
    const newIdx = resolveIndex - 1
    const c = diffPairs[newIdx]
    const key = `${c.deliveredTripId}-${c.bookedTripId}`
    setResolveIndex(newIdx)
    setLocalChoice(syncChoices[key] ?? null)
  }, [resolveIndex, diffPairs, syncChoices])

  const handleNavNext = useCallback(() => {
    if (resolveIndex >= diffPairs.length - 1) return
    const newIdx = resolveIndex + 1
    const c = diffPairs[newIdx]
    const key = `${c.deliveredTripId}-${c.bookedTripId}`
    setResolveIndex(newIdx)
    setLocalChoice(syncChoices[key] ?? null)
  }, [resolveIndex, diffPairs, syncChoices])

  // Current card being resolved
  const currentResolveCard = resolving ? diffPairs[resolveIndex] : null

  const renderCandidate = (c: MatchCandidate) => {
    const key = `${c.deliveredTripId}-${c.bookedTripId}`
    const isSelected = !deselected.has(key)
    const conf = CONFIDENCE_CONFIG[c.confidence as keyof typeof CONFIDENCE_CONFIG] || CONFIDENCE_CONFIG.none
    const ConfIcon = conf.icon
    const matchedSet = new Set(c.matchedFields)

    return (
      <div
        key={key}
        onClick={() => togglePair(c.deliveredTripId, c.bookedTripId)}
        className="rounded-lg cursor-pointer transition-all border p-2.5"
        style={{
          background: isSelected ? 'rgba(99,102,241,0.05)' : 'transparent',
          borderColor: isSelected ? 'rgba(99,102,241,0.2)' : 'rgba(0,0,0,0.04)',
          opacity: isSelected ? 1 : 0.38,
          boxShadow: isSelected ? '0 1px 6px rgba(99,102,241,0.08)' : 'none',
        }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          {isSelected ? (
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#6366f1' }} />
          ) : (
            <div className="h-3.5 w-3.5 rounded-full border-2 flex-shrink-0" style={{ borderColor: 'var(--ink-4)' }} />
          )}
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: `${conf.color}1a`, color: conf.color }}>
            <ConfIcon className="h-2.5 w-2.5" />
            {Math.round(c.score * 100)}%
          </span>
        </div>

        <div className="space-y-px">
          {CRITERIA.map(({ key: cKey, matchField }) => {
            const dStr = fmtVal(cKey, c.delivered[cKey] as string | null)
            const bStr = fmtVal(cKey, c.booked[cKey] as string | null)
            const isMatch = matchedSet.has(matchField)
            const same = dStr === bStr
            const bothEmpty = dStr === '—' && bStr === '—'
            if (bothEmpty) return null

            return (
              <div key={cKey} className="flex items-center gap-1.5 text-[11px] leading-tight">
                {(isMatch || same) ? (
                  <Check className="h-2.5 w-2.5 flex-shrink-0" style={{ color: '#16a34a' }} />
                ) : (
                  <span className="w-2.5 h-2.5 flex-shrink-0 rounded-sm border" style={{ borderColor: 'var(--ink-4)' }} />
                )}
                <span style={{ color: 'var(--ink-3)', minWidth: 46 }} className="text-[10px]">{CRITERIA.find(cr => cr.key === cKey)?.label}</span>
                {same || isMatch ? (
                  <span className="font-medium truncate" style={{ color: 'var(--ink)' }}>{dStr}</span>
                ) : (
                  <span className="flex items-center gap-0.5 truncate" style={{ color: 'var(--ink-2)' }}>
                    <span>{dStr}</span>
                    <ArrowRight className="h-2.5 w-2.5" style={{ color: 'var(--ink-4)' }} />
                    <span style={{ color: '#d97706' }}>{bStr}</span>
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const isEmptyResult = !isLoading && candidates.length === 0

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !isLoading) { setResolving(false); onClose() } }}>
      <DialogContent
        hideCloseButton={isLoading || isEmptyResult}
        className={cn(
          resolving ? 'max-w-[520px]' : (isLoading || isEmptyResult) ? 'sm:max-w-[440px]' : 'max-w-[90vw] lg:max-w-[1100px]',
          (isLoading || isEmptyResult) && 'p-0'
        )}
        style={(isLoading || isEmptyResult) ? {
          background: 'linear-gradient(145deg, #1e1b4b 0%, #2d1b69 45%, #4c1d95 80%, #6d28d9 100%)',
          border: '1px solid rgba(139,92,246,0.3)',
          overflow: 'hidden',
        } : undefined}
      >
        <DialogTitle style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}>
          Tự động đối chiếu (AI)
        </DialogTitle>
        {isLoading ? <AILoadingState /> : isEmptyResult ? <NoResultState onClose={onClose} /> : <>
        {/* Gradient accent strip */}
        <div style={{
          margin: '-24px -24px 20px -24px',
          height: 3,
          background: 'linear-gradient(to right, #6366f1, #a855f7, #ec4899)',
          borderRadius: '12px 12px 0 0',
        }} />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg"
              style={{ background: 'rgba(99,102,241,0.1)' }}
            >
              <Zap className="h-4 w-4" style={{ color: '#6366f1' }} />
            </span>
            <span style={{ background: 'linear-gradient(to right,#6366f1,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Tự động (AI)
            </span>
            {resolving && (
              <span className="text-[12px] font-normal" style={{ color: 'var(--ink-3)', WebkitTextFillColor: 'var(--ink-3)' }}>
                — Giải quyết khác biệt ({resolveIndex + 1}/{diffPairs.length})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Resolution stepper — git-style conflict diff */}
        {resolving && currentResolveCard ? (() => {
          const matchedSet = new Set(currentResolveCard.matchedFields)
          const matchedRows = CRITERIA.filter(({ matchField, key }) => {
            if (!matchedSet.has(matchField)) return false
            const val = fmtVal(key, currentResolveCard.delivered[key] as string | null)
            return val !== '—'
          })
          const autoFillRows = getAutoFillFields(currentResolveCard)
          const diffRows = getDiffFields(currentResolveCard)

          return (
            <div className="space-y-2">
              {/* Compact header: badge + inline hint */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ color: '#b45309', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  {diffRows.length} xung đột
                </span>
                <span className="text-[11px]" style={{ color: 'var(--ink-4)' }}>
                  · Nhấn vào cột để chọn giá trị muốn giữ
                </span>
              </div>

              {/* Matched + auto-fill — single compact row strip */}
              {(matchedRows.length > 0 || autoFillRows.length > 0) && (
                <div
                  className="rounded-lg px-3 py-2"
                  style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}
                >
                  <div className="flex flex-wrap gap-x-5 gap-y-0.5">
                    {matchedRows.map(({ key, label }) => (
                      <span key={key} className="flex items-center gap-1 text-[11px]">
                        <Check className="h-2.5 w-2.5 flex-shrink-0" style={{ color: '#6366f1' }} />
                        <span style={{ color: 'var(--ink-4)' }}>{label}</span>
                        <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{fmtVal(key, currentResolveCard.delivered[key] as string | null)}</span>
                      </span>
                    ))}
                    {autoFillRows.map(({ label, value }) => (
                      <span key={label} className="flex items-center gap-1 text-[11px]">
                        <ArrowRight className="h-2.5 w-2.5 flex-shrink-0" style={{ color: 'var(--ink-4)' }} />
                        <span style={{ color: 'var(--ink-4)' }}>{label}</span>
                        <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Git-style conflict diff blocks */}
              {diffRows.map(({ label, delivered, booked }) => (
                <div
                  key={label}
                  className="overflow-hidden"
                  style={{ border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10 }}
                >
                  {/* Field label header */}
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5"
                    style={{ background: 'rgba(99,102,241,0.04)', borderBottom: '1px solid rgba(99,102,241,0.1)' }}
                  >
                    <AlertCircle className="h-3 w-3" style={{ color: '#f59e0b' }} />
                    <span className="text-[11px] font-medium" style={{ color: 'var(--ink-3)' }}>
                      {label}
                    </span>
                  </div>

                  {/* Split pane */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr' }}>
                    {/* Left: Dữ liệu đã đi */}
                    <div
                      onClick={() => setLocalChoice('delivered')}
                      className="cursor-pointer transition-colors"
                      style={{
                        padding: '12px 16px',
                        background: localChoice === 'delivered' ? 'rgba(99,102,241,0.07)' : 'transparent',
                        outline: localChoice === 'delivered' ? '2px solid #6366f1' : 'none',
                        outlineOffset: -2,
                      }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: localChoice === 'delivered' ? '#6366f1' : 'var(--ink-4)' }}>
                        Dữ liệu đã đi
                      </p>
                      <p className="font-mono text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
                        {delivered}
                      </p>
                    </div>

                    {/* Divider */}
                    <div style={{ background: 'rgba(99,102,241,0.12)' }} />

                    {/* Right: Dữ liệu chủ hàng */}
                    <div
                      onClick={() => setLocalChoice('booked')}
                      className="cursor-pointer transition-colors"
                      style={{
                        padding: '12px 16px',
                        background: localChoice === 'booked' ? 'rgba(99,102,241,0.07)' : 'transparent',
                        outline: localChoice === 'booked' ? '2px solid #6366f1' : 'none',
                        outlineOffset: -2,
                      }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: localChoice === 'booked' ? '#6366f1' : 'var(--ink-4)' }}>
                        Dữ liệu chủ hàng
                      </p>
                      <p className="font-mono text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
                        {booked}
                      </p>
                    </div>
                  </div>

                  {/* Result row */}
                  <div
                    className="flex items-center gap-2 px-3 py-2"
                    style={{ borderTop: '1px solid rgba(99,102,241,0.1)', background: 'rgba(99,102,241,0.03)' }}
                  >
                    <span className="text-[11px]" style={{ color: 'var(--ink-4)' }}>Kết quả:</span>
                    {localChoice ? (
                      <span className="font-mono text-[12px] font-bold" style={{ color: '#6366f1' }}>
                        {localChoice === 'delivered' ? delivered : booked}
                        <span className="font-sans font-normal text-[10px] ml-1.5" style={{ color: 'var(--ink-4)' }}>
                          ({localChoice === 'delivered' ? 'đã đi' : 'chủ hàng'})
                        </span>
                      </span>
                    ) : (
                      <span className="text-[11px] italic" style={{ color: 'var(--ink-4)' }}>chưa chọn</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        })() : (
          <>
            {/* Legend */}
            {candidates.length > 0 && (
              <div className="flex items-center gap-3 pb-2.5 mb-1" style={{ borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
                <span className="flex items-center gap-1.5 text-[10.5px]">
                  <span className="inline-block w-3 h-2 rounded-sm" style={{ background: 'rgba(99,102,241,0.5)' }} />
                  <span style={{ color: 'var(--ink-3)' }}>Đã đi</span>
                </span>
                <ArrowRight className="h-2.5 w-2.5" style={{ color: 'var(--ink-4)' }} />
                <span className="flex items-center gap-1.5 text-[10.5px]">
                  <span className="inline-block w-3 h-2 rounded-sm" style={{ background: '#f59e0b' }} />
                  <span style={{ color: 'var(--ink-3)' }}>Chủ hàng</span>
                </span>
                <span className="ml-auto flex items-center gap-1">
                  <button
                    className="text-[10.5px] font-medium px-3 py-1 rounded-full transition-all duration-150 hover:scale-105 active:scale-95"
                    style={{
                      color: allSelected ? '#6366f1' : 'var(--ink-3)',
                      background: allSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
                      border: `1px solid ${allSelected ? 'rgba(99,102,241,0.25)' : 'transparent'}`,
                    }}
                    onClick={() => { setDeselected(new Set()); setAllSelected(true) }}
                  >
                    Chọn tất cả
                  </button>
                  <button
                    className="text-[10.5px] font-medium px-3 py-1 rounded-full transition-all duration-150 hover:scale-105 active:scale-95"
                    style={{
                      color: !allSelected ? '#6366f1' : 'var(--ink-3)',
                      background: !allSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
                      border: `1px solid ${!allSelected ? 'rgba(99,102,241,0.25)' : 'transparent'}`,
                    }}
                    onClick={() => { setDeselected(new Set(allKeys)); setAllSelected(false) }}
                  >
                    Bỏ tất cả
                  </button>
                </span>
              </div>
            )}

            <div className="max-h-[60vh] overflow-y-auto pr-1">
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
                    <rect x="78" y="60" width="18" height="5" rx="2.5" fill="#F59E0B" fillOpacity="0.2" />
                    <text x="87" y="64.5" textAnchor="middle" fontSize="4" fontFamily="monospace" fill="#D97706" fontWeight="600">TO#</text>
                    <circle cx="60" cy="50" r="10" fill="white" stroke="#E2E8F0" strokeWidth="1.5" />
                    <path d="M55 48.5 C55 46.5 56.5 45 58.5 45 L60 45" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M65 51.5 C65 53.5 63.5 55 61.5 55 L60 55" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="59" y1="47" x2="61" y2="53" stroke="#E2E8F0" strokeWidth="1.2" strokeLinecap="round" />
                    <line x1="48" y1="50" x2="50" y2="50" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
                    <line x1="70" y1="50" x2="72" y2="50" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
                    <circle cx="60" cy="50" r="2.5" fill="#F59E0B" fillOpacity="0.9" />
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
                    <div className="mb-4">
                      <h3 className="text-[12px] font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--ink-2)' }}>
                        <span style={{ display: 'inline-block', width: 3, height: 11, borderRadius: 2, background: 'linear-gradient(to bottom,#6366f1,#a855f7)', flexShrink: 0 }} />
                        Khớp đầy đủ ({fullMatches.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                        {fullMatches.map(renderCandidate)}
                      </div>
                    </div>
                  )}
                  {partialMatches.length > 0 && (
                    <div>
                      <h3 className="text-[12px] font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--ink-2)' }}>
                        <span style={{ display: 'inline-block', width: 3, height: 11, borderRadius: 2, background: 'linear-gradient(to bottom,#f59e0b,#f97316)', flexShrink: 0 }} />
                        Khớp một phần ({partialMatches.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                        {partialMatches.map(renderCandidate)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        <DialogFooter className={resolving ? 'justify-between items-center' : 'justify-end'}>
          {resolving ? (
            <>
              {/* Left: prev / counter / next navigation */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleNavPrev}
                  disabled={resolveIndex === 0}
                  className="flex items-center justify-center w-7 h-7 rounded-full transition-all disabled:opacity-30 hover:scale-110 active:scale-95"
                  style={{ color: 'var(--ink-3)', border: '1px solid var(--line)' }}
                  onMouseEnter={(e) => { if (resolveIndex > 0) { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(99,102,241,0.08)'; b.style.borderColor = 'rgba(99,102,241,0.3)'; b.style.color = '#6366f1' } }}
                  onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'transparent'; b.style.borderColor = 'var(--line)'; b.style.color = 'var(--ink-3)' }}
                  aria-label="Trường trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-[12px] tabular-nums px-2 font-medium" style={{ color: 'var(--ink-3)', minWidth: 40, textAlign: 'center' }}>
                  {resolveIndex + 1} / {diffPairs.length}
                </span>
                <button
                  onClick={handleNavNext}
                  disabled={resolveIndex >= diffPairs.length - 1}
                  className="flex items-center justify-center w-7 h-7 rounded-full transition-all disabled:opacity-30 hover:scale-110 active:scale-95"
                  style={{ color: 'var(--ink-3)', border: '1px solid var(--line)' }}
                  onMouseEnter={(e) => { if (resolveIndex < diffPairs.length - 1) { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(99,102,241,0.08)'; b.style.borderColor = 'rgba(99,102,241,0.3)'; b.style.color = '#6366f1' } }}
                  onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'transparent'; b.style.borderColor = 'var(--line)'; b.style.color = 'var(--ink-3)' }}
                  aria-label="Trường tiếp theo"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Right: back to grid + apply */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setResolving(false); setLocalChoice(null) }}
                  disabled={isConfirming}
                  className="text-sm font-medium px-4 py-2 rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  style={{ color: 'var(--ink-3)', background: 'var(--surface-2)', border: '1px solid var(--line)' }}
                >
                  Quay lại
                </button>
                <button
                  onClick={handleApplyChoice}
                  disabled={!localChoice || isConfirming}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-white text-sm font-semibold tracking-wide transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none"
                  style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
                >
                  {isConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  Áp dụng
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={selectedPairs.length === 0 || isConfirming}
              className="ai-btn-glow inline-flex items-center gap-2 px-5 py-2 rounded-full text-white text-sm font-semibold tracking-wide transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none"
              style={{ background: 'linear-gradient(to right, #6366f1, #a855f7, #ec4899)' }}
            >
              {isConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Ghép {selectedPairs.length} cặp
              <span className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
            </button>
          )}
        </DialogFooter>
        </>}
      </DialogContent>
    </Dialog>
  )
}
