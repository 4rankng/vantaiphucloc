import { Input } from '@/components/ui/Input'
import { Search } from 'lucide-react'

interface SearchPillProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
}

export function SearchPill({ placeholder, value, onChange }: SearchPillProps) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="pl-11 search-pill"
      />
    </div>
  )
}
