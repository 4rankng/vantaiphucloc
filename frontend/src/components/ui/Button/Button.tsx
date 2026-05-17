/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-target",
  {
    variants: {
      variant: {
        default: "shadow-sm active:scale-[0.98]",
        destructive: "shadow-sm active:scale-[0.98]",
        outline: "border bg-transparent shadow-sm hover:bg-[var(--theme-bg-tertiary)]",
        danger: "border bg-transparent shadow-sm hover:bg-[color-mix(in_srgb,var(--theme-status-error)_8%,transparent)]",
        secondary: "shadow-sm hover:bg-[var(--theme-bg-tertiary)]",
        muted: "shadow-sm",
        ghost: "hover:bg-[var(--theme-bg-tertiary)]",
        link: "underline-offset-4 hover:underline",
        gold: "shadow-sm font-semibold active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const themeMap: Record<string, React.CSSProperties> = {
  default: { background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' },
  destructive: { background: 'var(--theme-status-error)', color: '#fff' },
  outline: { borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' },
  danger: { borderColor: 'var(--theme-status-error)', color: 'var(--theme-status-error)' },
  secondary: { background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' },
  muted: { background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-muted)' },
  ghost: { color: 'var(--theme-text-primary)' },
  link: { color: 'var(--theme-brand-primary)' },
  gold: { background: 'var(--theme-brand-secondary)', color: 'var(--theme-text-inverse)' },
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const themeStyle = themeMap[variant ?? 'default'] ?? {}
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        style={{ ...themeStyle, ...style }}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
