import { useParams, useNavigate } from 'react-router-dom'
import { useMatchTrip } from '@/hooks/use-match-trip'
import { ContBadge } from '@/components/shared/ContBadge'
import { ConfirmationCheckbox } from '@/components/shared/ConfirmationCheckbox'
import {
  Check, ChevronDown, X, Sparkles, ArrowLeft, ArrowUpDown,
  Truck, FileText, AlertCircle, CheckCircle2, Plus, Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { useToast } from '@/components/atoms/Toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { useState } from 'react'

export function MatchTrip() {
  const { tripId: tripIdStr } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const isMobile = useIsMobile(1024)
  const [lowConfConfirm, setLowConfConfirm] = useState(false)

  const {
    loading, submitting, pickMode, setPickMode,
    clientOptions, routeOptions,
    unmatchedJobs, draftTrips,
    selectedJob,
    selectedTrips, selectedTripIds, toggleTripSelection,
    getTripMatchStatus,
    selectedJobId, setSelectedJobId,
    jobClient, jobRoute, jobConts,
    setJobClient, setJobRoute, setJobContainers,
    handleMatch,
  } = useMatchTrip(Number(tripIdStr))

  const handleMatchWithToast = async () => {
    try {
      await handleMatch()
      toast.success('Thành công', `Đã ghép ${selectedTripIds.length} đơn hàng thành công`)
      setLowConfConfirm(false)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? (err instanceof Error ? err.message : undefined)
      toast.error('Không thể khớp chuyến', detail ?? 'Lỗi hệ thống. Thử lại sau.')
    }
  }

  const handleMatchClick = () => {
    handleMatchWithToast()
  }

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
        {/* Left Panel - WorkOrder Selector */}
        <div
          className="lg:w-[420px] xl:w-[480px] shrink-0 p-4 lg:p-6 lg:border-r overflow-y-auto"
          style={{ borderColor: 'var(--theme-border-light)' }}
        >
          <div className="space-y-4">
            {/* WorkOrder Selector */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--theme-brand-primary)' }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-brand-primary)' }}>
                  Chuyến đã chạy (1)
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
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--theme-text-muted)' }}>{selectedJob.driver.name} · {selectedJob.partner.name}</p>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chọn chuyến đã chạy</p>
                  )}
                </div>
                <ChevronDown className="w-5 h-5 shrink-0 ml-2" style={{ color: 'var(--theme-text-muted)' }} />
              </button>
            </div>

            {/* Connection Line */}
            <div className="flex items-center justify-center py-1">
              <ArrowUpDown className="w-5 h-5" style={{ color: 'var(--theme-text-muted)' }} />
            </div>

            {/* Selected TripOrders */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--theme-status-warning)' }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-status-warning)' }}>
                  Đơn hàng đã chọn ({selectedTripIds.length})
                </span>
              </div>

              {selectedTrips.length === 0 ? (
                <div
                  className="px-4 py-3 rounded-lg text-sm"
                  style={{ background: 'var(--theme-bg-secondary)', border: '1px dashed var(--theme-border-default)', color: 'var(--theme-text-muted)' }}
                >
                  Chọn đơn hàng từ danh sách bên phải
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedTrips.map(trip => {
                    const matchStatus = getTripMatchStatus(trip.id)
                    const statusColor = matchStatus === 'full' ? 'var(--theme-status-success)' : matchStatus === 'partial' ? 'var(--theme-status-warning)' : 'var(--theme-status-error)'
                    return (
                      <div
                        key={trip.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                        style={{
                          background: 'var(--theme-bg-secondary)',
                          border: `1px solid ${statusColor}`,
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {(trip.containers ?? []).map((c, i) => (
                              <span key={i} className="flex items-center gap-1">
                                <ContBadge type={c.workType} />
                                <span className="text-sm font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{c.containerNumber}</span>
                              </span>
                            ))}
                          </div>
                          <p className="text-xs mt-1 truncate" style={{ color: 'var(--theme-text-muted)' }}>{trip.partner.name} · {trip.route}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {matchStatus === 'full' && <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--theme-status-success)' }} />}
                          {matchStatus === 'partial' && <AlertCircle className="w-4 h-4" style={{ color: 'var(--theme-status-warning)' }} />}
                          <button
                            onClick={() => toggleTripSelection(trip.id)}
                            className="p-1 rounded-lg"
                            style={{ color: 'var(--theme-text-muted)' }}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - TripOrder List (multi-select) */}
        <div className="flex-1 flex flex-col overflow-hidden">
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
            </div>
            {selectedTripIds.length > 0 && (
              <span className="typo-caption px-2 py-1 rounded font-bold" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
                Đã chọn {selectedTripIds.length}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {draftTrips.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <FileText className="w-10 h-10 mb-3" style={{ color: 'var(--theme-text-muted)' }} />
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--theme-text-primary)' }}>Không có đơn hàng nào</p>
                <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Tất cả đơn hàng đã được khớp</p>
              </div>
            ) : (
              <div>
                {draftTrips.map(trip => {
                  const isSelected = selectedTripIds.includes(trip.id)
                  const matchStatus = selectedJob ? getTripMatchStatus(trip.id) : 'none' as const
                  const matchColor = matchStatus === 'full' ? 'var(--theme-status-success)' : matchStatus === 'partial' ? 'var(--theme-status-warning)' : 'var(--theme-text-muted)'
                  const bgColor = isSelected
                    ? 'var(--theme-brand-primary-light)'
                    : matchStatus === 'full' && selectedJob
                      ? 'var(--theme-status-success-light)'
                      : matchStatus === 'partial' && selectedJob
                        ? 'var(--theme-status-warning-light)'
                        : 'transparent'

                  return (
                    <button
                      key={trip.id}
                      onClick={() => toggleTripSelection(trip.id)}
                      className="w-full px-4 py-3 flex items-start gap-3 touch-manipulation text-left"
                      style={{
                        borderBottom: '1px solid var(--theme-border-light)',
                        background: bgColor,
                      }}
                    >
                      {/* Checkbox */}
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border-2 transition-all"
                        style={{
                          borderColor: isSelected ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)',
                          background: isSelected ? 'var(--theme-brand-primary)' : 'transparent',
                        }}
                      >
                        {isSelected && <Check className="w-3 h-3" style={{ color: 'var(--theme-text-on-brand)' }} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                          {(trip.containers ?? []).map((c, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <ContBadge type={c.workType} />
                              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{c.containerNumber}</span>
                            </span>
                          ))}
                        </div>
                        <p className="text-xs truncate" style={{ color: 'var(--theme-text-secondary)' }}>
                          {trip.partner.name} · {trip.route}
                        </p>
                      </div>

                      {/* Match indicator */}
                      {selectedJob && (
                        <div className="flex items-center gap-1 shrink-0">
                          {matchStatus === 'full' && <CheckCircle2 className="w-4 h-4" style={{ color: matchColor }} />}
                          {matchStatus === 'partial' && <AlertCircle className="w-4 h-4" style={{ color: matchColor }} />}
                          <span className="text-[10px] font-bold" style={{ color: matchColor }}>
                            {matchStatus === 'full' ? '100%' : matchStatus === 'partial' ? 'MT' : ''}
                          </span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bottom action bar */}
          {selectedJob && selectedTripIds.length > 0 && (
            <div
              className="px-4 lg:px-6 pb-4 lg:pb-6 pt-3 shrink-0 border-t"
              style={{ borderColor: 'var(--theme-border-light)' }}
            >
              <Button
                onClick={handleMatchClick}
                disabled={submitting}
                className="w-full h-12 font-bold rounded-xl text-sm gap-2"
                style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
              >
                <Check className="w-5 h-5" />
                {submitting
                  ? 'Đang khớp...'
                  : `Xác nhận ghép ${selectedTripIds.length} đơn hàng`}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Picker modal for WO */}
      {pickMode === 'job' && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-lg max-h-[80vh] rounded-t-2xl lg:rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--theme-bg-primary)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--theme-border-light)' }}>
              <h3 className="font-bold" style={{ color: 'var(--theme-text-primary)' }}>Chọn chuyến đã chạy</h3>
              <button onClick={() => setPickMode(null)} className="p-1 rounded-lg" style={{ color: 'var(--theme-text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {unmatchedJobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => { setSelectedJobId(job.id); setPickMode(null) }}
                  className="w-full px-4 py-3 flex items-start gap-3 text-left hover:opacity-80"
                  style={{
                    borderBottom: '1px solid var(--theme-border-light)',
                    background: job.id === selectedJobId ? 'var(--theme-brand-primary-light)' : 'transparent',
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--theme-brand-primary-light)' }}>
                    <Truck className="w-5 h-5" style={{ color: 'var(--theme-brand-primary)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      {job.containers.map(c => (
                        <span key={c.containerNumber} className="flex items-center gap-1">
                          <ContBadge type={c.workType} />
                          <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{c.containerNumber}</span>
                        </span>
                      ))}
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--theme-text-secondary)' }}>{job.driver.name} · {job.partner.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
