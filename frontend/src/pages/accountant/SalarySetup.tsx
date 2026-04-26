import { useState } from 'react'
import { Label } from '@/components/ui/Label/Label'
import { Input } from '@/components/ui/Input/Input'
import { Button } from '@/components/ui/Button/Button'

export function SalarySetup() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-26`
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-25`
  })

  const handleSave = () => {
    // In real app: call API to save period config
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4 space-y-4"
        style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Kỳ lương hiện tại</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Từ ngày</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Đến ngày</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {[
            { label: '1 → Cuối tháng', from: '01', to: '31' },
            { label: '26 → 25', from: '26', to: '25' },
          ].map(preset => (
            <button
              key={preset.label}
              onClick={() => {
                const d = new Date()
                const m = d.getMonth() + 1
                const y = d.getFullYear()
                setStartDate(`${y}-${String(m).padStart(2, '0')}-${preset.from}`)
                const endMonth = preset.to === '25' ? m + 1 : m
                const endYear = endMonth > 12 ? y + 1 : y
                setEndDate(`${endYear}-${String(endMonth > 12 ? endMonth - 12 : endMonth).padStart(2, '0')}-${preset.to}`)
              }}
              className="flex-1 py-2 rounded-xl text-xs font-medium touch-manipulation"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <Button onClick={handleSave}
          className="w-full h-10 font-bold rounded-xl"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
          Lưu
        </Button>
      </div>
    </div>
  )
}
