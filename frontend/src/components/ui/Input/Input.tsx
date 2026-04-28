import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-lg border bg-[var(--theme-bg-secondary)] px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--theme-text-muted)] placeholder:truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
  {
    variants: {
      variant: {
        default: "border-[var(--theme-border-default)] focus-visible:ring-[var(--theme-brand-secondary)]",
        error: "border-red-500 focus-visible:ring-red-500",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, error, ...props }, ref) => (
    <div className="w-full">
      <input
        type={type}
        className={cn(inputVariants({ variant: error ? "error" : variant }), className)}
        ref={ref}
        aria-invalid={!!error}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
)
Input.displayName = "Input"

export { Input, inputVariants }
