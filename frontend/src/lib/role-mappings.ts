import type { Role } from '@/data/domain'

/** Role colors for general use (director grouped with superadmin) */
export const ROLE_COLORS: Record<Role, { bg: string; color: string }> = {
  superadmin: { bg: 'var(--theme-status-info-light)', color: 'var(--theme-status-info)' },
  director: { bg: 'var(--theme-status-info-light)', color: 'var(--theme-status-info)' },
  accountant: { bg: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' },
  driver: { bg: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' },
}

/** Role colors for SuperAdmin dashboard (each role gets a unique color) */
export const SUPERADMIN_ROLE_COLORS: Record<Role, { bg: string; color: string }> = {
  superadmin: { bg: 'var(--theme-status-info-light)', color: 'var(--theme-status-info)' },
  director: { bg: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' },
  driver: { bg: 'var(--theme-status-success-light)', color: 'var(--theme-status-success)' },
  accountant: { bg: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' },
}

export const CREATABLE_ROLES: Role[] = ['driver', 'accountant', 'director']
