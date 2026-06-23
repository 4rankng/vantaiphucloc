/**
 * Day/month segmented toggle for OCR charts. Shared by the /superadmin
 * dashboard overview and the /superadmin/ocr-analytics detail page so both
 * present the same granularity switch with identical styling and a11y.
 */
export type ViewMode = 'day' | 'month'

const VIEW_LABELS: Record<ViewMode, string> = {
  day: 'Theo ngày',
  month: 'Theo tháng',
}

const VIEW_ORDER: ViewMode[] = ['day', 'month']

interface OcrViewToggleProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
}

export function OcrViewToggle({ value, onChange }: OcrViewToggleProps) {
  return (
    <div
      className="flex items-center gap-1 rounded-lg p-1"
      style={{ background: 'var(--theme-bg-secondary)' }}
      role="tablist"
      aria-label="Chế độ xem biểu đồ"
    >
      {VIEW_ORDER.map((mode) => {
        const active = mode === value
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(mode)}
            className="rounded-md min-h-[44px] px-3 py-2 text-[12.5px] font-medium transition-colors"
            style={{
              background: active ? 'var(--surface)' : 'transparent',
              color: active
                ? 'var(--theme-text-primary)'
                : 'var(--theme-text-muted)',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {VIEW_LABELS[mode]}
          </button>
        )
      })}
    </div>
  )
}
