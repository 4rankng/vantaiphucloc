import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Role } from '@/data/domain'
import { api, setTokens, clearTokens } from '@/services/api/client'

export interface UserInfo {
  id: string
  name: string
  role: Role
  companyId?: number
  companyName?: string
}

interface AuthContextType {
  user: UserInfo | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(() => {
    const saved = localStorage.getItem('ttransport_user')
    return saved ? JSON.parse(saved) : null
  })

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await api.post('/auth/login', { username, password })
      const { access_token, refresh_token } = res.data
      const { id, username: name, role, company_id, company_name } = res.data.user

      setTokens(access_token, refresh_token)

      const u: UserInfo = {
        id: String(id),
        name,
        role,
        companyId: company_id ?? undefined,
        companyName: company_name ?? undefined,
      }
      localStorage.setItem('ttransport_user', JSON.stringify(u))
      setUser(u)
      return true
    } catch {
      return false
    }
  }, [])

  const logout = useCallback(() => {
    api.post('/auth/logout').catch(() => {})
    clearTokens()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
