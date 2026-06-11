import { memo } from 'react'
import { Trash2 } from 'lucide-react'
import type { Vendor } from '@/data/domain'
import type { VendorFocusableField } from './types'

interface VendorRowProps {
  vendor: Vendor
  onEdit: (field: VendorFocusableField) => void
  onDelete: () => void
}

export const VendorRow = memo(function VendorRow({ vendor, onEdit, onDelete }: VendorRowProps) {
  const cell = (field: VendorFocusableField) => (e: React.MouseEvent) => { e.stopPropagation(); onEdit(field) }
  return (
    <tr className="cursor-pointer group">
      <td onClick={cell('name')}>
        <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{vendor.name}</span>
      </td>
      <td onClick={cell('type')}>
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}>
          {vendor.type === 'company' ? 'Công ty' : 'Cá nhân'}
        </span>
      </td>
      <td onClick={cell('phone')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{vendor.phone || '—'}</span>
      </td>
      <td onClick={cell('address')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)', whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 220 }}>{vendor.address || '—'}</span>
      </td>
      <td onClick={cell('contactPerson')}>
        <span className="text-[13px]" style={{ color: 'var(--ink-2)' }}>{vendor.contactPerson || '—'}</span>
      </td>
      <td onClick={cell('taxCode')}>
        <span className="text-[13px] tabular-nums" style={{ color: 'var(--ink-2)' }}>{vendor.taxCode || '—'}</span>
      </td>
      <td style={{ width: 32 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity"
          style={{ width: 24, height: 24, color: 'var(--ink-3)' }}
          title="Xoá"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
})
