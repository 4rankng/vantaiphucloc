import { useState } from 'react'
import { useDriverStore } from '@/hooks/use-driver-store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EXPENSE_CATEGORIES } from '@/data/mockData'

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
    <div className="p-4 space-y-4">
      <button onClick={() => navigate('/driver/expenses')} className="text-sm text-[var(--theme-brand-primary)] mb-2 inline-block">← Quay lại</button>
      <h2 className="text-lg font-bold">Khai chi phí</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-[var(--theme-text-secondary)] mb-1 block">Chuyến</label>
          <select value={tripId} onChange={e => setTripId(e.target.value)} className="w-full h-10 rounded-lg border border-[var(--theme-border-default)] bg-[var(--theme-bg-secondary)] px-3 text-sm text-[var(--theme-text-primary)]">
            <option value="">-- Chọn chuyến --</option>
            {activeTrips.map(j => <option key={j.id} value={j.id}>{j.id} - {j.route.slice(0, 30)}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--theme-text-secondary)] mb-2 block">Hạng mục</label>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map(c => (
              <button key={c} type="button" onClick={() => setCategory(c)}
                className="px-3 py-2 rounded-full text-sm border transition-colors"
                  style={{
                    background: category === c ? 'var(--theme-brand-primary)' : 'var(--theme-bg-secondary)',
                    color: category === c ? 'var(--theme-text-on-brand)' : 'var(--theme-text-secondary)',
                    borderColor: category === c ? 'var(--theme-brand-primary)' : 'var(--theme-border-default)',
                  }}
              >{c}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--theme-text-secondary)] mb-1 block">Số tiền (VNĐ)</label>
          <Input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>

        {category === 'Dầu' && (
          <div>
            <label className="text-sm font-medium text-[var(--theme-text-secondary)] mb-1 block">Số lít</label>
            <Input type="number" placeholder="0" value={liters} onChange={e => setLiters(e.target.value)} />
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-[var(--theme-text-secondary)] mb-1 block">Ghi chú</label>
          <Input placeholder="Mô tả chi phí..." value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div className="bg-[var(--theme-bg-secondary)] rounded-xl p-4 border border-[var(--theme-border-default)]">
          <label className="text-sm font-medium text-[var(--theme-text-secondary)] mb-2 block">Ảnh biên lai</label>
          <div className="border-2 border-dashed border-[var(--theme-border-default)] rounded-xl p-6 text-center text-[var(--theme-text-muted)] text-sm">
            📷 Chụp ảnh biên lai
          </div>
        </div>

        <Button type="submit" className="w-full h-12 rounded-xl font-semibold" disabled={!category || !amount}>Gửi khai báo</Button>
      </form>
    </div>
  )
}
