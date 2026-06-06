import { Building2, Truck, User } from 'lucide-react'

export type ImportType = 'client' | 'vendor' | 'driver'

interface ImportTypeSelectorProps {
  value: ImportType
  onChange: (type: ImportType) => void
}

const TYPE_OPTIONS = [
  { type: 'client' as const, icon: Building2, label: 'Chủ hàng', hint: 'Tạo đơn đặt từ file Excel khách hàng' },
  { type: 'vendor' as const, icon: Truck, label: 'Nhà xe', hint: 'Đối soát chuyến đi từ file nhà thầu' },
  { type: 'driver' as const, icon: User, label: 'Lái xe nội bộ', hint: 'Đối soát chuyến đi từ file lái xe' },
]

export function ImportTypeSelector({ value, onChange }: ImportTypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3" style={{ maxWidth: 660 }}>
      {TYPE_OPTIONS.map(({ type, icon: Icon, label, hint }) => {
        const active = value === type
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className="text-left px-4 py-3.5 rounded-xl transition-all"
            style={{
              background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
              border: `1.5px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
              outline: 'none',
            }}
          >
            <div
              className="grid place-items-center mb-2.5"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: active ? 'var(--accent)' : 'var(--surface-3)',
                color: active ? 'var(--theme-text-on-brand)' : 'var(--ink-3)',
                transition: 'all 0.15s',
              }}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <p className="m-0 text-[13.5px] font-semibold" style={{ color: active ? 'var(--accent)' : 'var(--ink)' }}>
              {label}
            </p>
            <p className="m-0 mt-0.5 text-[11.5px] leading-snug" style={{ color: 'var(--ink-3)' }}>
              {hint}
            </p>
          </button>
        )
      })}
    </div>
  )
}
