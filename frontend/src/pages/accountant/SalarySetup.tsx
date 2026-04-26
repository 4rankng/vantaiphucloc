import { useState } from 'react'
import { Button } from '@/components/ui/Button/Button'
import { Label } from '@/components/ui/Label/Label'
import { Input } from '@/components/ui/Input/Input'

const DAY_OPTIONS = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28',
]

export function SalarySetup() {
  const [fromDay, setFromDay] = useState('26')
  const [toDay, setToDay] = useState('25')

  const formatDay = (d: string) => {
    if (d === 'cuoi thang') return 'cuối tháng'
    const n = parseInt(d)
    if (n === 1) return 'mùng 1'
    return `ngày ${d}`
  }

  const getExplanation = () => {
    if (!fromDay || !toDay) return ''
    const from = fromDay === 'cuoi thang' ? 'cuối tháng' : (parseInt(fromDay) === 1 ? 'mùng 1' : `ngày ${fromDay}`)
    const to = toDay === 'cuoi thang' ? 'cuối tháng' : `ngày ${toDay}`
    if (fromDay === '1' && toDay === 'cuoi thang') return 'Mùng 1 đến cuối tháng'
    if (fromDay === toDay) return `${from} đến ${to} tháng sau`
    return `${from} tháng này đến ${to} tháng sau`
  }

  const handleSave = () => {
    // In real app: call API to save period config
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4 space-y-4"
        style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Từ ngày</Label>
            <Input
              type="text"
              value={fromDay}
              onChange={e => setFromDay(e.target.value)}
              placeholder="26"
              className="text-sm font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Đến ngày</Label>
            <Input
              type="text"
              value={toDay}
              onChange={e => setToDay(e.target.value)}
              placeholder="25"
              className="text-sm font-mono"
            />
          </div>
        </div>

        {/* Explanation */}
        {fromDay && toDay && (
          <div className="rounded-xl p-3" style={{ background: 'var(--theme-brand-primary-light)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--theme-brand-primary)' }}>
              {getExplanation()}
            </p>
          </div>
        )}

        <Button onClick={handleSave}
          className="w-full h-10 font-bold rounded-xl"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
          Lưu
        </Button>
      </div>
    </div>
  )
}
