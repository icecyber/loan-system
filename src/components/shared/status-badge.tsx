import { cn } from "@/lib/utils"

const statusConfig: Record<string, { dot: string; bg: string; text: string }> = {
  ACTIVE: { dot: "bg-success", bg: "bg-success/10", text: "text-success" },
  APPROVED: { dot: "bg-success", bg: "bg-success/10", text: "text-success" },
  COMPLETED: { dot: "bg-success", bg: "bg-success/10", text: "text-success" },
  PAID: { dot: "bg-success", bg: "bg-success/10", text: "text-success" },
  PENDING: { dot: "bg-warning", bg: "bg-warning/10", text: "text-warning" },
  PARTIAL: { dot: "bg-warning", bg: "bg-warning/10", text: "text-warning" },
  OVERDUE: { dot: "bg-destructive", bg: "bg-destructive/10", text: "text-destructive" },
  DEFAULTED: { dot: "bg-destructive", bg: "bg-destructive/10", text: "text-destructive" },
  REJECTED: { dot: "bg-destructive", bg: "bg-destructive/10", text: "text-destructive" },
  FAILED: { dot: "bg-destructive", bg: "bg-destructive/10", text: "text-destructive" },
  CLOSED: { dot: "bg-muted-foreground", bg: "bg-muted", text: "text-muted-foreground" },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { dot: "bg-muted-foreground", bg: "bg-muted", text: "text-muted-foreground" }
  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
      config.bg,
      config.text
    )}>
      <span className={cn("size-1.5 rounded-full shrink-0", config.dot)} />
      {label}
    </span>
  )
}
