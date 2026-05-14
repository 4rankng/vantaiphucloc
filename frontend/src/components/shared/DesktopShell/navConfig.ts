import { Home, Plus, Clock, Bell, User, Users, LayoutDashboard, Truck, Route, Briefcase, FileText, DollarSign, type LucideIcon } from 'lucide-react'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  exact?: boolean
  section?: 'main' | 'admin'
}

export const DRIVER_NAV: NavItem[] = [
  { path: '/driver', label: 'Trang chủ', icon: Home, exact: true, section: 'main' },
  { path: '/driver/work-orders/new', label: 'Tạo chuyến', icon: Plus, section: 'main' },
  { path: '/driver/history', label: 'Lịch sử', icon: Clock, section: 'main' },
  { path: '/driver/notifications', label: 'Thông báo', icon: Bell, section: 'main' },
  { path: '/driver/profile', label: 'Hồ sơ', icon: User, section: 'admin' },
]

export const ACCOUNTANT_NAV: NavItem[] = [
  { path: '/accountant', label: 'Trang chủ', icon: Home, exact: true, section: 'main' },
  { path: '/accountant/partners', label: 'Đối tác', icon: Users, section: 'main' },
  { path: '/accountant/routes', label: 'Cung đường', icon: Route, section: 'main' },
  { path: '/accountant/work-orders', label: 'Đối soát', icon: Briefcase, section: 'main' },
  { path: '/accountant/trips', label: 'Chuyến', icon: Truck, section: 'main' },
  { path: '/accountant/pricing', label: 'Bảng giá', icon: DollarSign, section: 'main' },
  { path: '/accountant/salary-setup', label: 'Kỳ lương', icon: FileText, section: 'admin' },
]

export const DIRECTOR_NAV: NavItem[] = [
  { path: '/director', label: 'Trang chủ', icon: Home, exact: true, section: 'main' },
  { path: '/director/users', label: 'Tài khoản', icon: Users, section: 'main' },
  { path: '/director/notifications', label: 'Thông báo', icon: Bell, section: 'admin' },
]

export const SUPERADMIN_NAV: NavItem[] = [
  { path: '/superadmin', label: 'Trang chủ', icon: LayoutDashboard, exact: true, section: 'main' },
]
