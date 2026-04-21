import { useIsMobile } from '@/hooks/use-mobile'
import { FilterBar, MobileListCard } from '@/components/shared/DataList'
import { GlassCard } from '@/components/shared/GlassCard'
import { mockAlerts } from '@/data/mockData'
import { AlertTriangle, AlertCircle, Info, Bell } from 'lucide-react'

const severityVariant = (s: string): 'danger'|'warning'|'neutral' =>
  s === 'high' ? 'danger' : s === 'medium' ? 'warning' : 'neutral'

const severityLabel = (s: string) => s === 'high' ? 'Khẩn cấp' : s === 'medium' ? 'Cảnh báo' : 'Thông tin'

const typeIcon = (t: string) => {
  switch(t) {
    case 'maintenance': return <AlertTriangle size={16} className="text-red-500" />
    case 'expense': return <AlertCircle size={16} className="text-amber-500" />
    case 'overdue': return <AlertTriangle size={16} className="text-red-500" />
    default: return <Info size={16} className="text-blue-500" />
  }
}

export default function DispatcherAlertsPage() {
  const isMobile = useIsMobile()

  return (
    <div className="space-y-4">
      <FilterBar searchPlaceholder="Tìm cảnh báo..." />

      {isMobile ? (
        <div className="space-y-2">
          {mockAlerts.map((a) => (
            <MobileListCard key={a.id} className={a.severity === 'high' ? 'border-l-4 border-l-red-400' : a.severity === 'medium' ? 'border-l-4 border-l-amber-400' : ''}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{typeIcon(a.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${a.severity === 'high' ? 'bg-red-100 text-red-700' : a.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-[var(--theme-text-secondary)]'}`}>
                      {severityLabel(a.severity)}
                    </span>
                    <span className="text-[10px] text-[var(--theme-text-muted)]">{a.timestamp}</span>
                  </div>
                  <p className="text-[12px] text-[var(--theme-text-primary)]">{a.message}</p>
                </div>
              </div>
            </MobileListCard>
          ))}
        </div>
      ) : (
        <GlassCard className="overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] text-[var(--theme-text-muted)] uppercase tracking-wider border-b border-[var(--theme-border-default)]">
              <th className="px-4 py-2.5 font-semibold">Mức độ</th><th className="px-4 py-2.5 font-semibold">Loại</th>
              <th className="px-4 py-2.5 font-semibold">Nội dung</th><th className="px-4 py-2.5 font-semibold">Thời gian</th>
            </tr></thead>
            <tbody>{mockAlerts.map((a) => (
              <tr key={a.id} className={`border-b border-[var(--theme-border-light)] last:border-0 ${a.severity === 'high' ? 'bg-red-50/20' : ''}`}>
                <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${a.severity === 'high' ? 'bg-red-100 text-red-700' : a.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-[var(--theme-text-secondary)]'}`}>{severityLabel(a.severity)}</span></td>
                <td className="px-4 py-3">{typeIcon(a.type)}</td>
                <td className="px-4 py-3 text-[var(--theme-text-primary)]">{a.message}</td>
                <td className="px-4 py-3 text-[var(--theme-text-muted)] text-[12px]">{a.timestamp}</td>
              </tr>
            ))}</tbody>
          </table>
        </GlassCard>
      )}
    </div>
  )
}
