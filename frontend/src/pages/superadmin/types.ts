import { Truck, CircleDollarSign, LayoutDashboard, Shield, type LucideIcon } from 'lucide-react'
import type { Role } from '@/data/domain'

const PHUC_LOC = 'Phúc Lộc'

export interface UserAccount {
  id: string
  username: string
  fullName: string | null
  phone: string | null
  cccd: string | null
  email?: string
  role: Role
  vendor: string
  tractorPlate?: string
  active: boolean
  createdAt: string
}

export const ROLE_ICONS: Record<string, LucideIcon> = {
  superadmin: Shield,
  director: LayoutDashboard,
  driver: Truck,
  accountant: CircleDollarSign,
}

export function toUserAccount(obj: Record<string, unknown>): UserAccount {
  return {
    id: String(obj.id),
    username: obj.username as string,
    fullName: (obj.full_name as string) ?? null,
    phone: (obj.phone as string) ?? null,
    cccd: (obj.cccd as string) ?? null,
    email: obj.email as string | undefined,
    role: obj.role as Role,
    vendor: (obj.vendor as string) || PHUC_LOC,
    tractorPlate: obj.tractor_plate as string | undefined,
    active: obj.is_active as boolean,
    createdAt: obj.created_at as string,
  }
}
