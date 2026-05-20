import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Truck, Plus, User, X, Search } from 'lucide-react'
import { Button } from '@/components/ui'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog/ConfirmDialog'
import { Panel } from '@/components/shared/Panel'
import { EmptyState } from '@/components/shared/EmptyState'
import { Drawer } from '@/components/shared/Drawer'
import { InfoTip } from '@/components/shared/InfoTip'
import {
  useVendors,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
} from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { fuzzyMatch } from '@/lib/search-utils'
import type { Vendor } from '@/data/domain'

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH = 15
const VN_PHONE_RE = /^(0|\+?84)[35789]\d{8}$/
const VN_TAX_RE = /^\d{10}(\d{3})?$/
const EMPTY_FORM = { name: '', type: 'company' as const, phone: '', taxCode: '', address: '', contactPerson: '' }

// ─── Infinite scroll hook ─────────────────────────────────────────────────────

function useInfiniteScroll(onLoadMore: () => void) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) onLoadMore() },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [onLoadMore])

  return sentinelRef
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ count, label, accent }: { count: number; label: string; accent?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium"
      style={{
        background: accent ? 'var(--accent-soft)' : 'var(--surface-3)',
        color: accent ? 'var(--accent)' : 'var(--ink-2)',
      }}
    >
      <span className="tabular-nums font-bold" style={{ color: accent ? 'var(--accent)' : 'var(--ink)' }}>{count}</span>
      {label}
    </span>
  )
}

function SectionHeader({ icon, title, count, action }: {
  icon: React.ReactNode
  title: string
  count: number
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ color: 'var(--ink-2)' }}>{icon}</span>
      <h2 className="text-[15px] font-bold" style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}>
        {title}
      </h2>
      <span
        className="tabular-nums text-[11.5px] font-semibold rounded-full px-2 py-0.5"
        style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
      >
        {count}
      </span>
      {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
    </div>
  )
}

function SearchInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div className="relative" style={{ width: 220, flexShrink: 0 }}>
      <Search
        className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
        style={{ left: 10, color: 'var(--ink-3)' }}
      />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="nepo-input text-[13px]"
        style={{ paddingLeft: 32 }}
      />
    </div>
  )
}

function LoadMoreSentinel({ sentinelRef, hasMore }: {
  sentinelRef: React.RefObject<HTMLDivElement>
  hasMore: boolean
}) {
  if (!hasMore) return null
  return (
    <div ref={sentinelRef} className="flex justify-center py-3">
      <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>Đang tải…</span>
    </div>
  )
}

// ─── Vendor form drawer ──────────────────────────────────────────────────────

function VendorFormDrawer({ open, onClose, onSave, title, initial, isPending }: {
  open: boolean; onClose: () => void; onSave: (data: typeof EMPTY_FORM) => void; title: string; initial?: Partial<typeof EMPTY_FORM>; isPending?: boolean
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateField = <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    const errs: Record<string, string> = {}
    if (form.phone && !VN_PHONE_RE.test(form.phone.replace(/[\s-]/g, ''))) errs.phone = 'SĐT không hợp lệ'
    if (form.taxCode && !VN_TAX_RE.test(form.taxCode)) errs.taxCode = 'MST phải 10 hoặc 13 chữ số'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSave({ ...form, name: form.name.trim() })
  }

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose() }} breadcrumb="Nhà thầu" title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Huỷ</Button>
          <Button variant="default" onClick={handleSave}
            disabled={!form.name.trim() || !!isPending}>
            {isPending ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="vnd-name">
              Tên nhà thầu <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <input id="vnd-name" value={form.name} onChange={e => updateField('name', e.target.value)}
              placeholder="Tên nhà thầu" className="nepo-input" autoFocus />
          </div>
          <div>
            <label className="nepo-field-label">Loại</label>
            <div className="flex gap-1">
              {(['company', 'individual'] as const).map(t => (
                <button key={t} type="button" onClick={() => updateField('type', t)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: form.type === t ? 'var(--accent)' : 'var(--surface-3)',
                    color: form.type === t ? '#fff' : 'var(--ink-2)',
                  }}
                >{t === 'company' ? 'Công ty' : 'Cá nhân'}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label" htmlFor="vnd-phone">Điện thoại</label>
            <input id="vnd-phone" type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)}
              placeholder="0901234567" className="nepo-input" />
            {errors.phone && <p className="text-[11px] mt-1" style={{ color: 'var(--accent)' }}>{errors.phone}</p>}
          </div>
          <div>
            <label className="nepo-field-label" htmlFor="vnd-tax">
              Mã số thuế <InfoTip text="10 hoặc 13 chữ số" />
            </label>
            <input id="vnd-tax" value={form.taxCode} onChange={e => updateField('taxCode', e.target.value)}
              placeholder="0123456789" className="nepo-input" />
            {errors.taxCode && <p className="text-[11px] mt-1" style={{ color: 'var(--accent)' }}>{errors.taxCode}</p>}
          </div>
        </div>
        <div>
          <label className="nepo-field-label" htmlFor="vnd-addr">Địa chỉ</label>
          <input id="vnd-addr" value={form.address} onChange={e => updateField('address', e.target.value)}
            placeholder="Địa chỉ" className="nepo-input" />
        </div>
        <div>
          <label className="nepo-field-label" htmlFor="vnd-contact">Người liên hệ</label>
          <input id="vnd-contact" value={form.contactPerson} onChange={e => updateField('contactPerson', e.target.value)}
            placeholder="Họ tên người liên hệ" className="nepo-input" />
        </div>
      </div>
    </Drawer>
  )
}

