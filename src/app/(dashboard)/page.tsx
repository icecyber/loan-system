"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DollarSign, FileText, AlertCircle, CheckCircle, TrendingUp, PieChart } from "lucide-react"

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const res = await fetch("/api/loans?limit=100")
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const loans = data?.loans || []
  const totalLoans = loans.length
  const activeLoans = loans.filter((l: any) => l.status === "ACTIVE").length
  const overdueLoans = loans.filter((l: any) => l.status === "ACTIVE" && l.delinquentDays > 0).length
  const totalDisbursed = loans.reduce((s: number, l: any) => s + (l.status !== "PENDING" && l.status !== "REJECTED" ? Number(l.principalAmount) : 0), 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Loans" value={totalLoans} icon={FileText} />
        <StatCard label="Active Loans" value={activeLoans} icon={CheckCircle} />
        <StatCard label="Overdue" value={overdueLoans} icon={AlertCircle} />
        <StatCard
          label="Total Disbursed"
          value={new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalDisbursed)}
          icon={DollarSign}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Loan Status">
          <DonutChart loans={loans} />
        </ChartCard>
        <ChartCard title="Monthly Disbursements">
          <BarChart loans={loans} />
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Loans</CardTitle>
          <Link href="/loans" className="text-sm text-primary hover:underline">View all</Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : loans.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No loans yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.slice(0, 10).map((loan: any) => (
                  <TableRow key={loan.id}>
                    <TableCell>
                      <Link href={"/loans/" + loan.id} className="text-primary hover:underline font-medium">
                        {loan.loanNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {loan.customer?.user?.fullName || "-"}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(loan.principalAmount))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={loan.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {title === "Loan Status" ? <PieChart className="size-4" /> : <TrendingUp className="size-4" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function DonutChart({ loans }: { loans: any[] }) {
  const statusColors: Record<string, string> = {
    PENDING: "#94a3b8",
    APPROVED: "#6366f1",
    ACTIVE: "#22c55e",
    CLOSED: "#3b82f6",
    DEFAULTED: "#ef4444",
    REJECTED: "#f97316",
  }

  const counts: Record<string, number> = {}
  loans.forEach((l: any) => { counts[l.status] = (counts[l.status] || 0) + 1 })
  const statuses = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const total = loans.length

  if (total === 0) return <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No data</div>

  let cumulative = 0
  const segments = statuses.map(([status, count]) => {
    const percentage = count / total
    const offset = cumulative * 283
    const length = percentage * 283
    const seg = { status, count, percentage, offset, length, color: statusColors[status] || "#94a3b8" }
    cumulative += percentage
    return seg
  })

  return (
    <div className="flex items-center gap-6">
      <svg width="140" height="140" viewBox="0 0 64 64" className="shrink-0">
        {segments.map((s) => (
          <circle key={s.status} cx="32" cy="32" r="25" fill="none" stroke={s.color} strokeWidth="8"
            strokeDasharray={`${s.length} ${283 - s.length}`} strokeDashoffset={-s.offset}
            transform="rotate(-90 32 32)" className="transition-all duration-500" />
        ))}
        <circle cx="32" cy="32" r="16" fill="var(--color-card)" className="transition-colors" />
        <text x="32" y="32" textAnchor="middle" dominantBaseline="central"
          className="fill-foreground text-[10px] font-bold">{total}</text>
      </svg>
      <div className="space-y-1.5 text-sm">
        {segments.map((s) => (
          <div key={s.status} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-muted-foreground capitalize">{s.status.toLowerCase()}</span>
            <span className="font-medium ml-auto">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarChart({ loans }: { loans: any[] }) {
  const monthly: Record<string, number> = {}
  loans.forEach((l: any) => {
    if (!l.disbursementDate) return
    const key = new Date(l.disbursementDate).toLocaleDateString("en", { year: "numeric", month: "short" })
    monthly[key] = (monthly[key] || 0) + Number(l.principalAmount)
  })

  const entries = Object.entries(monthly).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
  if (entries.length === 0) return <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No disbursements</div>

  const max = Math.max(...entries.map(([, v]) => v))

  return (
    <div className="flex items-end gap-2 h-48">
      {entries.map(([month, amount]) => (
        <div key={month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <span className="text-[10px] text-muted-foreground">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact" }).format(amount)}
          </span>
          <div
            className="w-full rounded-t bg-gradient-to-t from-indigo-500 to-sky-400 transition-all duration-500 hover:from-indigo-400 min-h-[4px]"
            style={{ height: `${(amount / max) * 100}%` }}
          />
          <span className="text-[10px] text-muted-foreground">{month}</span>
        </div>
      ))}
    </div>
  )
}
