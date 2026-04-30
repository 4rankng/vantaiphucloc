import { Home, Plus, Clock, Bell, User, Users, LayoutDashboard, Truck, CircleDollarSign, Route, Briefcase, FileText, DollarSign, type LucideIcon } from 'lucide-react'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

export const DRIVER_NAV: NavItem[] = [
  { path: '/driver', label: 'Trang chủ', icon: Home, exact: true },
  { path: '/driver/work-orders/new', label: 'Tạo chuyến', icon: Plus },
  { path: '/driver/history', label: 'Lịch sử', icon: Clock },
  { path: '/driver/notifications', label: 'Thông báo', icon: Bell },
  { path: '/driver/profile', label: 'Hồ sơ', icon: User },
]

export const ACCOUNTANT_NAV: NavItem[] = [
  { path: '/accountant', label: 'Trang chủ', icon: Home, exact: true },
  { path: '/accountant/clients', label: 'Khách hàng', icon: Users },
  { path: '/accountant/routes', label: 'Cung đường', icon: Route },
  { path: '/accountant/work-orders', label: 'Đối soát', icon: Briefcase },
  { path: '/accountant/trips', label: 'Chuyến', icon: Truck },
  { path: '/accountant/pricing', label: 'Bảng giá', icon: DollarSign },
  { path: '/accountant/salary-setup', label: 'Kỳ lương', icon: FileText },
]

export const DIRECTOR_NAV: NavItem[] = [
  { path: '/director', label: 'Trang chủ', icon: Home, exact: true },
  { path: '/director/users', label: 'Tài khoản', icon: Users },
  { path: '/director/notifications', label: 'Thông báo', icon: Bell },
]

export const SUPERADMIN_NAV: NavItem[] = [
  { path: '/superadmin', label: 'Trang chủ', icon: LayoutDashboard, exact: true },
]
