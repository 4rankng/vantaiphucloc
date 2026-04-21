import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const progressVariants = cva("relative h-2 w-full overflow-hidden rounded-full bg-[var(--theme-bg-tertiary)]", {
  variants: {
    size: {
      sm: "h-1",
      default: "h-2",
      lg: "h-3",
    },
  },
  defaultVariants: { size: "default" },
})

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>,
    VariantProps<typeof progressVariants> {
  indicatorClassName?: string
}

const Progress = React.forwardRef<React.ComponentRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  ({ className, size, value, indicatorClassName, ...props }, ref) => (
    <ProgressPrimitive.Root ref={ref} className={cn(progressVariants({ size }), className)} {...props}>
      <ProgressPrimitive.Indicator
        className={cn("h-full w-full flex-1 rounded-full bg-[var(--theme-brand-primary)] transition-all", indicatorClassName)}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
)
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress, progressVariants }
