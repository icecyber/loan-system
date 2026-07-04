"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/shared/status-badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { toast } from "sonner"
import { ArrowLeftIcon, PencilIcon, Trash2 } from "lucide-react"

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<any>({})

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const res = await fetch("/api/customers/" + id)
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/customers/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to update")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] })
      setEditOpen(false)
      toast("Customer updated successfully")
    },
    onError: () => toast("Failed to update customer"),
  })

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const router = useRouter()

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/customers/" + id, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete customer")
      return res.json()
    },
    onSuccess: () => {
      toast("Customer deleted")
      router.push("/customers")
    },
    onError: () => toast("Failed to delete customer"),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!customer) {
    return <div className="text-center py-12 text-muted-foreground">Customer not found</div>
  }

  const openEdit = () => {
    setEditForm({
      phone: customer.phone || "",
      addressLine: customer.addressLine || "",
      city: customer.city || "",
      state: customer.state || "",
      postalCode: customer.postalCode || "",
      employmentType: customer.employmentType || "",
      employerName: customer.employerName || "",
      monthlyIncome: customer.monthlyIncome || "",
    })
    setEditOpen(true)
  }

  const info = [
    { label: "Email", value: customer.user?.email },
    { label: "Phone", value: customer.phone },
    { label: "Address", value: [customer.addressLine, customer.city, customer.state, customer.postalCode].filter(Boolean).join(", ") },
    { label: "City", value: customer.city },
    { label: "State", value: customer.state },
    { label: "Postal Code", value: customer.postalCode },
    { label: "Employment Type", value: customer.employmentType },
    { label: "Employer", value: customer.employerName },
    { label: "Monthly Income", value: customer.monthlyIncome ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(customer.monthlyIncome)) : "-" },
  ]

  return (
    <div className="space-y-6">
      <Link href="/customers" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeftIcon className="size-3" /> Back to Customers
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{customer.user?.fullName}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openEdit}>
            <PencilIcon /> Edit
          </Button>
          <Button variant="destructive" size="icon" onClick={() => setDeleteConfirm(true)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {info.map((i) => (
              <div key={i.label}>
                <p className="text-xs text-muted-foreground font-semibold uppercase">{i.label}</p>
                <p className="text-sm">{i.value || "-"}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loans</CardTitle>
            <Link href="/loans/new" className="text-sm text-primary hover:underline">+ New Loan</Link>
          </CardHeader>
          <CardContent>
            {(!customer.loans || customer.loans.length === 0) ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No loans</div>
            ) : (
              <div className="space-y-3">
                {customer.loans.map((loan: any) => (
                  <Link
                    key={loan.id}
                    href={"/loans/" + loan.id}
                    className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-primary">{loan.loanNumber}</span>
                      <StatusBadge status={loan.status} />
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(loan.principalAmount))} &middot; {loan.tenureMonths} months
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This will also delete all their loans, installments, and payments."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteMutation.isPending}
      />

      <Dialog open={editOpen} onOpenChange={(o) => { if (!o) setEditOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Phone"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
            <Input
              placeholder="Address"
              value={editForm.addressLine}
              onChange={(e) => setEditForm({ ...editForm, addressLine: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="City"
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
              />
              <Input
                placeholder="State"
                value={editForm.state}
                onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
              />
            </div>
            <Input
              placeholder="Postal Code"
              value={editForm.postalCode}
              onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
            />
            <Input
              placeholder="Employment Type"
              value={editForm.employmentType}
              onChange={(e) => setEditForm({ ...editForm, employmentType: e.target.value })}
            />
            <Input
              placeholder="Employer Name"
              value={editForm.employerName}
              onChange={(e) => setEditForm({ ...editForm, employerName: e.target.value })}
            />
          </div>
          <DialogFooter showCloseButton>
            <Button onClick={() => updateMutation.mutate(editForm)}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
