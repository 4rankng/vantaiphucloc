import { type PricingLine } from '@/data/domain'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { Plus, X } from 'lucide-react'

export function LineEditor({ lines, onChange }: {
  lines: PricingLine[]
  onChange: (lines: PricingLine[]) => void
}) {
  const addLine = () =>
    onChange([...lines, { quantity: 1, unitPrice: 0, driverSalary: 0, allowance: 0 }])

  const removeLine = (idx: number) => onChange(lines.filter((_, i) => i !== idx))

  const updateLine = (idx: number, field: keyof PricingLine, value: number) => {
    onChange(lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>
          Mức giá theo số lượng
        </Label>
        <button
          onClick={addLine}
          className="flex items-center gap-1 text-xs font-medium touch-manipulation"
          style={{ color: 'var(--theme-brand-primary)' }}
        >
          <Plus className="w-3.5 h-3.5" /> Thêm mức
        </button>
      </div>

      {lines.map((line, i) => (
        <div
          key={i}
          className="rounded-xl p-2 space-y-2"
          style={{ background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border-default)' }}
        >
          <div className="flex items-center gap-2">
            {/* Quantity selector */}
            <div className="flex items-center gap-1">
              {[1, 2].map(q => (
                <button
                  key={q}
                  onClick={() => updateLine(i, 'quantity', q)}
                  className="px-2 py-1 rounded text-xs font-bold touch-manipulation"
                  style={{
                    background: line.quantity === q ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                    color: line.quantity === q ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                  }}
                >
                  ×{q}
                </button>
              ))}
            </div>

            {lines.length > 1 && (
              <button
                onClick={() => removeLine(i)}
                className="touch-manipulation shrink-0 ml-auto"
                style={{ color: 'var(--theme-status-error)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Đơn giá</span>
              <Input
                type="number" min={0}
                value={line.unitPrice || ''}
                onChange={e => updateLine(i, 'unitPrice', Math.max(0, Number(e.target.value)))}
                placeholder="0" className="text-xs font-mono h-7"
              />
            </div>
            <div>
              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Lương tài xế</span>
              <Input
                type="number" min={0}
                value={line.driverSalary || ''}
                onChange={e => updateLine(i, 'driverSalary', Math.max(0, Number(e.target.value)))}
                placeholder="0" className="text-xs font-mono h-7"
              />
            </div>
            <div>
              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Phụ cấp</span>
              <Input
                type="number" min={0}
                value={line.allowance || ''}
                onChange={e => updateLine(i, 'allowance', Math.max(0, Number(e.target.value)))}
                placeholder="0" className="text-xs font-mono h-7"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
