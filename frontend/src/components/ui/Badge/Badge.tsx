/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--theme-brand-primary)] text-white",
        secondary: "border-transparent bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]",
        success: "border-transparent bg-emerald-100 text-emerald-700",
        warning: "border-transparent bg-amber-100 text-amber-700",
        danger: "border-transparent bg-red-100 text-red-700",
        info: "border-transparent bg-blue-100 text-blue-700",
        neutral: "border-transparent bg-slate-100 text-slate-700",
        outline: "border-[var(--theme-border-default)] text-[var(--theme-text-primary)]",
        gold: "border-transparent bg-[var(--theme-brand-primary-light)] text-[var(--theme-brand-secondary)]",
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
