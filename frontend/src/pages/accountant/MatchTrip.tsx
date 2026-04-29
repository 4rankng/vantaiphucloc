import { useParams } from 'react-router-dom'
import { useMatchTrip } from '@/hooks/use-match-trip'
import { ContBadge } from '@/components/shared/ContBadge'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { PickModal } from '@/components/shared/PickModal'
import { EditDialog } from '@/components/shared/EditDialog'
import { CompareRow } from '@/components/shared/CompareRow'
import { ContCompareRow } from '@/components/shared/ContCompareRow'
import { WORK_TYPES } from '@/data/domain'
import { Check, ChevronDown, X } from 'lucide-react'
import { Button, Input, Label } from '@/components/ui'

export function MatchTrip() {
  const { tripId: tripIdStr } = useParams<{ tripId: string }>()
  const {
    loading, submitting, pickMode, setPickMode,
    editDialog,
    editedJob, setEditedJob,
    editedTrip, setEditedTrip,
    dialogContLeft, setDialogContLeft,
    dialogContainers, setDialogContainers,
    clientOptions, routeOptions,
    unmatchedJobs, draftTrips,
    selectedJob, selectedTrip,
    selectedTripId, setSelectedTripId,
    selectedJobId, setSelectedJobId,
    tripClient, jobClient, tripRoute, jobRoute, tripCont, jobConts,
    contMatched, clientMatched, routeMatched,
    openEdit, saveDialog, handleMatch,
  } = useMatchTrip(Number(tripIdStr))

  if (loading) {
    return <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />)}</div>
  }

  return (
    <>
      <div className="flex flex-col h-[calc(100dvh-56px)]">
        {/* ── TOP: Selector buttons ── */}
        <div className="px-4 pt-3 pb-2 space-y-2 shrink-0">
          <button onClick={() => setPickMode('trip')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl touch-manipulation"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-status-warning)' }}>Chuyến yêu cầu</p>
              {selectedTrip ? (
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <ContBadge type={selectedTrip.workType} />
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{selectedTrip.containerNumber}</span>
                </div>
              ) : (
                <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>Chọn chuyến yêu cầu</p>
              )}
            </div>
            <ChevronDown className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--theme-text-muted)' }} />
          </button>

          <button onClick={() => setPickMode('job')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl touch-manipulation"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-brand-primary)' }}>Chuyến đã chạy</p>
              {selectedJob ? (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {selectedJob.containers.map(c => (
                    <span key={c.containerNumber} className="flex items-center gap-1">
                      <ContBadge type={c.workType} />
                      <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{c.containerNumber}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>Chọn chuyến đã chạy</p>
              )}
            </div>
            <ChevronDown className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--theme-text-muted)' }} />
          </button>
        </div>

        {/* ── MIDDLE: Comparison rows (tappable) ── */}
        {selectedTrip && selectedJob && editedTrip && editedJob ? (
          <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
            <ContCompareRow
              left={tripCont!} right={jobConts} matched={contMatched}
              leftLabel="Yêu cầu" rightLabel="Đã chạy"
              onTapLeft={() => openEdit('cont-left')}
              onTapRight={() => openEdit('cont-right')}
            />
            <CompareRow label="Khách hàng" left={tripClient} right={jobClient} matched={clientMatched}
              leftLabel="Yêu cầu" rightLabel="Đã chạy"
              onTapLeft={() => openEdit('client-left')}
              onTapRight={() => openEdit('client-right')}
            />
            <CompareRow label="Cung đường" left={tripRoute} right={jobRoute} matched={routeMatched}
              leftLabel="Yêu cầu" rightLabel="Đã chạy"
              onTapLeft={() => openEdit('route-left')}
              onTapRight={() => openEdit('route-right')}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-4">
            <p className="text-xs text-center" style={{ color: 'var(--theme-text-muted)' }}>Chọn cả hai chuyến để so sánh</p>
          </div>
        )}

        {/* ── BOTTOM ── */}
        {selectedTrip && selectedJob && (
          <div className="px-4 pb-4 pt-2 shrink-0" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
            <Button onClick={handleMatch} disabled={submitting}
              className="w-full h-12 font-bold rounded-xl text-sm"
              style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
              <Check className="w-4 h-4 mr-1.5" /> {submitting ? 'Đang khớp...' : 'Khớp chuyến'}
            </Button>
          </div>
        )}
      </div>

      {/* ── Picker modals ── */}
      <PickModal open={pickMode === 'trip'} title="Chọn chuyến yêu cầu"
        items={draftTrips} selectedId={selectedTripId} onSelect={setSelectedTripId} onClose={() => setPickMode(null)}
        renderLabel={trip => (
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <ContBadge type={trip.workType} />
              <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{trip.containerNumber}</span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>{trip.clientName}</p>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{trip.route}</p>
          </div>
        )}
      />
      <PickModal open={pickMode === 'job'} title="Chọn chuyến đã chạy"
        items={unmatchedJobs} selectedId={selectedJobId} onSelect={setSelectedJobId} onClose={() => setPickMode(null)}
        renderLabel={job => (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {job.containers.map(c => (
                <span key={c.containerNumber} className="flex items-center gap-1">
                  <ContBadge type={c.workType} />
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{c.containerNumber}</span>
                </span>
              ))}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>{job.driverName} · {job.clientName}</p>
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{job.route}</p>
          </div>
        )}
      />

      {/* ── Edit dialogs ── */}
      {/* Container - left (yêu cầu / trip) */}
      <EditDialog open={editDialog === 'cont-left'} title="Sửa container · Yêu cầu" color="var(--theme-status-warning)" onClose={saveDialog}>
        <div className="rounded-xl p-3 space-y-3"
          style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Loại công</Label>
            <div className="flex flex-wrap gap-1.5">
              {WORK_TYPES.map(w => (
                <button key={w} onClick={() => setDialogContLeft(prev => ({ ...prev, type: w }))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold touch-manipulation"
                  style={{ background: dialogContLeft.type === w ? 'var(--theme-status-warning)' : 'var(--theme-bg-tertiary)', color: dialogContLeft.type === w ? '#fff' : 'var(--theme-text-primary)' }}>
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Số cont</Label>
            <Input value={dialogContLeft.number} onChange={e => setDialogContLeft(prev => ({ ...prev, number: e.target.value }))}
              className="text-sm font-mono h-10" autoFocus />
          </div>
        </div>
      </EditDialog>

      {/* Container - right (đã chạy / work order) */}
      <EditDialog open={editDialog === 'cont-right'} title="Sửa container · Đã chạy" color="var(--theme-brand-primary)" onClose={saveDialog}>
        {dialogContainers.map((c, i) => (
          <div key={i} className="rounded-xl p-3 space-y-3"
            style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Container {i + 1}</span>
              {dialogContainers.length > 1 && (
                <button onClick={() => setDialogContainers(prev => prev.filter((_, j) => j !== i))}
                  className="touch-manipulation" style={{ color: 'var(--theme-status-error)' }}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Loại công</Label>
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
              <Input value={c.number} onChange={e => setDialogContainers(prev => prev.map((c2, j) => j === i ? { ...c2, number: e.target.value } : c2))}
                className="text-sm font-mono h-10" autoFocus />
            </div>
          </div>
        ))}
        <button onClick={() => setDialogContainers(prev => [...prev, { type: 'E20', number: '' }])}
          className="w-full py-2.5 rounded-xl text-xs font-medium touch-manipulation"
          style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)', border: '1px dashed var(--theme-border-default)' }}>
          + Thêm container
        </button>
      </EditDialog>

      {/* Khách hàng - left (yêu cầu / trip) */}
      <EditDialog open={editDialog === 'client-left'} title="Sửa khách hàng · Yêu cầu" color="var(--theme-status-warning)" onClose={saveDialog}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Khách hàng</Label>
          <InlineSelect
            placeholder="Chọn khách hàng..."
            value={editedTrip?.clientName ?? ''}
            options={clientOptions}
            onChange={v => setEditedTrip(prev => prev ? { ...prev, clientName: v } : null)}
          />
        </div>
      </EditDialog>

      {/* Khách hàng - right (đã chạy / job) */}
      <EditDialog open={editDialog === 'client-right'} title="Sửa khách hàng · Đã chạy" color="var(--theme-brand-primary)" onClose={saveDialog}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Khách hàng</Label>
          <InlineSelect
            placeholder="Chọn khách hàng..."
            value={editedJob?.clientName ?? ''}
            options={clientOptions}
            onChange={v => setEditedJob(prev => prev ? { ...prev, clientName: v } : null)}
          />
        </div>
      </EditDialog>

      {/* Cung đường - left (yêu cầu / trip) */}
      <EditDialog open={editDialog === 'route-left'} title="Sửa cung đường · Yêu cầu" color="var(--theme-status-warning)" onClose={saveDialog}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Cung đường</Label>
          <InlineSelect
            placeholder="Chọn cung đường..."
            value={editedTrip?.route ?? ''}
            options={routeOptions}
            onChange={v => setEditedTrip(prev => prev ? { ...prev, route: v } : null)}
          />
        </div>
      </EditDialog>

      {/* Cung đường - right (đã chạy / job) */}
      <EditDialog open={editDialog === 'route-right'} title="Sửa cung đường · Đã chạy" color="var(--theme-brand-primary)" onClose={saveDialog}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Cung đường</Label>
          <InlineSelect
            placeholder="Chọn cung đường..."
            value={editedJob?.route ?? ''}
            options={routeOptions}
            onChange={v => setEditedJob(prev => prev ? { ...prev, route: v } : null)}
          />
        </div>
      </EditDialog>
    </>
  )
}
