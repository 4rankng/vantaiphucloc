import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isCompany(entity: { name?: string; type?: string }): boolean {
  const n = entity.name?.toLowerCase() ?? ''
  return n.includes('công ty') || n.includes('tnhh') || n.includes('co.') || n.includes('corp')
    || n.includes('vận tải') || n.includes('xí nghiệp') || n.includes('doanh nghiệp')
    || n.includes('dịch vụ') || n.includes('thương mại') || n.includes('cp.') || n.includes('jsc')
    || entity.type === 'company'
}
