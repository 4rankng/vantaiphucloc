import { useState } from 'react'
import { Button } from '@/components/ui'
import { Label } from '@/components/ui'
import { Input } from '@/components/ui'
import { useSalaryConfig, useUpdateSalaryConfig } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'

export function SalarySetup() {
  const toast = useToast()
  const { data: config, isLoading: loading } = useSalaryConfig()
  const updateConfig = useUpdateSalaryConfig()

  const [fromDay, setFromDay] = useState('26')
  const [toDay, setToDay] = useState('25')

  // Sync server config to local state once loaded
  const [synced, setSynced] = useState(false)
  if (config && !synced) {
    setFromDay(String(config.from_day ?? 26))
    setToDay(String(config.to_day ?? 25))
    setSynced(true)
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
    updateConfig.mutate(
      { from_day: parseInt(fromDay) || 26, to_day: parseInt(toDay) || 25 },
      {
        onSuccess: () => toast.success('Đã lưu', 'Cấu hình kỳ lương đã được cập nhật'),
        onError: () => toast.error('Lỗi', 'Không thể lưu cấu hình'),
      },
    )
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
          disabled={updateConfig.isPending || loading}
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
          {updateConfig.isPending ? 'Đang lưu...' : loading ? 'Đang tải...' : 'Lưu'}
        </Button>
      </div>
    </div>
  )
}
