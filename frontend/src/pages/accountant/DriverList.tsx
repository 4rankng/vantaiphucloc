import { useMemo, useState } from 'react'
import { Car } from 'lucide-react'
import { DataTablePro, type Column } from '@/components/shared/DataTablePro/DataTablePro'
import { SettingsPageLayout } from '@/components/shared/SettingsPageLayout'
import { useDrivers } from '@/hooks/use-queries'
import { fuzzyMatch } from '@/lib/search-utils'
import type { Driver } from '@/data/domain'

export function DriverList() {
  const { data: drivers = [], isLoading } = useDrivers()
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () => drivers.filter(d => !search || fuzzyMatch(search, `${d.fullName ?? ''} ${d.username} ${d.phone}`)),
    [drivers, search],
  )

  const columns: Column<Driver>[] = [
    { key: 'name', header: 'Tài xế', accessor: d => <span className="font-medium">{d.fullName || d.username}</span>, sortable: true, sortKey: d => d.fullName ?? d.username },
    { key: 'phone', header: 'SĐT', accessor: d => d.phone
      ? <span>{d.phone}</span>
      : <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-brand-primary)' }}>+ Thêm SĐT</span>,
      sortable: true },
    { key: 'plate', header: 'Biển số xe', accessor: d => <span className="font-mono text-xs">{d.vehiclePlate || '—'}</span> },
  ]

  return (
    <SettingsPageLayout
      title="Tài xế"
      subtitle="Danh sách tài xế và thông tin xe"
      icon={Car}
      iconColor="var(--theme-status-info)"
    >
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Tìm tài xế, SĐT..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md h-9 px-3 rounded-lg text-sm border"
          style={{ background: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }}
        />
        <span className="text-xs shrink-0" style={{ color: 'var(--theme-text-muted)' }}>
          {search ? `${filtered.length}/${drivers.length}` : `${drivers.length}`} tài xế
        </span>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs font-medium px-2 py-1 rounded-md shrink-0 inline-flex items-center gap-1"
            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
          >
            × Xoá lọc
          </button>
        )}
      </div>

      <DataTablePro
        data={filtered}
        columns={columns}
        rowKey={d => d.id}
        loading={isLoading}
        defaultSortKey="name"
        emptyState={<p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{search ? 'Không tìm thấy tài xế' : 'Chưa có tài xế'}</p>}
      />
    </SettingsPageLayout>
  )
}
