/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] text-[13px] font-medium leading-none tracking-[-0.01em] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 select-none antialiased",
  {
    variants: {
      variant: {
        default:
          "shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.12)] active:scale-[0.97] active:shadow-[0_1px_1px_rgba(0,0,0,0.04)]",
        destructive:
          "border border-transparent shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.1)] active:scale-[0.97]",
        outline:
          "border bg-transparent hover:bg-[var(--theme-bg-tertiary)] active:scale-[0.97]",
        danger:
          "border bg-transparent hover:bg-[color-mix(in_srgb,var(--theme-status-error)_5%,transparent)] active:scale-[0.97]",
        secondary:
          "hover:bg-[var(--theme-bg-tertiary)] active:scale-[0.97]",
        muted:
          "active:scale-[0.97]",
        ghost:
          "hover:bg-[var(--theme-bg-tertiary)] active:scale-[0.97]",
        link:
          "underline-offset-4 hover:underline",
        gold:
          "shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.12)] active:scale-[0.97]",
      },
      size: {
        default: "h-8 px-3.5 py-0",
        sm: "h-7 px-2.5 text-[12px]",
        lg: "h-9 px-5",
        icon: "h-8 w-8",
        "icon-sm": "h-7 w-7",
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
  default: {
    background: 'var(--theme-brand-primary)',
    color: 'var(--theme-text-on-brand)',
  },
  destructive: {
    background: 'color-mix(in srgb, var(--theme-status-error) 90%, var(--theme-status-error))',
    color: '#fff',
  },
  outline: {
    borderColor: 'var(--theme-border-default)',
    color: 'var(--theme-text-secondary)',
  },
  danger: {
    borderColor: 'color-mix(in srgb, var(--theme-status-error) 25%, transparent)',
    color: 'var(--theme-status-error)',
  },
  secondary: {
    background: 'var(--theme-bg-tertiary)',
    color: 'var(--theme-text-secondary)',
  },
  muted: {
    background: 'var(--theme-bg-tertiary)',
    color: 'var(--theme-text-muted)',
  },
  ghost: {
    color: 'var(--theme-text-secondary)',
  },
  link: {
    color: 'var(--theme-brand-primary)',
  },
  gold: {
    background: 'var(--theme-brand-secondary)',
    color: 'var(--theme-text-inverse)',
  },
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
