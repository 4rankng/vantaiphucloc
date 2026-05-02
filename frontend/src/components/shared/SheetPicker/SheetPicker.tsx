import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select/Select'

interface SheetPickerOption {
  value: string
  label: string
  sublabel?: string
}

interface SheetPickerProps {
  label: string
  placeholder: string
  value: string
  options: SheetPickerOption[]
  onChange: (value: string) => void
}

export function SheetPicker({ placeholder, value, options, onChange }: SheetPickerProps) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger
        className="h-12 rounded-2xl px-4 text-sm"
        style={{
          background: 'var(--theme-bg-secondary)',
          border: '1.5px solid var(--theme-border-default)',
          boxShadow: 'var(--theme-shadow-card)',
          color: value ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
          fontWeight: value ? 500 : 400,
        }}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}{opt.sublabel ? ` — ${opt.sublabel}` : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
