import {
  LayoutDashboard, Truck, Route, Users, FileText, Receipt,
  UserCog, BarChart3, AlertTriangle, CircleDollarSign, BookOpen,
  Camera, Wallet, UserCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  icon: LucideIcon
  path: string
}

// ─── Director ─────────────────────────────────────────────
export const directorNav: NavItem[] = [
  { label: 'Tổng quan', icon: LayoutDashboard, path: '/director' },
  { label: 'Đội xe', icon: Truck, path: '/director/fleet' },
  { label: 'Chuyến xe', icon: Route, path: '/director/trips' },
  { label: 'Chủ hàng', icon: Users, path: '/director/clients' },
  { label: 'Hóa đơn', icon: FileText, path: '/director/invoices' },
  { label: 'Công nợ', icon: Receipt, path: '/director/receivables' },
  { label: 'KPI Tài xế', icon: UserCog, path: '/director/driver-kpi' },
  { label: 'Báo cáo', icon: BarChart3, path: '/director/reports' },
]

// ─── Dispatcher ────────────────────────────────────────────
export const dispatcherNav: NavItem[] = [
  { label: 'Tổng quan', icon: LayoutDashboard, path: '/dispatcher' },
  { label: 'Chuyến xe', icon: Route, path: '/dispatcher/trips' },
  { label: 'Cảnh báo', icon: AlertTriangle, path: '/dispatcher/alerts' },
  { label: 'Đội xe', icon: Truck, path: '/dispatcher/fleet' },
  { label: 'Chủ hàng', icon: Users, path: '/dispatcher/clients' },
]

// ─── Accountant ────────────────────────────────────────────
export const accountantNav: NavItem[] = [
  { label: 'Tổng quan', icon: LayoutDashboard, path: '/accountant' },
  { label: 'Khách hàng', icon: Users, path: '/accountant/clients' },
  { label: 'Cung đường', icon: Route, path: '/accountant/routes' },
  { label: 'Đơn giá', icon: CircleDollarSign, path: '/accountant/pricings' },
  { label: 'Số công', icon: Camera, path: '/accountant/work-orders' },
  { label: 'Chuyến/Lệnh', icon: Truck, path: '/accountant/trip-orders' },
  { label: 'Tính lương', icon: Wallet, path: '/accountant/salary' },
  { label: 'Hóa đơn', icon: FileText, path: '/accountant/invoices' },
  { label: 'Công nợ', icon: Receipt, path: '/accountant/receivables' },
  { label: 'Chốt sổ', icon: BookOpen, path: '/accountant/period-close' },
]

// ─── Driver ────────────────────────────────────────────────
export const driverNav: NavItem[] = [
  { label: 'Trang chủ', icon: LayoutDashboard, path: '/driver' },
  { label: 'Chuyến xe', icon: Route, path: '/driver/trips' },
  { label: 'Chụp ảnh', icon: Camera, path: '/driver/photos' },
  { label: 'Thu nhập', icon: Wallet, path: '/driver/income' },
  { label: 'Tài khoản', icon: UserCircle, path: '/driver/account' },
]

// ─── Page title map ────────────────────────────────────────
export const pageTitles: Record<string, string> = {
  '/director': 'Tổng quan',
  '/director/fleet': 'Đội xe',
  '/director/trips': 'Chuyến xe',
  '/director/clients': 'Chủ hàng',
  '/director/invoices': 'Hóa đơn',
  '/director/receivables': 'Công nợ',
  '/director/driver-kpi': 'KPI Tài xế',
  '/director/reports': 'Báo cáo',
  '/dispatcher': 'Tổng quan',
  '/dispatcher/trips': 'Chuyến xe',
  '/dispatcher/alerts': 'Cảnh báo',
  '/dispatcher/fleet': 'Đội xe',
  '/dispatcher/clients': 'Chủ hàng',
  '/accountant': 'Tổng quan',
  '/accountant/clients': 'Khách hàng',
  '/accountant/routes': 'Cung đường',
  '/accountant/pricings': 'Đơn giá',
  '/accountant/work-orders': 'Số công',
  '/accountant/trip-orders': 'Chuyến/Lệnh',
  '/accountant/salary': 'Tính lương',
  '/accountant/invoices': 'Hóa đơn',
  '/accountant/receivables': 'Công nợ',
  '/accountant/period-close': 'Chốt sổ',
  '/driver': 'Trang chủ',
  '/driver/trips': 'Chuyến xe',
  '/driver/photos': 'Chụp ảnh',
  '/driver/income': 'Thu nhập',
  '/driver/account': 'Tài khoản',
}

export function getPageTitle(pathname: string): string {
  // Exact match first
  if (pageTitles[pathname]) return pageTitles[pathname]
  // Prefix match
  const keys = Object.keys(pageTitles).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (pathname.startsWith(key)) return pageTitles[key]
  }
  return 'TTransport'
}
