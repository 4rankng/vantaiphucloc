import { Check } from 'lucide-react'

interface ConfirmationCheckboxProps {
  isConfirmed: boolean
  onToggle?: () => void
  disabled?: boolean
  label?: string
}

export function ConfirmationCheckbox({ isConfirmed, onToggle, disabled = false, label = 'Đã khớp' }: ConfirmationCheckboxProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium touch-manipulation transition-colors"
      style={{
        background: isConfirmed ? 'var(--theme-status-success-light)' : 'var(--theme-bg-tertiary)',
        color: isConfirmed ? 'var(--theme-status-success-text)' : 'var(--theme-text-muted)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        className="w-4 h-4 rounded border flex items-center justify-center"
        style={{
          borderColor: isConfirmed ? 'var(--theme-status-success-text)' : 'var(--theme-border-default)',
          background: isConfirmed ? 'var(--theme-status-success-text)' : 'transparent',
        }}
      >
        {isConfirmed && <Check className="w-3 h-3" style={{ color: 'var(--theme-text-on-brand)' }} />}
      </div>
      <span>{label}</span>
    </button>
  )
}
