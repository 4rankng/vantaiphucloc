import { useState } from 'react'
import { Drawer } from '@/components/shared/Drawer'
import { Button } from '@/components/ui'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
import { useVehicles } from '@/hooks/use-queries'

export interface DriverFormDrawerProps {
  open: boolean
  onClose: () => void
  onSave: (data: { username: string; fullName: string; phone: string; plate: string; password?: string }) => void
  saving?: boolean
}

export function DriverFormDrawer({ open, onClose, onSave, saving }: DriverFormDrawerProps) {
  const [form, setForm] = useState({ username: '', fullName: '', phone: '', plate: '', password: '' })
  const { data: vehicles = [] } = useVehicles()
  const [plateInput, setPlateInput] = useState('')
  const showCreatePlate = plateInput.trim() && !vehicles.some(v => v.plate.toLowerCase() === plateInput.toLowerCase().trim())

  const handleSave = () => {
    if (!form.username.trim()) return
    onSave({ ...form, plate: plateInput.trim() || form.plate.trim(), password: form.password.trim() || undefined })
    setForm({ username: '', fullName: '', phone: '', plate: '', password: '' })
    setPlateInput('')
  }

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose() }}
      breadcrumb="Lái xe" title="Thêm lái xe"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>Huỷ</Button>
          <Button size="sm" onClick={handleSave} disabled={!form.username.trim() || !!saving}>
            {saving ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="drv-new-user">
              Tên đăng nhập <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <input id="drv-new-user" value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              placeholder="taixe1" className="nepo-input" autoFocus />
          </div>
          <div>
            <label className="nepo-field-label" htmlFor="drv-new-name">Họ và tên</label>
            <input id="drv-new-name" value={form.fullName}
              onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
              placeholder="Nguyễn Văn A" className="nepo-input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="drv-new-phone">Số điện thoại</label>
            <input id="drv-new-phone" type="tel" value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="0912345678" className="nepo-input" />
          </div>
          <div>
            <label className="nepo-field-label">Biển số xe</label>
            <InlineSelect
              placeholder="Chọn hoặc nhập"
              value={form.plate}
              options={vehicles.map(v => ({ value: v.plate, label: v.plate }))}
              onChange={v => setForm(p => ({ ...p, plate: v }))}
              onInputChange={v => setPlateInput(v)}
              onCreateNew={showCreatePlate ? () => setForm(p => ({ ...p, plate: plateInput.trim() })) : undefined}
              createNewLabel={showCreatePlate ? `Tạo mới "${plateInput.trim()}"` : undefined}
            />
          </div>
        </div>
        <div>
          <label className="nepo-field-label" htmlFor="drv-new-password">Mật khẩu</label>
          <input id="drv-new-password" type="text" value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            placeholder="Mặc định = số điện thoại" className="nepo-input" />
        </div>
      </div>
    </Drawer>
  )
}
