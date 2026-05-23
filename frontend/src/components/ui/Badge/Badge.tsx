/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Tighter px-2 for a more refined pill; 11px text matches nepo-table badge sizing
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-[-0.005em] transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        default:   "border-transparent bg-[var(--theme-brand-primary)] text-white",
        secondary: "border-transparent bg-[var(--surface-3)] text-[var(--ink-2)]",
        success:   "border-transparent bg-[var(--success-soft)] text-[var(--accent-ink)]",
        warning:   "border-transparent bg-[var(--warning-soft)] text-[var(--warning)]",
        danger:    "border-transparent bg-[var(--danger-soft)] text-[var(--danger)]",
        info:      "border-transparent bg-[var(--info-soft)] text-[var(--info)]",
        neutral:   "border-transparent bg-[var(--neutral-soft)] text-[var(--ink-3)]",
        outline:   "border-[var(--line-2)] bg-transparent text-[var(--ink-2)]",
        gold:      "border-transparent bg-[var(--warning-soft)] text-[var(--warning)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
