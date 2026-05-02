import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useWorkOrders,
  useTripOrders,
  useDashboardSummary,
  useUpdateWorkOrder,
  useUpdateTripOrder,
  useSuggestMatches,
} from '@/hooks/use-queries'
import { useIsMobile } from '@/hooks/use-mobile'
import { MonthNavigator } from '@/components/shared/MonthNavigator'
import { StatsGrid } from '@/components/shared/StatsGrid'
import { QuickActionsBar } from '@/components/shared/QuickActionsBar'
import { StatusBadgePro } from '@/components/shared/StatusBadgePro'
import { EditDialog } from '@/components/shared/EditDialog'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { useMonthParams } from './use-month-params'
import { formatCurrencyFull as fmt, type WorkOrder, type TripOrder } from '@/data/domain'
import {
  Sparkles, ArrowRight, ChevronLeft, ChevronRight,
  CheckCircle2, Plus, Wallet, Tag, Users, MapPin,
  FileText, Truck, Car, Briefcase, DollarSign, Clock, AlertTriangle,
  Calendar, User, Pencil,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveRoute(wo: WorkOrder | TripOrder): string {
  const parts = wo.route.split(' - ')
  const from = wo.pickupLocation || parts[0] || wo.route
  const to = wo.dropoffLocation || parts[1] || null
  return to ? `${from} → ${to}` : from
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--theme-brand-primary) 12%, transparent)' }}
      >
        <Icon className="h-7 w-7" style={{ color: 'var(--theme-brand-primary)' }} />
      </div>
      <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{text}</p>
    </div>
  )
}

// ─── Workbench column card ────────────────────────────────────────────────────

