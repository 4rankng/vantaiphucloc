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
        {/* Left panel - Job selector */}
        <div
          className="lg:w-[380px] xl:w-[420px] shrink-0 p-4 lg:p-6 lg:border-r overflow-y-auto"
          style={{ borderColor: 'var(--theme-border-light)' }}
        >
          <div className="space-y-4">
            {/* Job selector */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--theme-brand-primary)' }}
                />
                <span className="typo-label" style={{ color: 'var(--theme-brand-primary)' }}>
                  Chuyến đã chạy
                </span>
              </div>
              <button
                onClick={() => setPickMode('job')}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg touch-manipulation transition-all hover:scale-[1.01]"
                style={{
                  background: 'var(--theme-bg-secondary)',
                  boxShadow: 'var(--theme-shadow-card)',
                  border: selectedJob ? '2px solid var(--theme-brand-primary)' : '1px solid var(--theme-border-default)',
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--theme-brand-primary-light)' }}
                  >
                    <Truck className="w-5 h-5" style={{ color: 'var(--theme-brand-primary)' }} />
                  </div>
                  {selectedJob ? (
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {selectedJob.containers.map(c => (
                          <span key={c.containerNumber} className="flex items-center gap-1">
                            <ContBadge type={c.workType} />
                            <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                              {c.containerNumber}
                            </span>
                          </span>
                        ))}
                      </div>
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--theme-text-muted)' }}>
                        {selectedJob.driverName} · {selectedJob.clientName}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chọn chuyến đã chạy</p>
                  )}
                </div>
                <ChevronDown className="w-5 h-5 shrink-0 ml-2" style={{ color: 'var(--theme-text-muted)' }} />
              </button>
            </div>

            {/* Trip selector — shown when trip already selected */}
            {selectedTrip && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--theme-status-warning)' }} />
                  <span className="typo-label" style={{ color: 'var(--theme-status-warning)' }}>Đơn hàng đã chọn</span>
                </div>
                <button
                  onClick={() => setSelectedTripId(0)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg touch-manipulation transition-all hover:opacity-80"
                  style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '2px solid var(--theme-status-warning)' }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--theme-status-warning-light)' }}>
                      <FileText className="w-5 h-5" style={{ color: 'var(--theme-status-warning)' }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(selectedTrip.containers?.length ? selectedTrip.containers : []).map((c, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <ContBadge type={c.workType} />
                            <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{c.containerNumber}</span>
                          </span>
                        ))}
                      </div>
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--theme-text-muted)' }}>{selectedTrip.clientName} · {selectedTrip.route}</p>
                    </div>
                  </div>
                  <X className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--theme-text-muted)' }} />
                </button>
              </div>
            )}

            {/* Action buttons when both selected */}
            {selectedJob && selectedTrip && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--theme-bg-secondary)' }}>
                  {allMatched ? (
                    <><CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-status-success)' }} /><span className="text-xs font-medium" style={{ color: 'var(--theme-status-success)' }}>Tất cả thông tin khớp</span></>
                  ) : (
                    <><AlertCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-status-warning)' }} /><span className="text-xs font-medium" style={{ color: 'var(--theme-status-warning)' }}>Một số thông tin chưa khớp</span></>
                  )}
                  <div className="ml-auto">
                    <ConfirmationCheckbox isConfirmed={selectedTrip.isConfirmed} onToggle={handleToggleConfirmation} disabled={toggling} label="Đã chốt" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/accountant/create-trip', { state: { fromWorkOrder: selectedJob } })}
                    className="h-10 px-3 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-1.5 shrink-0"
                    style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-brand-primary)', border: '1px solid var(--theme-border-default)' }}
                  >
                    <Plus className="w-4 h-4" /> Tạo đơn mới
                  </button>
                  <Button
                    onClick={handleMatch}
                    disabled={submitting}
                    className="flex-1 h-10 font-bold rounded-lg text-sm flex items-center justify-center gap-2"
                    style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
                  >
                    <Check className="w-4 h-4" />
                    {submitting ? 'Đang khớp...' : 'Xác nhận khớp chuyến'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — trip list when no trip selected, comparison when selected */}
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
                    {draftTrips.length}
                  </span>
                  {suggestions.length > 0 && (
                    <span className="flex items-center gap-1 typo-caption px-2 py-1 rounded" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
                      <Sparkles className="w-3 h-3" /> {suggestions.length} gợi ý
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {draftTrips.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <FileText className="w-10 h-10 mb-3" style={{ color: 'var(--theme-text-muted)' }} />
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--theme-text-primary)' }}>Không có đơn hàng nào</p>
                    <p className="text-xs mb-4" style={{ color: 'var(--theme-text-muted)' }}>Tạo đơn hàng mới để bắt đầu đối soát</p>
                    <button
                      onClick={() => navigate('/accountant/create-trip', { state: { fromWorkOrder: selectedJob } })}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                      style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
                    >
                      <Plus className="w-4 h-4" /> Tạo đơn mới
                    </button>
                  </div>
                ) : (() => {
                  const suggestedIds = new Set(suggestions.map(s => s.tripOrder.id))
                  const unsuggestedTrips = draftTrips.filter(t => !suggestedIds.has(t.id))
                  return (
                    <div>
                      {suggestions.length > 0 && (
                        <>
                          <div className="px-4 pt-3 pb-1">
                            <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--theme-brand-primary)' }}>
                              <Sparkles className="w-3 h-3" /> Gợi ý khớp
                            </p>
                          </div>
                          {suggestions.map((s, idx) => {
                            const isFull = s.confidence === 'full'
                            const isPartial = s.confidence === 'partial'
                            const pct = Math.min(100, s.score)
                            const color = isFull ? 'var(--theme-status-success)' : isPartial ? 'var(--theme-status-warning)' : 'var(--theme-text-muted)'
                            return (
                              <button
                                key={s.tripOrder.id}
                                onClick={() => setSelectedTripId(s.tripOrder.id)}
                                className="w-full text-left px-4 py-3 flex items-start gap-3 touch-manipulation hover:opacity-80 transition-opacity"
                                style={{ borderBottom: '1px solid var(--theme-border-light)', background: isFull ? 'var(--theme-status-success-light)' : isPartial ? 'var(--theme-status-warning-light)' : 'transparent' }}
                              >
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-muted)' }}>{idx + 1}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                    {(s.tripOrder.containers?.length ? s.tripOrder.containers : []).map((c, i) => (
                                      <span key={i} className="flex items-center gap-1">
                                        <ContBadge type={c.workType} />
                                        <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{c.containerNumber}</span>
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-xs truncate" style={{ color: 'var(--theme-text-secondary)' }}>{s.tripOrder.clientName} · {s.tripOrder.route}</p>
                                  {s.matchedFields.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {s.matchedFields.map(f => (
                                        <span key={f} className="text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5" style={{ background: 'var(--theme-status-success-light)', color: 'var(--theme-status-success)' }}>
                                          <Check className="w-2.5 h-2.5" />
                                          {f === 'driver' ? 'Tài xế' : f === 'client' ? 'Khách hàng' : f === 'route' ? 'Cung đường' : 'Container'}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--theme-bg-tertiary)' }}>
                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                                  </div>
                                  <span className="text-[10px] font-bold tabular-nums" style={{ color }}>{pct}%</span>
                                </div>
                              </button>
                            )
                          })}
                        </>
                      )}
                      {unsuggestedTrips.length > 0 && (
                        <>
                          {suggestions.length > 0 && (
                            <div className="px-4 pt-3 pb-1">
                              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>Tất cả đơn hàng</p>
                            </div>
                          )}
                          {unsuggestedTrips.map(trip => (
                            <button
                              key={trip.id}
                              onClick={() => setSelectedTripId(trip.id)}
                              className="w-full text-left px-4 py-3 flex items-start gap-3 touch-manipulation hover:opacity-80 transition-opacity"
                              style={{ borderBottom: '1px solid var(--theme-border-light)' }}
                            >
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--theme-status-warning-light)' }}>
                                <FileText className="w-5 h-5" style={{ color: 'var(--theme-status-warning)' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                  {(trip.containers?.length ? trip.containers : []).map((c, i) => (
                                    <span key={i} className="flex items-center gap-1">
                                      <ContBadge type={c.workType} />
                                      <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{c.containerNumber}</span>
                                    </span>
                                  ))}
                                </div>
                                <p className="text-xs truncate" style={{ color: 'var(--theme-text-secondary)' }}>{trip.clientName} · {trip.route}</p>
                              </div>
                            </button>
                          ))}
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
        items={unmatchedJobs}
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
        items={draftTrips}
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
