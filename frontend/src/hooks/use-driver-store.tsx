import React, { useState, useCallback, type ReactNode } from 'react'
import { mockDrivers, type Driver } from '@/data/mockData'

const DRIVER_ID = 'DRV-001'

export interface DriverStore {
  driver: Driver
  navigate: (path: string) => void
  goBack: () => void
  currentPath: string
}

const StoreContext = React.createContext<DriverStore | null>(null)

export function DriverStoreProvider({ children }: { children: ReactNode }) {
  const [currentPath, setCurrentPath] = useState('/driver')
  const [history, setHistory] = useState<string[]>(['/driver'])
  const driver = mockDrivers.find(d => d.id === DRIVER_ID)!

  const navigate = useCallback((path: string) => {
    setCurrentPath(path)
    setHistory(prev => [...prev, path])
  }, [])

  const goBack = useCallback(() => {
    setHistory(prev => {
      if (prev.length <= 1) return prev
      const next = prev.slice(0, -1)
      setCurrentPath(next[next.length - 1])
      return next
    })
  }, [])

  return (
    <StoreContext.Provider value={{ driver, navigate, goBack, currentPath }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useDriverStore() {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error('useDriverStore must be within DriverStoreProvider')
  return ctx
}
