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
        default: "text-white shadow-sm active:scale-[0.98]",
        destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        outline: "border bg-transparent shadow-sm hover:bg-[var(--theme-bg-tertiary)]",
        secondary: "shadow-sm hover:bg-[var(--theme-bg-tertiary)]",
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

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const themeStyle = (() => {
      switch (variant) {
        case 'default':
          return { background: 'var(--theme-brand-primary)', color: 'var(--theme-text-on-brand)' }
        case 'outline':
          return { borderColor: 'var(--theme-border-default)', color: 'var(--theme-text-primary)' }
        case 'secondary':
          return { background: 'var(--theme-bg-tertiary)', color: 'var(--theme-text-primary)' }
        case 'ghost':
          return { color: 'var(--theme-text-primary)' }
        case 'link':
          return { color: 'var(--theme-brand-primary)' }
        case 'gold':
          return { background: 'var(--theme-brand-secondary)', color: 'var(--theme-text-inverse)' }
        default:
          return {}
      }
    })()
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
