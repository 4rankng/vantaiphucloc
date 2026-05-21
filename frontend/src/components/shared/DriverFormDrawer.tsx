import { useState } from 'react'
import { Button } from '@/components/ui'
import { Drawer } from '@/components/shared/Drawer'
import { InlineSelect } from '@/components/shared/InlineSelect'
import { useVehicles } from '@/hooks/use-queries'

export type DriverFormData = { fullName: string; phone: string; plate: string; username: string }

export function DriverFormDrawer({
  onSave,
  onClose,
  isPending,
}: {
  onSave: (data: DriverFormData) => void
  onClose: () => void
  isPending: boolean
}) {
  const { data: vehicles = [] } = useVehicles()
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [plate, setPlate] = useState('')
  const [plateInput, setPlateInput] = useState('')
  const showCreatePlate = plateInput.trim() && !vehicles.some(v => v.plate.toLowerCase() === plateInput.toLowerCase().trim())

  return (
    <Drawer open onOpenChange={(o) => { if (!o) onClose() }} breadcrumb="Đội xe" title="Thêm lái xe"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button variant="default"
            onClick={() => onSave({ username, fullName, phone, plate: plateInput.trim() || plate.trim() })}
            disabled={!username.trim() || isPending}>
            {isPending ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="drv-username">Tên đăng nhập</label>
            <input id="drv-username" value={username} onChange={e => setUsername(e.target.value)} placeholder="taixe1" className="nepo-input" autoFocus />
          </div>
          <div>
            <label className="nepo-field-label" htmlFor="drv-fullname">Họ và tên</label>
            <input id="drv-fullname" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nguyễn Văn A" className="nepo-input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="drv-phone">Số điện thoại</label>
            <input id="drv-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912345678" className="nepo-input" />
          </div>
          <div>
            <label className="nepo-field-label" htmlFor="drv-plate">Biển số xe</label>
            <InlineSelect
              placeholder="Chọn hoặc nhập" value={plate}
              options={vehicles.map(v => ({ value: v.plate, label: v.plate }))}
              onChange={v => setPlate(v)} onInputChange={v => setPlateInput(v)}
              onCreateNew={showCreatePlate ? () => setPlate(plateInput.trim()) : undefined}
              createNewLabel={showCreatePlate ? `Tạo mới "${plateInput.trim()}"` : undefined}
            />
          </div>
        </div>
      </div>
    </Drawer>
  )
}
