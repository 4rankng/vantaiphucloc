/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-[7px] whitespace-nowrap rounded-lg text-[13px] font-semibold leading-none transition-[background,border-color,color,transform,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--theme-brand-primary)] disabled:pointer-events-none disabled:opacity-50 select-none antialiased",
  {
    variants: {
      variant: {
        default:
          "shadow-[0_4px_10px_-3px_rgba(0,177,79,0.32)] active:translate-y-[1px]",
        destructive:
          "active:translate-y-[1px]",
        outline:
          "border active:translate-y-[1px]",
        danger:
          "border active:translate-y-[1px]",
        secondary:
          "active:translate-y-[1px]",
        muted:
          "active:translate-y-[1px]",
        ghost:
          "active:translate-y-[1px]",
        link:
          "underline-offset-4 hover:underline",
        gold:
          "shadow-[0_4px_10px_-3px_rgba(0,177,79,0.32)] active:translate-y-[1px]",
      },
      size: {
        default: "h-9 px-3.5 py-0",
        sm: "h-7 px-2.5 text-[12px] gap-1.5",
        lg: "h-10 px-5",
        icon: "h-9 w-9",
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
    background: 'var(--theme-status-error)',
    color: '#fff',
  },
  outline: {
    background: 'var(--theme-bg-secondary)',
    borderColor: 'var(--line-2)',
    color: 'var(--theme-text-primary)',
  },
  danger: {
    background: 'var(--theme-bg-secondary)',
    borderColor: 'var(--danger-soft)',
    color: 'var(--theme-status-error)',
  },
  secondary: {
    background: 'var(--theme-bg-secondary)',
    color: 'var(--theme-text-primary)',
    border: '1px solid var(--line-2)',
  },
  muted: {
    background: 'var(--theme-bg-tertiary)',
    color: 'var(--theme-text-secondary)',
  },
  ghost: {
    color: 'var(--theme-text-secondary)',
    background: 'transparent',
  },
  link: {
    color: 'var(--theme-brand-primary)',
  },
  gold: {
    background: 'var(--theme-brand-primary)',
    color: 'var(--theme-text-on-brand)',
  },
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const themeStyle = themeMap[variant ?? 'default'] ?? {}
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), `nepo-btn-${variant ?? 'default'}`)}
        style={{ ...themeStyle, ...style }}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
