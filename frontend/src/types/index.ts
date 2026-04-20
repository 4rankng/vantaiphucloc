export type Role = 'director' | 'dispatcher' | 'accountant' | 'driver'

export const ROLE_LABELS: Record<Role, string> = {
  director: 'Giám đốc',
  dispatcher: 'Điều hành',
  accountant: 'Kế toán',
  driver: 'Tài xế',
}

export const ROLE_ICONS: Record<Role, string> = {
  director: '👔',
  dispatcher: '📋',
  accountant: '🧮',
  driver: '🚛',
}
