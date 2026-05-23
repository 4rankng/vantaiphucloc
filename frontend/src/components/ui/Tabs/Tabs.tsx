/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const tabsListVariants = cva(
  "inline-flex items-center gap-0.5 transition-all",
  {
    variants: {
      variant: {
        underline: "border-b border-[var(--line)] w-full justify-start",
        pill: "rounded-xl bg-[var(--surface-2)] p-1",
      },
    },
    defaultVariants: { variant: "underline" },
  }
)

const tabsTriggerVariants = cva(
  // 13px, tracking-tight, correct focus ring with --accent
  "inline-flex items-center justify-center whitespace-nowrap text-[13px] font-medium tracking-[-0.005em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        underline:
          "pb-2.5 pt-1 px-3 border-b-2 border-transparent text-[var(--ink-3)] hover:text-[var(--ink-2)] data-[state=active]:border-[var(--accent)] data-[state=active]:text-[var(--ink)] data-[state=active]:font-semibold",
        pill:
          "rounded-lg px-3 py-1.5 text-[var(--ink-3)] hover:text-[var(--ink-2)] data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--ink)] data-[state=active]:font-semibold data-[state=active]:shadow-sm",
      },
    },
    defaultVariants: { variant: "underline" },
  }
)

interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

const TabsList = React.forwardRef<React.ComponentRef<typeof TabsPrimitive.List>, TabsListProps>(
  ({ className, variant, ...props }, ref) => (
    <TabsPrimitive.List ref={ref} className={cn(tabsListVariants({ variant }), className)} {...props} />
  )
)
TabsList.displayName = TabsPrimitive.List.displayName

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {}

const TabsTrigger = React.forwardRef<React.ComponentRef<typeof TabsPrimitive.Trigger>, TabsTriggerProps>(
  ({ className, variant, ...props }, ref) => (
    <TabsPrimitive.Trigger ref={ref} className={cn(tabsTriggerVariants({ variant }), className)} {...props} />
  )
)
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-4 focus-visible:outline-none", className)}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants, tabsTriggerVariants }
