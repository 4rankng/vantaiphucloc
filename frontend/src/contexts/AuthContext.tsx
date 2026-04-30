/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import type { Role } from '@/data/domain'
import { api, setTokens, clearTokens } from '@/services/api/client'
import { subscribeToPush, isPushSupported, getPushSubscriptionStatus } from '@/lib/push-subscription'

export interface UserInfo {
  id: string
  name: string
  role: Role
}

interface AuthContextType {
  user: UserInfo | null
  login: (username: string, password: string) => Promise<UserInfo | null>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(() => {
    const saved = localStorage.getItem('ttransport_user')
    return saved ? JSON.parse(saved) : null
  })

  const login = useCallback(async (username: string, password: string): Promise<UserInfo | null> => {
    try {
      const res = await api.post('/auth/login', { username, password })
      const { access_token, refresh_token } = res.data
      const { id, username: name, role } = res.data.user

      setTokens(access_token, refresh_token)

      const u: UserInfo = {
        id: String(id),
        name,
        role,
      }
      localStorage.setItem('ttransport_user', JSON.stringify(u))
      setUser(u)
      return u
    } catch {
      return null
    }
  }, [])

  const logout = useCallback(() => {
    api.post('/auth/logout').catch(() => {})
    clearTokens()
    setUser(null)
  }, [])

  // Auto-subscribe to push notifications after login
  useEffect(() => {
    if (!user || !isPushSupported()) return
    getPushSubscriptionStatus().then(status => {
      if (!status.subscribed && Notification.permission === 'granted') {
        subscribeToPush().catch(() => {})
      }
    })
  }, [user])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])

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
