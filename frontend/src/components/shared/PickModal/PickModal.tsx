import { CheckCircle2 } from 'lucide-react'

export function PickModal<T extends { id: number }>({
  open, title, items, selectedId, onSelect, onClose, renderLabel,
}: {
  open: boolean; title: string; items: T[]; selectedId: number
  onSelect: (id: number) => void; onClose: () => void
  renderLabel: (item: T) => React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: 'var(--theme-bg-primary)' }}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{title}</p>
        <button onClick={onClose} className="text-xs font-medium px-3 py-1.5 rounded-lg touch-manipulation" style={{ color: 'var(--theme-brand-primary)' }}>Đóng</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: 'var(--theme-text-muted)' }}>Không có dữ liệu</p>
        ) : items.map(item => {
          const isSelected = item.id === selectedId
          return (
            <button key={item.id} onClick={() => { onSelect(item.id); onClose() }}
              className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 touch-manipulation"
              style={{ background: isSelected ? 'var(--theme-brand-primary-light)' : 'transparent', borderBottom: '1px solid var(--theme-border-light)' }}>
              <div className="flex-1 min-w-0">{renderLabel(item)}</div>
              {isSelected && <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--theme-brand-primary)' }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
