import { Info } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui'

export function InfoTip({ text, side = 'top' }: { text: string; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex items-center justify-center cursor-help"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            <Info className="h-3 w-3" style={{ opacity: 0.5 }} />
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} className="text-xs max-w-[200px]">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
