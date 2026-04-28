import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Role } from '@/data/mockData'
import { mockDrivers } from '@/data/mockData'
import { api } from '@/services/api/client'

export interface UserInfo {
  id: string
  name: string
  role: Role
  companyId?: number
}

interface AuthContextType {
  user: UserInfo | null
  /** Real login: POST /auth/login with phone + password, stores JWT in localStorage */
  login: (phone: string, password: string) => Promise<boolean>
  /** Sandbox/dev shortcut: log in as a role without a real backend */
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

function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('ttransport_user')
  localStorage.removeItem('ttransport_role')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(() => {
    const saved = localStorage.getItem('ttransport_user')
    return saved ? JSON.parse(saved) : null
  })

  // Listen for 401 responses from the Axios interceptor and log the user out.
  // The interceptor in client.ts rejects with an ApiError whose `type` is 'auth'
  // and `statusCode` is 401. We intercept at the response level here.
  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      response => response,
      (error) => {
        // error is already transformed to ApiError by client.ts interceptor,
        // but the original axios error is also available via error.response
        const status = error?.statusCode ?? error?.response?.status
        if (status === 401) {
          clearAuth()
          setUser(null)
        }
        return Promise.reject(error)
      },
    )
    return () => {
      api.interceptors.response.eject(interceptorId)
    }
  }, [])

  /**
   * Real login: calls POST /api/v1/auth/login, stores the JWT under key `token`,
   * and sets the user state from the JWT payload fields returned by the backend.
   * Returns true on success, false on failure.
   */
  const login = async (phone: string, password: string): Promise<boolean> => {
    try {
      const res = await api.post('/auth/login', { phone, password })
      const { access_token, role, id, name, company_id } = res.data as {
        access_token: string
        token_type: string
        role: Role
        id: number | string
        name: string
        company_id: number
      }

      // Store JWT so the Axios request interceptor picks it up automatically
      localStorage.setItem('token', access_token)

      const u: UserInfo = {
        id: String(id),
        name,
        role,
        companyId: company_id,
      }
      localStorage.setItem('ttransport_user', JSON.stringify(u))
      localStorage.setItem('ttransport_role', role)
      setUser(u)
      return true
    } catch {
      return false
    }
  }

  /**
   * Sandbox/dev shortcut — sets user state without a real backend call.
   * Useful during development when the backend is not running.
   */
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
    clearAuth()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, loginAs, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
