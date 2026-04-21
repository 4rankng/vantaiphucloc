import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const skeletonVariants = cva("animate-pulse rounded-md bg-[var(--theme-bg-tertiary)]", {
  variants: {
    shape: {
      text: "h-4 w-full",
      circle: "rounded-full",
      card: "h-32 w-full rounded-xl",
      avatar: "h-10 w-10 rounded-full",
    },
  },
  defaultVariants: { shape: "text" },
})

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof skeletonVariants> {}

function Skeleton({ className, shape, ...props }: SkeletonProps) {
  return <div className={cn(skeletonVariants({ shape }), className)} {...props} />
}

export { Skeleton, skeletonVariants }
