import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useCallback } from 'react'
import { useMatchJob } from '@/hooks/use-match-job'
import { ContBadge } from '@/components/shared/ContBadge'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { PickModal } from '@/components/shared/PickModal'
import { EditDialog } from '@/components/shared/EditDialog'
import { CompareRow } from '@/components/shared/CompareRow'
import { ContCompareRow } from '@/components/shared/ContCompareRow'
import { ConfirmationCheckbox } from '@/components/shared/ConfirmationCheckbox'
import { StatusBadgePro } from '@/components/shared/StatusBadgePro'
import { WORK_TYPES } from '@/data/domain'
import type { MatchSuggestion } from '@/data/domain'
import { Check, ChevronDown, X, Sparkles, ArrowRight, Keyboard, Plus, ArrowLeft } from 'lucide-react'
import { Button, Input, Label } from '@/components/ui'
import { useToggleTripConfirmation } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { useIsMobile } from '@/hooks/use-mobile'

function SuggestionCard({ suggestion, onSelect, index }: { suggestion: MatchSuggestion; onSelect: () => void; index: number }) {
  const { tripOrder, confidence, matchedFields, score } = suggestion
  const isFull = confidence === 'full'
  const isPartial = confidence === 'partial'

  const confidencePercent = Math.min(100, score)
  const confidenceColor = isFull ? 'var(--theme-status-success)' : isPartial ? 'var(--theme-status-warning)' : 'var(--theme-text-muted)'

  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-xl transition-all hover:scale-[0.99] active:scale-[0.98] touch-manipulation overflow-hidden"
      style={{
        background: 'var(--theme-bg-secondary)',
        border: `2px solid ${isFull ? 'var(--theme-status-success)' : isPartial ? 'var(--theme-status-warning)' : 'var(--theme-border-default)'}`,
      }}
    >
      {/* Header with confidence bar */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--theme-border-light)' }}
      >
        <div className="flex items-center gap-2">
          <kbd
            className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-mono font-bold"
            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
          >
            {index + 1}
          </kbd>
          <span className="text-xs font-bold" style={{ color: confidenceColor }}>
            {isFull ? 'Khớp đầy đủ' : isPartial ? 'Khớp một phần' : 'Gợi ý'}
          </span>
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

      {/* Content */}
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
        <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          {tripOrder.clientName} · {tripOrder.route}
        </p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {matchedFields.map(f => (
            <span
              key={f}
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: `color-mix(in srgb, ${confidenceColor} 15%, transparent)`, color: confidenceColor }}
            >
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
  const isMobile = useIsMobile()
  const { mutate: toggleConfirmation, isPending: toggling } = useToggleTripConfirmation()
  const {
    loading, loadingSuggestions, submitting, pickMode, setPickMode,
    editDialog,
    editedJob, setEditedJob,
    editedTrip, setEditedTrip,
    dialogContainers, setDialogContainers,
    dialogContRight, setDialogContRight,
    clientOptions, routeOptions,
    unmatchedJobs, draftTrips,
    selectedJob, selectedTrip,
    selectedJobId, setSelectedJobId,
    selectedTripId, setSelectedTripId,
    suggestions,
    jobClient, tripClient, jobRoute, tripRoute, jobConts, tripConts,
    contMatched, clientMatched, routeMatched,
    openEdit, saveDialog, handleMatch,
  } = useMatchJob(Number(jobIdStr))

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Number keys 1-9 to select suggestions
      if (suggestions.length > 0 && !selectedTripId && e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1
        if (idx < suggestions.length) {
          setSelectedTripId(suggestions[idx].tripOrder.id)
        }
      }
      // Enter to match when both are selected
      if (e.key === 'Enter' && selectedJob && selectedTrip && !submitting) {
        e.preventDefault()
        handleMatch()
      }
      // Escape to go back
      if (e.key === 'Escape') {
        navigate(-1)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [suggestions, selectedTripId, selectedJob, selectedTrip, submitting, setSelectedTripId, handleMatch, navigate])

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

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col h-[calc(100dvh-56px)] lg:h-[calc(100vh-73px)]">
        {/* Desktop header */}
        {!isMobile && (
          <div
            className="px-6 py-3 flex items-center justify-between shrink-0"
            style={{ borderBottom: '1px solid var(--theme-border-default)' }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-xl transition hover:opacity-80"
                style={{ background: 'var(--theme-bg-tertiary)' }}
              >
                <ArrowLeft className="h-4 w-4" style={{ color: 'var(--theme-text-primary)' }} />
              </button>
              <div>
                <h1 className="text-lg font-bold font-display" style={{ color: 'var(--theme-text-primary)' }}>
                  Đối soát phiếu
                </h1>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  Ghép phiếu tài xế với lệnh điều phối
                </p>
              </div>
            </div>

            {/* Keyboard hints */}
            <div className="hidden lg:flex items-center gap-3 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--theme-bg-tertiary)] font-mono">1-9</kbd>
                Chọn gợi ý
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--theme-bg-tertiary)] font-mono">Enter</kbd>
                Khớp
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--theme-bg-tertiary)] font-mono">Esc</kbd>
                Quay lại
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left panel - Selection */}
          <div
            className="lg:w-[380px] shrink-0 overflow-y-auto"
            style={{
              background: isMobile ? 'transparent' : 'var(--theme-bg-secondary)',
              borderRight: isMobile ? 'none' : '1px solid var(--theme-border-default)',
            }}
          >
            <div className="p-4 space-y-3">
              {/* Job selector */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--theme-brand-primary)' }}>
                  Phiếu tài xế (Đã chạy)
                </p>
                <button
                  onClick={() => setPickMode('job')}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl touch-manipulation transition hover:opacity-90"
                  style={{
                    background: selectedJob ? 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)' : 'var(--theme-bg-secondary)',
                    border: `2px solid ${selectedJob ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
                  }}
                >
                  <div className="flex-1 min-w-0 text-left">
                    {selectedJob ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedJob.containers.map(c => (
                          <span key={c.containerNumber} className="flex items-center gap-1">
                            <ContBadge type={c.workType} />
                            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                              {c.containerNumber}
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chọn phiếu tài xế</p>
                    )}
                    {selectedJob && (
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--theme-text-muted)' }}>
                        {selectedJob.driverName} · {selectedJob.clientName}
                      </p>
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--theme-text-muted)' }} />
                </button>
              </div>

              {/* Arrow indicator */}
              {selectedJob && (
                <div className="flex justify-center">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ background: 'var(--theme-bg-tertiary)' }}
                  >
                    <ArrowRight className="h-4 w-4" style={{ color: 'var(--theme-text-muted)' }} />
                  </div>
                </div>
              )}

              {/* Trip selector */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--theme-status-warning)' }}>
                  Lệnh điều phối (Yêu cầu)
                </p>
                <button
                  onClick={() => setPickMode('trip')}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl touch-manipulation transition hover:opacity-90"
                  style={{
                    background: selectedTrip ? 'color-mix(in srgb, var(--theme-status-warning) 8%, transparent)' : 'var(--theme-bg-secondary)',
                    border: `2px solid ${selectedTrip ? 'var(--theme-status-warning)' : 'var(--theme-border-default)'}`,
                  }}
                >
                  <div className="flex-1 min-w-0 text-left">
                    {selectedTrip ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(selectedTrip.containers?.length ? selectedTrip.containers : []).map((c, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <ContBadge type={c.workType} />
                            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
                              {c.containerNumber}
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chọn lệnh điều phối</p>
                    )}
                    {selectedTrip && (
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--theme-text-muted)' }}>
                        {selectedTrip.clientName} · {selectedTrip.route}
                      </p>
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--theme-text-muted)' }} />
                </button>
              </div>

              {/* Suggestions */}
              {suggestions.length > 0 && !selectedTripId && (
                <div className="pt-2">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--theme-status-warning)' }} />
                    <p className="text-xs font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                      Gợi ý ghép ({suggestions.length})
                    </p>
                  </div>
                  <div className="space-y-2">
                    {suggestions.slice(0, 5).map((s, idx) => (
                      <SuggestionCard
                        key={s.tripOrder.id}
                        suggestion={s}
                        index={idx}
                        onSelect={() => setSelectedTripId(s.tripOrder.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right panel - Comparison */}
          <div className="flex-1 overflow-y-auto flex flex-col">
            {selectedJob && selectedTrip && editedJob && editedTrip ? (
              <>
                <div className="flex-1 p-4 space-y-3">
                  <ContCompareRow
                    left={jobConts}
                    right={tripConts}
                    matched={contMatched}
                    leftLabel="Đã chạy"
                    rightLabel="Yêu cầu"
                    onTapLeft={() => openEdit('cont-left')}
                    onTapRight={() => openEdit('cont-right')}
                  />
                  <CompareRow
                    label="Khách hàng"
                    left={jobClient}
                    right={tripClient}
                    matched={clientMatched}
                    leftLabel="Đã chạy"
                    rightLabel="Yêu cầu"
                    onTapLeft={() => openEdit('client-left')}
                    onTapRight={() => openEdit('client-right')}
                  />
                  <CompareRow
                    label="Cung đường"
                    left={jobRoute}
                    right={tripRoute}
                    matched={routeMatched}
                    leftLabel="Đã chạy"
                    rightLabel="Yêu cầu"
                    onTapLeft={() => openEdit('route-left')}
                    onTapRight={() => openEdit('route-right')}
                  />
                </div>

                {/* Bottom action bar */}
                <div
                  className="p-4 shrink-0 space-y-3"
                  style={{ borderTop: '1px solid var(--theme-border-default)', background: 'var(--theme-bg-secondary)' }}
                >
                  {/* Confirmation status */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-secondary)' }}>
                      Trạng thái
                    </span>
                    <ConfirmationCheckbox
                      isConfirmed={selectedTrip.isConfirmed}
                      onToggle={handleToggleConfirmation}
                      disabled={toggling}
                      label="Đã chốt"
                    />
                  </div>

                  {/* Match button */}
                  <Button
                    onClick={handleMatch}
                    disabled={submitting}
                    className="w-full h-12 font-bold rounded-xl text-sm flex items-center justify-center gap-2"
                    style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
                  >
                    <Check className="w-5 h-5" />
                    {submitting ? 'Đang khớp...' : 'Khớp chuyến'}
                    {!isMobile && (
                      <kbd className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/20">Enter</kbd>
                    )}
                  </Button>

                  {/* Create new link */}
                  <button
                    onClick={() => navigate('/accountant/create-trip', { state: { fromWorkOrder: selectedJob } })}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition hover:opacity-80"
                    style={{ color: 'var(--theme-brand-primary)' }}
                  >
                    <Plus className="w-4 h-4" />
                    Tạo lệnh điều phối mới
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center px-4">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full mb-4"
                  style={{ background: 'var(--theme-bg-tertiary)' }}
                >
                  <ArrowRight className="h-8 w-8" style={{ color: 'var(--theme-text-muted)' }} />
                </div>
                <p className="text-sm font-semibold text-center mb-1" style={{ color: 'var(--theme-text-primary)' }}>
                  Chọn cả hai để so sánh
                </p>
                <p className="text-xs text-center" style={{ color: 'var(--theme-text-muted)' }}>
                  Chọn phiếu tài xế và lệnh điều phối để bắt đầu đối soát
                </p>
              </div>
            )}
          </div>
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
        title="Chọn lệnh điều phối"
        items={draftTrips}
        selectedId={selectedTripId}
        onSelect={setSelectedTripId}
        onClose={() => setPickMode(null)}
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

      {/* Edit dialogs */}
      <EditDialog open={editDialog === 'cont-left'} title="Sửa container · Đã chạy" color="var(--theme-brand-primary)" onClose={saveDialog}>
        {dialogContainers.map((c, i) => (
          <div key={i} className="rounded-xl p-3 space-y-3" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Container {i + 1}</span>
              {dialogContainers.length > 1 && (
                <button onClick={() => setDialogContainers(prev => prev.filter((_, j) => j !== i))} className="touch-manipulation" style={{ color: 'var(--theme-status-error)' }}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Loại container</Label>
              <div className="flex flex-wrap gap-1.5">
                {WORK_TYPES.map(w => (
                  <button key={w} onClick={() => setDialogContainers(prev => prev.map((c2, j) => j === i ? { ...c2, type: w } : c2))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold touch-manipulation"
                    style={{ background: c.type === w ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: c.type === w ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)' }}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Số cont</Label>
              <Input value={c.number} onChange={e => setDialogContainers(prev => prev.map((c2, j) => j === i ? { ...c2, number: e.target.value } : c2))} className="text-sm font-mono h-10" autoFocus />
            </div>
          </div>
        ))}
        <button onClick={() => setDialogContainers(prev => [...prev, { type: 'E20', number: '' }])}
          className="w-full py-2.5 rounded-xl text-xs font-medium touch-manipulation"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)', border: '1px dashed var(--theme-border-default)' }}>
          + Thêm container
        </button>
      </EditDialog>

      <EditDialog open={editDialog === 'cont-right'} title="Sửa container · Yêu cầu" color="var(--theme-status-warning)" onClose={saveDialog}>
        {dialogContRight.map((c, i) => (
          <div key={i} className="rounded-xl p-3 space-y-3" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Container {i + 1}</span>
              {dialogContRight.length > 1 && (
                <button onClick={() => setDialogContRight(prev => prev.filter((_, j) => j !== i))} className="touch-manipulation" style={{ color: 'var(--theme-status-error)' }}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Loại container</Label>
              <div className="flex flex-wrap gap-1.5">
                {WORK_TYPES.map(w => (
                  <button key={w} onClick={() => setDialogContRight(prev => prev.map((c2, j) => j === i ? { ...c2, type: w } : c2))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold touch-manipulation"
                    style={{ background: c.type === w ? 'var(--theme-status-warning)' : 'var(--theme-bg-tertiary)', color: c.type === w ? '#fff' : 'var(--theme-text-primary)' }}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Số cont</Label>
              <Input value={c.number} onChange={e => setDialogContRight(prev => prev.map((c2, j) => j === i ? { ...c2, number: e.target.value } : c2))} className="text-sm font-mono h-10" autoFocus />
            </div>
          </div>
        ))}
        <button onClick={() => setDialogContRight(prev => [...prev, { type: 'E20', number: '' }])}
          className="w-full py-2.5 rounded-xl text-xs font-medium touch-manipulation"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)', border: '1px dashed var(--theme-border-default)' }}>
          + Thêm container
        </button>
      </EditDialog>

      <EditDialog open={editDialog === 'client-left'} title="Sửa khách hàng · Đã chạy" color="var(--theme-brand-primary)" onClose={saveDialog}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Khách hàng</Label>
          <InlineSelect placeholder="Chọn khách hàng..." value={editedJob?.clientName ?? ''} options={clientOptions} onChange={v => setEditedJob(prev => prev ? { ...prev, clientName: v } : null)} />
        </div>
      </EditDialog>

      <EditDialog open={editDialog === 'client-right'} title="Sửa khách hàng · Yêu cầu" color="var(--theme-status-warning)" onClose={saveDialog}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Khách hàng</Label>
          <InlineSelect placeholder="Chọn khách hàng..." value={editedTrip?.clientName ?? ''} options={clientOptions} onChange={v => setEditedTrip(prev => prev ? { ...prev, clientName: v } : null)} />
        </div>
      </EditDialog>

      <EditDialog open={editDialog === 'route-left'} title="Sửa cung đường · Đã chạy" color="var(--theme-brand-primary)" onClose={saveDialog}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Cung đường</Label>
          <InlineSelect placeholder="Chọn cung đường..." value={editedJob?.route ?? ''} options={routeOptions} onChange={v => setEditedJob(prev => prev ? { ...prev, route: v } : null)} />
        </div>
      </EditDialog>

      <EditDialog open={editDialog === 'route-right'} title="Sửa cung đường · Yêu cầu" color="var(--theme-status-warning)" onClose={saveDialog}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Cung đường</Label>
          <InlineSelect placeholder="Chọn cung đường..." value={editedTrip?.route ?? ''} options={routeOptions} onChange={v => setEditedTrip(prev => prev ? { ...prev, route: v } : null)} />
        </div>
      </EditDialog>
    </>
  )
}
