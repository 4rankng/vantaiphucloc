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
  { path: '/driver/delivered-trips/new', label: 'Tạo chuyến', icon: Plus, section: 'main' },
  { path: '/driver/history', label: 'Lịch sử', icon: Clock, section: 'main' },
  { path: '/driver/notifications', label: 'Thông báo', icon: Bell, section: 'main' },
  { path: '/driver/profile', label: 'Hồ sơ', icon: User, section: 'admin' },
]

export const ACCOUNTANT_NAV: NavItem[] = [
  { path: '/accountant', label: 'Trang chủ', icon: Home, exact: true, section: 'main' },
]

export const DIRECTOR_NAV: NavItem[] = [
  { path: '/director', label: 'Trang chủ', icon: Home, exact: true, section: 'main' },
  { path: '/director/users', label: 'Tài khoản', icon: Users, section: 'main' },
  { path: '/director/notifications', label: 'Thông báo', icon: Bell, section: 'admin' },
]

export const SUPERADMIN_NAV: NavItem[] = [
  { path: '/superadmin', label: 'Trang chủ', icon: LayoutDashboard, exact: true, section: 'main' },
]
