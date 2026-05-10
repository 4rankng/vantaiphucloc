import { useState, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Building2, UserCircle, Phone, Truck } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { SearchBar } from '@/components/shared/SearchBar'
import { FilterPills } from '@/components/shared/FilterPills'
import { InfoRow } from '@/components/shared/InfoRow'
import { PartnersTable, type PartnerRow } from '@/components/shared/PartnersTable'
import { CreateClientDialog } from '@/components/shared/CreateClientDialog'
import { CreateVendorDialog } from '@/components/shared/CreateVendorDialog'
import { fuzzyMatch } from '@/lib/search-utils'
import {
  useClients, useCreateClient, useDeleteClient,
  useVendors, useCreateVendor, useDeleteVendor,
} from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { useIsMobile } from '@/hooks/use-mobile'
import type { Client } from '@/data/domain'
import type { Vendor } from '@/services/api/vendors.api'

type PartnerFilter = 'ALL' | 'client' | 'vendor'

function toClientRow(c: Client): PartnerRow {
  return {
    id: c.id,
    name: c.name,
    partnerType: 'client',
    type: c.type,
    phone: c.phone,
    taxCode: c.taxCode ?? '',
    address: c.address ?? '',
    contactPerson: c.contactPerson ?? '',
  }
}

function toVendorRow(v: Vendor): PartnerRow {
  return {
    id: v.id,
    name: v.name,
    partnerType: 'vendor',
    type: v.type ?? 'company',
    phone: v.phone ?? '',
    taxCode: v.taxCode ?? '',
    address: v.address ?? '',
    contactPerson: v.contactPerson ?? '',
  }
}

