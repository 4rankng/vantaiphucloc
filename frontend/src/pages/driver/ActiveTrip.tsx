import { useDriverStore } from '@/hooks/use-driver-store'
import { BackButton } from '@/components/shared/BackButton'
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
    <div className="p-4 space-y-4 pb-6">
      <BackButton />

      {/* Route card — compact */}
      <div className="rounded-2xl p-3.5" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Navigation className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-brand-primary)' }} />
            <span className="text-[15px] font-bold truncate" style={{ color: 'var(--theme-text-primary)' }}>{job.route}</span>
          </div>
          <Badge variant={getJobStatusBadge(job.status as JobStatus).variant as any} className="ml-2 shrink-0 text-[10px]">
            {getJobStatusBadge(job.status as JobStatus).label}
          </Badge>
        </div>
        <InlineStatStrip items={[
          { label: 'Container', value: job.containerNumber.slice(-7) },
          { label: 'Xe kéo', value: job.tractorPlate },
          { label: 'Quãng đường', value: job.distanceKm + ' km' },
        ]} />
      </div>

      {/* Progress — compact */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>Trạm kiểm tra</span>
          <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--theme-brand-primary)' }}>{doneCount}/{cps.length}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--theme-bg-tertiary)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: progress === 100 ? 'var(--theme-status-success)' : 'var(--theme-brand-primary)' }}
          />
        </div>
        <div className="space-y-1.5">
          {cps.map(cp => {
            const CpIcon = CHECKPOINT_ICONS[cp.id] ?? Circle
            return (
              <button
                key={cp.id}
                onClick={() => toggleCheckpoint(jobId, cp.id)}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
                style={{
                  background: 'var(--theme-bg-secondary)',
                  borderLeft: cp.done ? '3px solid var(--theme-status-success)' : '3px solid transparent',
                }}
              >
                {cp.done ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--theme-status-success)' }} />
                ) : (
                  <CpIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
                )}
                <span className={`text-sm ${cp.done ? 'font-semibold' : ''}`} style={{ color: cp.done ? 'var(--theme-status-success)' : 'var(--theme-text-primary)' }}>
                  {cp.label}
                </span>
                {cp.timestamp && (
                  <span className="text-[11px] ml-auto tabular-nums" style={{ color: 'var(--theme-text-muted)' }}>
                    {new Date(cp.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Expenses — compact list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold" style={{ color: 'var(--theme-text-secondary)' }}>Chi phí chuyến</span>
          <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyShort(totalExp)}</span>
        </div>
        {tripExpenses.length > 0 ? (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
            {tripExpenses.map((e, i) => (
              <div key={e.id}>
                <div className="flex justify-between items-center px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Fuel className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
                    <span className="text-sm" style={{ color: 'var(--theme-text-primary)' }}>{e.category}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-text-primary)' }}>{formatCurrencyShort(e.amount)}</span>
                </div>
                {i < tripExpenses.length - 1 && <div className="mx-4 border-t" style={{ borderColor: 'var(--theme-border-light)' }} />}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-center py-3 rounded-2xl" style={{ color: 'var(--theme-text-muted)', background: 'var(--theme-bg-secondary)' }}>
            Chưa khai chi phí
          </p>
        )}
      </div>

      <Button onClick={() => navigate('/driver/expenses/new')} className="w-full h-11 rounded-2xl font-semibold text-sm">
        <PlusCircle className="w-4 h-4 mr-2" />
        Khai chi phí
      </Button>
    </div>
  )
}
