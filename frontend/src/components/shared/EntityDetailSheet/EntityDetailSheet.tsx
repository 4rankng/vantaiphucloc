import { X } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/Sheet'

interface Field {
  label: string
  value: string | null | undefined
}

interface EntityDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  fields: Field[]
  children?: React.ReactNode
  actions?: React.ReactNode
  maxWidth?: number
}

export function EntityDetailSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  fields,
  children,
  actions,
  maxWidth = 360,
}: EntityDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 gap-0"
        style={{ width: '100%', maxWidth, border: 'none' }}
      >
        <div
          className="flex items-center justify-between"
          style={{ padding: '10px 16px', borderBottom: '0.5px solid var(--theme-border-light)' }}
        >
          <div>
            <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
              {title}
            </span>
            {subtitle && (
              <p className="text-xs font-mono-num mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{subtitle}</p>
            )}
          </div>
          <button
            onClick={() => onOpenChange(false)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--theme-text-muted)' }}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', borderBottom: '0.5px solid var(--theme-border-light)' }}>
          {fields.slice(0, 4).map((field, idx) => (
            <div
              key={field.label}
              style={{
                padding: '10px 16px',
                borderRight: idx % 2 === 0 ? '0.5px solid var(--theme-border-light)' : 'none',
                borderBottom: '0.5px solid var(--theme-border-light)',
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  color: 'var(--theme-text-muted)',
                  margin: '0 0 3px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {field.label}
              </p>
              <p
                className="text-sm"
                style={{
                  color: field.value ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
                  fontWeight: 500,
                }}
              >
                {field.value || '—'}
              </p>
            </div>
          ))}
        </div>

        {fields.slice(4).map((field, idx) => (
          <div
            key={field.label}
            style={{
              padding: '10px 16px',
              borderBottom: idx < fields.slice(4).length - 1 ? '0.5px solid var(--theme-border-light)' : 'none',
            }}
          >
            <p
              style={{
                fontSize: 10,
                color: 'var(--theme-text-muted)',
                margin: '0 0 3px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {field.label}
            </p>
            <p
              className="text-sm"
              style={{
                color: field.value ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
                fontWeight: 500,
              }}
            >
              {field.value || '—'}
            </p>
          </div>
        ))}

        {children}

        {actions && (
          <div
            style={{
              padding: '10px 16px',
              borderTop: '0.5px solid var(--theme-border-light)',
              display: 'flex',
              gap: 8,
            }}
          >
            {actions}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