function WorkbenchCard({
  title, titleExtra, footerLabel, onFooter, children, minHeight = '320px',
}: {
  title: React.ReactNode
  titleExtra?: React.ReactNode
  footerLabel?: string
  onFooter?: () => void
  children: React.ReactNode
  minHeight?: string
}) {
  return (
    <div
      className="flex flex-col rounded-2xl border overflow-hidden"
      style={{
        background: 'var(--theme-bg-secondary)',
        borderColor: 'var(--theme-border-default)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3"
        style={{ borderBottom: '1px solid var(--theme-border-default)' }}
      >
        <div className="text-sm font-semibold font-display" style={{ color: 'var(--theme-text-primary)' }}>
          {title}
        </div>
        {titleExtra}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight }}>
        {children}
      </div>

      {/* Footer */}
      {footerLabel && onFooter && (
        <div style={{ borderTop: '1px solid var(--theme-border-default)' }}>
          <button
            onClick={onFooter}
            className="flex w-full items-center justify-center gap-1.5 px-4 py-3 text-sm font-semibold transition hover:opacity-70"
            style={{ color: 'var(--theme-brand-primary)' }}
          >
            {footerLabel} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Trip order row ───────────────────────────────────────────────────────────

function TripRow({ trip, onClick, isLast }: { trip: TripOrder; onClick: () => void; isLast?: boolean }) {
  const isPending = trip.status === 'PENDING' || trip.status === 'DRAFT'
  const isConfirmed = trip.isConfirmed
  const isDraft = trip.status === 'DRAFT'

  const types = trip.containers.length > 0
    ? (() => {
        const map: Record<string, number> = {}
        trip.containers.forEach(c => { map[c.workType] = (map[c.workType] ?? 0) + 1 })
        return Object.entries(map).map(([t, n]) => n > 1 ? `${t} × ${n}` : t).join(' ')
      })()
    : trip.workType ?? ''

  const tripDate = trip.tripDate
    ? new Date(trip.tripDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''

  let statusVariant: 'success' | 'warning' | 'neutral' | 'completed' | 'draft' | 'pending' | 'matched' = 'neutral'
  let statusLabel = ''

  if (isConfirmed) {
    statusVariant = 'success'
    statusLabel = 'Đã xác nhận'
  } else if (isDraft) {
    statusVariant = 'draft'
    statusLabel = 'Nháp'
  } else if (trip.status === 'COMPLETED') {
    statusVariant = 'completed'
    statusLabel = 'Hoàn thành'
  } else if (isPending) {
    statusVariant = 'pending'
    statusLabel = 'Chờ xử lý'
  } else {
    statusVariant = 'matched'
    statusLabel = 'Đã ghép'
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 transition hover:bg-[color-mix(in_srgb,var(--theme-brand-primary)_4%,transparent)] active:scale-[0.99] touch-manipulation"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--theme-border-light)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
          {trip.code} · {trip.clientName}
        </span>
        <StatusBadgePro variant={statusVariant} label={statusLabel} size="sm" />
      </div>
      <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>
        {tripDate}{tripDate && ' | '}{resolveRoute(trip)}
      </p>
      {(trip.tractorPlate || types) && (
        <div className="mt-1.5 flex items-center gap-3">
          {trip.tractorPlate && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              <Truck className="h-3 w-3" />
              {trip.tractorPlate}
            </span>
          )}
          {types && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              <Car className="h-3 w-3" />
              {types}
            </span>
          )}
        </div>
      )}
    </button>
  )
}

// ─── Unmatched WO row ─────────────────────────────────────────────────────────

function UnmatchedRow({ wo, onClick, isLast }: { wo: WorkOrder; onClick: () => void; isLast?: boolean }) {
  const containerNums = wo.containers.map(c => c.containerNumber).filter(Boolean).slice(0, 1).join(', ')

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 transition hover:bg-[color-mix(in_srgb,var(--theme-brand-primary)_4%,transparent)] active:scale-[0.99] touch-manipulation"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--theme-border-light)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>
          {wo.code} · {wo.driverName}
        </span>
        <StatusBadgePro variant="warning" label="Chờ ghép" size="sm" />
      </div>
      <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>
        {wo.clientName} | {resolveRoute(wo)}
      </p>
      <div className="mt-1.5 flex items-center gap-3">
        {wo.tractorPlate && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            <Truck className="h-3 w-3" />
            {wo.tractorPlate}
          </span>
        )}
        {wo.containers[0]?.workType && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            <Car className="h-3 w-3" />
            {wo.containers[0].workType}
          </span>
        )}
        {containerNums && (
          <span className="text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>
            {containerNums}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Trip info mini-card ──────────────────────────────────────────────────────

function TripMiniCard({ trip, isSelected, onClick }: {
  trip: TripOrder
  isSelected?: boolean
  onClick?: () => void
}) {
  const tripDate = trip.tripDate
    ? new Date(trip.tripDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    : null
  const types = trip.containers.length > 0
    ? (() => {
        const map: Record<string, number> = {}
        trip.containers.forEach(c => { map[c.workType] = (map[c.workType] ?? 0) + 1 })
        return Object.entries(map).map(([t, n]) => n > 1 ? `${t}×${n}` : t).join(' ')
      })()
    : trip.workType ?? ''

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="w-full text-left rounded-xl p-3 transition-all"
      style={{
        background: isSelected
          ? 'color-mix(in srgb, var(--theme-brand-primary) 10%, var(--theme-bg-primary))'
          : 'var(--theme-bg-primary)',
        border: `1.5px solid ${isSelected ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)'}`,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Label */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
          Đơn hàng
        </span>
        {isSelected && (
          <span className="text-[10px] font-bold" style={{ color: 'var(--theme-brand-primary)' }}>✓ Đã chọn</span>
        )}
      </div>
      {/* Client */}
      <p className="text-sm font-semibold leading-tight truncate mb-1" style={{ color: 'var(--theme-text-primary)' }}>
        {trip.clientName}
      </p>
      {/* Route */}
      <p className="text-xs truncate mb-2" style={{ color: 'var(--theme-text-secondary)' }}>
        {resolveRoute(trip)}
      </p>
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {tripDate && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            <Calendar className="h-3 w-3 shrink-0" />
            {tripDate}
          </span>
        )}
        {trip.driverName && (
          <span className="flex items-center gap-1 text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>
            <User className="h-3 w-3 shrink-0" />
            {trip.driverName}
          </span>
        )}
        {trip.tractorPlate && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            <Truck className="h-3 w-3 shrink-0" />
            {trip.tractorPlate}
          </span>
        )}
        {types && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            <Car className="h-3 w-3 shrink-0" />
            {types}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Work order mini-card ─────────────────────────────────────────────────────

function WorkOrderMiniCard({ wo, onClick }: { wo: WorkOrder; onClick?: () => void }) {
  const containerNums = wo.containers.map(c => c.containerNumber).filter(Boolean).slice(0, 2).join(', ')
  const types = wo.containers.length > 0
    ? (() => {
        const map: Record<string, number> = {}
        wo.containers.forEach(c => { map[c.workType] = (map[c.workType] ?? 0) + 1 })
        return Object.entries(map).map(([t, n]) => n > 1 ? `${t}×${n}` : t).join(' ')
      })()
    : ''

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="w-full text-left rounded-xl p-3 transition-all"
      style={{
        background: 'var(--theme-bg-primary)',
        border: '1.5px solid var(--theme-border-default)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Label */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
          Phiếu tài xế
        </span>
        {onClick && (
          <span className="text-[10px] font-bold" style={{ color: 'var(--theme-brand-primary)' }}>✎ Sửa</span>
        )}
      </div>
      {/* Client */}
      <p className="text-sm font-semibold leading-tight truncate mb-1" style={{ color: 'var(--theme-text-primary)' }}>
        {wo.clientName}
      </p>
      {/* Route */}
      <p className="text-xs truncate mb-2" style={{ color: 'var(--theme-text-secondary)' }}>
        {resolveRoute(wo)}
      </p>
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {wo.driverName && (
          <span className="flex items-center gap-1 text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>
            <User className="h-3 w-3 shrink-0" />
            {wo.driverName}
          </span>
        )}
        {wo.tractorPlate && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            <Truck className="h-3 w-3 shrink-0" />
            {wo.tractorPlate}
          </span>
        )}
        {types && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            <Car className="h-3 w-3 shrink-0" />
            {types}
          </span>
        )}
        {containerNums && (
          <span className="text-xs font-mono" style={{ color: 'var(--theme-text-muted)' }}>
            {containerNums}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Match suggestion row ─────────────────────────────────────────────────────

function MatchRow({ wo, trips, onMatch, isLast }: {
  wo: WorkOrder
  trips: TripOrder[]
  onMatch: (woId: number) => void
  isLast?: boolean
}) {
  const updateWO = useUpdateWorkOrder()
  const updateTrip = useUpdateTripOrder()

  // Build ranked candidates
  const candidates = useMemo(() => {
    const woRoute = wo.route.toLowerCase()
    const woClient = wo.clientName.toLowerCase()
    return trips
      .filter(t => t.status === 'DRAFT' || t.status === 'PENDING')
      .map(t => {
        let score = 0
        if (t.clientName.toLowerCase() === woClient) score += 50
        if (t.route.toLowerCase() === woRoute) score += 30
        if (t.driverId === wo.driverId) score += 20
        return { trip: t, score }
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
  }, [wo, trips])

  const [selectedIdx, setSelectedIdx] = useState(0)
  const selectedCandidate = candidates[selectedIdx] ?? null
  const isFullMatch = (selectedCandidate?.score ?? 0) >= 100

  // WO edit state
  const [editWO, setEditWO] = useState(false)
  const [woClient, setWoClient] = useState('')
  const [woRoute, setWoRoute] = useState('')
  const [woDriver, setWoDriver] = useState('')

  // Trip edit state
  const [editTrip, setEditTrip] = useState(false)
  const [tripClient, setTripClient] = useState('')
  const [tripRoute, setTripRoute] = useState('')
  const [tripDriver, setTripDriver] = useState('')

  const openEditWO = (e: React.MouseEvent) => {
    e.stopPropagation()
    setWoClient(wo.clientName)
    setWoRoute(wo.route)
    setWoDriver(wo.driverName)
    setEditWO(true)
  }

  const saveWO = () => {
    updateWO.mutate({ id: wo.id, data: { clientName: woClient, route: woRoute, driverName: woDriver } })
    setEditWO(false)
  }

  const openEditTrip = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!selectedCandidate) return
    setTripClient(selectedCandidate.trip.clientName)
    setTripRoute(selectedCandidate.trip.route)
    setTripDriver(selectedCandidate.trip.driverName)
    setEditTrip(true)
  }

  const saveTrip = () => {
    if (!selectedCandidate) return
    updateTrip.mutate({ id: selectedCandidate.trip.id, data: { clientName: tripClient, route: tripRoute, driverName: tripDriver } })
    setEditTrip(false)
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIdx(i => Math.max(0, i - 1))
  }
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIdx(i => Math.min(candidates.length - 1, i + 1))
  }

  return (
    <div
      className="px-4 py-4"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--theme-border-light)' }}
    >
      {/* Two-panel layout */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Left: Trip order (selectable + editable) */}
        <div className="flex flex-col gap-1.5">
          {selectedCandidate ? (
            <TripMiniCard
              trip={selectedCandidate.trip}
              isSelected
              onClick={openEditTrip}
            />
          ) : (
            <div
              className="rounded-xl p-3 flex items-center justify-center"
              style={{ background: 'var(--theme-bg-primary)', border: '1.5px dashed var(--theme-border-default)', minHeight: 100 }}
            >
              <p className="text-xs text-center" style={{ color: 'var(--theme-text-muted)' }}>Không tìm thấy lệnh phù hợp</p>
            </div>
          )}
          {/* Candidate navigator */}
          {candidates.length > 1 && (
            <div className="flex items-center justify-between px-1">
              <button
                onClick={handlePrev}
                disabled={selectedIdx === 0}
                className="flex items-center gap-0.5 text-xs font-medium transition disabled:opacity-30"
                style={{ color: 'var(--theme-brand-primary)' }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Trước
              </button>
              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                {selectedIdx + 1}/{candidates.length}
              </span>
              <button
                onClick={handleNext}
                disabled={selectedIdx === candidates.length - 1}
                className="flex items-center gap-0.5 text-xs font-medium transition disabled:opacity-30"
                style={{ color: 'var(--theme-brand-primary)' }}
              >
                Sau
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Work order (editable) */}
        <WorkOrderMiniCard wo={wo} onClick={openEditWO} />
      </div>

      {/* Action button */}
      <div className="flex justify-center">
        <button
          onClick={() => isFullMatch && onMatch(wo.id)}
          disabled={!isFullMatch}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98]"
          style={{
            background: isFullMatch ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
            color: isFullMatch ? '#fff' : 'var(--theme-text-muted)',
            cursor: isFullMatch ? 'pointer' : 'not-allowed',
          }}
        >
          Xác nhận
        </button>
      </div>

      {/* Inline edit: Work Order */}
      <EditDialog open={editWO} title="Sửa phiếu tài xế" color="var(--theme-brand-primary)" onClose={saveWO}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Khách hàng</Label>
          <Input value={woClient} onChange={e => setWoClient(e.target.value)} className="text-sm h-10" autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Cung đường</Label>
          <Input value={woRoute} onChange={e => setWoRoute(e.target.value)} className="text-sm h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Tài xế</Label>
          <Input value={woDriver} onChange={e => setWoDriver(e.target.value)} className="text-sm h-10" />
        </div>
      </EditDialog>

      {/* Inline edit: Trip Order */}
      <EditDialog open={editTrip} title="Sửa lệnh điều hành" color="var(--theme-status-warning)" onClose={saveTrip}>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Khách hàng</Label>
          <Input value={tripClient} onChange={e => setTripClient(e.target.value)} className="text-sm h-10" autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Cung đường</Label>
          <Input value={tripRoute} onChange={e => setTripRoute(e.target.value)} className="text-sm h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Tài xế</Label>
          <Input value={tripDriver} onChange={e => setTripDriver(e.target.value)} className="text-sm h-10" />
        </div>
      </EditDialog>
    </div>
  )
}

// ─── Desktop dashboard ────────────────────────────────────────────────────────

function DesktopDashboard() {
  const navigate = useNavigate()
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()

  const { data: workOrders = [] } = useWorkOrders({ dateFrom, dateTo })
  const { data: trips = [] } = useTripOrders({ dateFrom, dateTo })
  const { data: summary } = useDashboardSummary()

  const pendingWOs = useMemo(() => workOrders.filter(w => w.status === 'PENDING'), [workOrders])
  const totalDriverSalary = useMemo(() => workOrders.reduce((s, w) => s + (w.earning ?? 0), 0), [workOrders])
  const revenue = summary?.totalRevenue ?? trips.reduce((s, t) => s + (t.revenue ?? 0), 0)
  const pendingTrips = trips.filter(t => t.status === 'PENDING' || t.status === 'DRAFT')
  const completedTrips = trips.filter(t => t.status === 'COMPLETED')

  const sortedTrips = useMemo(
    () => [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    [trips],
  )
  const unmatchedWOs = useMemo(
    () => workOrders.filter(w => w.status !== 'MATCHED' && w.status !== 'COMPLETED').slice(0, 10),
    [workOrders],
  )
  const matchCandidates = useMemo(() => pendingWOs.slice(0, 5), [pendingWOs])

  // Stats for the grid
  const stats = [
    {
      label: 'Doanh thu tháng',
      value: fmt(revenue),
      icon: <DollarSign className="h-5 w-5" />,
      onClick: () => navigate('/accountant/trips'),
    },
    {
      label: 'Chi phí tài xế',
      value: fmt(totalDriverSalary),
      icon: <Wallet className="h-5 w-5" />,
      onClick: () => navigate('/accountant/driver-trips'),
    },
    {
      label: 'Lệnh chờ ghép',
      value: String(pendingTrips.length),
      valueColor: pendingTrips.length > 0 ? 'var(--theme-status-warning)' : undefined,
      icon: <Clock className="h-5 w-5" />,
      onClick: () => navigate('/accountant/trips'),
    },
    {
      label: 'Phiếu chưa ghép',
      value: String(pendingWOs.length),
      valueColor: pendingWOs.length > 0 ? 'var(--theme-status-warning)' : undefined,
      icon: <AlertTriangle className="h-5 w-5" />,
      onClick: () => navigate('/accountant/work-orders'),
    },
  ]

  // Quick actions
  const quickActions = [
    { id: 'create', label: 'Tạo đơn', icon: <Plus className="h-4 w-4" />, onClick: () => navigate('/accountant/create-trip'), primary: true },
    { id: 'reconcile', label: 'Đối soát', icon: <Briefcase className="h-4 w-4" />, onClick: () => navigate('/accountant/work-orders') },
    { id: 'partners', label: 'Đối tác', icon: <Users className="h-4 w-4" />, onClick: () => navigate('/accountant/partners') },
    { id: 'routes', label: 'Cung đường', icon: <MapPin className="h-4 w-4" />, onClick: () => navigate('/accountant/routes') },
    { id: 'pricing', label: 'Bảng giá', icon: <Tag className="h-4 w-4" />, onClick: () => navigate('/accountant/pricing') },
    { id: 'salary', label: 'Kỳ lương', icon: <Wallet className="h-4 w-4" />, onClick: () => navigate('/accountant/salary-setup') },
  ]

  return (
    <div className="space-y-6">
      {/* Header with Month navigator */}
      <div className="flex items-center justify-end gap-4">
        <MonthNavigator
          year={year}
          month={month}
          onPrev={onPrev}
          onNext={onNext}
        />
      </div>

      {/* KPI Stats Grid */}
      <StatsGrid stats={stats} columns={4} />

      {/* Quick actions */}
      <QuickActionsBar actions={quickActions} />

      {/* 3-column workbench — needs enough room, so xl breakpoint (1280px) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left: Đơn hàng */}
        <WorkbenchCard
          title="Đơn hàng gần đây"
          footerLabel="Xem tất cả lệnh"
          onFooter={() => navigate('/accountant/trips')}
        >
          {sortedTrips.length === 0 ? (
            <EmptyState icon={FileText} text="Chưa có lệnh nào" />
          ) : (
            sortedTrips.map((trip, i) => (
              <TripRow
                key={trip.id}
                trip={trip}
                isLast={i === sortedTrips.length - 1}
                onClick={() => navigate(`/accountant/trip/${trip.id}`)}
              />
            ))
          )}
        </WorkbenchCard>

        {/* Middle: Gợi ý ghép phiếu */}
        <WorkbenchCard
          title={
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" style={{ color: 'var(--theme-status-warning)' }} />
              Gợi ý ghép phiếu
            </span>
          }
          footerLabel="Mở đối soát đầy đủ"
          onFooter={() => navigate('/accountant/work-orders')}
        >
          {matchCandidates.length === 0 ? (
            <EmptyState icon={CheckCircle2} text="Tất cả phiếu đã ghép" />
          ) : (
            matchCandidates.map((wo, i) => (
              <MatchRow
                key={wo.id}
                wo={wo}
                trips={trips}
                isLast={i === matchCandidates.length - 1}
                onMatch={id => navigate(`/accountant/match/${id}`)}
              />
            ))
          )}
        </WorkbenchCard>

        {/* Right: Phiếu tài xế chưa ghép */}
        <WorkbenchCard
          title="Phiếu tài xế chưa ghép"
          titleExtra={
            <button
              onClick={() => navigate('/accountant/work-orders')}
              className="text-xs font-semibold transition hover:opacity-70"
              style={{ color: 'var(--theme-brand-primary)' }}
            >
              Xem tất cả
            </button>
          }
        >
          {unmatchedWOs.length === 0 ? (
            <EmptyState icon={CheckCircle2} text="Không có phiếu chờ" />
          ) : (
            unmatchedWOs.map((wo, i) => (
              <UnmatchedRow
                key={wo.id}
                wo={wo}
                isLast={i === unmatchedWOs.length - 1}
                onClick={() => navigate(`/accountant/match/${wo.id}`)}
              />
            ))
          )}
        </WorkbenchCard>
      </div>
    </div>
  )
}

// ─── Mobile dashboard ─────────────────────────────────────────────────────────

function MobileDashboard() {
  const navigate = useNavigate()
  const { year, month, dateFrom, dateTo, onPrev, onNext } = useMonthParams()
  const { data: workOrders = [] } = useWorkOrders({ dateFrom, dateTo })
  const { data: trips = [] } = useTripOrders({ dateFrom, dateTo })
  const { data: summary } = useDashboardSummary()

  const pendingWOs = useMemo(() => workOrders.filter(w => w.status === 'PENDING'), [workOrders])
  const totalDriverSalary = useMemo(() => workOrders.reduce((s, w) => s + (w.earning ?? 0), 0), [workOrders])
  const revenue = summary?.totalRevenue ?? trips.reduce((s, t) => s + (t.revenue ?? 0), 0)
  const pendingTrips = trips.filter(t => t.status === 'PENDING' || t.status === 'DRAFT')
  const recentTrips = useMemo(
    () => [...trips].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [trips],
  )
  const unmatchedWOs = useMemo(
    () => workOrders.filter(w => w.status !== 'MATCHED' && w.status !== 'COMPLETED').slice(0, 5),
    [workOrders],
  )

  const stats = [
    { label: 'Doanh thu tháng', value: fmt(revenue) },
    { label: 'Chi phí tài xế', value: fmt(totalDriverSalary) },
    { label: 'Lệnh chờ ghép', value: String(pendingTrips.length), valueColor: pendingTrips.length > 0 ? 'var(--theme-status-warning)' : undefined },
    { label: 'Phiếu chưa ghép', value: String(pendingWOs.length), valueColor: pendingWOs.length > 0 ? 'var(--theme-status-warning)' : undefined },
  ]

  const quickActions = [
    { id: 'create', label: 'Tạo đơn', icon: <Plus className="h-4 w-4" />, onClick: () => navigate('/accountant/create-trip'), primary: true },
    { id: 'reconcile', label: 'Đối soát', icon: <Briefcase className="h-4 w-4" />, onClick: () => navigate('/accountant/work-orders') },
    { id: 'partners', label: 'Đối tác', icon: <Users className="h-4 w-4" />, onClick: () => navigate('/accountant/partners') },
    { id: 'routes', label: 'Cung đường', icon: <MapPin className="h-4 w-4" />, onClick: () => navigate('/accountant/routes') },
    { id: 'pricing', label: 'Bảng giá', icon: <Tag className="h-4 w-4" />, onClick: () => navigate('/accountant/pricing') },
    { id: 'salary', label: 'Kỳ lương', icon: <Wallet className="h-4 w-4" />, onClick: () => navigate('/accountant/salary-setup') },
  ]

  return (
    <div className="space-y-4 pb-8">
      {/* Month navigator */}
      <MonthNavigator
        year={year}
        month={month}
        onPrev={onPrev}
        onNext={onNext}
      />

      {/* KPI grid - 2x2 */}
      <StatsGrid stats={stats} columns={2} />

      {/* Quick actions - scrollable row */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {quickActions.map(a => (
          <button
            key={a.id}
            onClick={a.onClick}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:opacity-80 active:scale-[0.97] touch-manipulation shrink-0"
            style={{
              background: a.primary ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
              borderColor: a.primary ? 'transparent' : 'var(--theme-border-default)',
              color: a.primary ? '#fff' : 'var(--theme-text-primary)',
            }}
          >
            <span style={{ color: a.primary ? '#fff' : 'var(--theme-brand-primary)' }}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>

      {/* Đơn hàng */}
      <WorkbenchCard
        title="Đơn hàng"
        footerLabel="Xem tất cả lệnh"
        onFooter={() => navigate('/accountant/trips')}
        minHeight="200px"
      >
        {recentTrips.length === 0 ? (
          <EmptyState icon={FileText} text="Chưa có lệnh nào" />
        ) : (
          recentTrips.map((trip, i) => (
            <TripRow
              key={trip.id}
              trip={trip}
              isLast={i === recentTrips.length - 1}
              onClick={() => navigate(`/accountant/trip/${trip.id}`)}
            />
          ))
        )}
      </WorkbenchCard>

      {/* Gợi ý ghép phiếu */}
      <WorkbenchCard
        title={
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" style={{ color: 'var(--theme-status-warning)' }} />
            Gợi ý ghép phiếu
          </span>
        }
        footerLabel="Mở đối soát đầy đủ"
        onFooter={() => navigate('/accountant/work-orders')}
        minHeight="200px"
      >
        {pendingWOs.length === 0 ? (
          <EmptyState icon={CheckCircle2} text="Tất cả phiếu đã ghép" />
        ) : (
          pendingWOs.slice(0, 3).map((wo, i) => (
            <MatchRow
              key={wo.id}
              wo={wo}
              trips={trips}
              isLast={i === Math.min(pendingWOs.length, 3) - 1}
              onMatch={id => navigate(`/accountant/match/${id}`)}
            />
          ))
        )}
      </WorkbenchCard>

      {/* Phiếu tài xế chưa ghép */}
      <WorkbenchCard
        title="Phiếu tài xế chưa ghép"
        titleExtra={
          <button
            onClick={() => navigate('/accountant/work-orders')}
            className="text-xs font-semibold"
            style={{ color: 'var(--theme-brand-primary)' }}
          >
            Lọc
          </button>
        }
        minHeight="200px"
      >
        {unmatchedWOs.length === 0 ? (
          <EmptyState icon={CheckCircle2} text="Không có phiếu chờ" />
        ) : (
          unmatchedWOs.map((wo, i) => (
            <UnmatchedRow
              key={wo.id}
              wo={wo}
              isLast={i === unmatchedWOs.length - 1}
              onClick={() => navigate(`/accountant/match/${wo.id}`)}
            />
          ))
        )}
      </WorkbenchCard>
    </div>
  )
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function AccountantDashboard() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileDashboard /> : <DesktopDashboard />
}
