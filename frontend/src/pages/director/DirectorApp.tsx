import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, KeyRound, ChevronRight } from 'lucide-react'
import { AppTopBar } from '@/components/shared/AppTopBar'
import { DirectorDashboard } from './DirectorDashboard'
import { UserManagement } from './UserManagement'
import { DirectorNotifications } from './DirectorNotifications'
import { DriverJobs } from './DriverJobs'
import { ClientJobs } from './ClientJobs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'

type DirectorPage = 'dashboard' | 'users' | 'notifications' | 'account' | 'driver-jobs' | 'client-jobs'

function AccountPage({ onBack }: { onBack: () => void }) {
  const { user, logout } = useAuth()
  const initials = (user?.name ?? 'GD').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const [pwDialog, setPwDialog] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  return (
    <>
      <AppTopBar variant="page" title="Tài khoản" onBack={onBack} />
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3 rounded-2xl p-4" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold" style={{ color: 'var(--theme-text-primary)' }}>{user?.name}</p>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
              Giám đốc
            </span>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
          <button onClick={() => setPwDialog(true)} className="w-full flex items-center justify-between px-4 py-3.5 touch-manipulation">
            <div className="flex items-center gap-3">
              <KeyRound className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>Đổi mật khẩu</span>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
          </button>
        </div>

        <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm touch-manipulation" style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error-text)' }}>
          <LogOut className="w-4 h-4" /> Đăng xuất
        </button>
      </div>

      <Dialog open={pwDialog} onOpenChange={setPwDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Đổi mật khẩu</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mật khẩu hiện tại</Label>
              <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mật khẩu mới</Label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Xác nhận mật khẩu mới</Label>
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwDialog(false)}>Huỷ</Button>
            <Button onClick={() => setPwDialog(false)} disabled={!currentPw || !newPw || newPw !== confirmPw}>Đổi mật khẩu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function DirectorApp() {
  const { user } = useAuth()
  const [page, setPage] = useState<DirectorPage>('dashboard')
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')

  const goBack = () => setPage('dashboard')

  const renderContent = () => {
    switch (page) {
      case 'users':
        return <><AppTopBar variant="page" title="Quản lý tài khoản" onBack={goBack} /><UserManagement /></>
      case 'notifications':
        return <><AppTopBar variant="page" title="Thông báo" onBack={goBack} /><DirectorNotifications /></>
      case 'account':
        return <AccountPage onBack={goBack} />
      case 'driver-jobs':
        return <DriverJobs driverId={selectedDriverId} onBack={goBack} />
      case 'client-jobs':
        return <ClientJobs clientId={selectedClientId} onBack={goBack} />
      default:
        return (
          <>
            <AppTopBar
              variant="home"
              name={user?.name ?? ''}
              onNotifications={() => setPage('notifications')}
              onProfile={() => setPage('account')}
            />
            <DirectorDashboard
              onManageUsers={() => setPage('users')}
              onViewDriverJobs={(id) => { setSelectedDriverId(id); setPage('driver-jobs') }}
              onViewClientJobs={(id) => { setSelectedClientId(id); setPage('client-jobs') }}
            />
          </>
        )
    }
  }

  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--theme-bg-primary)' }}>
      {renderContent()}
    </div>
  )
}
