import type { AuditLogEntry } from '@/services/api/audit.api'
import { formatActivityEntry, formatFinancialChange, SUBJECT_PREFIX } from '@/lib/activity-utils'

const ROLE_INITIALS: Record<string, string> = {
  accountant: 'KT', director: 'ĐT', driver: 'LX', superadmin: 'SA',
}
const ROLE_LABELS: Record<string, string> = {
  accountant: 'Kế toán', director: 'Giám đốc', driver: 'Lái xe', superadmin: 'Quản trị',
}

export function ActivityItem({ log, isFirst }: { log: AuditLogEntry; isFirst: boolean }) {
  const time = new Date(log.createdAt)
  const timeStr = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  const dateStr = time.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })

  const roleLabel = ROLE_LABELS[log.userRole ?? ''] ?? ''
  const rawName = log.userName || ''
  const actorLabel = log.userId
    ? [roleLabel, rawName].filter(Boolean).join(' ') || 'Người dùng'
    : 'Hệ thống'

  const activityText = formatActivityEntry(log.action, log.tableName)
  const changes = formatFinancialChange(log)
  const initials = ROLE_INITIALS[log.userRole ?? ''] ?? rawName.slice(0, 2).toUpperCase()
  const isCreate = log.action?.toLowerCase().includes('create')

  return (
    <div
      className="flex gap-3 rounded-[10px] px-3 py-2.5 transition-colors duration-150 relative text-left"
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--theme-bg-tertiary)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {!isFirst && (
        <div style={{ position: 'absolute', top: 0, left: 28, width: 1, height: 12, background: 'var(--theme-border-light)' }} />
      )}
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
        style={{
          background: isCreate ? 'color-mix(in srgb, var(--theme-status-warning) 10%, transparent)' : 'color-mix(in srgb, var(--theme-brand-primary) 10%, transparent)',
          color: isCreate ? 'var(--theme-status-warning)' : 'var(--theme-brand-primary)',
        }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] leading-snug" style={{ color: 'var(--theme-text-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>{actorLabel}</span>{' '}
          <span style={{ color: isCreate ? 'var(--theme-status-warning)' : 'var(--theme-brand-primary)' }}>đã {activityText}</span>
          {log.subjectName && (
            <span className="font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
              {(() => { const pfx = SUBJECT_PREFIX[log.tableName]; return pfx ? ` ${pfx} ` : ' ' })()}{log.subjectName}
            </span>
          )}
        </p>
        <p className="mt-0.5 font-mono text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>
          {timeStr} · {dateStr}
        </p>
        {changes && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {changes.map((c, ci) => (
              <span key={ci} className="inline-flex items-center gap-1 text-[11px] rounded-md px-2 py-0.5" style={{ background: 'var(--theme-bg-tertiary)' }}>
                <span style={{ color: 'var(--theme-text-muted)' }}>{c.label}:</span>
                <span className="line-through" style={{ color: 'var(--theme-text-muted)' }}>{c.old.toLocaleString('vi-VN')}</span>
                <span style={{ color: 'var(--theme-text-muted)' }}>→</span>
                <span className="font-bold" style={{ color: 'var(--theme-brand-primary)' }}>{c.new.toLocaleString('vi-VN')}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
