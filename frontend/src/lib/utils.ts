import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isCompany(entity: { name?: string; type?: string }): boolean {
  const n = entity.name?.toLowerCase() ?? ''
  return n.includes('công ty') || n.includes('tnhh') || n.includes('co.') || n.includes('corp') || entity.type === 'company'
}
