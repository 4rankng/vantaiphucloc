import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { GitMerge, Users, Truck } from 'lucide-react'
import { WorkOrderList } from '@/pages/accountant/WorkOrderList'
import { CustomerReconciliation } from '@/pages/accountant/CustomerReconciliation'
import { VendorReconciliation } from '@/pages/accountant/VendorReconciliation'

const TABS = [
  { key: 'match', label: 'Khớp chuyến', icon: GitMerge },
  { key: 'customer', label: 'Đối soát KH', icon: Users },
  { key: 'vendor', label: 'Đối soát nhà xe', icon: Truck },
] as const

type TabKey = (typeof TABS)[number]['key']

export function ReconciliationPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as TabKey | null
  const activeTab: TabKey = useMemo(
    () => (TABS.some((t) => t.key === tabParam) ? tabParam! : 'match'),
    [tabParam],
  )

  const setTab = useCallback(
    (key: TabKey) => {
      setSearchParams({ tab: key }, { replace: true })
    },
    [setSearchParams],
  )

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar — elevated section header */}
      <div
        role="tablist"
        aria-label="Đối soát"
        className="flex shrink-0 border-b overflow-x-auto"
        style={{
          background: 'var(--theme-bg-secondary)',
          borderColor: 'var(--theme-border-default)',
        }}
      >
        {TABS.map((tab) => {
          const active = tab.key === activeTab
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(tab.key)}
              className="relative inline-flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-offset-0"
              style={{
                color: active
                  ? 'var(--theme-brand-primary)'
                  : 'var(--theme-text-muted)',
              }}
            >
              <Icon
                size={14}
                strokeWidth={active ? 2.25 : 1.75}
                aria-hidden
              />
              <span className="tracking-tight">{tab.label}</span>
              {active && (
                <span
                  aria-hidden
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: 'var(--theme-brand-primary)' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 py-5">
        {activeTab === 'match' && <WorkOrderList />}
        {activeTab === 'customer' && <CustomerReconciliation />}
        {activeTab === 'vendor' && <VendorReconciliation />}
      </div>
    </div>
  )
}
