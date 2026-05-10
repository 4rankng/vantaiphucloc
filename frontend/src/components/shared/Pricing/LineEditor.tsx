import { useState } from 'react'
import { type PricingLine } from '@/data/domain'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { Plus, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

export function LineEditor({ lines, onChange }: {
  lines: PricingLine[]
  onChange: (lines: PricingLine[]) => void
}) {
  const [pendingRemove, setPendingRemove] = useState<number | null>(null)

  const addLine = () =>
    onChange([...lines, { quantity: 1, unitPrice: 0, driverSalary: 0, allowance: 0 }])

  const removeLine = (idx: number) => {
    onChange(lines.filter((_, i) => i !== idx))
    setPendingRemove(null)
  }

  const updateLine = (idx: number, field: keyof PricingLine, value: number) => {
    onChange(lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }

  return (
    <div className="space-y-3">
      {lines.map((line, i) => (
        <div
          key={i}
          className="card p-4"
        >
          {/* Header: Quantity selector + Remove button */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5">
              {[1, 2].map(q => (
                <button
                  key={q}
                  onClick={() => updateLine(i, 'quantity', q)}
                  className="px-3 py-2 rounded-md text-sm font-bold transition-colors"
                  style={{
                    background: line.quantity === q ? 'var(--theme-brand-primary)' : 'var(--theme-bg-tertiary)',
                    color: line.quantity === q ? 'var(--theme-text-on-brand)' : 'var(--theme-text-primary)',
                    border: '1px solid var(--theme-border-default)',
                  }}
                >
                  ×{q}
                </button>
              ))}
            </div>

            {lines.length > 1 && (
              <button
                onClick={() => setPendingRemove(i)}
                className="ml-auto p-1 rounded-md hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                style={{ color: 'var(--theme-status-error)' }}
                title="Xoá mức giá này"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Input grid: 3 columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="typo-form-label">Đơn giá</Label>
              <Input
                type="number"
                min={0}
                value={line.unitPrice || ''}
                onChange={e => updateLine(i, 'unitPrice', Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="font-mono-num"
              />
            </div>
            <div className="space-y-2">
              <Label className="typo-form-label">Lương tài xế</Label>
              <Input
                type="number"
                min={0}
                value={line.driverSalary || ''}
                onChange={e => updateLine(i, 'driverSalary', Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="font-mono-num"
              />
            </div>
            <div className="space-y-2">
              <Label className="typo-form-label">Phụ cấp</Label>
              <Input
                type="number"
                min={0}
                value={line.allowance || ''}
                onChange={e => updateLine(i, 'allowance', Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="font-mono-num"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add button */}
      <button
        onClick={addLine}
        className="flex items-center gap-2 text-sm font-medium py-2 px-3 rounded-md transition-colors"
        style={{
          color: 'var(--theme-brand-primary)',
          background: 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)',
        }}
      >
        <Plus size={16} />
        Thêm mức giá
      </button>

      <ConfirmDialog
        open={pendingRemove !== null}
        onClose={() => setPendingRemove(null)}
        onConfirm={() => pendingRemove !== null && removeLine(pendingRemove)}
        title="Xoá mức giá?"
        description={pendingRemove !== null
          ? `Xoá mức giá ×${lines[pendingRemove]?.quantity ?? 1} (${lines[pendingRemove]?.unitPrice ?? 0}đ)? Hành động này không thể hoàn tác.`
          : ''}
        confirmLabel="Xoá"
      />
    </div>
  )
}
