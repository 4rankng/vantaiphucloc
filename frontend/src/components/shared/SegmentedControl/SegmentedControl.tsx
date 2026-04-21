import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const segmentedVariants = cva(
  'inline-flex items-center rounded-lg bg-[var(--theme-bg-tertiary)] p-1',
)

const segmentedItemVariants = cva(
  'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-secondary)] cursor-pointer',
  {
    variants: {
      active: {
        true: 'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] shadow-sm',
        false: 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]',
      },
    },
  }
)

interface SegmentedControlOption {
  value: string
  label: string
}

interface SegmentedControlProps extends VariantProps<typeof segmentedVariants> {
  options: SegmentedControlOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function SegmentedControl({ options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div className={cn(segmentedVariants(), className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(segmentedItemVariants({ active: opt.value === value }))}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
