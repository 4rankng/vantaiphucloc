import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  icon: LucideIcon
  path: string
}

// ─── Accountant ────────────────────────────────────────────
export const accountantNav: NavItem[] = []

// ─── Page title map ────────────────────────────────────────
export const pageTitles: Record<string, string> = {
  '/director': 'Tổng quan',
  '/accountant': 'Tổng quan',
  '/accountant/profile': 'Tài khoản',
  '/accountant/clients': 'Chủ hàng',
  '/accountant/vendors': 'Nhà thầu',
  '/accountant/drivers': 'Lái xe',
  '/accountant/transporters': 'Vận tải',
  '/accountant/settings': 'Thiết lập',
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
