import React, { useState, useCallback, type ReactNode } from 'react'
import {
  mockJobs, mockExpenses, mockDrivers,
  type Job, type ExpenseItem, type Driver
} from '@/data/mockData'

export interface Checkpoint {
  id: string
  label: string
  done: boolean
  timestamp: string | null
}

export interface Notification {
  id: string
  icon: string
  title: string
  message: string
  timestamp: string
  read: boolean
}

const DRIVER_ID = 'DRV-001'

const CHECKPOINT_TEMPLATES: Omit<Checkpoint, 'done' | 'timestamp'>[] = [
  { id: 'cp1', label: 'Nhận ca' },
  { id: 'cp2', label: 'Chụp container' },
  { id: 'cp3', label: 'Chụp giao hàng' },
  { id: 'cp4', label: 'Hạ bãi' },
]

const initialNotifications: Notification[] = [
  { id: 'ntf-1', icon: 'reject', title: 'Chi phí bị từ chối', message: 'Chi phí sửa chữa EXP-005 đã bị từ chối do thiếu ảnh biên lai.', timestamp: '2025-04-20T14:30:00Z', read: false },
  { id: 'ntf-2', icon: 'trip', title: 'Chuyến mới được giao', message: 'Bạn được giao chuyến JOB-001: Hải Phòng → Mộc Châu, Sơn La.', timestamp: '2025-04-20T06:00:00Z', read: false },
  { id: 'ntf-3', icon: 'license', title: 'GPLX sắp hết hạn', message: 'Giấy phép lái xe của bạn sẽ hết hạn vào 15/05/2025. Vui lòng gia hạn.', timestamp: '2025-04-19T09:00:00Z', read: false },
  { id: 'ntf-4', icon: 'approve', title: 'Chi phí đã duyệt', message: 'Chi phí dầu EXP-004 đã được duyệt (520k VNĐ).', timestamp: '2025-04-19T16:00:00Z', read: true },
  { id: 'ntf-5', icon: 'star', title: 'Đánh giá chuyến', message: 'Chuyến JOB-005 đã được khách hàng đánh giá 5 sao.', timestamp: '2025-04-18T18:00:00Z', read: true },
]

export interface DriverStore {
  driver: Driver
  jobs: Job[]
  expenses: ExpenseItem[]
  checkpoints: Record<string, Checkpoint[]>
  notifications: Notification[]
  unreadCount: number
  toggleCheckpoint: (jobId: string, cpId: string) => void
  addExpense: (e: Omit<ExpenseItem, 'id' | 'status' | 'date' | 'driverName' | 'tractorPlate'>) => void
  navigate: (path: string) => void
  goBack: () => void
  currentPath: string
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  updateJobStatus: (jobId: string, status: Job['status']) => void
}

const StoreContext = React.createContext<DriverStore | null>(null)

export function DriverStoreProvider({ children }: { children: ReactNode }) {
  const [currentPath, setCurrentPath] = useState('/driver')
  const [history, setHistory] = useState<string[]>(['/driver'])
  const driver = mockDrivers.find(d => d.id === DRIVER_ID)!
  const [jobs, setJobs] = useState<Job[]>(mockJobs.filter(j => j.driverId === DRIVER_ID))
  const [expenses, setExpenses] = useState<ExpenseItem[]>(
    mockExpenses.filter(e => e.driverName === driver.name)
  )
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [checkpoints, setCheckpoints] = useState<Record<string, Checkpoint[]>>(() => {
    const m: Record<string, Checkpoint[]> = {}
    jobs.filter(j => j.status === 'IN_PROGRESS').forEach(j => {
      m[j.id] = CHECKPOINT_TEMPLATES.map(c => ({ ...c, done: false, timestamp: null }))
    })
    return m
  })

  const unreadCount = notifications.filter(n => !n.read).length

  const toggleCheckpoint = useCallback((jobId: string, cpId: string) => {
    setCheckpoints(prev => {
      const cps = prev[jobId] ?? CHECKPOINT_TEMPLATES.map(c => ({ ...c, done: false, timestamp: null }))
      const updated = cps.map(cp =>
        cp.id === cpId ? { ...cp, done: !cp.done, timestamp: !cp.done ? new Date().toISOString() : null } : cp
      )
      // If last checkpoint done, mark job completed
      const allDone = updated.every(c => c.done)
      if (allDone) {
        setJobs(js => js.map(j => j.id === jobId ? { ...j, status: 'COMPLETED' as const } : j))
      }
      return { ...prev, [jobId]: updated }
    })
  }, [])

  const updateJobStatus = useCallback((jobId: string, status: Job['status']) => {
    setJobs(js => js.map(j => j.id === jobId ? { ...j, status } : j))
  }, [])

  const addExpense = useCallback((e: Omit<ExpenseItem, 'id' | 'status' | 'date' | 'driverName' | 'tractorPlate'>) => {
    setExpenses(prev => [
      ...prev,
      {
        ...e,
        id: 'EXP-' + String(prev.length + 1).padStart(3, '0'),
        status: 'DRAFT' as const,
        date: new Date().toISOString().split('T')[0],
        driverName: driver.name,
        tractorPlate: driver.tractorPlate,
      },
    ])
  }, [driver])

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const navigate = useCallback((path: string) => {
    setCurrentPath(path)
    setHistory(prev => [...prev, path])
    window.scrollTo(0, 0)
  }, [])

  const goBack = useCallback(() => {
    setHistory(prev => {
      if (prev.length <= 1) return prev
      const next = prev.slice(0, -1)
      setCurrentPath(next[next.length - 1])
      window.scrollTo(0, 0)
      return next
    })
  }, [])

  return (
    <StoreContext.Provider value={{ driver, jobs, expenses, checkpoints, notifications, unreadCount, toggleCheckpoint, addExpense, navigate, goBack, currentPath, markNotificationRead, markAllNotificationsRead, updateJobStatus }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useDriverStore() {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error('useDriverStore must be within DriverStoreProvider')
  return ctx
}
