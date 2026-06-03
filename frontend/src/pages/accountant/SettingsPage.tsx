import { Calendar, Route, Settings, Truck, Wrench } from 'lucide-react'
import { SettingCard, type SettingCardItem } from '@/components/shared/forms/SettingCard/SettingCard'
import { PageHeader } from '@/components/shared/layouts/PageHeader'

const SETTINGS_SECTIONS: SettingCardItem[] = [
  {
    key: 'salary-period',
    label: 'Kỳ lương',
    desc: 'Cấu hình ngày bắt đầu và kết thúc kỳ lương hàng tháng',
    icon: Calendar,
    path: '/accountant/settings/ky-luong',
    color: 'var(--theme-ai-accent)',
  },
  {
    key: 'route-pricing',
    label: 'Cước thu chủ hàng',
    desc: 'Quản lý bảng giá cước theo tuyến đường và loại hình tác nghiệp',
    icon: Route,
    path: '/accountant/settings/cuoc-tuyen',
    color: 'var(--theme-status-info)',
  },
  {
    key: 'vendor-route-pricing',
    label: 'Cước trả xe ngoài',
    desc: 'Quản lý bảng giá cước trả nhà thầu theo tuyến đường',
    icon: Truck,
    path: '/accountant/settings/cuoc-tra-xe-ngoai',
    color: 'var(--theme-status-warning)',
  },
  {
    key: 'operation-types',
    label: 'Loại tác nghiệp',
    desc: 'Quản lý các loại tác nghiệp (Xuất/Nhập tàu, Chuyển bãi, Đóng kho...)',
    icon: Wrench,
    path: '/accountant/settings/tac-nghiep',
    color: 'var(--theme-status-success)',
  },
]

export function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Thiết lập"
        subtitle="Cấu hình hệ thống và thông số vận hành"
        lucideIcon={Settings}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_SECTIONS.map((section) => (
          <SettingCard key={section.key} section={section} />
        ))}
      </div>
    </div>
  )
}
