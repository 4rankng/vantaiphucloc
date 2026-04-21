import { useDriverStore } from '@/hooks/use-driver-store'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InlineStatStrip } from '@/components/shared/InlineStatStrip'
import { formatCurrencyShort, getJobStatusBadge, type JobStatus } from '@/data/mockData'
import {
  CheckCircle2, Circle, Package, TruckIcon, Navigation,
  Camera, MapPinCheck, Warehouse, PlusCircle, Fuel,
} from 'lucide-react'

const CHECKPOINT_ICONS: Record<string, any> = {
  cp1: Navigation,
  cp2: Camera,
  cp3: MapPinCheck,
  cp4: Warehouse,
}

export function ActiveTrip({ jobId }: { jobId: string }) {
  const { jobs, checkpoints, toggleCheckpoint, expenses, navigate } = useDriverStore()
  const job = jobs.find(j => j.id === jobId)
  if (!job) return <p className="p-4">Không tìm thấy chuyến</p>

  const cps = checkpoints[jobId] ?? []
  const doneCount = cps.filter(c => c.done).length
  const tripExpenses = expenses.filter(e => e.jobId === jobId)
  const totalExp = tripExpenses.reduce((s, e) => s + e.amount, 0)
  const progress = cps.length > 0 ? (doneCount / cps.length) * 100 : 0

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Route card */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Navigation className="w-4 h-4" style={{ color: 'var(--theme-brand-primary)' }} />
              <span className="text-[15px] font-bold truncate" style={{ color: 'var(--theme-text-primary)' }}>{job.route}</span>
            </div>
            <Badge variant={getJobStatusBadge(job.status as JobStatus).variant as any}>
              {getJobStatusBadge(job.status as JobStatus).label}
            </Badge>
          </div>
        </div>
        <InlineStatStrip items={[
          { label: 'Container', value: job.containerNumber.slice(-7) },
          { label: 'Xe kéo', value: job.tractorPlate },
          { label: 'Quãng đường', value: job.distanceKm + ' km' },
        ]} />
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>Trạm kiểm tra</span>
          <span className="text-xs font-bold" style={{ color: 'var(--theme-brand-primary)' }}>{doneCount}/{cps.length}</span>
        </div>
        {/* Progress bar */}
        <div className="h-2.5 rounded-full overflow-hidden mb-4" style={{ background: 'var(--theme-bg-tertiary)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: progress === 100 ? 'var(--theme-status-success)' : 'var(--theme-brand-primary)' }}
          />
        </div>
        <div className="space-y-2.5">
          {cps.map(cp => {
            const CpIcon = CHECKPOINT_ICONS[cp.id] ?? Circle
            return (
              <button
                key={cp.id}
                onClick={() => toggleCheckpoint(jobId, cp.id)}
                className="w-full flex items-center gap-3.5 rounded-2xl p-3.5 card-lift"
                style={{
                  background: 'var(--theme-bg-secondary)',
                  boxShadow: 'var(--theme-shadow-card)',
                  borderLeft: cp.done ? '3px solid var(--theme-status-success)' : '3px solid transparent',
                }}
              >
                {cp.done ? (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--theme-status-success-light)' }}>
                    <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--theme-status-success)' }} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--theme-bg-tertiary)' }}>
                    <CpIcon className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold" style={{ color: cp.done ? 'var(--theme-status-success)' : 'var(--theme-text-primary)' }}>{cp.label}</p>
                  {cp.timestamp && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                      {new Date(cp.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Expenses */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>Chi phí chuyến</span>
          <span className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyShort(totalExp)}</span>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
          {tripExpenses.length === 0 ? (
            <div className="p-5 text-center">
              <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Chưa khai chi phí</p>
            </div>
          ) : (
            tripExpenses.map((e, i) => (
              <div key={e.id}>
                <div className="flex justify-between items-center px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Fuel className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
                    <span className="text-sm" style={{ color: 'var(--theme-text-primary)' }}>{e.category}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyShort(e.amount)}</span>
                </div>
                {i < tripExpenses.length - 1 && <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-light)' }} />}
              </div>
            ))
          )}
        </div>
      </div>

      <Button onClick={() => navigate('/driver/expenses/new')} className="w-full h-12 rounded-2xl font-bold text-[15px]">
        <PlusCircle className="w-5 h-5 mr-2" />
        Khai chi phí
      </Button>
    </div>
  )
}
