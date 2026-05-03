/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import type { Role } from '@/data/domain'
import { api, setTokens, clearTokens } from '@/services/api/client'
import { subscribeToPush, isPushSupported, getPushSubscriptionStatus } from '@/lib/push-subscription'
import { startHealthMonitor, stopHealthMonitor } from '@/lib/network'

export interface UserInfo {
  id: string
  name: string
  role: Role
}

interface AuthContextType {
  user: UserInfo | null
  login: (username: string, password: string) => Promise<UserInfo | null>
  logout: () => void
  updateUser: (patch: Partial<Pick<UserInfo, 'name'>>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(() => {
    const saved = localStorage.getItem('ttransport_user')
    return saved ? JSON.parse(saved) : null
  })

  const login = useCallback(async (username: string, password: string): Promise<UserInfo | null> => {
    const res = await api.post('/auth/login', { username, password })
    const { access_token, refresh_token } = res.data
    const { id, username: userUsername, full_name, role } = res.data.user

    setTokens(access_token, refresh_token)

    const u: UserInfo = {
      id: String(id),
      name: full_name || userUsername,
      role,
    }
    localStorage.setItem('ttransport_user', JSON.stringify(u))
    setUser(u)
    if (role === 'driver') startHealthMonitor()
    return u
  }, [])

  const logout = useCallback(() => {
    api.post('/auth/logout').catch(() => {})
    clearTokens()
    stopHealthMonitor()
    setUser(null)
  }, [])

  const updateUser = useCallback((patch: Partial<Pick<UserInfo, 'name'>>) => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      localStorage.setItem('ttransport_user', JSON.stringify(next))
      return next
    })
  }, [])

  // Auto-subscribe to push on login — request permission if not yet decided, then subscribe
  useEffect(() => {
    if (!user || !isPushSupported()) return
    getPushSubscriptionStatus().then(async status => {
      if (status.subscribed) return
      // If permission already denied, nothing we can do silently
      if (Notification.permission === 'denied') return
      // Request permission (no-op if already granted), then subscribe
      subscribeToPush().catch(() => {})
    })
  }, [user])

  const value = useMemo(() => ({ user, login, logout, updateUser }), [user, login, logout, updateUser])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
