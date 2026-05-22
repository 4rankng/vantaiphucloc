import { type ReactNode, memo } from 'react'
import { cn } from '@/lib/utils'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export const PageTransition = memo<PageTransitionProps>(({ children, className }) => (
  <div className={cn('animate-page-enter', className)}>
    {children}
  </div>
))

PageTransition.displayName = 'PageTransition'
