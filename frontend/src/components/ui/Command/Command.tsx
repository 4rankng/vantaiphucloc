import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/Input"

interface CommandProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Command({ open, onOpenChange, children }: CommandProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-[var(--theme-border-default)] bg-[var(--theme-bg-secondary)] shadow-2xl">
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function CommandInput({
  placeholder = "Tìm kiếm...",
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex items-center border-b border-[var(--theme-border-default)] px-4">
      <Search className="mr-2 h-4 w-4 shrink-0 text-[var(--theme-text-muted)]" />
      <Input
        placeholder={placeholder}
        className="border-0 focus:ring-0 h-11 px-0"
        {...props}
      />
    </div>
  )
}

function CommandList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("max-h-80 overflow-y-auto p-2", className)} {...props} />
}

function CommandItem({
  className,
  onSelect,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { onSelect?: () => void }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:bg-[var(--theme-bg-tertiary)] focus:bg-[var(--theme-bg-tertiary)] outline-none",
        className
      )}
      onClick={onSelect}
      {...props}
    />
  )
}

function CommandEmpty({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="py-8 text-center text-sm text-[var(--theme-text-muted)]" {...props}>
      {children ?? "Không tìm thấy kết quả."}
    </div>
  )
}

function CommandGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("py-1", className)} {...props} />
}

function CommandSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("-mx-1 my-1 h-px bg-[var(--theme-border-default)]", className)} {...props} />
}

export { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup, CommandSeparator }
