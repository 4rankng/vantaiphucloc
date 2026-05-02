import { Users } from 'lucide-react'
import { ROLE_LABELS } from '@/data/domain'
import { ROLE_ICONS } from '@/pages/superadmin/types'
import type { UserAccount } from '@/services/api/users.api'

const PHUC_LOC = 'Phúc Lộc'

export function UserCard({ user, onTap }: { user: UserAccount; onTap: () => void }) {
  const RoleIcon = ROLE_ICONS[user.role] ?? Users

  return (
    <button
      onClick={onTap}
      className="w-full text-left rounded-2xl p-3.5 transition-all active:scale-[0.98] touch-manipulation"
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-card)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--theme-brand-primary-light)' }}>
          <RoleIcon className="w-4 h-4" style={{ color: 'var(--theme-brand-primary)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--theme-text-primary)' }}>{user.fullName || user.username}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' }}>
              {ROLE_LABELS[user.role]}
            </span>
            {user.role === 'driver' && user.vendor !== PHUC_LOC && (
              <span className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                {user.vendor}
              </span>
            )}
            {user.tractorPlate && (
              <span className="text-xs font-mono font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                {user.tractorPlate}
              </span>
            )}
          </div>
        </div>
        {!user.isActive && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error-text)' }}>
            Ngưng
          </span>
        )}
      </div>
    </button>
  )
}
