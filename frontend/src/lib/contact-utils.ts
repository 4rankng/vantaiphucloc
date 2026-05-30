import type { Client, Vendor } from '@/data/domain'
import type { ContactRow } from '@/components/shared/data-display/ContactsTable'

export function toClientRow(c: Client): ContactRow {
  return { id: c.id, name: c.name, partnerType: 'client', type: 'company', phone: c.phone ?? '', taxCode: c.taxCode ?? '', address: c.address ?? '', contactPerson: c.contactPerson ?? '' }
}

export function toVendorRow(v: Vendor): ContactRow {
  return { id: v.id, name: v.name, partnerType: 'vendor', type: 'company', phone: v.phone ?? '', taxCode: v.taxCode ?? '', address: v.address ?? '', contactPerson: v.contactPerson ?? '' }
}
