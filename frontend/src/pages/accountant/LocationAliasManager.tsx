import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Check, X, RotateCcw, Clock, Filter, Plus } from 'lucide-react'
import { SettingsPageLayout } from '@/components/shared/SettingsPageLayout'
import { useToast } from '@/components/atoms/Toast'
import { listAliases, createAlias, confirmAlias, rejectAlias, reopenAlias, getPendingReviewLocations } from '@/services/api/locationAliases.api'
import { getLocations, createLocation } from '@/services/api/locations.api'
import type { LocationAlias, LocationAliasStatus, Location } from '@/data/domain'

type TabKey = 'pending' | 'all'

const STATUS_COLORS: Record<LocationAliasStatus, string> = {
  PENDING: 'var(--theme-status-warning)',
  CONFIRMED: 'var(--theme-status-success)',
  REJECTED: 'var(--theme-status-error)',
  MERGED: 'var(--theme-status-info)',
}

const STATUS_LABELS: Record<LocationAliasStatus, string> = {
  PENDING: 'Chờ duyệt',
  CONFIRMED: 'Đã xác nhận',
  REJECTED: 'Đã từ chối',
  MERGED: 'Đã gộp',
}

function StatusBadge({ status }: { status: LocationAliasStatus }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: `color-mix(in srgb, ${STATUS_COLORS[status]} 12%, transparent)`,
        color: STATUS_COLORS[status],
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

export function LocationAliasManager() {
  const toast = useToast()
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabKey>('pending')
  const [statusFilter, setStatusFilter] = useState<LocationAliasStatus | ''>('')
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState<number | ''>('')
  const [newLocationName, setNewLocationName] = useState('')
  const [newAliasName, setNewAliasName] = useState('')

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await getLocations()
      return res.success ? res.data : []
    },
  })

  const locationMap = new Map(locations.map((l: Location) => [l.id, l.name]))

  const { data: pendingGroups = [], isLoading: loadingPending } = useQuery({
    queryKey: ['location-aliases', 'pending-review'],
    queryFn: async () => {
      const res = await getPendingReviewLocations()
      return res.success ? res.data : []
    },
    enabled: tab === 'pending',
  })

  const pendingAliases = pendingGroups.flatMap(g => g.pendingAliases)

  const { data: allAliases = [], isLoading: loadingAll } = useQuery({
    queryKey: ['location-aliases', 'all', statusFilter],
    queryFn: async () => {
      const res = await listAliases({ status: statusFilter || undefined })
      return res.success ? res.data : []
    },
    enabled: tab === 'all',
  })

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['location-aliases'] })
  }, [qc])

  const confirmMut = useMutation({
    mutationFn: (id: number) => confirmAlias(id),
    onSuccess: () => { toast.success('Đã xác nhận bí danh'); invalidate() },
    onError: () => toast.error('Lỗi', 'Không thể xác nhận'),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) => rejectAlias(id, note),
    onSuccess: () => { toast.success('Đã từ chối bí danh'); setRejectingId(null); setRejectNote(''); invalidate() },
    onError: () => toast.error('Lỗi', 'Không thể từ chối'),
  })

  const reopenMut = useMutation({
    mutationFn: (id: number) => reopenAlias(id),
    onSuccess: () => { toast.success('Đã mở lại bí danh'); invalidate() },
    onError: () => toast.error('Lỗi', 'Không thể mở lại'),
  })

  const createMut = useMutation({
    mutationFn: async ({ locationId, alias }: { locationId: number; alias: string }) => createAlias(locationId, alias),
    onSuccess: () => {
      toast.success('Đã thêm bí danh')
      setCreateOpen(false)
      setNewAliasName('')
      setNewLocationName('')
      invalidate()
      qc.invalidateQueries({ queryKey: ['locations'] })
    },
    onError: () => toast.error('Lỗi', 'Không thể thêm bí danh'),
  })

  const createLocationMut = useMutation({
    mutationFn: (name: string) => createLocation({ name }),
    onSuccess: (res) => {
      if (!res.success) { toast.error('Lỗi', 'Không thể tạo địa điểm'); return }
      qc.invalidateQueries({ queryKey: ['locations'] })
      createMut.mutate({ locationId: res.data.id, alias: newAliasName })
    },
    onError: () => toast.error('Lỗi', 'Không thể tạo địa điểm'),
  })

  const aliases = tab === 'pending' ? pendingAliases : allAliases
  const loading = tab === 'pending' ? loadingPending : loadingAll

  return (
    <SettingsPageLayout title="Địa điểm & bí danh" subtitle="Quản lý bí danh địa điểm để ghép chuyến chính xác" icon={MapPin}>
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--theme-bg-tertiary)' }}>
        <button
          onClick={() => setTab('pending')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
          style={{
            background: tab === 'pending' ? 'var(--theme-bg-primary)' : 'transparent',
            color: tab === 'pending' ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
            boxShadow: tab === 'pending' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          <Clock className="w-3.5 h-3.5" />
          Chờ duyệt
          {pendingAliases.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: 'var(--theme-status-warning)', color: '#fff' }}>
              {pendingAliases.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('all')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
          style={{
            background: tab === 'all' ? 'var(--theme-bg-primary)' : 'transparent',
            color: tab === 'all' ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
            boxShadow: tab === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}
        >
          Tất cả
        </button>
      </div>

      {/* Add alias button + form */}
      {!createOpen ? (
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          <Plus className="w-3.5 h-3.5" /> Thêm bí danh
        </button>
      ) : (
        <div className="card p-4 flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="typo-form-label">Địa điểm chính</label>
            <select
              value={selectedLocationId}
              onChange={e => {
                const v = e.target.value
                if (v === '__new__') {
                  setSelectedLocationId('__new__' as any)
                } else {
                  setSelectedLocationId(Number(v) || '')
                  setNewLocationName('')
                }
              }}
              className="h-9 w-full px-2 rounded-md text-sm"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
            >
              <option value="">— Chọn địa điểm —</option>
              <option value="__new__">+ Tạo địa điểm mới</option>
              {locations.map((l: Location) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="typo-form-label">Bí danh</label>
            <input
              value={newAliasName}
              onChange={e => setNewAliasName(e.target.value)}
              placeholder="Nhập bí danh..."
              className="h-9 w-full px-2 rounded-md text-sm"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
              autoFocus
            />
          </div>
          <button
            onClick={() => {
              if (!newAliasName.trim()) { toast.error('Lỗi', 'Nhập bí danh'); return }
              if (selectedLocationId === '__new__') {
                if (!newLocationName.trim()) { toast.error('Lỗi', 'Nhập tên địa điểm'); return }
                createLocationMut.mutate(newLocationName.trim())
              } else {
                if (!selectedLocationId) { toast.error('Lỗi', 'Chọn địa điểm'); return }
                createMut.mutate({ locationId: selectedLocationId as number, alias: newAliasName.trim() })
              }
            }}
            disabled={createMut.isPending || createLocationMut.isPending}
            className="h-9 px-4 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
            style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
          >
            {(createMut.isPending || createLocationMut.isPending) ? 'Đang lưu...' : 'Thêm'}
          </button>
          <button
            onClick={() => { setCreateOpen(false); setNewAliasName(''); setNewLocationName('') }}
            className="h-9 px-3 rounded-lg text-sm font-medium"
            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
          >
            Huỷ
          </button>
        </div>
      )}

      {/* Filter (all tab only) */}
      {tab === 'all' && (
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-muted)' }} />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as LocationAliasStatus | '')}
            className="h-8 px-2 rounded-md text-sm border-0"
            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="REJECTED">Đã từ chối</option>
            <option value="MERGED">Đã gộp</option>
          </select>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
          ))}
        </div>
      ) : aliases.length === 0 ? (
        <div className="card p-10 text-center">
          <MapPin className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--theme-text-muted)', opacity: 0.5 }} />
          <p className="typo-h3 mb-1" style={{ color: 'var(--theme-text-primary)' }}>
            {tab === 'pending' ? 'Không có bí danh chờ duyệt' : 'Không có bí danh'}
          </p>
          <p className="typo-body-sm" style={{ color: 'var(--theme-text-muted)' }}>
            {tab === 'pending' ? 'Bí danh do tài xế gửi sẽ hiển thị ở đây' : 'Thay đổi bộ lọc để xem thêm'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--theme-border-default)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--theme-bg-tertiary)' }}>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Bí danh</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Địa điểm chính</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Nguồn</th>
                {tab === 'all' && (
                  <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Trạng thái</th>
                )}
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Ngày tạo</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {aliases.map((a: LocationAlias, i: number) => {
                const isRejecting = rejectingId === a.id
                return (
                  <tr
                    key={a.id}
                    style={{
                      background: i % 2 === 0 ? 'var(--theme-bg-primary)' : 'var(--theme-bg-secondary)',
                      borderTop: '1px solid var(--theme-border-light)',
                    }}
                  >
                    <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--theme-text-primary)' }}>{a.alias}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--theme-text-secondary)' }}>
                      {locationMap.get(a.locationId) ?? `#${a.locationId}`}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--theme-text-muted)' }}>
                      <span className="text-xs">{a.source}</span>
                    </td>
                    {tab === 'all' && (
                      <td className="px-4 py-2.5"><StatusBadge status={a.status} /></td>
                    )}
                    <td className="px-4 py-2.5 tabular-nums text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                      {new Date(a.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {a.status === 'PENDING' && !isRejecting && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => confirmMut.mutate(a.id)}
                            disabled={confirmMut.isPending}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
                            style={{ background: 'color-mix(in srgb, var(--theme-status-success) 12%, transparent)', color: 'var(--theme-status-success)' }}
                          >
                            <Check className="w-3 h-3" /> Xác nhận
                          </button>
                          <button
                            onClick={() => { setRejectingId(a.id); setRejectNote('') }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
                            style={{ background: 'color-mix(in srgb, var(--theme-status-error) 12%, transparent)', color: 'var(--theme-status-error)' }}
                          >
                            <X className="w-3 h-3" /> Từ chối
                          </button>
                        </div>
                      )}
                      {a.status === 'PENDING' && isRejecting && (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            value={rejectNote}
                            onChange={e => setRejectNote(e.target.value)}
                            placeholder="Lý do (tuỳ chọn)"
                            className="h-7 px-2 rounded text-xs border-0 w-32"
                            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }}
                            autoFocus
                          />
                          <button
                            onClick={() => rejectMut.mutate({ id: a.id, note: rejectNote || undefined })}
                            disabled={rejectMut.isPending}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                            style={{ background: 'var(--theme-status-error)', color: '#fff' }}
                          >
                            {rejectMut.isPending ? '...' : 'OK'}
                          </button>
                          <button
                            onClick={() => setRejectingId(null)}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                            style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
                          >
                            Huỷ
                          </button>
                        </div>
                      )}
                      {a.status === 'REJECTED' && (
                        <button
                          onClick={() => reopenMut.mutate(a.id)}
                          disabled={reopenMut.isPending}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
                          style={{ background: 'color-mix(in srgb, var(--theme-status-info) 12%, transparent)', color: 'var(--theme-status-info)' }}
                        >
                          <RotateCcw className="w-3 h-3" /> Mở lại
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SettingsPageLayout>
  )
}
