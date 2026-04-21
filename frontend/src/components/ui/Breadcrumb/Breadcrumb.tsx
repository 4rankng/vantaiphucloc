import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const Breadcrumb = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<"nav">>(
  ({ className, ...props }, ref) => (
    <nav ref={ref} aria-label="Breadcrumb" className={cn("flex items-center text-sm", className)} {...props} />
  )
)
Breadcrumb.displayName = "Breadcrumb"

const BreadcrumbList = React.forwardRef<HTMLOListElement, React.ComponentPropsWithoutRef<"ol">>(
  ({ className, ...props }, ref) => (
    <ol ref={ref} className={cn("flex items-center gap-1.5", className)} {...props} />
  )
)
BreadcrumbList.displayName = "BreadcrumbList"

const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<"li">>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("inline-flex items-center gap-1.5", className)} {...props} />
  )
)
BreadcrumbItem.displayName = "BreadcrumbItem"

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, React.ComponentPropsWithoutRef<"a">>(
  ({ className, ...props }, ref) => (
    <a
      ref={ref}
      className={cn("text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-secondary)] rounded", className)}
      {...props}
    />
  )
)
BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn("font-medium text-[var(--theme-text-primary)]", className)} {...props} />
  )
)
BreadcrumbPage.displayName = "BreadcrumbPage"

const BreadcrumbSeparator = ({ children, className, ...props }: React.ComponentPropsWithoutRef<"li">) => (
  <li role="presentation" aria-hidden="true" className={cn("text-[var(--theme-text-muted)]", className)} {...props}>
    {children ?? <ChevronRight className="h-3.5 w-3.5" />}
  </li>
)

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator }
