"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { ArrowLeftIcon, CalculatorIcon, PlusIcon } from "lucide-react"

const loanTypes = [
  { value: "PERSONAL", label: "Personal" },
  { value: "HOME", label: "Home" },
  { value: "AUTO", label: "Auto" },
  { value: "BUSINESS", label: "Business" },
  { value: "EDUCATION", label: "Education" },
]

const calcMethods = [
  { value: "REDUCING_BALANCE", label: "Reducing Balance" },
  { value: "FLAT_RATE", label: "Flat Rate" },
  { value: "EQUAL_PRINCIPAL", label: "Equal Principal" },
]

export default function LoanCreate() {
  const router = useRouter()

  const [form, setForm] = useState({
    customerId: "", loanType: "PERSONAL", calculationMethod: "REDUCING_BALANCE",
    principalAmount: "", interestRate: "", tenureMonths: "",
    disbursementDate: "", firstEmiDate: "", notes: "",
  })
  const [preview, setPreview] = useState<any>(null)

  const { data: customersData } = useQuery({
    queryKey: ["customers-all"],
    queryFn: async () => {
      const res = await fetch("/api/customers?limit=200")
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to create")
      return res.json()
    },
    onSuccess: (res) => {
      toast("Loan created successfully")
      router.push("/loans/" + res.id)
    },
    onError: () => toast("Failed to create loan"),
  })

  const handleCalcPreview = async () => {
    if (!form.principalAmount || !form.interestRate || !form.tenureMonths) {
      toast("Fill principal, rate, and tenure first")
      return
    }
    try {
      const res = await fetch("/api/loans/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Failed to calculate")
      const data = await res.json()
      setPreview(data)
    } catch {
      toast("Failed to calculate preview")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.customerId) { toast("Select a customer"); return }
    createMutation.mutate(form)
  }

  const customers = customersData?.customers || []

  return (
    <div className="space-y-6">
      <Link href="/loans" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeftIcon className="size-3" /> Back to Loans
      </Link>
      <h1 className="text-2xl font-bold">Create New Loan</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Loan Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v ?? "" })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.user?.fullName} ({c.user?.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <Select value={form.loanType} onValueChange={(v) => setForm({ ...form, loanType: v ?? "PERSONAL" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loanTypes.map((lt) => (
                      <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={form.calculationMethod} onValueChange={(v) => setForm({ ...form, calculationMethod: v ?? "REDUCING_BALANCE" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {calcMethods.map((cm) => (
                      <SelectItem key={cm.value} value={cm.value}>{cm.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Principal ($)"
                  type="number"
                  value={form.principalAmount}
                  onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
                />
                <Input
                  placeholder="Interest Rate (% p.a.)"
                  type="number"
                  step="0.01"
                  value={form.interestRate}
                  onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Tenure (months)"
                  type="number"
                  value={form.tenureMonths}
                  onChange={(e) => setForm({ ...form, tenureMonths: e.target.value })}
                />
                <Input
                  placeholder="Disbursement Date"
                  type="date"
                  value={form.disbursementDate}
                  onChange={(e) => setForm({ ...form, disbursementDate: e.target.value })}
                />
              </div>

              <Input
                placeholder="First EMI Date"
                type="date"
                value={form.firstEmiDate}
                onChange={(e) => setForm({ ...form, firstEmiDate: e.target.value })}
              />

              <textarea
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
              />

              <div className="flex gap-3">
                <Button variant="outline" type="button" onClick={handleCalcPreview}>
                  <CalculatorIcon /> Preview
                </Button>
                <Button type="submit">
                  {createMutation.isPending ? "Creating..." : "Create Loan"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {preview && (
          <Card>
            <CardHeader>
              <CardTitle>Amortization Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                {[
                  { label: "EMI Amount", value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(preview.emiAmount) },
                  { label: "Total Interest", value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(preview.totalInterest) },
                  { label: "Total Payable", value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(preview.totalPayable) },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between text-sm py-1 border-b">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-semibold">{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="max-h-80 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">#</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Interest</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.installments?.map((inst: any) => (
                      <TableRow key={inst.installmentNo}>
                        <TableCell className="text-right">{inst.installmentNo}</TableCell>
                        <TableCell className="text-right">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(inst.amount)}</TableCell>
                        <TableCell className="text-right">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(inst.principalPart)}</TableCell>
                        <TableCell className="text-right">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(inst.interestPart)}</TableCell>
                        <TableCell className="text-right">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(inst.outstandingAfter)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
