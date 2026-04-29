/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

const paginationButtonVariants = cva(
  "h-9 min-w-[36px] px-3 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-brand-secondary)]",
  {
    variants: {
      active: {
        true: "bg-[var(--theme-brand-primary)] text-[var(--theme-text-on-brand)]",
        false: "border border-[var(--theme-border-default)] text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]",
      },
    },
  }
)

interface PaginationProps extends VariantProps<typeof paginationButtonVariants> {
  totalPages: number
  currentPage: number
  onPageChange: (page: number) => void
  className?: string
}

function Pagination({ totalPages, currentPage, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null

  const getVisiblePages = () => {
    const pages: (number | "ellipsis")[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push("ellipsis")
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push("ellipsis")
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <nav className={cn("flex items-center gap-1", className)}>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Trước</span>
      </Button>
      {getVisiblePages().map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e${i}`} className="px-2 text-[var(--theme-text-muted)]">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(paginationButtonVariants({ active: p === currentPage }))}
          >
            {p}
          </button>
        )
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="gap-1"
      >
        <span className="hidden sm:inline">Sau</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  )
}

export { Pagination, paginationButtonVariants }
