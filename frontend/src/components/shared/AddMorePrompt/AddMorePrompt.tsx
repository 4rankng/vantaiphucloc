interface AddMorePromptProps {
  visible: boolean
  onAdd: () => void
  onDismiss: () => void
}

export function AddMorePrompt({ visible, onAdd, onDismiss }: AddMorePromptProps) {
  if (!visible) return null

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-center" style={{ color: 'var(--theme-text-secondary)' }}>
        Có thêm cont nữa không?
      </p>
      <div className="flex gap-3">
        <button
          onClick={onAdd}
          className="flex-1 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 touch-manipulation transition-colors active:scale-[0.98]"
          style={{
            background: 'transparent',
            color: 'var(--theme-brand-primary)',
            border: '2px solid var(--theme-brand-primary)',
          }}
        >
          + Thêm cont
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 h-12 rounded-xl text-sm font-bold touch-manipulation transition-colors active:scale-[0.98]"
          style={{
            background: 'var(--theme-bg-tertiary)',
            color: 'var(--theme-text-secondary)',
          }}
        >
          Không
        </button>
      </div>
    </div>
  )
}
