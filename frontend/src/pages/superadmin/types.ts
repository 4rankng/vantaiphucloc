import { Truck, CircleDollarSign, LayoutDashboard, type LucideIcon } from 'lucide-react'
import type { Role } from '@/data/domain'

const PHUC_LOC = 'Phúc Lộc'

export interface UserAccount {
  id: string
  username: string
  phone: string
  email?: string
  role: Role
  vendor: string
  tractorPlate?: string
  active: boolean
  createdAt: string
}

export const ROLE_ICONS: Record<string, LucideIcon> = {
  director: LayoutDashboard,
  driver: Truck,
  accountant: CircleDollarSign,
}

export function toUserAccount(obj: Record<string, unknown>): UserAccount {
  return {
    id: String(obj.id),
    username: obj.username as string,
    phone: obj.phone as string,
    email: obj.email as string | undefined,
    role: obj.role as Role,
    vendor: (obj.vendor as string) || PHUC_LOC,
    tractorPlate: obj.tractor_plate as string | undefined,
    active: obj.is_active as boolean,
    createdAt: obj.created_at as string,
  }
}
