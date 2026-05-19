import { Search } from 'lucide-react'

export interface ToolbarSearchProps {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  /** Fixed width in px. Defaults to 240. Pass 0 for fluid (flex-1 caller responsibility). */
  width?: number | string
  className?: string
}

export function ToolbarSearch({ value, onChange, placeholder, width = 240, className = '' }: ToolbarSearchProps) {
  const style: React.CSSProperties = width
    ? { width: typeof width === 'number' ? `${width}px` : width }
    : {}
  return (
    <div className={`nepo-toolbar-search relative ${className}`} style={style}>
      <Search
        className="absolute h-3.5 w-3.5 pointer-events-none"
        style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full"
      />
    </div>
  )
}
