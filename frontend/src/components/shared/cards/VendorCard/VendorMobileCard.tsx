import { memo } from 'react'
import { Truck, Pencil, Trash2 } from 'lucide-react'
import type { Vendor } from '@/data/domain'

interface VendorMobileCardProps {
  vendor: Vendor
  onEdit: () => void
  onDelete: () => void
}

export const VendorMobileCard = memo(function VendorMobileCard({ vendor, onEdit, onDelete }: VendorMobileCardProps) {
  const isCompany = vendor.type === 'company'
  return (
    <div
      onClick={onEdit}
      className="p-4 rounded-xl border flex flex-col gap-3 transition-colors active:scale-[0.99] touch-manipulation cursor-pointer"
      style={{
        background: 'var(--theme-bg-secondary, #ffffff)',
        borderColor: 'var(--theme-border-default, #e4e4e7)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: isCompany ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--surface-3)',
              color: isCompany ? 'var(--accent)' : 'var(--ink-3)',
            }}
          >
            <Truck className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1 leading-normal">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                {vendor.name}
              </span>
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
              >
                {vendor.type === 'company' ? 'Công ty' : 'Cá nhân'}
              </span>
            </div>
            {vendor.phone && (
              <a
                href={`tel:${vendor.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-medium block mt-1 hover:underline tabular-nums"
                style={{ color: 'var(--accent)' }}
              >
                {vendor.phone}
              </a>
            )}
            {vendor.address && (
              <p className="text-xs mt-1 truncate" style={{ color: 'var(--ink-2)' }}>
                {vendor.address}
              </p>
            )}
            {vendor.contactPerson && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-2)' }}>
                LH: {vendor.contactPerson}
              </p>
            )}
            {vendor.taxCode && (
              <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: 'var(--ink-3)' }}>
                MST: {vendor.taxCode}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="w-9 h-9 flex items-center justify-center rounded-lg border touch-target"
            style={{ borderColor: 'var(--theme-border-default)', color: 'var(--ink-2)' }}
            title="Sửa"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="w-9 h-9 flex items-center justify-center rounded-lg border touch-target"
            style={{ borderColor: 'var(--theme-border-default)', color: 'var(--theme-status-error, #E32434)' }}
            title="Xoá"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
})
