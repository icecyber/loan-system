"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/data-table"
import { Pagination } from "@/components/shared/pagination"
import { toast } from "sonner"
import { SearchIcon, PlusIcon, UserPlus, Users, FileDown } from "lucide-react"

export default function CustomerList() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    userId: "", phone: "", addressLine: "", city: "", state: "",
    postalCode: "", employmentType: "", monthlyIncome: "", employerName: "",
  })
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ["customers", debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" })
      if (debouncedSearch) params.set("search", debouncedSearch)
      const res = await fetch("/api/customers?" + params.toString())
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
  })

  const { data: availableUsersData } = useQuery({
    queryKey: ["users-available"],
    queryFn: async () => {
      const res = await fetch("/api/users?withoutCustomer=true")
      if (!res.ok) throw new Error("Failed to fetch users")
      return res.json()
    },
    enabled: showForm,
  })

  const availableUsers = availableUsersData?.users || []
  const availableTotal = availableUsersData?.total || 0

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to create")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      setShowForm(false)
      setForm({ userId: "", phone: "", addressLine: "", city: "", state: "", postalCode: "", employmentType: "", monthlyIncome: "", employerName: "" })
      toast("Customer created successfully")
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : "Failed to create customer")
    },
  })

  const customers = data?.customers || []
  const total = data?.total || 0

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (c: any) => (
        <Link href={"/customers/" + c.id} className="text-primary hover:underline font-medium">
          {c.user?.fullName}
        </Link>
      ),
    },
    { key: "email", label: "Email", render: (c: any) => c.user?.email || "-" },
    { key: "phone", label: "Phone", render: (c: any) => c.phone || "-" },
    { key: "city", label: "City", render: (c: any) => c.city || "-" },
    {
      key: "loans",
      label: "Loans",
      render: (c: any) => c._count?.loans ?? c.loans?.length ?? 0,
    },
    {
      key: "actions",
      label: "Actions",
      render: (c: any) => (
        <Link href={"/customers/" + c.id}>
          <Button variant="outline" size="sm">View</Button>
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <div className="flex gap-2">
          <a href="/api/customers?format=csv">
            <Button variant="outline"><FileDown /> Export CSV</Button>
          </a>
          <Button onClick={() => setShowForm(true)}>
            <PlusIcon /> Add Customer
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
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
              <DataTable columns={columns} data={customers} keyExtractor={(c: any) => c.id} emptyMessage="No customers found" />
              <Pagination page={page} total={total} limit={20} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false) }}>
        <DialogContent className="sm:max-w-md p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5" /> New Customer Profile
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[65vh] px-6 py-4 space-y-5">
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              Create a customer profile for an existing registered user. The user will be able to apply for loans once a profile is created.
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-select">Registered User</Label>
              {availableTotal > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {availableTotal} user{availableTotal !== 1 ? "s" : ""} registered without a profile.
                  Choose one to link this customer profile to.
                </p>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  All registered users already have customer profiles.{' '}
                  <Link href="/admin/users" className="underline hover:text-foreground">
                    Register a new user
                  </Link>
                  .
                </p>
              )}
              <Select value={form.userId} onValueChange={(v) => setForm({ ...form, userId: v ?? "" })}>
                <SelectTrigger id="user-select" className="w-full">
                  <SelectValue placeholder={availableTotal > 0 ? "Choose a registered user..." : "No users available"} />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      <Users className="mx-auto size-8 mb-2 opacity-40" />
                      No users without profiles
                    </div>
                  ) : (
                    availableUsers.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        <span className="font-medium">{u.fullName}</span>
                        <span className="text-muted-foreground ml-2">({u.email})</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-medium text-foreground">Contact Information</h4>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1 (555) 123-4567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="123 Main Street"
                  value={form.addressLine}
                  onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="State"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal">Postal Code</Label>
                  <Input
                    id="postal"
                    placeholder="12345"
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-medium text-foreground">Employment Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="employment-type">Employment Type</Label>
                  <Input
                    id="employment-type"
                    placeholder="Full-time"
                    value={form.employmentType}
                    onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly-income">Monthly Income ($)</Label>
                  <Input
                    id="monthly-income"
                    type="number"
                    placeholder="5000"
                    value={form.monthlyIncome}
                    onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employer">Employer Name</Label>
                <Input
                  id="employer"
                  placeholder="Acme Corp"
                  value={form.employerName}
                  onChange={(e) => setForm({ ...form, employerName: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter showCloseButton className="border-t px-6 py-4">
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.userId}>
              {createMutation.isPending ? "Creating..." : "Create Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
