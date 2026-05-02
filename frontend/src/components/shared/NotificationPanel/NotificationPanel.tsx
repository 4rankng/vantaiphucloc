import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Bell, CheckCircle, Wallet, UserPlus, Truck, ChevronRight, type LucideIcon } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api/client'
import { queryKeys } from '@/hooks/use-queries'

export interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  time: string
  read: boolean
}

// ─── Type config ──────────────────────────────────────────────────────────────

interface TypeConfig { icon: LucideIcon; color: string; bg: string }

const DEFAULT_CFG: TypeConfig = { icon: Bell, color: 'var(--theme-brand-primary)', bg: 'var(--theme-brand-primary-light)' }

const TYPE_MAP: Record<string, TypeConfig> = {
  work_order: { icon: CheckCircle, color: 'var(--theme-status-success)', bg: 'var(--theme-status-success-light)' },
  salary:     { icon: Wallet,      color: 'var(--theme-status-warning)', bg: 'var(--theme-status-warning-light)' },
  account:    { icon: UserPlus,    color: 'var(--theme-status-info)',    bg: 'var(--theme-status-info-light)' },
  trip:       { icon: Truck,       color: 'var(--theme-brand-primary)', bg: 'var(--theme-brand-primary-light)' },
}

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const now = Date.now()
    const diff = now - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Vừa xong'
    if (mins < 60) return `${mins} phút trước`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} giờ trước`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days} ngày trước`
    return d.toLocaleDateString('vi-VN')
  } catch {
    return iso
  }
}

// ─── Fetch hook ───────────────────────────────────────────────────────────────

function useNotificationsData() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const res = await api.get('/dashboard/notifications')
      const raw = Array.isArray(res.data) ? res.data : []
      return raw.map((n: Record<string, unknown>, i: number) => ({
        id: (n.id as string) || String(i),
        type: (n.type as string) || 'general',
        title: (n.title as string) || '',
        message: (n.message as string) || '',
        time: relativeTime(n.time as string || n.created_at as string || ''),
        read: !!n.read,
      })) as AppNotification[]
    },
    staleTime: 30_000,
    refetchInterval: 300_000, // 5 min fallback — SSE handles real-time
  })
}

// ─── Unread badge count hook (lightweight) ────────────────────────────────────

export function useUnreadCount() {
  const { data: notifications } = useNotificationsData()
  return notifications?.filter(n => !n.read).length ?? 0
}

// ─── NotificationPanel ────────────────────────────────────────────────────────

interface NotificationPanelProps {
  open: boolean
  onClose: () => void
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const { data: notifications = [], isLoading, refetch } = useNotificationsData()
  const qc = useQueryClient()
  const panelRef = useRef<HTMLDivElement>(null)
  const prevOpen = useRef(false)

  // Refetch when panel opens
  useEffect(() => {
    if (open && !prevOpen.current) refetch()
    prevOpen.current = open
  }, [open, refetch])

  // Close on backdrop click
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const unread = notifications.filter(n => !n.read).length

  const handleMarkAllRead = () => {
    qc.setQueryData<AppNotification[]>(queryKeys.notifications, old =>
      old?.map(n => ({ ...n, read: true })) ?? []
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="absolute right-0 top-0 bottom-0 w-full max-w-[400px] flex flex-col animate-slide-in"
        style={{ background: 'var(--theme-bg-primary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--theme-border-default)' }}>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold" style={{ color: 'var(--theme-text-primary)' }}>
              Thông báo
            </h2>
            {unread > 0 && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center" style={{ background: 'var(--theme-status-error)', color: '#fff' }}>
                {unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-semibold px-2 py-1 rounded-lg touch-manipulation"
                style={{ color: 'var(--theme-brand-primary)' }}
              >
                Đọc tất cả
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full touch-manipulation"
              style={{ background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-2xl" style={{ background: 'var(--theme-bg-secondary)' }}>
                  <div className="w-9 h-9 rounded-full animate-pulse" style={{ background: 'var(--theme-bg-tertiary)' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded animate-pulse w-3/4" style={{ background: 'var(--theme-bg-tertiary)' }} />
                    <div className="h-2.5 rounded animate-pulse w-full" style={{ background: 'var(--theme-bg-tertiary)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--theme-bg-secondary)' }}>
                <Bell className="w-7 h-7" style={{ color: 'var(--theme-text-muted)' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Không có thông báo</p>
              <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Thông báo mới sẽ xuất hiện ở đây</p>
            </div>
          ) : (
            <div className="p-3 space-y-1.5">
              {notifications.map(n => {
                const cfg = TYPE_MAP[n.type] ?? DEFAULT_CFG
                const Icon = cfg.icon
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 rounded-xl p-3 transition-colors touch-manipulation"
                    style={{
                      background: n.read ? 'transparent' : 'var(--theme-bg-secondary)',
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: cfg.bg }}
                    >
                      <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--theme-text-primary)' }}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: 'var(--theme-brand-primary)' }} />
                        )}
                      </div>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
                        {n.message}
                      </p>
                      <p className="text-[10px] mt-1 font-medium" style={{ color: 'var(--theme-text-muted)' }}>
                        {n.time}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2.5" style={{ borderColor: 'var(--theme-border-default)' }}>
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold touch-manipulation"
            style={{ color: 'var(--theme-text-muted)', background: 'var(--theme-bg-secondary)' }}
          >
            Đóng
            <ChevronRight className="w-3 h-3 rotate-90" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
