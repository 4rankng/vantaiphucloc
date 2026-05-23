/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const progressVariants = cva(
  // Track: surface-3 gives a subtler, more refined base than theme-bg-tertiary
  "relative w-full overflow-hidden rounded-full bg-[var(--surface-3)]",
  {
    variants: {
      size: {
        xs: "h-0.5",   // 2px — ultra-thin, for inline sparkline-like uses
        sm: "h-1",     // 4px
        default: "h-2", // 8px
        lg: "h-3",     // 12px
      },
    },
    defaultVariants: { size: "default" },
  }
)

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  indicatorClassName?: string
}

const Progress = React.forwardRef<React.ComponentRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, size, value, indicatorClassName, ...props }, ref) => (
    <ProgressPrimitive.Root ref={ref} className={cn(progressVariants({ size }), className)} {...props}>
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 rounded-full transition-all",
          // Subtle top highlight makes the bar feel dimensional (like a pill)
          "bg-[var(--accent)]",
          "[background-image:linear-gradient(to_bottom,rgba(255,255,255,0.18)_0%,transparent_60%)]",
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
)
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress, progressVariants }
