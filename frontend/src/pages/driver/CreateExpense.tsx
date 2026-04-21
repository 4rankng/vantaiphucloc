import { useState } from 'react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EXPENSE_CATEGORIES } from '@/data/mockData'
import { ArrowLeft, Camera, Fuel, Car, Wrench, CircleDot, Droplets, Banknote, Shield, ShieldCheck } from 'lucide-react'

const CATEGORY_ICONS: Record<string, any> = {
  'Dầu': Fuel,
  'Đi đường': Car,
  'Sửa chữa': Wrench,
  'Lốp': CircleDot,
  'Nhớt': Droplets,
  'Lương lx': Banknote,
  'Bảo hiểm': Shield,
  'Phí cầu đường': ShieldCheck,
}

export function CreateExpense() {
  const { jobs, addExpense, navigate } = useDriverStore()
  const [tripId, setTripId] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [liters, setLiters] = useState('')
  const [description, setDescription] = useState('')

  const activeTrips = jobs.filter(j => j.status === 'IN_PROGRESS' || j.status === 'COMPLETED')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!category || !amount) return
    addExpense({
      jobId: tripId,
      category,
      amount: Number(amount),
      description,
    })
    navigate('/driver/expenses')
  }

  return (
    <div className="p-4 space-y-5">
      <button
        onClick={() => navigate('/driver/expenses')}
        className="flex items-center gap-1.5 text-sm font-medium"
        style={{ color: 'var(--theme-brand-primary)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại
      </button>
      <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>Khai chi phí</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Trip selector */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider mb-2 block" style={{ color: 'var(--theme-text-muted)' }}>
            Chuyến
          </label>
          <select
            value={tripId}
            onChange={e => setTripId(e.target.value)}
            className="w-full h-11 rounded-xl border text-sm px-3 transition-colors"
            style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
          >
            <option value="">-- Chọn chuyến --</option>
            {activeTrips.map(j => <option key={j.id} value={j.id}>{j.id} - {j.route.slice(0, 30)}</option>)}
          </select>
        </div>

        {/* Category pills */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider mb-2 block" style={{ color: 'var(--theme-text-muted)' }}>
            Hạng mục
          </label>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map(c => {
              const Icon = CATEGORY_ICONS[c] ?? Fuel
              const isActive = category === c
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition-all"
                  style={{
                    background: isActive ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                    color: isActive ? 'var(--theme-text-on-brand)' : 'var(--theme-text-secondary)',
                    borderColor: isActive ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {c}
                </button>
              )
            })}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider mb-2 block" style={{ color: 'var(--theme-text-muted)' }}>
            Số tiền (VNĐ)
          </label>
          <Input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} className="h-11" />
        </div>

        {/* Liters (fuel only) */}
        {category === 'Dầu' && (
          <div>
            <label className="text-xs font-medium uppercase tracking-wider mb-2 block" style={{ color: 'var(--theme-text-muted)' }}>
              Số lít
            </label>
            <Input type="number" placeholder="0" value={liters} onChange={e => setLiters(e.target.value)} className="h-11" />
          </div>
        )}

        {/* Description */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider mb-2 block" style={{ color: 'var(--theme-text-muted)' }}>
            Ghi chú
          </label>
          <Input placeholder="Mô tả chi phí..." value={description} onChange={e => setDescription(e.target.value)} className="h-11" />
        </div>

        {/* Receipt photo placeholder */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider mb-2 block" style={{ color: 'var(--theme-text-muted)' }}>
            Ảnh biên lai
          </label>
          <button
            type="button"
            className="w-full rounded-xl border-2 border-dashed p-6 text-center transition-colors"
            style={{ borderColor: 'var(--theme-border-default)', background: 'var(--theme-bg-secondary)' }}
          >
            <Camera className="w-6 h-6 mx-auto mb-1" style={{ color: 'var(--theme-text-muted)' }} />
            <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Chụp ảnh biên lai</span>
          </button>
        </div>

        <Button type="submit" className="w-full h-11 rounded-xl font-semibold" disabled={!category || !amount}>
          Gửi khai báo
        </Button>
      </form>
    </div>
  )
}
