import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'

export function Fab({ onClick, label = '' }: { onClick: () => void; label?: string }) {
  return createPortal(
    <button
      onClick={onClick}
      className="fixed bottom-6 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-50 transition-transform active:scale-90 touch-manipulation"
      style={{
        background: 'var(--theme-brand-primary)',
        color: 'var(--theme-text-on-brand)',
        boxShadow: 'var(--theme-shadow-elevated)',
      }}
      aria-label={label || 'Thêm'}
    >
      <Plus className="w-6 h-6" />
    </button>,
    document.body,
  )
}
