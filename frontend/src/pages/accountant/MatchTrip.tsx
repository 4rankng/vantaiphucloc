import { useParams, useNavigate } from 'react-router-dom'
import { useMatchTrip } from '@/hooks/use-match-trip'
import { ContBadge } from '@/components/shared/ContBadge'
import { PickModal } from '@/components/shared/PickModal'
import { CompareRow } from '@/components/shared/CompareRow'
import { ContCompareRow } from '@/components/shared/ContCompareRow'
import { ConfirmationCheckbox } from '@/components/shared/ConfirmationCheckbox'
import { StatusBadgePro } from '@/components/shared/StatusBadgePro'
import type { WOSuggestion } from '@/data/domain'
import {
  Check, ChevronDown, X, Sparkles, ArrowLeft, ArrowUpDown,
  Truck, FileText, AlertCircle, CheckCircle2, Plus,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { useToggleTripConfirmation } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { useMemo } from 'react'

function WOSuggestionCard({
  suggestion,
  onSelect,
  index,
  isSelected,
}: {
  suggestion: WOSuggestion
  onSelect: () => void
  index: number
  isSelected?: boolean
}) {
  const { workOrder, confidence, matchedFields, score } = suggestion
  const isFull = confidence === 'full'
  const isPartial = confidence === 'partial'

  const confidencePercent = Math.min(100, score ?? 0)
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
          {workOrder.containers.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <ContBadge type={c.workType} />
              <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                {c.containerNumber}
              </span>
            </span>
          ))}
        </div>
        <p className="text-sm mb-1.5" style={{ color: 'var(--theme-text-secondary)' }}>
          <span className="font-medium">{workOrder.driverName}</span> · {workOrder.clientName} · {workOrder.route}
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

