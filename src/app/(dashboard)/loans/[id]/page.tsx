"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { StatusBadge } from "@/components/shared/status-badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { StatCard } from "@/components/shared/stat-card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { ArrowLeftIcon, FileDownIcon, PlusIcon, Trash2 } from "lucide-react"

const statusTransitions: Record<string, string[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["ACTIVE", "REJECTED"],
  ACTIVE: ["CLOSED", "DEFAULTED"],
  DEFAULTED: ["CLOSED"],
}

const transitionLabels: Record<string, string> = {
  APPROVED: "Approve",
  REJECTED: "Reject",
  ACTIVE: "Activate",
  CLOSED: "Close",
  DEFAULTED: "Default",
}

const paymentModes = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "ONLINE", label: "Online" },
  { value: "UPI", label: "UPI" },
]

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [payForm, setPayForm] = useState({ paymentMode: "CASH", transactionRef: "", paymentDate: "" })
  const [selectedInstallments, setSelectedInstallments] = useState<string[]>([])

  const { data: loan, isLoading } = useQuery({
    queryKey: ["loan", id],
    queryFn: async () => {
      const res = await fetch("/api/loans/" + id)
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
    enabled: !!id,
  })

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch("/api/loans/" + id + "/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan", id] })
      setConfirmAction(null)
      toast("Status updated successfully")
    },
    onError: () => toast("Failed to update status"),
  })

  const paymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, loanId: id }),
      })
      if (!res.ok) throw new Error("Failed to record payment")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan", id] })
      setShowPaymentForm(false)
      setPayForm({ paymentMode: "CASH", transactionRef: "", paymentDate: "" })
      setSelectedInstallments([])
      toast("Payment recorded successfully")
    },
    onError: () => toast("Failed to record payment"),
  })

  const [editOpen, setEditOpen] = useState(false)
