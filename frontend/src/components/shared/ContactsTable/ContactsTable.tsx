import { Phone, MapPin, User } from 'lucide-react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils'

export interface ContactRow extends Record<string, unknown> {
  id: number
  name: string
  partnerType: 'client' | 'vendor'
  type: 'company' | 'individual'
  phone: string
  taxCode: string
  address: string
  contactPerson: string
}

interface ContactsTableProps {
  contacts: ContactRow[]
  onRowClick: (contact: ContactRow) => void
  loading?: boolean
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/)
  const letters = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : name.slice(0, 2)
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0 select-none"
      style={{ background: 'var(--theme-brand-primary-light, color-mix(in srgb, var(--theme-brand-primary) 12%, transparent))', color: 'var(--theme-brand-primary)' }}
    >
      {letters.toUpperCase()}
    </div>
  )
}

export function ContactsTable({ contacts, onRowClick, loading }: ContactsTableProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--theme-border-default)] bg-[var(--theme-bg-secondary)] overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--theme-border-default)] last:border-0 animate-pulse">
            <div className="w-9 h-9 rounded-xl bg-[var(--theme-bg-tertiary)]" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-40 rounded bg-[var(--theme-bg-tertiary)]" />
              <div className="h-3 w-24 rounded bg-[var(--theme-bg-tertiary)]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (contacts.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--theme-border-default)] bg-[var(--theme-bg-secondary)] py-16 text-center text-sm text-[var(--theme-text-muted)]">
        Không có đối tác
      </div>
    )
  }

  return (
    <div className="rounded-[var(--theme-radius-lg,10px)] border border-[var(--theme-border-default)] bg-[var(--theme-bg-secondary)] overflow-hidden">
      {/* Header */}
      <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr] gap-4 px-5 py-3" style={{ borderBottom: '1px solid var(--theme-border-light, var(--theme-border-default))' }}>
        {['Tên', 'Loại đối tác', 'Điện thoại', 'Địa chỉ', 'Người liên hệ'].map(h => (
          <span key={h} className="text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--theme-text-muted)' }}>
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {contacts.map((row, i) => (
        <div
          key={row.id}
          onClick={() => onRowClick(row)}
          className={cn(
            'flex lg:grid lg:grid-cols-[2fr_1fr_1fr_1.5fr_1fr] items-center gap-4 px-5 py-3.5',
            'cursor-pointer transition-colors hover:bg-[var(--theme-bg-tertiary)]',
          )}
          style={{ borderBottom: i < contacts.length - 1 ? '1px solid var(--theme-border-light, var(--theme-border-default))' : undefined }}
        >
          {/* Name + initials */}
          <div className="flex items-center gap-3 min-w-0">
            <Initials name={row.name} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--theme-text-primary)] truncate">{row.name}</p>
              {row.taxCode && (
                <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">MST: {row.taxCode}</p>
              )}
            </div>
          </div>

          {/* Partner type badge */}
          <div className="hidden lg:flex items-center">
            <StatusBadge
              variant={row.partnerType === 'client' ? 'info' : 'warning'}
              label={row.partnerType === 'client' ? 'Khách hàng' : 'Nhà thầu'}
              size="sm"
            />
          </div>

          {/* Phone */}
          <div className="hidden lg:flex items-center gap-1.5 text-sm text-[var(--theme-text-secondary)]">
            {row.phone ? (
              <>
                <Phone size={13} className="shrink-0 text-[var(--theme-text-muted)]" />
                {row.phone}
              </>
            ) : (
              <span className="text-[var(--theme-text-muted)]">—</span>
            )}
          </div>

          {/* Address */}
          <div className="hidden lg:flex items-start gap-1.5 text-sm text-[var(--theme-text-secondary)]">
            {row.address ? (
              <>
                <MapPin size={13} className="shrink-0 mt-0.5 text-[var(--theme-text-muted)]" />
                <span className="line-clamp-2 leading-snug">{row.address}</span>
              </>
            ) : (
              <span className="text-[var(--theme-text-muted)]">—</span>
            )}
          </div>

          {/* Contact person */}
          <div className="hidden lg:flex items-center gap-1.5 text-sm text-[var(--theme-text-secondary)]">
            {row.contactPerson ? (
              <>
                <User size={13} className="shrink-0 text-[var(--theme-text-muted)]" />
                {row.contactPerson}
              </>
            ) : (
              <span className="text-[var(--theme-text-muted)]">—</span>
            )}
          </div>

          {/* Mobile: compact secondary info */}
          <div className="flex lg:hidden flex-col gap-1 ml-auto items-end shrink-0">
            <StatusBadge
              variant={row.partnerType === 'client' ? 'info' : 'warning'}
              label={row.partnerType === 'client' ? 'Khách hàng' : 'Nhà thầu'}
              size="sm"
            />
            {row.phone && (
              <span className="text-xs text-[var(--theme-text-muted)]">{row.phone}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