export function MatchTrip() {
  const { tripId: tripIdStr } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const isMobile = useIsMobile(1024)
  const { mutate: toggleConfirmation, isPending: toggling } = useToggleTripConfirmation()

  const {
    loading, loadingSuggestions, submitting, pickMode, setPickMode,
    clientOptions, routeOptions,
    unmatchedJobs, draftTrips,
    selectedJob, selectedTrip,
    selectedTripId, setSelectedTripId,
    selectedJobId, setSelectedJobId,
    suggestions,
    tripClient, jobClient, tripRoute, jobRoute, tripConts, jobConts,
    contMatched, clientMatched, routeMatched,
    setTripClient, setTripRoute, setTripContainers,
    setJobClient, setJobRoute, setJobContainers,
    handleMatch,
  } = useMatchTrip(Number(tripIdStr))

  // Memoize edit configs
  const clientEditLeft = useMemo(() => ({ options: clientOptions, onChange: setTripClient, placeholder: 'Chọn khách hàng...' }), [clientOptions, setTripClient])
  const clientEditRight = useMemo(() => ({ options: clientOptions, onChange: setJobClient, placeholder: 'Chọn khách hàng...' }), [clientOptions, setJobClient])
  const routeEditLeft = useMemo(() => ({ options: routeOptions, onChange: setTripRoute, placeholder: 'Chọn cung đường...' }), [routeOptions, setTripRoute])
  const routeEditRight = useMemo(() => ({ options: routeOptions, onChange: setJobRoute, placeholder: 'Chọn cung đường...' }), [routeOptions, setJobRoute])
  const contEditLeft = useMemo(() => ({ onChange: setTripContainers, accentColor: 'var(--theme-status-warning)' }), [setTripContainers])
  const contEditRight = useMemo(() => ({ onChange: setJobContainers, accentColor: 'var(--theme-brand-primary)' }), [setJobContainers])

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
      {/* Header */}
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
                Khớp chuyến đi
              </h1>
              <p className="typo-meta">Ghép nối chuyến yêu cầu với chuyến đã chạy</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Panel - Trip Selectors */}
        <div
          className="lg:w-[420px] xl:w-[480px] shrink-0 p-4 lg:p-6 lg:border-r overflow-y-auto"
          style={{ borderColor: 'var(--theme-border-light)' }}
        >
          <div className="space-y-4">
            {/* Trip Selector - Yêu cầu */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--theme-status-warning)' }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-status-warning)' }}>
                  Chuyến yêu cầu
                </span>
              </div>
              <button
                onClick={() => setPickMode('trip')}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg touch-manipulation transition-all hover:scale-[1.01]"
                style={{
                  background: 'var(--theme-bg-secondary)',
                  boxShadow: 'var(--theme-shadow-card)',
                  border: selectedTrip ? '2px solid var(--theme-status-warning)' : '1px solid var(--theme-border-default)',
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--theme-status-warning-light)' }}>
                    <FileText className="w-5 h-5" style={{ color: 'var(--theme-status-warning)' }} />
                  </div>
                  {selectedTrip ? (
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
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chọn chuyến yêu cầu</p>
                  )}
                </div>
                <ChevronDown className="w-5 h-5 shrink-0 ml-2" style={{ color: 'var(--theme-text-muted)' }} />
              </button>
            </div>

            {/* Connection Line */}
            <div className="flex items-center justify-center py-1">
              <ArrowUpDown className="w-5 h-5" style={{ color: 'var(--theme-text-muted)' }} />
            </div>

            {/* Job Selector - Đã chạy */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--theme-brand-primary)' }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-brand-primary)' }}>
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
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--theme-brand-primary-light)' }}>
                    <Truck className="w-5 h-5" style={{ color: 'var(--theme-brand-primary)' }} />
                  </div>
                  {selectedJob ? (
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {selectedJob.containers.map(c => (
                          <span key={c.containerNumber} className="flex items-center gap-1">
                            <ContBadge type={c.workType} />
                            <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{c.containerNumber}</span>
                          </span>
                        ))}
                      </div>
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--theme-text-muted)' }}>{selectedJob.driverName} · {selectedJob.clientName}</p>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chọn chuyến đã chạy</p>
                  )}
                </div>
                <ChevronDown className="w-5 h-5 shrink-0 ml-2" style={{ color: 'var(--theme-text-muted)' }} />
              </button>
            </div>

            {/* Suggestions Panel */}
            {suggestions.length > 0 && !selectedJobId && (
              <div
                className="mt-6 p-4 rounded-lg"
                style={{
                  background: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--theme-border-default)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg" style={{ background: 'var(--theme-brand-primary-light)' }}>
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--theme-brand-primary)' }} />
                  </div>
                  <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Gợi ý khớp</p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
                    {suggestions.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {suggestions.map((s, index) => (
                    <WOSuggestionCard
                      key={s.workOrder.id}
                      suggestion={s}
                      index={index}
                      onSelect={() => setSelectedJobId(s.workOrder.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Comparison View */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedTrip && selectedJob ? (
            <>
              {/* Comparison Header */}
              <div
                className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)' }}
              >
                <h2 className="typo-h3">So sánh chi tiết</h2>
                <p className="typo-meta">Nhấn vào từng mục để chỉnh sửa</p>
              </div>

              {/* Comparison Rows */}
              <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-3">
                <ContCompareRow left={tripConts} right={jobConts} matched={contMatched} leftLabel="Yêu cầu" rightLabel="Đã chạy" editLeft={contEditLeft} editRight={contEditRight} />
                <CompareRow label="Khách hàng" left={tripClient} right={jobClient} matched={clientMatched} leftLabel="Yêu cầu" rightLabel="Đã chạy" editLeft={clientEditLeft} editRight={clientEditRight} />
                <CompareRow label="Cung đường" left={tripRoute} right={jobRoute} matched={routeMatched} leftLabel="Yêu cầu" rightLabel="Đã chạy" editLeft={routeEditLeft} editRight={routeEditRight} />
              </div>

              {/* Action Footer */}
              <div
                className="px-4 lg:px-6 pb-4 lg:pb-6 pt-3 shrink-0 space-y-3"
                style={{ borderTop: '1px solid var(--theme-border-light)' }}
              >
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--theme-bg-secondary)' }}>
                  <div className="flex items-center gap-3">
                    {allMatched ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--theme-status-success)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--theme-status-success)' }}>Tất cả thông tin khớp</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5" style={{ color: 'var(--theme-status-warning)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--theme-status-warning)' }}>Một số thông tin chưa khớp</span>
                      </>
                    )}
                  </div>
                  <ConfirmationCheckbox
                    isConfirmed={selectedTrip.isConfirmed}
                    onToggle={handleToggleConfirmation}
                    disabled={toggling}
                    label="Đã chốt"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleMatch}
                    disabled={submitting}
                    className="flex-1 h-12 font-bold rounded-xl text-sm gap-2"
                    style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
                  >
                    <Check className="w-5 h-5" />
                    {submitting ? 'Đang khớp...' : 'Xác nhận khớp chuyến'}
                  </Button>
                  <button
                    onClick={() => navigate('/accountant/create-trip', { state: { fromTripOrder: selectedTrip } })}
                    className="h-12 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-brand-primary)', border: '1px solid var(--theme-border-default)' }}
                  >
                    <Plus className="w-4 h-4" /> Tạo chuyến mới
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--theme-bg-secondary)' }}>
                  <ArrowUpDown className="w-8 h-8" style={{ color: 'var(--theme-text-muted)' }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--theme-text-primary)' }}>Chọn hai chuyến để so sánh</h3>
                <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                  Chọn một chuyến yêu cầu và một chuyến đã chạy để bắt đầu so sánh và khớp thông tin
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Picker modals */}
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
                  <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{c.containerNumber}</span>
                </span>
              ))}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>{trip.clientName}</p>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{trip.route}</p>
          </div>
        )}
      />
      <PickModal
        open={pickMode === 'job'}
        title="Chọn chuyến đã chạy"
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
                  <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{c.containerNumber}</span>
                </span>
              ))}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>{job.driverName} · {job.clientName}</p>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{job.route}</p>
          </div>
        )}
      />
    </div>
  )
}
