/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  // Base — height matches Button default (h-9 = 36px), consistent with form rows
  "flex w-full h-9 rounded-lg border px-3 text-[13.5px] leading-none font-sans tracking-[-0.008em] ring-offset-[var(--theme-bg-primary)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--theme-text-muted)] placeholder:font-normal placeholder:tracking-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-[border-color,box-shadow] duration-150",
  {
    variants: {
      variant: {
        default: [
          "bg-[var(--theme-bg-secondary)]",
          "border-[var(--line)]",             /* slightly softer than --line-2 */
          "text-[var(--ink)]",
          "hover:border-[var(--line-2)]",
          "focus-visible:ring-[var(--accent)]",
          "focus-visible:border-[var(--accent)]",
        ].join(" "),
        error: [
          "bg-[var(--theme-bg-secondary)]",
          "border-[var(--danger)]",
          "text-[var(--ink)]",
          "focus-visible:ring-[var(--danger)]",
        ].join(" "),
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
