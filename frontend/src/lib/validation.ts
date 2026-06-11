/**
 * Shared validation patterns and utilities.
 *
 * Vietnamese tax codes are 10 or 13 digits (MST / Mã số thuế).
 * Used by both Client and Vendor form validation.
 */
export const VN_TAX_RE = /^\d{10}(\d{3})?$/

/** Validate a Vietnamese tax code. Returns an error message or undefined. */
export function validateTaxCode(value: string | undefined | null): string | undefined {
  if (!value) return undefined
  return VN_TAX_RE.test(value) ? undefined : 'MST không hợp lệ'
}
