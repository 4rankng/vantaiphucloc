import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Role } from '@/data/mockData'
import { mockDrivers } from '@/data/mockData'

export interface UserInfo {
  id: string
  name: string
  role: Role
}

interface AuthContextType {
  user: UserInfo | null
  login: (username: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(() => {
    const saved = localStorage.getItem('ttransport_user')
    return saved ? JSON.parse(saved) : null
  })

  const login = (username: string, password: string): boolean => {
    if (username === 'driver' && password === 'driver') {
      const d = mockDrivers[0]
      const u: UserInfo = { id: d.id, name: d.name, role: 'driver' as Role }
      localStorage.setItem('ttransport_user', JSON.stringify(u))
      localStorage.setItem('ttransport_role', 'driver')
      setUser(u)
      return true
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem('ttransport_user')
    localStorage.removeItem('ttransport_role')
    setUser(null)
  }

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
