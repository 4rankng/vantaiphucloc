import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet/Sheet'

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

export function SheetPicker({ label, placeholder, value, options, onChange }: SheetPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between h-11 rounded-xl px-4 text-sm touch-manipulation"
        style={{
          background: 'var(--theme-bg-secondary)',
          border: '1px solid var(--theme-border-default)',
          color: selected ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
        }}
      >
        <span className={selected ? 'font-medium' : ''}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-0 pb-0 max-h-[70dvh]">
          <SheetHeader className="px-4 pt-2 pb-3">
            <SheetTitle className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>
              {label}
            </SheetTitle>
          </SheetHeader>

          <div className="overflow-y-auto max-h-[55dvh] px-2 pb-6">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className="w-full text-left flex items-center justify-between px-4 py-3.5 rounded-xl mb-1 transition-colors touch-manipulation"
                style={{
                  background: opt.value === value ? 'var(--theme-brand-primary-light)' : 'transparent',
                }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--theme-text-primary)' }}>
                    {opt.label}
                  </p>
                  {opt.sublabel && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--theme-text-muted)' }}>
                      {opt.sublabel}
                    </p>
                  )}
                </div>
                {opt.value === value && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-2"
                    style={{ background: 'var(--theme-brand-primary)' }}>
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
