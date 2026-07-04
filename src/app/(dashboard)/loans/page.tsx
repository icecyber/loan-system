"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/data-table"
import { Pagination } from "@/components/shared/pagination"
import { StatusBadge } from "@/components/shared/status-badge"
import { PlusIcon, FileDown } from "lucide-react"

const statusFilters = ["", "PENDING", "APPROVED", "ACTIVE", "CLOSED", "DEFAULTED", "REJECTED"]

export default function LoanList() {
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["loans", status, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (status) params.set("status", status)
      const res = await fetch("/api/loans?" + params.toString())
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const loans = data?.loans || []
  const total = data?.total || 0

  const columns = [
    {
      key: "loanNumber",
      label: "Loan #",
      render: (l: any) => (
        <Link href={"/loans/" + l.id} className="text-primary hover:underline font-medium">
          {l.loanNumber}
        </Link>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      render: (l: any) => l.customer?.user?.fullName || "-",
    },
    {
      key: "amount",
      label: "Amount",
      render: (l: any) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(l.principalAmount)),
    },
    {
      key: "status",
      label: "Status",
      render: (l: any) => <StatusBadge status={l.status} />,
    },
    {
      key: "created",
      label: "Created",
      render: (l: any) => new Date(l.createdAt).toLocaleDateString(),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Loans</h1>
        <div className="flex gap-2">
          <a href={"/api/loans?format=csv" + (status ? "&status=" + status : "")}>
            <Button variant="outline"><FileDown /> Export CSV</Button>
          </a>
          <Link href="/loans/new">
            <Button><PlusIcon /> New Loan</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1) }}
            className={
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors " +
              (status === s
                ? "bg-primary text-primary-foreground"
                : "border border-input bg-background text-muted-foreground hover:bg-muted")
            }
          >
            {s || "All"}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <>
              <DataTable columns={columns} data={loans} keyExtractor={(l: any) => l.id} emptyMessage="No loans found" />
              <Pagination page={page} total={total} limit={20} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