const [editForm, setEditForm] = useState({ notes: "", loanType: "", disbursementDate: "", firstEmiDate: "" })
const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (loan) {
      setEditForm({
        notes: loan.notes || "",
        loanType: loan.loanType || "PERSONAL",
        disbursementDate: loan.disbursementDate ? new Date(loan.disbursementDate).toISOString().split("T")[0] : "",
        firstEmiDate: loan.firstEmiDate ? new Date(loan.firstEmiDate).toISOString().split("T")[0] : "",
      })
    }
  }, [loan])

  const editMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/loans/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to update loan")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan", id] })
      setEditOpen(false)
      toast("Loan updated successfully")
    },
    onError: () => toast("Failed to update loan"),
  })

  const deleteLoanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/loans/" + id, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete loan")
      return res.json()
    },
    onSuccess: () => {
      toast("Loan deleted")
      router.push("/loans")
    },
    onError: () => toast("Failed to delete loan"),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    )
  }

  if (!loan) {
    return <div className="text-center py-12 text-muted-foreground">Loan not found</div>
  }

  const totalPaid = loan.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0

  const stats = [
    { label: "Loan Amount", value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(loan.principalAmount)) },
    { label: "EMI", value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(loan.emiAmount)) },
    { label: "Total Interest", value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(loan.totalInterest)) },
    { label: "Total Payable", value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(loan.totalPayable)) },
    { label: "Tenure", value: loan.tenureMonths + " months" },
    { label: "Remaining Balance", value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(loan.remainingBalance)) },
  ]

  const handlePay = () => {
    const amount = selectedInstallments.reduce((sum, instId) => {
      const inst = loan.installments?.find((i: any) => i.id === instId)
      return sum + (inst ? Number(inst.amount) : 0)
    }, 0)
    paymentMutation.mutate({
      amount: amount.toString(),
      paymentMode: payForm.paymentMode,
      transactionRef: payForm.transactionRef,
      paymentDate: payForm.paymentDate,
      installmentIds: selectedInstallments,
    })
  }

  return (
    <div className="space-y-6">
      <Link href="/loans" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeftIcon className="size-3" /> Back to Loans
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{loan.loanNumber}</h1>
          <StatusBadge status={loan.status} />
        </div>
        <div className="flex gap-2">
          <a
            href={"/api/loans/" + id + "/export"}
            target="_blank" rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <FileDownIcon className="size-4" /> Download PDF
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteConfirm("loan")}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {loan.customer && (
        <Card size="sm">
          <CardContent className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Customer:</span>
            <Link href={"/customers/" + loan.customer.id} className="text-primary hover:underline font-medium">
              {loan.customer.user?.fullName}
            </Link>
            <span className="text-sm text-muted-foreground">({loan.loanType})</span>
          </CardContent>
        </Card>
      )}

      {statusTransitions[loan.status] && (
        <div className="flex gap-2">
          {statusTransitions[loan.status].map((nextStatus) => (
            <Button
              key={nextStatus}
              variant={nextStatus === "REJECTED" || nextStatus === "DEFAULTED" ? "destructive" : "default"}
              onClick={() => setConfirmAction(nextStatus)}
            >
              {transitionLabels[nextStatus] || nextStatus}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Status" value={loan.status} />
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} />
        ))}
        <StatCard label="Disbursed Date" value={loan.disbursementDate ? new Date(loan.disbursementDate).toLocaleDateString() : "-"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Amortization Schedule</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Interest</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loan.installments?.map((inst: any) => (
                      <TableRow key={inst.id}>
                        <TableCell>{inst.installmentNo}</TableCell>
                        <TableCell>{new Date(inst.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(inst.amount))}</TableCell>
                        <TableCell className="text-right">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(inst.principalPart))}</TableCell>
                        <TableCell className="text-right">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(inst.interestPart))}</TableCell>
                        <TableCell className="text-right">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(inst.outstandingBefore))}</TableCell>
                        <TableCell><StatusBadge status={inst.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
              {loan.status === "ACTIVE" && (
                <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(!showPaymentForm)}>
                  {showPaymentForm ? "Cancel" : <><PlusIcon /> Record</>}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {showPaymentForm && (
                <div className="mb-4 p-4 bg-muted/50 rounded-lg space-y-3">
                  <Select value={payForm.paymentMode} onValueChange={(v) => setPayForm({ ...payForm, paymentMode: v ?? "CASH" })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentModes.map((pm) => (
                        <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Transaction Ref"
                    value={payForm.transactionRef}
                    onChange={(e) => setPayForm({ ...payForm, transactionRef: e.target.value })}
                  />
                  <Input
                    placeholder="Payment Date"
                    type="date"
                    value={payForm.paymentDate}
                    onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
                  />
                  <div>
                    <p className="text-sm font-medium mb-2">Select Installments</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {loan.installments?.filter((i: any) => i.status === "PENDING" || i.status === "OVERDUE").map((inst: any) => (
                        <label key={inst.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer hover:bg-muted rounded px-1">
                          <input
                            type="checkbox"
                            checked={selectedInstallments.includes(inst.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedInstallments([...selectedInstallments, inst.id])
                              else setSelectedInstallments(selectedInstallments.filter((x) => x !== inst.id))
                            }}
                            className="rounded border-input"
                          />
                          <span>#{inst.installmentNo} &mdash; {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(inst.amount))} &mdash; Due {new Date(inst.dueDate).toLocaleDateString()}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    Total: {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                      selectedInstallments.reduce((s, instId) => {
                        const inst = loan.installments?.find((i: any) => i.id === instId)
                        return s + (inst ? Number(inst.amount) : 0)
                      }, 0)
                    )}
                  </div>
                  <Button onClick={handlePay} disabled={selectedInstallments.length === 0} className="w-full">
                    Pay Selected
                  </Button>
                </div>
              )}

              {(!loan.payments || loan.payments.length === 0) ? (
                <div className="text-center py-6 text-sm text-muted-foreground">No payments recorded</div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {loan.payments.map((p: any) => (
                    <div key={p.id} className="p-3 rounded-lg border text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-green-600">
                          +{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(p.amount))}
                        </span>
                        <span className="text-muted-foreground text-xs">{new Date(p.paymentDate).toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {p.paymentMode}{p.transactionRef ? " \u00b7 " + p.transactionRef : ""}
                        {p.installments?.length > 0 && (
                          <span> &middot; #{p.installments.map((i: any) => i.installmentNo).join(", #")}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={(o) => { if (!o) setEditOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Loan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Loan Type</Label>
              <Select value={editForm.loanType} onValueChange={(v) => setEditForm({ ...editForm, loanType: v ?? "PERSONAL" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["PERSONAL", "HOME", "AUTO", "BUSINESS", "EDUCATION"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Disbursement Date</Label>
              <Input type="date" value={editForm.disbursementDate} onChange={(e) => setEditForm({ ...editForm, disbursementDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>First EMI Date</Label>
              <Input type="date" value={editForm.firstEmiDate} onChange={(e) => setEditForm({ ...editForm, firstEmiDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => editMutation.mutate(editForm)} disabled={editMutation.isPending}>
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && statusMutation.mutate(confirmAction)}
        title={"Confirm " + (confirmAction || "")}
        message={"Are you sure you want to change this loan's status to " + (confirmAction || "") + "?"}
        confirmLabel={transitionLabels[confirmAction || ""] || "Confirm"}
        variant={confirmAction === "DEFAULTED" || confirmAction === "REJECTED" ? "destructive" : "default"}
        loading={statusMutation.isPending}
      />

      <ConfirmDialog
        open={deleteConfirm === "loan"}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteLoanMutation.mutate()}
        title="Delete Loan"
        message="Are you sure you want to delete this loan? This will also delete all associated installments and payments."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteLoanMutation.isPending}
      />
    </div>
  )
}
