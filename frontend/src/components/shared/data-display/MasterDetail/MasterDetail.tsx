import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MasterDetailProps {
  master: ReactNode
  detail: ReactNode
  className?: string
}

export function MasterDetail({ master, detail, className }: MasterDetailProps) {
  return (
    <div className={cn('flex flex-col lg:flex-row gap-4 h-full', className)}>
      <div className="lg:w-[380px] lg:shrink-0 lg:overflow-y-auto">{master}</div>
      <div className="flex-1 min-w-0 lg:overflow-y-auto">{detail}</div>
    </div>
  )
}
