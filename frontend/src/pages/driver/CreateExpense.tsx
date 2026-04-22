import { useState } from 'react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EXPENSE_CATEGORIES } from '@/data/mockData'
import { ArrowLeft, Camera, Fuel, Car, Wrench, CircleDot, Droplets, Banknote, Shield, ShieldCheck, ChevronDown } from 'lucide-react'

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
    <div className="p-4 space-y-6">
      <button
        onClick={() => navigate('/driver/expenses')}
        className="flex items-center gap-1.5 text-sm font-semibold"
        style={{ color: 'var(--theme-brand-primary)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại
      </button>
      <h2 className="text-xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>Khai chi phí</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Trip selector */}
        <div>
          <label className="text-xs font-bold mb-2.5 block" style={{ color: 'var(--theme-text-secondary)' }}>
            Chuyến
          </label>
          <button
            type="button"
            onClick={() => {
              const labels = activeTrips.map(j => `${j.id} - ${j.route.slice(0, 30)}`)
              const choice = prompt('Chọn chuyến:\n' + labels.map((l, i) => `${i + 1}. ${l}`).join('\n'))
              if (choice) {
                const idx = parseInt(choice) - 1
                if (idx >= 0 && idx < activeTrips.length) setTripId(activeTrips[idx].id)
              }
            }}
            className="w-full h-12 rounded-2xl text-sm px-4 text-left flex items-center justify-between card-lift"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', color: tripId ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}
          >
            <span className="truncate">{tripId ? activeTrips.find(j => j.id === tripId)?.route.slice(0, 30) ?? tripId : 'Chọn chuyến...'}</span>
            <ChevronDown className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--theme-text-muted)' }} />
          </button>
        </div>

        {/* Category chips */}
        <div>
          <label className="text-xs font-bold mb-2.5 block" style={{ color: 'var(--theme-text-secondary)' }}>
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
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: isActive ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                    color: isActive ? 'var(--theme-text-on-brand)' : 'var(--theme-text-secondary)',
                    boxShadow: isActive ? 'var(--theme-shadow-sm)' : 'none',
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
          <label className="text-xs font-bold mb-2.5 block" style={{ color: 'var(--theme-text-secondary)' }}>
            Số tiền (VNĐ)
          </label>
          <Input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} className="h-12 search-pill" />
        </div>

        {/* Liters (fuel only) */}
        {category === 'Dầu' && (
          <div>
            <label className="text-xs font-bold mb-2.5 block" style={{ color: 'var(--theme-text-secondary)' }}>
              Số lít
            </label>
            <Input type="number" placeholder="0" value={liters} onChange={e => setLiters(e.target.value)} className="h-12 search-pill" />
          </div>
        )}

        {/* Description */}
        <div>
          <label className="text-xs font-bold mb-2.5 block" style={{ color: 'var(--theme-text-secondary)' }}>
            Ghi chú
          </label>
          <Input placeholder="Mô tả chi phí..." value={description} onChange={e => setDescription(e.target.value)} className="h-12 search-pill" />
        </div>

        {/* Receipt photo */}
        <div>
          <label className="text-xs font-bold mb-2.5 block" style={{ color: 'var(--theme-text-secondary)' }}>
            Ảnh biên lai
          </label>
          <button
            type="button"
            className="w-full rounded-2xl border-2 border-dashed p-8 text-center"
            style={{ borderColor: 'var(--theme-border-default)', background: 'var(--theme-bg-secondary)' }}
          >
            <div className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: 'var(--theme-bg-tertiary)' }}>
              <Camera className="w-5 h-5" style={{ color: 'var(--theme-text-muted)' }} />
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--theme-text-secondary)' }}>Chụp ảnh biên lai</span>
          </button>
        </div>

        <Button type="submit" className="w-full h-12 rounded-2xl font-bold text-[15px]" disabled={!category || !amount}
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          Gửi khai báo
        </Button>
      </form>
    </div>
  )
}
