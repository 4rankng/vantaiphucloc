// DEPRECATED: Vendor merged into Partner.
// This file re-exports from partners.api.ts for backward compatibility.
// Update imports to use partners.api.ts directly.

export type { PartnerType as VendorType } from '@/data/domain'

export interface Vendor {
  id: number
  name: string
  type?: 'company' | 'individual'
  phone?: string
  taxCode?: string
  address?: string
  contactPerson?: string
  createdAt: string
  updatedAt: string
}

export type VendorFormData = {
  name: string
  type?: 'company' | 'individual'
  phone?: string
  taxCode?: string
  address?: string
  contactPerson?: string
}

export {
  getPartners as getVendors,
  createPartner as createVendor,
  updatePartner as updateVendor,
  deletePartner as deleteVendor,
} from './partners.api'