// ─── Vendor detail drawer ────────────────────────────────────────────────────

function VendorDetailDrawer({ vendor, onClose, onEdit, onDelete }: {
  vendor: Vendor; onClose: () => void; onEdit: () => void; onDelete: () => void
}) {
  return (
    <Drawer open onOpenChange={(o) => { if (!o) onClose() }}
      breadcrumb="Nhà thầu" title={vendor.name} meta={vendor.taxCode || undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onDelete}
            style={{ color: 'var(--accent)', marginRight: 'auto' }}>Xoá</Button>
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
          <Button variant="default" onClick={onEdit}>Sửa</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label">Loại</label>
            <p className="text-[13px]" style={{ color: 'var(--ink)' }}>
              {vendor.type === 'company' ? 'Công ty' : 'Cá nhân'}
            </p>
          </div>
          <div>
            <label className="nepo-field-label">SĐT</label>
            <p className="text-[13px]" style={{ color: vendor.phone ? 'var(--ink)' : 'var(--ink-3)' }}>
              {vendor.phone || '—'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nepo-field-label">MST</label>
            <p className="text-[13px]" style={{ color: vendor.taxCode ? 'var(--ink)' : 'var(--ink-3)' }}>
              {vendor.taxCode || '—'}
            </p>
          </div>
          <div>
            <label className="nepo-field-label">Liên hệ</label>
            <p className="text-[13px]" style={{ color: vendor.contactPerson ? 'var(--ink)' : 'var(--ink-3)' }}>
              {vendor.contactPerson || '—'}
            </p>
          </div>
        </div>
        <div>
          <label className="nepo-field-label">Địa chỉ</label>
          <p className="text-[13px]" style={{ color: vendor.address ? 'var(--ink)' : 'var(--ink-3)' }}>
            {vendor.address || '—'}
          </p>
        </div>
      </div>
    </Drawer>
  )
}

// ─── Vendor row ───────────────────────────────────────────────────────────────

function VendorRow({ vendor, onOpenDetail }: { vendor: Vendor; onOpenDetail: () => void }) {
  const initials = vendor.name.slice(0, 2).toUpperCase()

  return (
    <tr onClick={onOpenDetail} className="cursor-pointer">
      <td>
        <div className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
          {initials}
        </div>
      </td>
      <td><span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{vendor.name}</span></td>
      <td><span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{vendor.phone || '—'}</span></td>
      <td><span className="text-[13px] line-clamp-1" style={{ color: 'var(--ink-2)' }}>{vendor.address || '—'}</span></td>
      <td><span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{vendor.contactPerson || '—'}</span></td>
      <td><span className="text-[13px] font-medium tabular-nums" style={{ color: 'var(--ink)' }}>{vendor.taxCode || '—'}</span></td>
    </tr>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function VendorsPage() {
  const toast = useToast()
  const { data: vendors = [], isLoading } = useVendors()
  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()
  const deleteVendor = useDeleteVendor()

  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Vendor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)
  const [detailTarget, setDetailTarget] = useState<Vendor | null>(null)

  // Infinite scroll
  const [limit, setLimit] = useState(BATCH)
  useEffect(() => { setLimit(BATCH) }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!search.trim()) return vendors
    const q = search
    return vendors.filter(p => fuzzyMatch(p.name, q) || fuzzyMatch(p.phone ?? '', q) || fuzzyMatch(p.taxCode ?? '', q))
  }, [vendors, search])

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit])
  const hasMore = limit < filtered.length
  const loadMore = useCallback(() => setLimit(n => n + BATCH), [])
  const sentinel = useInfiniteScroll(loadMore)

  const companyCount = vendors.filter(v => v.type === 'company').length
  const individualCount = vendors.filter(v => v.type !== 'company').length

  const handleCreate = useCallback((data: typeof EMPTY_FORM) => {
    createVendor.mutate(data, {
      onSuccess: () => { toast.success('Đã thêm nhà thầu'); setShowCreate(false) },
      onError: () => toast.error('Không thể thêm nhà thầu'),
    })
  }, [createVendor, toast])

  const handleUpdate = useCallback((data: typeof EMPTY_FORM) => {
    if (!editTarget) return
    updateVendor.mutate({ id: editTarget.id, data }, {
      onSuccess: () => { toast.success('Đã cập nhật'); setEditTarget(null) },
      onError: () => toast.error('Không thể cập nhật'),
    })
  }, [editTarget, updateVendor, toast])

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return
    deleteVendor.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Đã xoá'); setDeleteTarget(null); setDetailTarget(null) },
      onError: () => toast.error('Không thể xoá'),
    })
  }, [deleteTarget, deleteVendor, toast])

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <header>
        <h1 className="typo-display">Nhà thầu</h1>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <StatPill count={vendors.length} label=" nhà thầu" accent />
          <StatPill count={companyCount} label=" công ty" />
          <StatPill count={individualCount} label=" cá nhân" />
          <div style={{ marginLeft: 'auto' }}>
            <Button variant="default" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Thêm
            </Button>
          </div>
        </div>
      </header>

      {/* ── Table section ── */}
      <section>
        <SectionHeader
          icon={<Truck className="h-4 w-4" />}
          title="Danh sách nhà thầu"
          count={filtered.length}
          action={<SearchInput value={search} onChange={setSearch} placeholder="Tìm tên, MST, SĐT…" />}
        />
        <Panel flush>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--surface-3)' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={<Truck className="h-5 w-5" />}
                title={search.trim() ? 'Không tìm thấy nhà thầu' : 'Chưa có nhà thầu nào'}
                compact
                action={!search.trim() ? (
                  <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
                    <Plus size={14} strokeWidth={2.25} /><span>Thêm nhà thầu</span>
                  </button>
                ) : undefined}
              />
            </div>
          ) : (
            <>
              <div className="nepo-table-scroll overflow-x-auto">
                <table className="nepo-table w-full" style={{ minWidth: 600, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 48 }} />
                      <th className="text-left">Tên nhà thầu</th>
                      <th className="text-left">SĐT</th>
                      <th className="text-left">Địa chỉ</th>
                      <th className="text-left">Liên hệ</th>
                      <th className="text-left">MST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((v) => (
                      <VendorRow key={v.id} vendor={v} onOpenDetail={() => setDetailTarget(v)} />
                    ))}
                  </tbody>
                </table>
              </div>
              <LoadMoreSentinel sentinelRef={sentinel} hasMore={hasMore} />
            </>
          )}
        </Panel>
      </section>

      {/* ── Detail drawer ── */}
      {detailTarget && !editTarget && (
        <VendorDetailDrawer
          vendor={detailTarget}
          onClose={() => setDetailTarget(null)}
          onEdit={() => setEditTarget(detailTarget)}
          onDelete={() => { setDeleteTarget(detailTarget); setDetailTarget(null) }}
        />
      )}

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xoá nhà thầu"
        description={`"${deleteTarget?.name}" sẽ bị xoá vĩnh viễn và không thể khôi phục.`}
        confirmLabel="Xoá"
        variant="warning"
      />

      {/* ── Form drawers ── */}
      <VendorFormDrawer open={showCreate} onClose={() => setShowCreate(false)} onSave={handleCreate} title="Thêm nhà thầu" isPending={createVendor.isPending} />
      <VendorFormDrawer
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleUpdate}
        title="Cập nhật nhà thầu"
        isPending={updateVendor.isPending}
        initial={editTarget ? { name: editTarget.name, type: editTarget.type ?? 'company', phone: editTarget.phone ?? '', taxCode: editTarget.taxCode ?? '', address: editTarget.address ?? '', contactPerson: editTarget.contactPerson ?? '' } : undefined}
      />
    </div>
  )
}
