import { Check } from 'lucide-react'

interface ConfirmationCheckboxProps {
  isConfirmed: boolean
  onToggle?: () => void
  disabled?: boolean
  label?: string
}

export function ConfirmationCheckbox({ isConfirmed, onToggle, disabled = false, label = 'Đã chốt' }: ConfirmationCheckboxProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium touch-manipulation transition-colors"
      style={{
        background: isConfirmed ? 'var(--theme-status-success-light, #DCFCE7)' : 'var(--theme-bg-tertiary)',
        color: isConfirmed ? '#166534' : 'var(--theme-text-muted)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        className="w-4 h-4 rounded border flex items-center justify-center"
        style={{
          borderColor: isConfirmed ? '#166534' : 'var(--theme-border-default)',
          background: isConfirmed ? '#166534' : 'transparent',
        }}
      >
        {isConfirmed && <Check className="w-3 h-3 text-white" />}
      </div>
      <span>{label}</span>
    </button>
  )
}
