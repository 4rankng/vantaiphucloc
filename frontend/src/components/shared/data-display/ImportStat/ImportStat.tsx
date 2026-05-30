import { CheckCircle2, AlertTriangle } from 'lucide-react'

export function ImportStat({
  label,
  value,
  ok,
  warn,
}: {
  label: string
  value: string
  ok?: boolean
  warn?: boolean
}) {
  return (
    <div className="rounded-md p-2.5 flex items-center gap-2.5" style={{ background: 'var(--theme-bg-tertiary)' }}>
      {ok && (
        <CheckCircle2
          className="w-5 h-5 shrink-0"
          style={{ color: 'var(--theme-status-success)' }}
        />
      )}
      {warn && Number(value) > 0 && (
        <AlertTriangle
          className="w-5 h-5 shrink-0"
          style={{ color: 'var(--theme-status-warning)' }}
        />
      )}
      {warn && Number(value) === 0 && (
        <CheckCircle2
          className="w-5 h-5 shrink-0"
          style={{ color: 'var(--theme-status-success)' }}
        />
      )}
      <div>
        <p className="typo-caption mb-0.5">{label}</p>
        <p
          className="text-sm font-semibold"
          style={{
            color: ok
              ? 'var(--theme-status-success)'
              : warn && Number(value) > 0
              ? 'var(--theme-status-warning)'
              : warn && Number(value) === 0
              ? 'var(--theme-status-success)'
              : 'var(--theme-text-primary)',
          }}
        >
          {value}
        </p>
      </div>
    </div>
  )
}
