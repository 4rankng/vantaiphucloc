import {
  Users, Route, CircleDollarSign,
  Camera, Truck, Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  icon: LucideIcon
  path: string
}

// ─── Accountant ────────────────────────────────────────────
export const accountantNav: NavItem[] = [
  { label: 'Khách hàng', icon: Users, path: '/accountant/clients' },
  { label: 'Cung đường', icon: Route, path: '/accountant/routes' },
  { label: 'Đơn giá', icon: CircleDollarSign, path: '/accountant/pricings' },
  { label: 'Số công', icon: Camera, path: '/accountant/work-orders' },
  { label: 'Chuyến/Lệnh', icon: Truck, path: '/accountant/trip-orders' },
  { label: 'Tính lương', icon: Wallet, path: '/accountant/salary' },
]

// ─── Page title map ────────────────────────────────────────
export const pageTitles: Record<string, string> = {
  '/director': 'Tổng quan',
  '/accountant': 'Tổng quan',
  '/accountant/clients': 'Khách hàng',
  '/accountant/routes': 'Cung đường',
  '/accountant/pricings': 'Đơn giá',
  '/accountant/work-orders': 'Số công',
  '/accountant/trip-orders': 'Chuyến/Lệnh',
  '/accountant/salary': 'Tính lương',
  '/accountant/notifications': 'Thông báo',
  '/accountant/profile': 'Tài khoản',
  '/driver': 'Trang chủ',
  '/driver/history': 'Lịch sử',
  '/driver/notifications': 'Thông báo',
  '/driver/profile': 'Tài khoản',
}

export function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  const keys = Object.keys(pageTitles).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (pathname.startsWith(key)) return pageTitles[key]
  }
  return 'TTransport'
}
