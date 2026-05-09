import { useState } from 'react'
import { Settings, Wallet, Tag, Users, UserCog } from 'lucide-react'
import { SalarySetup } from './SalarySetup'
import { PricingList } from './PricingList'
import { ClientsAndVendors } from './ClientsAndVendors'
import { UserManagement } from '@/pages/director/UserManagement'

// ─── Tab config ───────────────────────────────────────────────────────────────

type SettingsTab = 'salary' | 'pricing' | 'contractors' | 'users'

const TABS: { key: SettingsTab; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'salary',       label: 'Kỳ lương',   icon: Wallet,   desc: 'Cấu hình kỳ tính lương tài xế' },
  { key: 'pricing',      label: 'Bảng giá',   icon: Tag,      desc: 'Giá vận chuyển theo tuyến & khách hàng' },
  { key: 'contractors',  label: 'Nhà thầu',   icon: Users,    desc: 'Quản lý đơn vị vận chuyển & khách hàng' },
  { key: 'users',        label: 'Người dùng', icon: UserCog,  desc: 'Tạo & quản lý tài khoản' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function AccountantSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('salary')

  return (
    <div className="space-y-5">
      {/* Page title */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'var(--theme-brand-primary-light)' }}
        >
          <Settings className="h-6 w-6" style={{ color: 'var(--theme-brand-primary)' }} />
        </div>
        <div>
          <h1 className="typo-display">Cài đặt</h1>
          <p className="typo-body-sm mt-0.5">Cấu hình hệ thống và dữ liệu nền</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 rounded-xl p-1" style={{ background: 'var(--theme-bg-tertiary)' }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 flex-1 justify-center py-2 px-3 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: isActive ? 'var(--theme-bg-primary)' : 'transparent',
                color: isActive ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
                boxShadow: isActive ? 'var(--theme-shadow-sm)' : 'none',
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Active tab label (mobile) */}
      <div className="sm:hidden">
        <p className="text-base font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
          {TABS.find(t => t.key === activeTab)?.label}
        </p>
        <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          {TABS.find(t => t.key === activeTab)?.desc}
        </p>
      </div>

      {/* Tab content */}
      {activeTab === 'salary'      && <SalarySetup />}
      {activeTab === 'pricing'     && <PricingList />}
      {activeTab === 'contractors' && <ClientsAndVendors />}
      {activeTab === 'users'       && <UserManagement />}
    </div>
  )
}
