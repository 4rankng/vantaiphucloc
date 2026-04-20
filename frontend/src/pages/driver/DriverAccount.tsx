import { useState } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DialogClose } from '@/components/ui/dialog'
import { LogoutConfirmDialog } from '@/components/layout/Header'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { mockDrivers } from '@/data/mockData'
import { User, Phone, Truck, KeyRound, LogOut, ChevronRight, Shield } from 'lucide-react'

export default function DriverAccount() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const driver = mockDrivers[0]
  const [showLogout, setShowLogout] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className="space-y-4">
      {/* Profile card */}
      <GlassCard className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-navy-900 flex items-center justify-center text-gold-400 text-xl font-bold shrink-0">
            {driver.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy-900 font-display">{driver.name}</h2>
            <p className="text-sm text-gray-500">Tài xế</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-gold-400 text-sm">⭐ {driver.rating}</span>
              <span className="text-[11px] text-gray-400">· {driver.totalTrips} chuyến</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Info */}
      <GlassCard className="divide-y divide-navy-100">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Phone size={18} className="text-gray-400 shrink-0" />
          <div className="flex-1"><p className="text-[11px] text-gray-400">Số điện thoại</p><p className="text-sm font-medium text-navy-900 font-mono-num">{driver.phone}</p></div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Truck size={18} className="text-gray-400 shrink-0" />
          <div className="flex-1"><p className="text-[11px] text-gray-400">Đầu kéo</p><p className="text-sm font-medium text-navy-900 font-mono-num">{driver.tractorPlate}</p></div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Shield size={18} className="text-gray-400 shrink-0" />
          <div className="flex-1"><p className="text-[11px] text-gray-400">Trạng thái</p><p className="text-sm font-medium text-emerald-600">● Đang hoạt động</p></div>
        </div>
      </GlassCard>

      {/* Actions */}
      <GlassCard className="divide-y divide-navy-100">
        <button onClick={() => setShowPassword(true)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-navy-50/50 transition-colors text-left">
          <KeyRound size={18} className="text-gray-400 shrink-0" />
          <span className="flex-1 text-sm font-medium text-navy-900">Đổi mật khẩu</span>
          <ChevronRight size={16} className="text-gray-300" />
        </button>
      </GlassCard>

      {/* Logout */}
      <Button onClick={() => setShowLogout(true)} variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-2 h-12 font-semibold">
        <LogOut size={18} /> Đăng xuất
      </Button>

      {/* Change Password Dialog */}
      <Dialog open={showPassword} onOpenChange={setShowPassword}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Đổi mật khẩu</DialogTitle><DialogDescription>Nhập mật khẩu mới</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Mật khẩu hiện tại</Label><Input type="password" /></div>
            <div className="space-y-2"><Label>Mật khẩu mới</Label><Input type="password" /></div>
            <div className="space-y-2"><Label>Xác nhận mật khẩu</Label><Input type="password" /></div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Huỷ</Button></DialogClose><Button className="bg-gold-400 text-navy-950 hover:bg-gold-300">Cập nhật</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <LogoutConfirmDialog open={showLogout} onOpenChange={setShowLogout} onConfirm={handleLogout} />
    </div>
  )
}
