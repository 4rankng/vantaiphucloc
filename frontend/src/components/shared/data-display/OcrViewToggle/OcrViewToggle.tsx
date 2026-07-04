export type ViewMode = 'hour' | 'day' | 'month'

const VIEW_LABELS: Record<ViewMode, string> = {
  hour: 'Theo giờ',
  day: 'Theo ngày',
  month: 'Theo tháng',
}

const VIEW_ORDER: ViewMode[] = ['hour', 'day', 'month']

interface OcrViewToggleProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
}

export function OcrViewToggle({ value, onChange }: OcrViewToggleProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as ViewMode)}
      className="h-10 w-full rounded-lg border px-3 text-[13px] font-semibold outline-none transition-colors sm:w-auto"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--theme-border-default)',
        color: 'var(--theme-text-primary)',
      }}
      aria-label="Chế độ xem biểu đồ"
    >
      {VIEW_ORDER.map((mode) => (
        <option key={mode} value={mode}>
          {VIEW_LABELS[mode]}
        </option>
      ))}
    </select>
  )
}
