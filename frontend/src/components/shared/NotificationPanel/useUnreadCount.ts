import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api/client'
import { queryKeys } from '@/hooks/use-queries'

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
      }))
    },
    staleTime: 30_000,
    refetchInterval: 300_000,
  })
}

export function useUnreadCount() {
  const { data: notifications } = useNotificationsData()
  return notifications?.filter(n => !n.read).length ?? 0
}
