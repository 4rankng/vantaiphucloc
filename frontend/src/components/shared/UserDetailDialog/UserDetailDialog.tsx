import { Users, Truck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { InfoRow } from '@/components/shared/InfoRow'
import { ROLE_ICONS, type UserAccount } from '@/pages/superadmin/types'
import { ROLE_LABELS } from '@/data/domain'

export function UserDetailDialog({
  user,
  open,
  onClose,
}: {
  user: UserAccount | null
  open: boolean
  onClose: () => void
}) {
  if (!user) return null
  const RoleIcon = ROLE_ICONS[user.role] ?? Users

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Chi tiết tài khoản</DialogTitle></DialogHeader>
        <div className="flex items-center gap-3 py-2">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--theme-brand-primary-light)' }}>
            <RoleIcon className="w-6 h-6" style={{ color: 'var(--theme-brand-primary)' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>{user.username}</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5"
              style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
              {ROLE_LABELS[user.role]}
            </span>
          </div>
        </div>
        <div className="space-y-0">
          <InfoRow icon={Users} label={user.role === 'driver' ? 'Nhà thầu' : 'Công ty'} value={user.vendor} noBorder />
          {user.tractorPlate && <InfoRow icon={Truck} label="Biển số đầu kéo" value={user.tractorPlate} noBorder />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">Huỷ</Button>
          <Button onClick={onClose} className="flex-1"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
