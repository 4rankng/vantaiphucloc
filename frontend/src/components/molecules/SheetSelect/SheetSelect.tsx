import type { ReactNode } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet/Sheet'
import { Check } from 'lucide-react'

export interface SheetSelectOption {
  value: string
  label: string
  subtitle?: string
  icon?: ReactNode
}

interface SheetSelectProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  options: SheetSelectOption[]
  value: string
  onChange: (value: string) => void
}

export function SheetSelect({ open, onOpenChange, title, options, value, onChange }: SheetSelectProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[60dvh] pb-safe">
        <SheetHeader className="pb-3">
          <SheetTitle className="text-base font-bold text-left">{title}</SheetTitle>
        </SheetHeader>
        <div className="space-y-2 overflow-y-auto max-h-[45dvh]">
          {options.map(opt => {
            const selected = value === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                className="w-full text-left rounded-2xl p-3.5 card-lift"
                style={{
                  background: selected ? 'var(--theme-brand-primary-light)' : 'var(--theme-bg-secondary)',
                  boxShadow: 'var(--theme-shadow-card)',
                  borderWidth: 2,
                  borderColor: selected ? 'var(--theme-brand-primary)' : 'transparent',
                  borderStyle: 'solid',
                }}
                onClick={() => { onChange(opt.value); onOpenChange(false) }}
              >
                <div className="flex items-center gap-3">
                  {opt.icon && (
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: selected ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)' }}>
                      {opt.icon}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text-primary)' }}>{opt.label}</p>
                    {opt.subtitle && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{opt.subtitle}</p>
                    )}
                  </div>
                  {selected && <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-brand-primary)' }} />}
                </div>
              </button>
            )
          })}
          {options.length === 0 && (
            <p className="text-center py-6 text-sm" style={{ color: 'var(--theme-text-muted)' }}>Không có lựa chọn nào</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
