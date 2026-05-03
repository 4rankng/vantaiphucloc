import { useParams, useNavigate } from 'react-router-dom'
import { useMatchJob } from '@/hooks/use-match-job'
import { ContBadge } from '@/components/shared/ContBadge'
import { PickModal } from '@/components/shared/PickModal'
import { CompareRow } from '@/components/shared/CompareRow'
import { ContCompareRow } from '@/components/shared/ContCompareRow'
import { ConfirmationCheckbox } from '@/components/shared/ConfirmationCheckbox'
import { StatusBadgePro } from '@/components/shared/StatusBadgePro'
import type { MatchSuggestion } from '@/data/domain'
import {
  Check, ChevronDown, X, Sparkles, Plus, ArrowLeft,
  FileText, Truck, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { useToggleTripConfirmation } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { useMemo } from 'react'

function SuggestionCard({ suggestion, onSelect, index, isSelected }: {
  suggestion: MatchSuggestion; onSelect: () => void; index: number; isSelected?: boolean
}) {
  const { tripOrder, confidence, matchedFields, score } = suggestion
  const isFull = confidence === 'full'
  const isPartial = confidence === 'partial'

  const confidencePercent = Math.min(100, score)
  const confidenceColor = isFull ? 'var(--theme-status-success)' : isPartial ? 'var(--theme-status-warning)' : 'var(--theme-text-muted)'

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl transition-all touch-manipulation overflow-hidden ${
        isSelected ? 'ring-2 ring-offset-2' : 'hover:scale-[1.01]'
      }`}
      style={{
        background: isFull ? 'var(--theme-status-success-light)' : isPartial ? 'var(--theme-status-warning-light)' : 'var(--theme-bg-secondary)',
        border: `1px solid ${isFull ? 'var(--theme-status-success)' : isPartial ? 'var(--theme-status-warning)' : 'var(--theme-border-default)'}`,
        ringColor: 'var(--theme-brand-primary)',
      }}
    >
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--theme-border-light)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
            style={{
              background: isSelected ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
              color: isSelected ? 'var(--theme-text-on-brand)' : 'var(--theme-text-muted)',
            }}
          >
            {index + 1}
          </div>
          <StatusBadgePro
            variant={isFull ? 'success' : isPartial ? 'warning' : 'neutral'}
            label={isFull ? 'Khớp đầy đủ' : isPartial ? 'Khớp một phần' : 'Gợi ý'}
            size="sm"
            showIcon
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--theme-bg-tertiary)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${confidencePercent}%`, background: confidenceColor }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums" style={{ color: confidenceColor }}>
            {confidencePercent}%
          </span>
        </div>
      </div>

      <div className="px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          {(tripOrder.containers?.length ? tripOrder.containers : []).map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <ContBadge type={c.workType} />
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                {c.containerNumber}
              </span>
            </span>
          ))}
        </div>
        <p className="text-sm mb-1.5" style={{ color: 'var(--theme-text-secondary)' }}>
          <span className="font-medium">{tripOrder.clientName}</span> · {tripOrder.route}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {matchedFields.map(f => (
            <span
              key={f}
              className="text-xs px-2 py-0.5 rounded-md font-medium flex items-center gap-1"
              style={{ background: 'var(--theme-status-success-light)', color: 'var(--theme-status-success)' }}
            >
              <Check className="w-3 h-3" />
              {f === 'driver' ? 'Tài xế' : f === 'client' ? 'Khách hàng' : f === 'route' ? 'Cung đường' : 'Container'}
            </span>
          ))}
        </div>
      </div>
    </button>
  )
}

