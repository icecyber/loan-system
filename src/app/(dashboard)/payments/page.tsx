"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/data-table"
import { Pagination } from "@/components/shared/pagination"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { StatusBadge } from "@/components/shared/status-badge"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { Trash2, SearchIcon, XIcon, FileDown } from "lucide-react"

export default function PaymentHistory() {
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["payments", page, search, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (search) params.set("search", search)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      const res = await fetch("/api/payments?" + params.toString())
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/payments/" + id, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete payment")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] })
      setDeleteId(null)
      toast("Payment deleted")
    },
    onError: () => toast("Failed to delete payment"),
  })

  const payments = data?.payments || []
  const total = data?.total || 0

  const columns = [
    {
      key: "date",
      label: "Date",
      render: (p: any) => new Date(p.paymentDate).toLocaleDateString(),
    },
    {
      key: "loan",
      label: "Loan #",
      render: (p: any) => p.loan ? (
        <Link href={"/loans/" + p.loanId} className="text-primary hover:underline">{p.loan.loanNumber}</Link>
      ) : "-",
    },
    {
      key: "customer",
      label: "Customer",
      render: (p: any) => p.customer?.user?.fullName || p.loan?.customer?.user?.fullName || "-",
    },
    {
      key: "amount",
      label: "Amount",
      render: (p: any) => (
        <span className="font-semibold text-green-600">
          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(p.amount))}
        </span>
      ),
    },
    {
      key: "mode",
      label: "Mode",
      render: (p: any) => p.paymentMode,
    },
    {
      key: "ref",
      label: "Transaction Ref",
      render: (p: any) => p.transactionRef || "-",
    },
    {
      key: "status",
      label: "Status",
      render: (p: any) => <StatusBadge status={p.status} />,
    },
    ...(user?.role === "ADMIN" ? [{
      key: "actions" as string,
      label: "Actions",
      render: (p: any) => (
        <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); setDeleteId(p.id) }}>
          <Trash2 className="size-3" />
        </Button>
      ),
    }] : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payment History</h1>
        <a href={"/api/payments?format=csv" + (search ? "&search=" + search : "") + (dateFrom ? "&dateFrom=" + dateFrom : "") + (dateTo ? "&dateTo=" + dateTo : "")}>
          <Button variant="outline"><FileDown /> Export CSV</Button>
        </a>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by loan #, customer, or ref..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8"
          />
          {search && (
            <button onClick={() => { setSearch(""); setPage(1) }} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
              <XIcon className="size-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} className="w-40" placeholder="From" />
          <span className="text-muted-foreground text-sm">to</span>
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} className="w-40" placeholder="To" />
        </div>
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
              <DataTable columns={columns} data={payments} keyExtractor={(p: any) => p.id} emptyMessage="No payments found" />
              <Pagination page={page} total={total} limit={20} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Payment"
        message="Are you sure you want to delete this payment? Associated installments will be marked as pending."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
