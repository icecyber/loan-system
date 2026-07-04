"use client"

import { useQuery } from "@tanstack/react-query"
import { StatCard } from "@/components/shared/stat-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, User, FileText, CheckCircle, Clock, AlertCircle, DollarSign, PiggyBank } from "lucide-react"

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats")
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const statCards = [
    { label: "Total Users", value: data?.totalUsers ?? "-", icon: Users },
    { label: "Total Customers", value: data?.totalCustomers ?? "-", icon: User },
    { label: "Total Loans", value: data?.totalLoans ?? "-", icon: FileText },
    { label: "Active Loans", value: data?.activeLoans ?? "-", icon: CheckCircle },
    { label: "Pending Loans", value: data?.pendingLoans ?? "-", icon: Clock },
    { label: "Overdue Loans", value: data?.overdueLoans ?? "-", icon: AlertCircle },
    {
      label: "Total Disbursed",
      value: data ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(data.totalDisbursed)) : "-",
      icon: DollarSign,
    },
    {
      label: "Total Collected",
      value: data ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(data.totalCollected)) : "-",
      icon: PiggyBank,
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))
        ) : (
          statCards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} />
          ))
        )}
      </div>
    </div>
  )
}
