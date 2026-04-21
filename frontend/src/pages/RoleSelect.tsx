import { useAuth } from '@/contexts/AuthContext'
import { ROLE_LABELS } from '@/data/mockData'
import type { Role } from '@/data/mockData'

const roles: Role[] = ['director', 'dispatcher', 'accountant', 'driver']

export function RoleSelect() {
  const { login } = useAuth()
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg-primary)]">
      <div className="w-full max-w-sm mx-4 space-y-3">
        <h1 className="text-lg font-bold text-center text-[var(--theme-text-primary)]">TTransport</h1>
        <p className="text-xs text-center text-[var(--theme-text-muted)] mb-4">Chọn vai trò để tiếp tục</p>
        {roles.map(r => (
          <button
            key={r}
            onClick={() => login(r)}
            className="w-full py-3 px-4 rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-default)] text-sm font-semibold text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors active:scale-[0.98]"
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>
    </div>
  )
}
