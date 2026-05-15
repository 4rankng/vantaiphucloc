import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { WorkOrderList } from '@/pages/accountant/WorkOrderList'
import { CustomerReconciliation } from '@/pages/accountant/CustomerReconciliation'
import { VendorReconciliation } from '@/pages/accountant/VendorReconciliation'

const TABS = [
  { key: 'match', label: 'Khớp chuyến' },
  { key: 'customer', label: 'Đối soát KH' },
  { key: 'vendor', label: 'Đối soát nhà xe' },
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
      {/* Tab bar */}
      <div
        className="flex shrink-0 border-b overflow-x-auto"
        style={{ borderColor: 'var(--theme-border, #e5e7eb)' }}
      >
        {TABS.map((tab) => {
          const active = tab.key === activeTab
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTab(tab.key)}
              className="relative px-4 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150"
              style={{
                color: active
                  ? 'var(--theme-brand-primary, #2563eb)'
                  : 'var(--theme-text-muted, #6b7280)',
              }}
            >
              {tab.label}
              {active && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-[2px] rounded-t"
                  style={{ background: 'var(--theme-brand-primary, #2563eb)' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'match' && <WorkOrderList />}
        {activeTab === 'customer' && <CustomerReconciliation />}
        {activeTab === 'vendor' && <VendorReconciliation />}
      </div>
    </div>
  )
}
