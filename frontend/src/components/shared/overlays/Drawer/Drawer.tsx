import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

export interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Accessible title (also rendered visually unless titleHidden). */
  title: React.ReactNode
  /** Visually hide the title (still announced to AT). */
  titleHidden?: boolean
  /** Optional breadcrumb-style label above the title. */
  breadcrumb?: React.ReactNode
  /** Optional small monospace meta below the title (e.g. an ID). */
  meta?: React.ReactNode
  /** Footer slot — typically Cancel + primary buttons. */
  footer?: React.ReactNode
  /** Width of the drawer. Defaults to '580px'. */
  width?: string
  children: React.ReactNode
}

export function Drawer({
  open,
  onOpenChange,
  title,
  titleHidden = false,
  breadcrumb,
  meta,
  footer,
  width = '580px',
  children,
}: DrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 transition-opacity duration-200 data-[state=open]:opacity-100 data-[state=closed]:opacity-0"
          style={{
            background: 'rgba(10, 10, 10, 0.4)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        />
        <DialogPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 flex flex-col outline-none data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full transition-transform duration-250"
          style={{
            width: `min(100vw, ${width})`,
            background: 'var(--surface)',
            boxShadow: 'var(--sh-drawer)',
          }}
        >
          {/* Header */}
          <header
            className="flex items-start justify-between gap-3 px-6 pb-4 shrink-0"
            style={{
              paddingTop: 'max(20px, env(safe-area-inset-top, 0px))',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div className="min-w-0 flex-1">
              {breadcrumb && (
                <p
                  className="m-0 mb-1 uppercase font-semibold"
                  style={{
                    fontSize: '11.5px',
                    letterSpacing: '0.08em',
                    color: 'var(--ink-3)',
                  }}
                >
                  {breadcrumb}
                </p>
              )}
              <DialogPrimitive.Title
                className={titleHidden ? 'sr-only' : 'm-0 flex items-center justify-between gap-2'}
                style={
                  titleHidden
                    ? undefined
                    : {
                        fontFamily: 'var(--theme-font-display)',
                        fontSize: '22px',
                        fontWeight: 600,
                        letterSpacing: '-0.03em',
                        color: 'var(--ink)',
                      }
                }
              >
                {title}
              </DialogPrimitive.Title>
              {meta && (
                <p
                  className="m-0 mt-1 truncate"
                  style={{
                    fontSize: '12.5px',
                    fontFamily: 'var(--theme-font-mono)',
                    color: 'var(--ink-3)',
                  }}
                >
                  {meta}
                </p>
              )}
            </div>
            <DialogPrimitive.Close
              className="nepo-drawer-close grid place-items-center rounded-lg shrink-0"
              aria-label="Đóng"
              style={{
                width: 36,
                height: 36,
                color: 'var(--ink-2)',
                background: 'transparent',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
            >
              <X className="h-[18px] w-[18px]" />
            </DialogPrimitive.Close>
          </header>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <DialogPrimitive.Description className="sr-only">
              {typeof title === 'string' ? title : 'Drawer panel'}
            </DialogPrimitive.Description>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <footer
              className="flex items-center justify-end gap-2 px-6 pt-3.5 shrink-0"
              style={{
                paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))',
                borderTop: '1px solid var(--line)',
                background: 'var(--surface)',
              }}
            >
              {footer}
            </footer>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export interface DrawerHeroProps {
  label?: React.ReactNode
  value: React.ReactNode
  meta?: React.ReactNode
  className?: string
}

/** Optional callout box at the top of a Drawer body — used for "current value" highlights. */
export function DrawerHero({ label, value, meta, className = '' }: DrawerHeroProps) {
  return (
    <div
      className={`px-4 py-3.5 mb-5 ${className}`}
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r)',
      }}
    >
      {label && (
        <p
          className="m-0 mb-1 uppercase font-semibold"
          style={{ fontSize: '11px', letterSpacing: '0.06em', color: 'var(--ink-3)' }}
        >
          {label}
        </p>
      )}
      <div
        className="tabular-nums"
        style={{
          fontFamily: 'var(--theme-font-display)',
          fontSize: '22px',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--ink)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {meta && (
        <p className="m-0 mt-1.5" style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
          {meta}
        </p>
      )}
    </div>
  )
}

export interface DrawerTabsProps<K extends string> {
  value: K
  onValueChange: (next: K) => void
  tabs: { value: K; label: React.ReactNode }[]
  className?: string
}

export function DrawerTabs<K extends string>({ value, onValueChange, tabs, className = '' }: DrawerTabsProps<K>) {
  return (
    <div
      className={`flex gap-0 mb-5 -mx-6 px-6 ${className}`}
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onValueChange(t.value)}
            className={`nepo-drawer-tab ${active ? 'is-active' : ''}`}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
