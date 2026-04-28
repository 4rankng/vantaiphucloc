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
  loginAs: (role: Role) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const ROLE_USERS: Record<string, Omit<UserInfo, 'role'>> = {
  superadmin: { id: 'SA-001', name: 'SuperAdmin' },
  director: { id: 'DIR-001', name: 'Giám đốc' },
  accountant: { id: 'ACC-001', name: 'Kế toán' },
  driver: { id: 'DRV-001', name: 'Nguyễn Văn Hùng' },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(() => {
    const saved = localStorage.getItem('ttransport_user')
    return saved ? JSON.parse(saved) : null
  })

  const loginAs = (role: Role) => {
    const base = role === 'driver'
      ? { id: mockDrivers[0].id, name: mockDrivers[0].name }
      : ROLE_USERS[role]
    const u: UserInfo = { ...base, role }
    localStorage.setItem('ttransport_user', JSON.stringify(u))
    localStorage.setItem('ttransport_role', role)
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem('ttransport_user')
    localStorage.removeItem('ttransport_role')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loginAs, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
