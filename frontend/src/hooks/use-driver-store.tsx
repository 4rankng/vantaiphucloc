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

const DRIVER_ID = 'DRV-001'

const CHECKPOINT_TEMPLATES: Omit<Checkpoint, 'done' | 'timestamp'>[] = [
  { id: 'cp1', label: 'Nhận ca' },
  { id: 'cp2', label: 'Chụp container' },
  { id: 'cp3', label: 'Chụp giao hàng' },
  { id: 'cp4', label: 'Hạ bãi' },
]

export interface DriverStore {
  driver: Driver
  jobs: Job[]
  expenses: ExpenseItem[]
  checkpoints: Record<string, Checkpoint[]>
  toggleCheckpoint: (jobId: string, cpId: string) => void
  addExpense: (e: Omit<ExpenseItem, 'id' | 'status' | 'date' | 'driverName' | 'tractorPlate'>) => void
  navigate: (path: string) => void
  currentPath: string
}

const StoreContext = React.createContext<DriverStore | null>(null)

export function DriverStoreProvider({ children }: { children: ReactNode }) {
  const [currentPath, setCurrentPath] = useState('/driver/trips')
  const driver = mockDrivers.find(d => d.id === DRIVER_ID)!
  const [jobs] = useState<Job[]>(mockJobs.filter(j => j.driverId === DRIVER_ID))
  const [expenses, setExpenses] = useState<ExpenseItem[]>(
    mockExpenses.filter(e => e.driverName === driver.name)
  )
  const [checkpoints, setCheckpoints] = useState<Record<string, Checkpoint[]>>(() => {
    const m: Record<string, Checkpoint[]> = {}
    jobs.filter(j => j.status === 'IN_PROGRESS').forEach(j => {
      m[j.id] = CHECKPOINT_TEMPLATES.map(c => ({ ...c, done: false, timestamp: null }))
    })
    return m
  })

  const toggleCheckpoint = useCallback((jobId: string, cpId: string) => {
    setCheckpoints(prev => {
      const cps = prev[jobId] ?? CHECKPOINT_TEMPLATES.map(c => ({ ...c, done: false, timestamp: null }))
      return {
        ...prev,
        [jobId]: cps.map(cp =>
          cp.id === cpId ? { ...cp, done: !cp.done, timestamp: !cp.done ? new Date().toISOString() : null } : cp
        ),
      }
    })
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

  const navigate = useCallback((path: string) => setCurrentPath(path), [])

  return (
    <StoreContext.Provider value={{ driver, jobs, expenses, checkpoints, toggleCheckpoint, addExpense, navigate, currentPath }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useDriverStore() {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error('useDriverStore must be within DriverStoreProvider')
  return ctx
}
