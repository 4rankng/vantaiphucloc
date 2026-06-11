/** Shared types and constants for Vendor inline-edit components. */

export { validateTaxCode } from '@/lib/validation'

export type VendorFormData = {
  name: string
  type: 'company' | 'individual'
  phone: string
  taxCode: string
  address: string
  contactPerson: string
}

export const EMPTY_VENDOR_FORM: VendorFormData = {
  name: '', type: 'company', phone: '', taxCode: '', address: '', contactPerson: '',
}

export type VendorFocusableField = 'name' | 'type' | 'phone' | 'address' | 'contactPerson' | 'taxCode' | null
