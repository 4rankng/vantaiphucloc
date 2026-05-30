export function EditDialog({ open, title, color, onClose, children }: {
  open: boolean; title: string; color: string; onClose: () => void; children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: 'var(--theme-bg-primary)' }}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--theme-border-light)' }}>
        <p className="text-sm font-bold" style={{ color }}>{title}</p>
        <button onClick={onClose} className="text-xs font-medium px-3 py-1.5 rounded-lg touch-manipulation" style={{ color: 'var(--theme-brand-primary)' }}>
          Xong
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {children}
      </div>
    </div>
  )
}
