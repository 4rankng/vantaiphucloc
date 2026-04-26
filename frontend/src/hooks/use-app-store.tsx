import React, { useState, useCallback, useContext, type ReactNode } from 'react'

export interface AppStore {
  currentPath: string
  navigate: (path: string) => void
  goBack: () => void
}

const StoreContext = React.createContext<AppStore | null>(null)

export function AppStoreProvider({ initialPath, children }: { initialPath: string; children: ReactNode }) {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [history, setHistory] = useState<string[]>([initialPath])

  const navigate = useCallback((path: string) => {
    setCurrentPath(prev => {
      if (prev === path) return prev
      setHistory(h => [...h, path])
      return path
    })
  }, [])

  const goBack = useCallback(() => {
    setHistory(h => {
      if (h.length <= 1) return h
      const next = h.slice(0, -1)
      setCurrentPath(next[next.length - 1])
      return next
    })
  }, [])

  return (
    <StoreContext.Provider value={{ currentPath, navigate, goBack }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useAppStore(): AppStore {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx
}
