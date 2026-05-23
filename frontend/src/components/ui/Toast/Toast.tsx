/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import * as ToastPrimitive from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitive.Provider

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center gap-3 overflow-hidden rounded-xl border p-3.5 transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
  {
    variants: {
      variant: {
        default: "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-[0_4px_16px_-2px_rgba(10,10,10,0.10)]",
        success: "border-[var(--accent)] bg-[var(--success-soft)] text-[var(--accent-ink)] [&_svg]:text-[var(--accent)] shadow-[0_4px_16px_-2px_rgba(0,177,79,0.14)]",
        warning: "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--ink)] [&_svg]:text-[var(--warning)] shadow-[0_4px_16px_-2px_rgba(245,166,35,0.14)]",
        error:   "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)] [&_svg]:text-[var(--danger)] shadow-[0_4px_16px_-2px_rgba(227,36,52,0.12)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

const Toast = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => (
  <ToastPrimitive.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />
))
Toast.displayName = ToastPrimitive.Root.displayName

const ToastAction = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-[var(--theme-border-default)] bg-transparent px-3 text-sm font-medium transition-colors hover:bg-[var(--theme-bg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-brand-secondary)] focus:ring-offset-2",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitive.Action.displayName

const ToastClose = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn(
      // Always visible at 50% opacity so users know it's dismissible;
      // full opacity + bg on hover — matches the Dialog close button pattern
      "ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
      "opacity-50 transition-all duration-150 hover:opacity-100",
      "hover:bg-black/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
      className
    )}
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </ToastPrimitive.Close>
))
ToastClose.displayName = ToastPrimitive.Close.displayName

const ToastTitle = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={cn(className)}
    style={{ fontSize: '13.5px', fontWeight: 600, letterSpacing: '-0.012em', lineHeight: 1.3 }}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitive.Title.displayName

const ToastDescription = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn(className)}
    style={{ fontSize: '12.5px', opacity: 0.8, letterSpacing: '-0.006em', lineHeight: 1.4, marginTop: 2 }}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitive.Description.displayName

const ToastViewport = React.forwardRef<
  React.ComponentRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      // Mobile: centered at top, below the offline pill (top-16 ≈ 64px)
      // Desktop: top-right corner, same vertical offset
      "fixed top-16 left-4 right-4 z-[190] flex max-h-screen flex-col gap-2 md:left-auto md:right-4 md:w-[380px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitive.Viewport.displayName

export { ToastProvider, Toast, ToastTitle, ToastDescription, ToastAction, ToastClose, ToastViewport, toastVariants }
