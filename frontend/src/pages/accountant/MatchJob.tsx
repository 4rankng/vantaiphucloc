import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
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
import {
  Check, ChevronDown, X, Sparkles, Plus, ArrowLeft,
  FileText, Truck, CheckCircle2, AlertCircle, Keyboard,
  Command,
} from 'lucide-react'
import { Button, Input, Label } from '@/components/ui'
import { useToggleTripConfirmation } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { useIsMobile } from '@/hooks/use-mobile'

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

function KeyboardShortcutsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
        style={{ background: 'var(--theme-bg-primary)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="p-2 rounded-xl"
            style={{ background: 'var(--theme-brand-primary-light)' }}
          >
            <Keyboard className="w-5 h-5" style={{ color: 'var(--theme-brand-primary)' }} />
          </div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>
            Phím tắt
          </h3>
        </div>
        <div className="space-y-3">
          {[
            { key: '1-9', action: 'Chọn gợi ý tương ứng' },
            { key: 'Enter', action: 'Xác nhận khớp chuyến' },
            { key: 'J', action: 'Chọn phiếu tài xế' },
            { key: 'T', action: 'Chọn đơn hàng' },
            { key: 'Esc', action: 'Quay lại / Đóng' },
            { key: '?', action: 'Hiện/ẩn phím tắt' },
          ].map(({ key, action }) => (
            <div key={key} className="flex items-center justify-between">
              <span
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold"
                style={{
                  background: 'var(--theme-bg-secondary)',
                  color: 'var(--theme-text-primary)',
                  border: '1px solid var(--theme-border-default)',
                }}
              >
                {key}
              </span>
              <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{action}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-text-primary)' }}
        >
          Đóng
        </button>
      </div>
    </div>
  )
}

export function MatchJob() {
  const { jobId: jobIdStr } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const isMobile = useIsMobile(1024)
  const { mutate: toggleConfirmation, isPending: toggling } = useToggleTripConfirmation()
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'Escape':
          if (showKeyboardHelp) {
            setShowKeyboardHelp(false)
          } else if (pickMode) {
            setPickMode(null)
          } else if (editDialog) {
            saveDialog()
          } else {
            navigate(-1)
          }
          break
        case '?':
          setShowKeyboardHelp(prev => !prev)
          break
        case 'Enter':
          if (selectedJob && selectedTrip && !submitting) {
            e.preventDefault()
            handleMatch()
          }
          break
        case 'j':
        case 'J':
          if (!editDialog) setPickMode('job')
          break
        case 't':
        case 'T':
          if (!editDialog) setPickMode('trip')
          break
        default:
          if (suggestions.length > 0 && !selectedTripId && !pickMode && !editDialog && e.key >= '1' && e.key <= '9') {
            const idx = parseInt(e.key) - 1
            if (idx < suggestions.length) {
              setSelectedTripId(suggestions[idx].tripOrder.id)
            }
          }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [suggestions, selectedTripId, selectedJob, selectedTrip, submitting, pickMode, editDialog, showKeyboardHelp, setSelectedTripId, handleMatch, saveDialog, setPickMode, navigate])

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
            <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      {showKeyboardHelp && <KeyboardShortcutsPanel onClose={() => setShowKeyboardHelp(false)} />}

      <div className="flex flex-col h-[calc(100dvh-56px)] lg:h-screen">
        {/* Desktop header */}
        {!isMobile && (
          <div
            className="flex items-center justify-between px-8 py-4 border-b shrink-0"
            style={{ borderColor: 'var(--theme-border-light)' }}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-xl transition-colors hover:opacity-80"
                style={{ background: 'var(--theme-bg-secondary)' }}
              >
                <ArrowLeft className="w-5 h-5" style={{ color: 'var(--theme-text-secondary)' }} />
              </button>
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                  Đối soát phiếu
                </h1>
                <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                  Ghép phiếu tài xế với đơn hàng
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowKeyboardHelp(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors hover:opacity-80"
              style={{ background: 'var(--theme-bg-secondary)' }}
              title="Phím tắt (?)"
            >
              <Command className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Phím tắt</span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left panel - Job selector only */}
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
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                    style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
                  >
                    J
                  </span>
                </div>
                <button
                  onClick={() => setPickMode('job')}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl touch-manipulation transition-all hover:scale-[1.01]"
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


              {/* Trip selector — shown when trip already selected (to allow changing) */}
              {selectedTrip && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--theme-status-warning)' }} />
                    <span className="typo-label" style={{ color: 'var(--theme-status-warning)' }}>Đơn hàng đã chọn</span>
                  </div>
                  <button
                    onClick={() => setSelectedTripId(0)}
                    className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl touch-manipulation transition-all hover:opacity-80"
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
                  <Button
                    onClick={handleMatch}
                    disabled={submitting}
                    className="w-full h-11 font-bold rounded-xl text-sm flex items-center justify-center gap-2"
                    style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
                  >
                    <Check className="w-4 h-4" />
                    {submitting ? 'Đang khớp...' : 'Xác nhận khớp chuyến'}
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.2)' }}>Enter</span>
                  </Button>
                  <button
                    onClick={() => navigate('/accountant/create-trip', { state: { fromWorkOrder: selectedJob } })}
                    className="w-full h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                    style={{ background: 'var(--theme-bg-secondary)', color: 'var(--theme-brand-primary)', border: '1px solid var(--theme-border-default)' }}
                  >
                    <Plus className="w-4 h-4" /> Tạo đơn mới
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right panel — trip list when no trip selected, comparison when selected */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedJob && selectedTrip && editedJob && editedTrip ? (
              <>
                <div
                  className="flex items-center justify-between px-6 py-3 border-b shrink-0"
                  style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-light)' }}
                >
                  <h2 className="typo-h2">So sánh chi tiết</h2>
                  <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Nhấn vào từng mục để chỉnh sửa</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-3">
                  <ContCompareRow left={jobConts} right={tripConts} matched={contMatched} leftLabel="Đã chạy" rightLabel="Yêu cầu" onTapLeft={() => openEdit('cont-left')} onTapRight={() => openEdit('cont-right')} />
                  <CompareRow label="Khách hàng" left={jobClient} right={tripClient} matched={clientMatched} leftLabel="Đã chạy" rightLabel="Yêu cầu" onTapLeft={() => openEdit('client-left')} onTapRight={() => openEdit('client-right')} />
                  <CompareRow label="Cung đường" left={jobRoute} right={tripRoute} matched={routeMatched} leftLabel="Đã chạy" rightLabel="Yêu cầu" onTapLeft={() => openEdit('route-left')} onTapRight={() => openEdit('route-right')} />
                </div>
              </>
            ) : (
              <>
                <div
                  className="flex items-center justify-between px-6 py-3 border-b shrink-0"
                  style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-light)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--theme-status-warning)' }} />
                    <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Chọn đơn hàng để khớp</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}>
                      {draftTrips.length}
                    </span>
                    {suggestions.length > 0 && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
                        <Sparkles className="w-3 h-3" /> {suggestions.length} gợi ý
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}>T</span>
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

      {/* Edit dialogs */}
      <EditDialog open={editDialog === 'cont-left'} title="Sửa container · Đã chạy" color="var(--theme-brand-primary)" onClose={saveDialog}>
        {dialogContainers.map((c, i) => (
          <div key={i} className="rounded-xl p-3 space-y-3" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Container {i + 1}</span>
              {dialogContainers.length > 1 && (
                <button onClick={() => setDialogContainers(prev => prev.filter((_, j) => j !== i))} className="touch-manipulation p-1 rounded hover:opacity-80" style={{ color: 'var(--theme-status-error)' }}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="typo-form-label">Loại container</Label>
              <div className="flex flex-wrap gap-1.5">
                {WORK_TYPES.map(w => (
                  <button key={w} onClick={() => setDialogContainers(prev => prev.map((c2, j) => j === i ? { ...c2, type: w } : c2))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold touch-manipulation transition-colors"
                    style={{ background: c.type === w ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)', color: c.type === w ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)' }}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="typo-form-label">Số cont</Label>
              <Input value={c.number} onChange={e => setDialogContainers(prev => prev.map((c2, j) => j === i ? { ...c2, number: e.target.value } : c2))} className="text-sm font-mono h-10" autoFocus />
            </div>
          </div>
        ))}
        <button onClick={() => setDialogContainers(prev => [...prev, { type: 'E20', number: '' }])}
          className="w-full py-2.5 rounded-xl text-xs font-medium touch-manipulation flex items-center justify-center gap-2"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)', border: '1px dashed var(--theme-border-default)' }}>
          <Plus className="w-4 h-4" /> Thêm container
        </button>
      </EditDialog>

      <EditDialog open={editDialog === 'cont-right'} title="Sửa container · Yêu cầu" color="var(--theme-status-warning)" onClose={saveDialog}>
        {dialogContRight.map((c, i) => (
          <div key={i} className="rounded-xl p-3 space-y-3" style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Container {i + 1}</span>
              {dialogContRight.length > 1 && (
                <button onClick={() => setDialogContRight(prev => prev.filter((_, j) => j !== i))} className="touch-manipulation p-1 rounded hover:opacity-80" style={{ color: 'var(--theme-status-error)' }}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="typo-form-label">Loại container</Label>
              <div className="flex flex-wrap gap-1.5">
                {WORK_TYPES.map(w => (
                  <button key={w} onClick={() => setDialogContRight(prev => prev.map((c2, j) => j === i ? { ...c2, type: w } : c2))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold touch-manipulation transition-colors"
                    style={{ background: c.type === w ? 'var(--theme-status-warning)' : 'var(--theme-bg-tertiary)', color: c.type === w ? '#fff' : 'var(--theme-text-primary)' }}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="typo-form-label">Số cont</Label>
              <Input value={c.number} onChange={e => setDialogContRight(prev => prev.map((c2, j) => j === i ? { ...c2, number: e.target.value } : c2))} className="text-sm font-mono h-10" autoFocus />
            </div>
          </div>
        ))}
        <button onClick={() => setDialogContRight(prev => [...prev, { type: 'E20', number: '' }])}
          className="w-full py-2.5 rounded-xl text-xs font-medium touch-manipulation flex items-center justify-center gap-2"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)', border: '1px dashed var(--theme-border-default)' }}>
          <Plus className="w-4 h-4" /> Thêm container
        </button>
      </EditDialog>

      <EditDialog open={editDialog === 'client-left'} title="Sửa khách hàng · Đã chạy" color="var(--theme-brand-primary)" onClose={saveDialog}>
        <div className="space-y-1.5">
          <Label className="typo-form-label">Khách hàng</Label>
          <InlineSelect placeholder="Chọn khách hàng..." value={editedJob?.clientName ?? ''} options={clientOptions} onChange={v => setEditedJob(prev => prev ? { ...prev, clientName: v } : null)} />
        </div>
      </EditDialog>

      <EditDialog open={editDialog === 'client-right'} title="Sửa khách hàng · Yêu cầu" color="var(--theme-status-warning)" onClose={saveDialog}>
        <div className="space-y-1.5">
          <Label className="typo-form-label">Khách hàng</Label>
          <InlineSelect placeholder="Chọn khách hàng..." value={editedTrip?.clientName ?? ''} options={clientOptions} onChange={v => setEditedTrip(prev => prev ? { ...prev, clientName: v } : null)} />
        </div>
      </EditDialog>

      <EditDialog open={editDialog === 'route-left'} title="Sửa cung đường · Đã chạy" color="var(--theme-brand-primary)" onClose={saveDialog}>
        <div className="space-y-1.5">
          <Label className="typo-form-label">Cung đường</Label>
          <InlineSelect placeholder="Chọn cung đường..." value={editedJob?.route ?? ''} options={routeOptions} onChange={v => setEditedJob(prev => prev ? { ...prev, route: v } : null)} />
        </div>
      </EditDialog>

      <EditDialog open={editDialog === 'route-right'} title="Sửa cung đường · Yêu cầu" color="var(--theme-status-warning)" onClose={saveDialog}>
        <div className="space-y-1.5">
          <Label className="typo-form-label">Cung đường</Label>
          <InlineSelect placeholder="Chọn cung đường..." value={editedTrip?.route ?? ''} options={routeOptions} onChange={v => setEditedTrip(prev => prev ? { ...prev, route: v } : null)} />
        </div>
      </EditDialog>
    </>
  )
}
