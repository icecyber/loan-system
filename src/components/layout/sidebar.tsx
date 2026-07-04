"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  LayoutDashboard,
  Users,
  HandCoins,
  ArrowRightLeft,
  Shield,
  UserCog,
  LogOut,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useAuth } from "@/hooks/use-auth"

const mainNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/loans", label: "Loans", icon: HandCoins },
  { href: "/payments", label: "Payments", icon: ArrowRightLeft },
]

const adminNav = [
  { href: "/admin", label: "Admin Dashboard", icon: Shield },
  { href: "/admin/users", label: "Users", icon: UserCog },
]

function SidebarNav({ collapsed, onNavClick }: { collapsed?: boolean; onNavClick?: () => void }) {
  const pathname = usePathname()
  const { user } = useAuth()

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {mainNav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavClick}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
            isActive(item.href)
              ? "bg-sidebar-primary/20 text-sidebar-primary-foreground"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? item.label : undefined}
        >
          <item.icon className="size-4 shrink-0" />
          {!collapsed && item.label}
        </Link>
      ))}
      {user?.role === "ADMIN" && (
        <>
          {!collapsed && (
            <div className="pt-4 pb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Admin
            </div>
          )}
          {adminNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                isActive(item.href)
                  ? "bg-sidebar-primary/20 text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && item.label}
            </Link>
          ))}
        </>
      )}
    </nav>
  )
}

function SidebarUser({ collapsed }: { collapsed?: boolean }) {
  const { user, logout } = useAuth()

  return (
    <div className="border-t border-sidebar-border p-4">
      {!collapsed ? (
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.fullName}
              </p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
            </div>
            <Badge
              variant={user?.role === "ADMIN" ? "default" : "secondary"}
              className={cn(
                "shrink-0",
                user?.role === "ADMIN"
                  ? "bg-yellow-600/30 text-yellow-400 hover:bg-yellow-600/30"
                  : "bg-sidebar-accent text-sidebar-accent-foreground/70 hover:bg-sidebar-accent"
              )}
            >
              {user?.role === "ADMIN" ? "Admin" : "User"}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={logout}
          >
            <LogOut className="size-4" />
            Logout
          </Button>
        </>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={logout}
          title="Logout"
        >
          <LogOut className="size-4" />
        </Button>
      )}
    </div>
  )
}

interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="flex flex-col p-0 border-r border-sidebar-border"
          style={{
            backgroundColor: "var(--sidebar)",
            color: "var(--sidebar-foreground)",
          }}
        >
          <SheetHeader className="border-b border-sidebar-border px-5 py-4">
            <SheetTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-sidebar-foreground">
              <div className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold">
                L
              </div>
              Loan Manager
            </SheetTitle>
          </SheetHeader>
          <SidebarNav onNavClick={() => onOpenChange(false)} />
          <SidebarUser />
        </SheetContent>
      </Sheet>

      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 border-r border-sidebar-border transition-all duration-300",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
        style={{
          backgroundColor: "var(--sidebar)",
          color: "var(--sidebar-foreground)",
        }}
      >
        <div className="flex items-center h-16 px-4 border-b border-sidebar-border gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold">
            L
          </div>
          {!collapsed && (
            <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground truncate">
              Loan Manager
            </h1>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn("ml-auto size-7 shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent", collapsed && "ml-0 mx-auto")}
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
        </div>
        <SidebarNav collapsed={collapsed} />
        <SidebarUser collapsed={collapsed} />
      </aside>
    </>
  )
}
