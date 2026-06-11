import { memo } from 'react'
import { Search } from 'lucide-react'

interface InlineSearchInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  width?: number | string
}

export const InlineSearchInput = memo(function InlineSearchInput({
  value,
  onChange,
  placeholder,
  width = 220,
}: InlineSearchInputProps) {
  return (
    <div className="relative" style={{ width }}>
      <Search
        className="absolute h-3.5 w-3.5"
        style={{ left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }}
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="nepo-input text-[12px]"
        style={{ width: '100%', paddingLeft: 28, height: 30 }}
      />
    </div>
  )
})