export function MatchJob() {
  const { jobId: jobIdStr } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const isMobile = useIsMobile(1024)
  const { mutate: toggleConfirmation, isPending: toggling } = useToggleTripConfirmation()
  const {
    loading, loadingSuggestions, submitting, pickMode, setPickMode,
    clientOptions, routeOptions,
    unmatchedJobs, draftTrips,
    selectedJob, selectedTrip,
    selectedJobId, setSelectedJobId,
    selectedTripId, setSelectedTripId,
    suggestions,
    jobClient, tripClient, jobRoute, tripRoute, jobConts, tripConts,
    contMatched, clientMatched, routeMatched,
    setJobClient, setJobRoute, setJobContainers,
    setTripClient, setTripRoute, setTripContainers,
    handleMatch,
  } = useMatchJob(Number(jobIdStr))

  // Memoize edit configs to prevent unnecessary re-renders
  const clientEditLeft = useMemo(() => ({ options: clientOptions, onChange: setJobClient, placeholder: 'Chọn khách hàng...' }), [clientOptions, setJobClient])
  const clientEditRight = useMemo(() => ({ options: clientOptions, onChange: setTripClient, placeholder: 'Chọn khách hàng...' }), [clientOptions, setTripClient])
  const routeEditLeft = useMemo(() => ({ options: routeOptions, onChange: setJobRoute, placeholder: 'Chọn cung đường...' }), [routeOptions, setJobRoute])
  const routeEditRight = useMemo(() => ({ options: routeOptions, onChange: setTripRoute, placeholder: 'Chọn cung đường...' }), [routeOptions, setTripRoute])
  const contEditLeft = useMemo(() => ({ onChange: setJobContainers, accentColor: 'var(--theme-brand-primary)' }), [setJobContainers])
  const contEditRight = useMemo(() => ({ onChange: setTripContainers, accentColor: 'var(--theme-status-warning)' }), [setTripContainers])

  const handleToggleConfirmation = () => {
    if (!selectedTrip) return
    toggleConfirmation(selectedTrip.id, {
      onSuccess: () => {
        toast.success('Thành công', selectedTrip.isConfirmed ? 'Đã bỏ chốt chuyến' : 'Đã chốt chuyến')
      },
      onError: () => {
        toast.error('Lỗi', 'Không thể thay đổi trạng thái chốt')
      },
    })
  }

  const allMatched = contMatched && clientMatched && routeMatched

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-4">
        <div className="h-10 w-48 rounded-xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="h-64 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)] lg:h-screen">
      {/* Desktop header */}
      {!isMobile && (
        <div
          className="flex items-center justify-between px-6 lg:px-8 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--theme-border-default)', background: 'var(--theme-bg-secondary)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg transition-colors"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="typo-h2" style={{ color: 'var(--theme-text-primary)' }}>
                Đối soát phiếu
              </h1>
              <p className="typo-meta" style={{ color: 'var(--theme-text-muted)' }}>
                Ghép phiếu tài xế với đơn hàng
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Left panel - Full job info card with match indicators */}
        {selectedJob && (
          <div
            className="lg:w-[420px] xl:w-[480px] shrink-0 p-4 lg:p-6 lg:border-r overflow-y-auto"
            style={{ borderColor: 'var(--theme-border-light)' }}
          >
            {/* Header with "Đổi chuyến" button */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--theme-brand-primary)' }} />
                <span className="typo-label" style={{ color: 'var(--theme-brand-primary)' }}>Chuyến đã chạy</span>
              </div>
              <button
                onClick={() => setPickMode('job')}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  background: 'transparent',
                  color: 'var(--theme-brand-primary)',
                  border: '1px solid var(--theme-brand-primary)',
                }}
              >
                Đổi chuyến
              </button>
            </div>

            {/* Full job info card */}
            <div
              className="rounded-lg p-4 space-y-4"
              style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
            >
              {/* Driver */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="typo-caption" style={{ color: 'var(--theme-text-muted)' }}>Tài xế</p>
                  <p className="typo-h3" style={{ color: 'var(--theme-text-primary)' }}>{selectedJob.driverName}</p>
                </div>
                {selectedTrip && clientMatched && (
                  <span className="chip chip-success text-xs">✓ Khớp</span>
                )}
                {selectedTrip && !clientMatched && (
                  <span className="chip chip-error text-xs">✗ Khác</span>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--theme-border-light)' }} />

              {/* Vehicle plate */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="typo-caption" style={{ color: 'var(--theme-text-muted)' }}>Biển số xe</p>
                  <p className="typo-body font-mono" style={{ color: 'var(--theme-text-primary)' }}>{selectedJob.tractorPlate}</p>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--theme-border-light)' }} />

              {/* Date */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="typo-caption" style={{ color: 'var(--theme-text-muted)' }}>Ngày/Giờ</p>
                  <p className="typo-body" style={{ color: 'var(--theme-text-primary)' }}>
                    {selectedJob.createdAt ? new Date(selectedJob.createdAt).toLocaleString('vi-VN') : '-'}
                  </p>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--theme-border-light)' }} />

              {/* Route */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="typo-caption" style={{ color: 'var(--theme-text-muted)' }}>Cung đường</p>
                  <p className="typo-body" style={{ color: 'var(--theme-text-primary)' }}>{selectedJob.route}</p>
                </div>
                {selectedTrip && routeMatched && (
                  <span className="chip chip-success text-xs">✓ Khớp</span>
                )}
                {selectedTrip && !routeMatched && (
                  <span className="chip chip-error text-xs">✗ Khác</span>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--theme-border-light)' }} />

              {/* Containers */}
              <div>
                <p className="typo-caption mb-2" style={{ color: 'var(--theme-text-muted)' }}>Container</p>
                <div className="space-y-2">
                  {selectedJob.containers.map(c => (
                    <div key={c.containerNumber} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ContBadge type={c.workType} />
                        <span className="text-sm font-mono" style={{ color: 'var(--theme-text-primary)' }}>{c.containerNumber}</span>
                      </div>
                      {selectedTrip && contMatched && (
                        <span className="chip chip-success text-xs">✓ Khớp</span>
                      )}
                      {selectedTrip && !contMatched && (
                        <span className="chip chip-error text-xs">✗ Khác</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--theme-border-light)' }} />

              {/* Client */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="typo-caption" style={{ color: 'var(--theme-text-muted)' }}>Khách hàng</p>
                  <p className="typo-body font-medium" style={{ color: 'var(--theme-text-primary)' }}>{selectedJob.clientName}</p>
                </div>
                {selectedTrip && clientMatched && (
                  <span className="chip chip-success text-xs">✓ Khớp</span>
                )}
                {selectedTrip && !clientMatched && (
                  <span className="chip chip-error text-xs">✗ Khác</span>
                )}
              </div>
            </div>

            {/* Action buttons when trip selected */}
            {selectedTrip && (
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--theme-bg-secondary)' }}>
                  {allMatched ? (
                    <><CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-status-success)' }} /><span className="text-xs font-medium" style={{ color: 'var(--theme-status-success)' }}>Tất cả thông tin khớp</span></>
                  ) : (
                    <><AlertCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-status-warning)' }} /><span className="text-xs font-medium" style={{ color: 'var(--theme-status-warning)' }}>Một số thông tin chưa khớp</span></>
                  )}
                  <div className="ml-auto">
                    <ConfirmationCheckbox isConfirmed={selectedTrip.isConfirmed} onToggle={handleToggleConfirmation} disabled={toggling} label="Đã chốt" />
                  </div>
                </div>
                <Button
                  onClick={handleMatch}
                  disabled={submitting}
                  className="w-full h-10 font-semibold rounded-lg text-sm flex items-center justify-center gap-2"
                  style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
                >
                  <Check className="w-4 h-4" />
                  {submitting ? 'Đang khớp...' : 'Xác nhận khớp'}
                </Button>
                <button
                  onClick={() => navigate('/accountant/create-trip', { state: { fromWorkOrder: selectedJob } })}
                  className="w-full h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                  style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-brand-primary)', border: '1px solid var(--theme-border-default)' }}
                >
                  <Plus className="w-4 h-4" /> Tạo đơn mới
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty state - select a job first */}
        {!selectedJob && (
          <div
            className="lg:w-[420px] xl:w-[480px] shrink-0 p-4 lg:p-6 lg:border-r overflow-y-auto flex flex-col items-center justify-center"
            style={{ borderColor: 'var(--theme-border-light)' }}
          >
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--theme-bg-secondary)' }}
              >
                <Truck className="w-8 h-8" style={{ color: 'var(--theme-text-muted)' }} />
              </div>
              <p className="font-semibold mb-1" style={{ color: 'var(--theme-text-primary)' }}>Chọn chuyến đã chạy</p>
              <p className="text-xs mb-4" style={{ color: 'var(--theme-text-muted)' }}>Từ danh sách bên phải</p>
              <button
                onClick={() => setPickMode('job')}
                className="text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                style={{
                  background: 'var(--theme-brand-primary)',
                  color: 'var(--theme-text-on-brand)',
                }}
              >
                Chọn chuyến
              </button>
            </div>
          </div>
        )}

        {/* Right panel — candidate list / comparison view */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedJob && selectedTrip ? (
            <>
              <div
                className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}
              >
                <h2 className="typo-h3">So sánh chi tiết</h2>
                <p className="typo-meta">Nhấn vào từng mục để chỉnh sửa</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-3">
                <ContCompareRow left={jobConts} right={tripConts} matched={contMatched} leftLabel="Đã chạy" rightLabel="Yêu cầu" editLeft={contEditLeft} editRight={contEditRight} />
                <CompareRow label="Khách hàng" left={jobClient} right={tripClient} matched={clientMatched} leftLabel="Đã chạy" rightLabel="Yêu cầu" editLeft={clientEditLeft} editRight={clientEditRight} />
                <CompareRow label="Cung đường" left={jobRoute} right={tripRoute} matched={routeMatched} leftLabel="Đã chạy" rightLabel="Yêu cầu" editLeft={routeEditLeft} editRight={routeEditRight} />
              </div>
            </>
          ) : (
            <>
              <div
                className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--theme-status-warning)' }} />
                  <h2 className="typo-h3">Chọn đơn hàng</h2>
                  <span className="typo-caption px-2 py-1 rounded" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}>
                    {draftTrips.filter(t => t.status === 'PENDING').length}
                  </span>
                  {suggestions.length > 0 && (
                    <span className="flex items-center gap-1 typo-caption px-2 py-1 rounded" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
                      <Sparkles className="w-3 h-3" /> {suggestions.length} gợi ý
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4">
                {draftTrips.filter(t => t.status === 'PENDING').length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <FileText className="w-10 h-10 mb-3" style={{ color: 'var(--theme-text-muted)' }} />
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--theme-text-primary)' }}>Không có đơn hàng nào</p>
                    <p className="text-xs mb-4" style={{ color: 'var(--theme-text-muted)' }}>Tạo đơn hàng mới để bắt đầu đối soát</p>
                    <button
                      onClick={() => navigate('/accountant/create-trip', { state: { fromWorkOrder: selectedJob } })}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                      style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
                    >
                      <Plus className="w-4 h-4" /> Tạo đơn mới
                    </button>
                  </div>
                ) : (() => {
                  const pendingTrips = draftTrips.filter(t => t.status === 'PENDING')
                  const suggestedIds = new Set(suggestions.map(s => s.tripOrder.id))
                  const unsuggestedTrips = pendingTrips.filter(t => !suggestedIds.has(t.id))

                  // Helper to check if trip matches selected job
                  const getTripMatches = (trip: any) => {
                    if (!selectedJob) return { clientMatches: false, routeMatches: false, contsMatch: false }
                    const clientMatches = trip.clientName === selectedJob.clientName
                    const routeMatches = trip.route === selectedJob.route
                    const jobContNumbers = new Set(selectedJob.containers.map(c => c.containerNumber))
                    const tripContNumbers = new Set((trip.containers ?? []).map(c => c.containerNumber))
                    const contsMatch = jobContNumbers.size > 0 && tripContNumbers.size > 0 &&
                      Array.from(jobContNumbers).every(num => tripContNumbers.has(num))
                    return { clientMatches, routeMatches, contsMatch }
                  }

                  return (
                    <div className="space-y-3">
                      {suggestions.length > 0 && (
                        <>
                          <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 px-1" style={{ color: 'var(--theme-brand-primary)' }}>
                            <Sparkles className="w-3 h-3" /> Gợi ý khớp
                          </p>
                          {suggestions.map((s, idx) => {
                            const isFull = s.confidence === 'full'
                            const isPartial = s.confidence === 'partial'
                            const pct = Math.min(100, s.score)
                            const color = isFull ? 'var(--theme-status-success)' : isPartial ? 'var(--theme-status-warning)' : 'var(--theme-text-muted)'
                            const isSelected = selectedTripId === s.tripOrder.id
                            const isBestMatch = idx === 0
                            return (
                              <div key={s.tripOrder.id}>
                                <div className="relative">
                                  {isBestMatch && (
                                    <div
                                      className="absolute -top-2 -left-2 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 z-10"
                                      style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
                                    >
                                      <Sparkles className="w-3 h-3" /> Đề xuất tốt nhất
                                    </div>
                                  )}
                                  <button
                                    onClick={() => setSelectedTripId(s.tripOrder.id)}
                                    className="w-full text-left px-3 py-3 rounded-lg touch-manipulation transition-all"
                                    style={{
                                      background: isSelected ? 'var(--theme-brand-primary-light)' : isFull ? 'var(--theme-status-success-light)' : isPartial ? 'var(--theme-status-warning-light)' : 'var(--theme-bg-secondary)',
                                      border: isSelected ? '2px solid var(--theme-brand-primary)' : isFull ? '1px solid var(--theme-status-success)' : isPartial ? '1px solid var(--theme-status-warning)' : '1px solid var(--theme-border-default)',
                                    }}
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                      <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0" style={{ background: isSelected ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: isSelected ? 'var(--theme-text-on-brand)' : 'var(--theme-text-muted)' }}>{idx + 1}</div>
                                      <div className="flex flex-wrap items-center gap-1">
                                        {(s.tripOrder.containers?.length ? s.tripOrder.containers : []).map((c, i) => (
                                          <span key={i} className="flex items-center gap-0.5">
                                            <ContBadge type={c.workType} />
                                            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{c.containerNumber}</span>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                                      <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--theme-bg-tertiary)' }}>
                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                                      </div>
                                      <span className="text-[10px] font-bold tabular-nums" style={{ color }}>{pct}%</span>
                                    </div>
                                  </div>
                                  <p className="text-xs mb-1.5" style={{ color: 'var(--theme-text-secondary)' }}>{s.tripOrder.clientName} · {s.tripOrder.route}</p>
                                  {s.matchedFields.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {s.matchedFields.map(f => (
                                        <span key={f} className="text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 chip chip-success" style={{ background: 'var(--theme-status-success-light)', color: 'var(--theme-status-success)' }}>
                                          <Check className="w-2 h-2" />
                                          {f === 'driver' ? 'Tài xế' : f === 'client' ? 'Khách hàng' : f === 'route' ? 'Cung đường' : 'Container'}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </button>

                                {/* Inline match details when selected */}
                                {isSelected && (
                                  <div className="mt-2 space-y-1 ml-1">
                                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--theme-text-muted)' }}>Chi tiết khớp:</p>
                                    <div className="text-xs space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        {s.matchedFields.includes('client') ? (
                                          <span className="chip chip-success">✓ Khách hàng</span>
                                        ) : (
                                          <span className="chip chip-error">✗ Khách hàng khác</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {s.matchedFields.includes('route') ? (
                                          <span className="chip chip-success">✓ Cung đường</span>
                                        ) : (
                                          <span className="chip chip-error">✗ Cung đường khác</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {s.matchedFields.includes('container') ? (
                                          <span className="chip chip-success">✓ Container</span>
                                        ) : (
                                          <span className="chip chip-error">✗ Container khác</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </>
                      )}
                      {unsuggestedTrips.length > 0 && (
                        <>
                          {suggestions.length > 0 && (
                            <p className="text-xs font-semibold uppercase tracking-wide mt-4" style={{ color: 'var(--theme-text-muted)' }}>Tất cả đơn hàng</p>
                          )}
                          {unsuggestedTrips.map(trip => {
                            const { clientMatches, routeMatches, contsMatch } = getTripMatches(trip)
                            const isSelected = selectedTripId === trip.id
                            return (
                              <div key={trip.id}>
                                <button
                                  onClick={() => setSelectedTripId(trip.id)}
                                  className="w-full text-left px-3 py-3 rounded-lg touch-manipulation transition-all"
                                  style={{
                                    background: isSelected ? 'var(--theme-brand-primary-light)' : 'var(--theme-bg-secondary)',
                                    border: isSelected ? '2px solid var(--theme-brand-primary)' : '1px solid var(--theme-border-default)',
                                  }}
                                >
                                  <div className="flex items-start gap-2.5 mb-1">
                                    <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ background: isSelected ? 'var(--theme-brand-primary)' : 'var(--theme-status-warning-light)' }}>
                                      <FileText className="w-4 h-4" style={{ color: isSelected ? 'var(--theme-text-on-brand)' : 'var(--theme-status-warning)' }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-1 mb-0.5">
                                        {(trip.containers?.length ? trip.containers : []).map((c, i) => (
                                          <span key={i} className="flex items-center gap-0.5">
                                            <ContBadge type={c.workType} />
                                            <span className="text-xs font-mono" style={{ color: 'var(--theme-text-primary)' }}>{c.containerNumber}</span>
                                          </span>
                                        ))}
                                      </div>
                                      <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>{trip.clientName} · {trip.route}</p>
                                    </div>
                                  </div>
                                  </button>
                                </div>

                                {/* Inline match details when selected */}
                                {isSelected && (
                                  <div className="mt-2 space-y-1 ml-1">
                                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--theme-text-muted)' }}>Chi tiết khớp:</p>
                                    <div className="text-xs space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        {clientMatches ? (
                                          <span className="chip chip-success">✓ Khách hàng</span>
                                        ) : (
                                          <span className="chip chip-error">✗ {trip.clientName}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {routeMatches ? (
                                          <span className="chip chip-success">✓ Cung đường</span>
                                        ) : (
                                          <span className="chip chip-error">✗ {trip.route}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {contsMatch ? (
                                          <span className="chip chip-success">✓ Container</span>
                                        ) : (
                                          <span className="chip chip-error">✗ Khác</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </>
                      )}
                    </div>
                  )
                })()}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Picker modals */}
      <PickModal
        open={pickMode === 'job'}
        title="Chọn phiếu tài xế"
        items={unmatchedJobs.filter(j => j.status === 'PENDING')}
        selectedId={selectedJobId}
        onSelect={setSelectedJobId}
        onClose={() => setPickMode(null)}
        searchKeys={job => [job.driverName, job.clientName, job.route, ...job.containers.map(c => c.containerNumber)].join(' ')}
        renderLabel={job => (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {job.containers.map(c => (
                <span key={c.containerNumber} className="flex items-center gap-1">
                  <ContBadge type={c.workType} />
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                    {c.containerNumber}
                  </span>
                </span>
              ))}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
              {job.driverName} · {job.clientName}
            </p>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{job.route}</p>
          </div>
        )}
      />
      <PickModal
        open={pickMode === 'trip'}
        title="Chọn đơn hàng"
        items={draftTrips.filter(t => t.status === 'PENDING')}
        selectedId={selectedTripId}
        onSelect={setSelectedTripId}
        onClose={() => setPickMode(null)}
        searchKeys={trip => [trip.clientName, trip.route, ...(trip.containers ?? []).map(c => c.containerNumber)].join(' ')}
        renderLabel={trip => (
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(trip.containers?.length ? trip.containers : []).map((c, i) => (
                <span key={i} className="flex items-center gap-1">
                  <ContBadge type={c.workType} />
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                    {c.containerNumber}
                  </span>
                </span>
              ))}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>{trip.clientName}</p>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{trip.route}</p>
          </div>
        )}
      />
    </div>
  )
}
