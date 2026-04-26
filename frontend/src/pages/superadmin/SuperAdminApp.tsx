import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AppTopBar } from '@/components/shared/AppTopBar'
import { ProfileDialog } from '@/components/shared/ProfileDialog'
import { FloatingActionButton } from '@/components/shared/FloatingActionButton'
import { InfoRow } from '@/components/shared/InfoRow'
import { UserCircle, Plus, Trash2, KeyRound, Shield, Building2, Users, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog/Dialog'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { Label } from '@/components/ui/Label/Label'
import { SheetPicker } from '@/components/shared/SheetPicker'
import { apiClient } from '@/services/api'
import type { Role } from '@/data/mockData'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DirectorAccount {
  id: string
  name: string
  phone: string
  email: string
  company: string
  active: boolean
  createdAt: string
  driverCount: number
  accountantCount: number
}

// ─── Mock Directors ───────────────────────────────────────────────────────────

const MOCK_DIRECTORS: DirectorAccount[] = [
  { id: 'DIR-001', name: 'Trần Văn Minh', phone: '0901 234 567', email: 'minh@phucloc.vn', company: 'Phúc Lộc', active: true, createdAt: '2026-01-15', driverCount: 4, accountantCount: 2 },
  { id: 'DIR-002', name: 'Nguyễn Thanh Hải', phone: '0902 345 678', email: 'hai@thanhbinh.vn', company: 'Thanh Bình', active: true, createdAt: '2026-02-20', driverCount: 6, accountantCount: 1 },
  { id: 'DIR-003', name: 'Lê Quốc Hùng', phone: '0903 456 789', email: 'hung@hoangphat.vn', company: 'Hoàng Phát', active: false, createdAt: '2026-03-10', driverCount: 0, accountantCount: 0 },
]

const CREATEABLE_ROLES: { value: Role; label: string }[] = [
  { value: 'director', label: 'Giám đốc' },
]

// ─── Director Card ────────────────────────────────────────────────────────────

function DirectorCard({ director, onTap }: { director: DirectorAccount; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="w-full text-left rounded-2xl p-3.5 transition-all active:scale-[0.98] touch-manipulation"
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-card)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--theme-brand-primary-light)' }}>
          <UserCircle className="w-5 h-5" style={{ color: 'var(--theme-brand-primary)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--theme-text-primary)' }}>{director.name}</p>
          <p className="text-[11px] font-medium" style={{ color: 'var(--theme-brand-primary)' }}>{director.company}</p>
        </div>
        {!director.active && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error-text)' }}>
            Ngưng
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 mt-1 pt-2" style={{ borderTop: '1px solid var(--theme-border-light)' }}>
        <span className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
          <Users className="w-3 h-3 inline mr-1" />{director.driverCount} tài xế
        </span>
        <span className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
          {director.accountantCount} kế toán
        </span>
        <ChevronRight className="w-3.5 h-3.5 ml-auto" style={{ color: 'var(--theme-text-muted)' }} />
      </div>
    </button>
  )
}

// ─── SuperAdmin Dashboard ─────────────────────────────────────────────────────

