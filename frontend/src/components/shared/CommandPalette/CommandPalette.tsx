import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, ArrowRight,
  LayoutDashboard, X,
} from 'lucide-react'

export interface CommandItem {
  id: string
  label: string
  description?: string
  icon?: ReactNode
  href?: string
  action?: () => void
  keywords?: string[]
  category?: string
}

export interface CommandPaletteProps {
  /** Whether the palette is open */
  open: boolean
  /** Close handler */
  onClose: () => void
  /** Additional commands beyond defaults */
  commands?: CommandItem[]
  /** Placeholder text */
  placeholder?: string
}

const DEFAULT_COMMANDS: CommandItem[] = [
  {
    id: 'dashboard',
    label: 'Tổng quan',
    description: 'Xem dashboard kế toán',
    icon: <LayoutDashboard className="h-4 w-4" />,
    href: '/accountant',
    keywords: ['dashboard', 'tong quan', 'home'],
    category: 'Navigation',
  },
]

export function CommandPalette({
  open,
  onClose,
  commands = [],
  placeholder = 'Tìm kiếm hoặc nhập lệnh...',
}: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const allCommands = useMemo(() => [...DEFAULT_COMMANDS, ...commands], [commands])

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands

    const q = query.toLowerCase()
    return allCommands.filter((cmd) => {
      const matchLabel = cmd.label.toLowerCase().includes(q)
      const matchDesc = cmd.description?.toLowerCase().includes(q)
      const matchKeywords = cmd.keywords?.some((kw) => kw.includes(q))
      return matchLabel || matchDesc || matchKeywords
    })
  }, [query, allCommands])

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {}
    filteredCommands.forEach((cmd) => {
      const cat = cmd.category ?? 'Other'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(cmd)
    })
    return groups
  }, [filteredCommands])

  // Focus input on open
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('')
       
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Reset selection when filtered list changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex(0)
  }, [query])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filteredCommands[selectedIndex]
        if (selected) {
          if (selected.href) {
            navigate(selected.href)
            onClose()
          } else if (selected.action) {
            selected.action()
            onClose()
          }
        }
      } else if (e.key === 'Escape') {
        onClose()
      }
    },
    [filteredCommands, selectedIndex, navigate, onClose]
  )

  // Handle click on command
  const handleSelect = useCallback(
    (cmd: CommandItem) => {
      if (cmd.href) {
        navigate(cmd.href)
        onClose()
      } else if (cmd.action) {
        cmd.action()
        onClose()
      }
    },
    [navigate, onClose]
  )

  // Scroll selected item into view
  useEffect(() => {
    const listEl = listRef.current
    if (!listEl) return
    const selectedEl = listEl.querySelector('[data-selected="true"]')
    selectedEl?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!open) return null

  let flatIndex = 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Palette */}
      <div
        className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-lg border shadow-2xl animate-fade-slide-up"
        style={{
          background: 'var(--theme-bg-secondary)',
          borderColor: 'var(--theme-border-default)',
        }}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--theme-border-default)' }}
        >
          <Search className="h-5 w-5 shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--theme-text-primary)' }}
          />
          <kbd
            className="hidden sm:inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-mono"
            style={{ borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-muted)' }}
          >
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="sm:hidden flex h-6 w-6 items-center justify-center rounded-full"
            style={{ background: 'var(--theme-bg-tertiary)' }}
          >
            <X className="h-3.5 w-3.5" style={{ color: 'var(--theme-text-muted)' }} />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                Không tìm thấy kết quả
              </p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, items]) => (
              <div key={category}>
                <p
                  className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  {category}
                </p>
                {items.map((cmd) => {
                  const isSelected = selectedIndex === flatIndex
                  const currentIndex = flatIndex
                  flatIndex++

                  return (
                    <button
                      key={cmd.id}
                      data-selected={isSelected}
                      onClick={() => handleSelect(cmd)}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{
                        background: isSelected
                          ? 'color-mix(in srgb, var(--theme-brand-primary) 8%, transparent)'
                          : 'transparent',
                      }}
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: isSelected
                            ? 'var(--theme-brand-primary)'
                            : 'var(--theme-bg-tertiary)',
                          color: isSelected ? '#fff' : 'var(--theme-text-muted)',
                        }}
                      >
                        {cmd.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--theme-text-primary)' }}
                        >
                          {cmd.label}
                        </p>
                        {cmd.description && (
                          <p
                            className="text-xs truncate"
                            style={{ color: 'var(--theme-text-muted)' }}
                          >
                            {cmd.description}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <ArrowRight
                          className="h-4 w-4 shrink-0"
                          style={{ color: 'var(--theme-brand-primary)' }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center justify-between px-4 py-2 text-[10px]"
          style={{
            borderTop: '1px solid var(--theme-border-default)',
            color: 'var(--theme-text-muted)',
          }}
        >
          <span>
            <kbd className="font-mono">↑↓</kbd> để chọn
          </span>
          <span>
            <kbd className="font-mono">Enter</kbd> để mở
          </span>
        </div>
      </div>
    </>
  )
}

// Hook to manage command palette state
// eslint-disable-next-line react-refresh/only-export-components
export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return { open, setOpen, toggle: () => setOpen((v) => !v), close: () => setOpen(false) }
}
