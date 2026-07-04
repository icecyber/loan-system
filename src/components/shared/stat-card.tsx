import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  iconColor?: string
  trend?: {
    value: string
    positive: boolean
  }
  className?: string
}

const iconBgMap: Record<string, string> = {
  indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
  sky: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400",
}

export function StatCard({ label, value, icon: Icon, iconColor = "indigo", trend, className }: StatCardProps) {
  return (
    <Card className={cn(
      "group relative overflow-hidden border border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
      <CardContent className="flex items-start gap-4 p-4 relative">
        {Icon && (
          <div className={cn(
            "flex size-11 items-center justify-center rounded-lg shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
            iconBgMap[iconColor] ?? iconBgMap.indigo
          )}>
            <Icon className="size-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {trend && (
            <p
              className={cn(
                "text-xs mt-1 font-medium",
                trend.positive ? "text-success" : "text-destructive"
              )}
            >
              {trend.value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