function SuperAdminDashboard({
  onViewDirector,
}: {
  onViewDirector: (id: string) => void
}) {
  const [directors, setDirectors] = useState<DirectorAccount[]>(() => {
    const saved = localStorage.getItem('ttransport_directors')
    return saved ? JSON.parse(saved) : MOCK_DIRECTORS
  })

  const activeCount = directors.filter(d => d.active).length
  const totalDrivers = directors.reduce((s, d) => s + d.driverCount, 0)
  const totalAccountants = directors.reduce((s, d) => s + d.accountantCount, 0)

  return (
    <div className="pb-24">
      {/* Stats */}
      <div className="px-4 pt-4 grid grid-cols-3 gap-2">
        {[
          { label: 'Giám đốc', value: `${activeCount}/${directors.length}`, accent: 'var(--theme-brand-primary)' },
          { label: 'Tài xế', value: String(totalDrivers), accent: 'var(--theme-status-success)' },
          { label: 'Kế toán', value: String(totalAccountants), accent: 'var(--theme-status-info)' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-2xl p-3 text-center"
            style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
            <p className="text-lg font-bold tabular-nums" style={{ color: accent }}>{value}</p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Director list */}
      <div className="px-4 mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--theme-text-muted)' }}>
          Danh sách Giám đốc
        </p>
        <div className="space-y-2">
          {directors.map(d => (
            <DirectorCard key={d.id} director={d} onTap={() => onViewDirector(d.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Director Detail ──────────────────────────────────────────────────────────

function DirectorDetail({
  directorId,
  onBack,
}: {
  directorId: string
  onBack: () => void
}) {
  const [directors] = useState<DirectorAccount[]>(() => {
    const saved = localStorage.getItem('ttransport_directors')
    return saved ? JSON.parse(saved) : MOCK_DIRECTORS
  })
  const director = directors.find(d => d.id === directorId)

  if (!director) {
    return (
      <div className="p-4 text-center py-12" style={{ color: 'var(--theme-text-muted)' }}>
        <p className="text-sm">Không tìm thấy thông tin</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header card */}
      <div className="rounded-2xl p-4"
        style={{ background: 'var(--theme-bg-secondary)', boxShadow: 'var(--theme-shadow-card)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--theme-brand-primary-light)' }}>
            <UserCircle className="w-6 h-6" style={{ color: 'var(--theme-brand-primary)' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>{director.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-3 h-3" style={{ color: 'var(--theme-text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--theme-brand-primary)' }}>{director.company}</span>
            </div>
          </div>
          {!director.active && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
              style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error-text)' }}>
              Ngưng
            </span>
          )}
        </div>
        <div className="space-y-0">
          <InfoRow icon={Users} label="Tài xế" value={`${director.driverCount} người`} noBorder />
          <InfoRow icon={KeyRound} label="Kế toán" value={`${director.accountantCount} người`} noBorder />
        </div>
      </div>
    </div>
  )
}

// ─── Create Director Dialog ───────────────────────────────────────────────────

function CreateDirectorDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', password: '' })

  const handleSubmit = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.company.trim() || !form.password.trim()) return
    // In real app: call API
    onClose()
    setForm({ name: '', phone: '', email: '', company: '', password: '' })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo tài khoản Giám đốc</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Họ tên</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nguyễn Văn A" className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Số điện thoại</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0901 234 567" className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@company.vn" className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Công ty</Label>
            <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Tên công ty" className="text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Mật khẩu</Label>
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex-1">Huỷ</Button>
          <Button onClick={handleSubmit}
            disabled={!form.name.trim() || !form.phone.trim() || !form.company.trim() || !form.password.trim()}
            className="flex-1"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}>
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main SuperAdmin App ──────────────────────────────────────────────────────

type Page = 'dashboard' | 'director-detail'

export function SuperAdminApp() {
  const { user } = useAuth()
  const [page, setPage] = useState<Page>('dashboard')
  const [selectedDirectorId, setSelectedDirectorId] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const goBack = () => setPage('dashboard')

  const renderContent = () => {
    switch (page) {
      case 'director-detail':
        return <><AppTopBar variant="page" title="Chi tiết Giám đốc" onBack={goBack} /><DirectorDetail directorId={selectedDirectorId} onBack={goBack} /></>
      default:
        return (
          <>
            <AppTopBar
              variant="home"
              name={user?.name ?? ''}
              onProfile={() => setProfileOpen(true)}
              onNotifications={() => {}}
            />
            <SuperAdminDashboard onViewDirector={(id) => { setSelectedDirectorId(id); setPage('director-detail') }} />
            <FloatingActionButton icon={<Plus className="w-6 h-6" />} onClick={() => setCreateOpen(true)} label="Tạo Giám đốc" />
          </>
        )
    }
  }

  return (
    <div className="min-h-[100dvh]" style={{ background: 'var(--theme-bg-primary)' }}>
      {renderContent()}
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
      <CreateDirectorDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
