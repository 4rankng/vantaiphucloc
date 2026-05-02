import { Users, Phone, ChevronRight } from 'lucide-react'
import { ROLE_LABELS, type Role } from '@/data/domain'
import { ROLE_ICONS } from '@/pages/superadmin/types'
import type { UserAccount } from '@/services/api/users.api'

const PHUC_LOC = 'Phúc Lộc'

const ROLE_COLORS: Record<Role, { bg: string; color: string }> = {
  superadmin: { bg: 'var(--theme-status-info-light)', color: 'var(--theme-status-info)' },
  director: { bg: 'var(--theme-brand-primary-light)', color: 'var(--theme-brand-primary)' },
  driver: { bg: 'var(--theme-status-success-light)', color: 'var(--theme-status-success)' },
  accountant: { bg: 'var(--theme-status-warning-light)', color: 'var(--theme-status-warning)' },
}

export function UserCard({ user, onTap }: { user: UserAccount; onTap: () => void }) {
  const RoleIcon = ROLE_ICONS[user.role] ?? Users
  const roleColors = ROLE_COLORS[user.role]

  return (
    <button
      onClick={onTap}
      className="group w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98] hover:shadow-md touch-manipulation"
      style={{
        background: 'var(--theme-bg-secondary)',
        boxShadow: 'var(--theme-shadow-sm)',
        border: '1px solid var(--theme-border-default)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: roleColors.bg }}
        >
          <RoleIcon className="w-5 h-5" style={{ color: roleColors.color }} />
        </div>
        
        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--theme-text-primary)' }}>
              {user.fullName || user.username}
            </p>
            {!user.isActive && (
              <span 
                className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: 'var(--theme-status-error-light)', color: 'var(--theme-status-error-text)' }}
              >
                Ngưng
              </span>
            )}
          </div>
          
          {/* Role badge */}
          <div className="flex items-center gap-2 mt-1.5">
            <span 
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: roleColors.bg, color: roleColors.color }}
            >
              {ROLE_LABELS[user.role]}
            </span>
            {user.role === 'driver' && user.vendor !== PHUC_LOC && (
              <span className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                {user.vendor}
              </span>
            )}
          </div>
          
          {/* Extra info */}
          <div className="flex items-center gap-3 mt-2">
            {user.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3" style={{ color: 'var(--theme-text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                  {user.phone}
                </span>
              </div>
            )}
            {user.tractorPlate && (
              <span 
                className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded"
                style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-secondary)' }}
              >
                {user.tractorPlate}
              </span>
            )}
          </div>
        </div>
        
        {/* Arrow */}
        <ChevronRight 
          className="w-5 h-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" 
          style={{ color: 'var(--theme-text-muted)' }}
        />
      </div>
    </button>
  )
}
