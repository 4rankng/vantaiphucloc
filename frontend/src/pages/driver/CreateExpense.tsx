import { useState } from 'react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/molecules/FormField'
import { SheetSelect, type SheetSelectOption } from '@/components/molecules/SheetSelect'
import { useToast } from '@/components/atoms/Toast'
import { EXPENSE_CATEGORIES } from '@/data/mockData'
import { ArrowLeft, Camera, Fuel, Car, Wrench, CircleDot, Droplets, Banknote, Shield, ShieldCheck, ChevronDown, Navigation, Package } from 'lucide-react'

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
  const toast = useToast()
  const [tripId, setTripId] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [liters, setLiters] = useState('')
  const [description, setDescription] = useState('')
  const [tripSheetOpen, setTripSheetOpen] = useState(false)

  const activeTrips = jobs.filter(j => j.status === 'IN_PROGRESS' || j.status === 'COMPLETED')
  const selectedTrip = activeTrips.find(j => j.id === tripId)

  const tripOptions: SheetSelectOption[] = activeTrips.map(j => ({
    value: j.id,
    label: j.route,
    subtitle: `${j.containerNumber} · ${j.distanceKm}km`,
    icon: j.status === 'IN_PROGRESS'
      ? <Navigation className="w-4 h-4" style={{ color: '#fff' }} />
      : <Package className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />,
  }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!category || !amount) return
    addExpense({
      jobId: tripId,
      category,
      amount: Number(amount),
      description,
    })
    toast.success('Khai chi phí thành công')
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
        <FormField label="Chuyến">
          <button
            type="button"
            onClick={() => setTripSheetOpen(true)}
            className="w-full h-12 rounded-2xl text-sm px-4 text-left flex items-center justify-between card-lift"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)', color: selectedTrip ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)' }}
          >
            <span className="truncate">
              {selectedTrip ? `${selectedTrip.route.slice(0, 30)} · ${selectedTrip.containerNumber}` : 'Chọn chuyến...'}
            </span>
            <ChevronDown className="w-4 h-4 shrink-0 ml-2" style={{ color: 'var(--theme-text-muted)' }} />
          </button>
        </FormField>

        {/* Category chips */}
        <FormField label="Hạng mục" required>
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
        </FormField>

        {/* Amount */}
        <FormField label="Số tiền (VNĐ)" required>
          <Input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} className="h-12 search-pill" />
        </FormField>

        {/* Liters (fuel only) */}
        {category === 'Dầu' && (
          <FormField label="Số lít" hint="Nhập số lít nhiên liệu">
            <Input type="number" placeholder="0" value={liters} onChange={e => setLiters(e.target.value)} className="h-12 search-pill" />
          </FormField>
        )}

        {/* Description */}
        <FormField label="Ghi chú">
          <Input placeholder="Mô tả chi phí..." value={description} onChange={e => setDescription(e.target.value)} className="h-12 search-pill" />
        </FormField>

        {/* Receipt photo */}
        <FormField label="Ảnh biên lai">
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
        </FormField>

        <Button type="submit" className="w-full h-12 rounded-2xl font-bold text-[15px]" disabled={!category || !amount}
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          Gửi khai báo
        </Button>
      </form>

      {/* Trip selector — Grab-style bottom sheet */}
      <SheetSelect
        open={tripSheetOpen}
        onOpenChange={setTripSheetOpen}
        title="Chọn chuyến"
        options={tripOptions}
        value={tripId}
        onChange={setTripId}
      />
    </div>
  )
}