export function DirectorPartners() {
  const toast = useToast()
  const isMobile = useIsMobile()
  const { data: clients = [], isLoading: clientsLoading } = useClients()
  const { data: vendors = [], isLoading: vendorsLoading } = useVendors()
  const createClient = useCreateClient()
  const deleteClient = useDeleteClient()
  const createVendor = useCreateVendor()
  const deleteVendor = useDeleteVendor()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<PartnerFilter>('ALL')
  const [selected, setSelected] = useState<PartnerRow | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<PartnerRow | null>(null)
  const [createType, setCreateType] = useState<'client' | 'vendor' | null>(null)

  const allPartners = useMemo(() => [
    ...clients.map(toClientRow),
    ...vendors.map(toVendorRow),
  ], [clients, vendors])

  const filtered = useMemo(() => {
    let list = allPartners
    if (filter === 'client') list = list.filter(p => p.partnerType === 'client')
    if (filter === 'vendor') list = list.filter(p => p.partnerType === 'vendor')
    if (search.trim()) {
      const q = search
      list = list.filter(p =>
        fuzzyMatch(p.name, q) ||
        fuzzyMatch(p.phone, q) ||
        fuzzyMatch(p.taxCode, q) ||
        fuzzyMatch(p.address, q) ||
        fuzzyMatch(p.contactPerson, q)
      )
    }
    return list
  }, [allPartners, filter, search])

  const counts = useMemo(() => ({
    ALL: allPartners.length,
    client: allPartners.filter(p => p.partnerType === 'client').length,
    vendor: allPartners.filter(p => p.partnerType === 'vendor').length,
  }), [allPartners])

  const handleDelete = useCallback(() => {
    if (!deleteConfirm) return
    const mutation = deleteConfirm.partnerType === 'client' ? deleteClient : deleteVendor
    mutation.mutate(deleteConfirm.id, {
      onSuccess: () => {
        toast.success('Đã xoá')
        setDeleteConfirm(null)
        setSelected(null)
      },
      onError: (err: unknown) => {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        toast.error('Không thể xoá', detail ?? `${deleteConfirm.name} có dữ liệu liên quan, không thể xoá.`)
      },
    })
  }, [deleteConfirm, deleteClient, deleteVendor, toast])

  const loading = clientsLoading || vendorsLoading

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
          {counts.ALL} đối tác
        </span>
        <button
          onClick={() => setCreateType('client')}
          className="btn-primary"
        >
          <Plus size={16} strokeWidth={2.25} />
          <span>Thêm đối tác</span>
        </button>
      </div>

      <SearchBar
        placeholder="Tìm kiếm đối tác..."
        value={search}
        onChange={setSearch}
      />

      <FilterPills<PartnerFilter>
        options={[
          { value: 'ALL', label: 'Tất cả', count: counts.ALL },
          { value: 'client', label: 'Khách hàng', count: counts.client },
          { value: 'vendor', label: 'Nhà thầu', count: counts.vendor },
        ]}
        value={filter}
        onChange={setFilter}
      />

      <PartnersTable
        partners={filtered}
        onRowClick={setSelected}
        loading={loading}
      />

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-1">
              <InfoRow
                icon={selected.partnerType === 'client' ? Building2 : Truck}
                label="Loại đối tác"
                value={selected.partnerType === 'client' ? 'Khách hàng' : 'Nhà thầu'}
              />
              <InfoRow
                icon={selected.type === 'company' ? Building2 : UserCircle}
                label="Loại hình"
                value={selected.type === 'company' ? 'Công ty' : 'Cá nhân'}
              />
              <InfoRow icon={Phone} label="Điện thoại" value={selected.phone || '—'} />
              <InfoRow label="Mã số thuế" value={selected.taxCode || '—'} />
              <InfoRow label="Địa chỉ" value={selected.address || '—'} />
              <InfoRow label="Người liên hệ" value={selected.contactPerson || '—'} noBorder />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setDeleteConfirm(selected); setSelected(null) }}
              className="flex-1"
              style={{ color: 'var(--theme-status-error)' }}
            >
              Xoá
            </Button>
            <Button variant="outline" onClick={() => setSelected(null)} className="flex-1">Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xoá {deleteConfirm?.partnerType === 'client' ? 'khách hàng' : 'nhà thầu'}?</DialogTitle></DialogHeader>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            {deleteConfirm?.name} sẽ bị xoá vĩnh viễn.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Huỷ</Button>
            <Button onClick={handleDelete} className="flex-1" style={{ background: 'var(--theme-status-error)', color: 'white' }}>Xoá</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create type picker */}
      <Dialog open={createType !== null} onOpenChange={() => setCreateType(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Thêm đối tác</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setCreateType('client')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg transition-all touch-manipulation"
              style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
            >
              <Building2 className="w-6 h-6" style={{ color: 'var(--theme-status-info)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Khách hàng</span>
            </button>
            <button
              onClick={() => setCreateType('vendor')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg transition-all touch-manipulation"
              style={{ background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-default)' }}
            >
              <Truck className="w-6 h-6" style={{ color: 'var(--theme-status-warning)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Nhà thầu</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create client dialog */}
      <CreateClientDialog
        open={createType === 'client'}
        onClose={() => setCreateType(null)}
        onConfirm={async (data) => {
          createClient.mutate(data, {
            onSuccess: () => {
              toast.success('Đã thêm khách hàng')
              setCreateType(null)
            },
          })
        }}
      />

      {/* Create vendor dialog */}
      <CreateVendorDialog
        open={createType === 'vendor'}
        onClose={() => setCreateType(null)}
        onConfirm={async (data) => {
          createVendor.mutate(data, {
            onSuccess: () => {
              toast.success('Đã thêm nhà thầu')
              setCreateType(null)
            },
          })
        }}
      />

      {/* FAB — mobile only */}
      {isMobile && createPortal(
        <button
          onClick={() => setCreateType('client')}
          className="fixed bottom-6 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 touch-manipulation"
          style={{ background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }}
        >
          <Plus className="w-6 h-6" />
        </button>,
        document.body,
      )}
    </div>
  )
}
