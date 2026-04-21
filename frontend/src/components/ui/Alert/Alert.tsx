import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm flex items-start gap-3",
  {
    variants: {
      variant: {
        default: "bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] border-[var(--theme-border-default)]",
        info: "border-sky-200 bg-sky-50 text-sky-900 [&>svg]:text-sky-600",
        success: "border-emerald-200 bg-emerald-50 text-emerald-900 [&>svg]:text-emerald-600",
        warning: "border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600",
        error: "border-red-200 bg-red-50 text-red-900 [&>svg]:text-red-600",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

const iconMap = {
  default: AlertCircle,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
}

interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  icon?: React.ReactNode
}

function Alert({ className, variant = "default", icon, children, ...props }: AlertProps) {
  const Icon = icon ? null : iconMap[variant ?? "default"]
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      {icon ?? (Icon && <Icon className="h-4 w-4 shrink-0 mt-0.5" />)}
      <div className="flex-1">{children}</div>
    </div>
  )
}

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("font-medium leading-none tracking-tight", className)} {...props} />
  )
)
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm opacity-80 mt-1", className)} {...props} />
  )
)
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription, alertVariants }
