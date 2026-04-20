import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Role } from '@/types'

interface AuthContextType {
  role: Role | null
  setRole: (role: Role) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(() => {
    return localStorage.getItem('ttransport_role') as Role | null
  })

  const setRole = (role: Role) => {
    localStorage.setItem('ttransport_role', role)
    setRoleState(role)
  }

  const logout = () => {
    localStorage.removeItem('ttransport_role')
    setRoleState(null)
  }

  return (
    <AuthContext.Provider value={{ role, setRole, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
