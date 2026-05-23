import { Calendar, Route, Settings } from 'lucide-react'
import { SettingCard, type SettingCardItem } from '@/components/shared/SettingCard/SettingCard'
import { PageHeader } from '@/components/shared/PageHeader'

const SETTINGS_SECTIONS: SettingCardItem[] = [
  {
    key: 'salary-period',
    label: 'Kỳ lương',
    desc: 'Cấu hình ngày bắt đầu và kết thúc kỳ lương hàng tháng',
    icon: Calendar,
    path: '/accountant/settings/ky-luong',
    color: '#6366f1',
  },
  {
    key: 'route-pricing',
    label: 'Cước tuyến',
    desc: 'Quản lý bảng giá cước theo tuyến đường và loại hình tác nghiệp',
    icon: Route,
    path: '/accountant/settings/cuoc-tuyen',
    color: '#0ea5e9',
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

      <div className="grid gap-3 sm:grid-cols-2">
        {SETTINGS_SECTIONS.map((section) => (
          <SettingCard key={section.key} section={section} />
        ))}
      </div>
    </div>
  )
}
