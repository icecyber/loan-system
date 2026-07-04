"use client"

import { usePathname } from "next/navigation"
import { Menu, LogOut, Moon, Sun, ChevronRight, LayoutDashboard } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"

interface HeaderProps {
  onMenuClick: () => void
}

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/customers": "Customers",
  "/loans": "Loans",
  "/payments": "Payments",
  "/admin": "Admin Dashboard",
  "/admin/users": "Users",
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return null

  const breadcrumbs = [{ label: "Home", href: "/" }]
  let current = ""
  for (const seg of segments) {
    current += `/${seg}`
    const label = seg.charAt(0).toUpperCase() + seg.slice(1)
    breadcrumbs.push({ label, href: current })
  }

  return (
    <nav className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
      <LayoutDashboard className="size-3.5" />
      {breadcrumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="size-3" />}
          {i === breadcrumbs.length - 1 ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <span>{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()

  const title =
    Object.entries(pageTitles).find(([path]) =>
      path === "/" ? pathname === "/" : pathname.startsWith(path)
    )?.[1] ?? ""

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border/40 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60 px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="size-5" />
      </Button>

      <div className="flex flex-col lg:flex-row lg:items-center gap-0 lg:gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <Breadcrumbs pathname={pathname} />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="text-muted-foreground hover:text-foreground"
          title="Toggle theme"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all duration-200 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all duration-200 dark:rotate-0 dark:scale-100" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="rounded-full" />
            }
          >
            <Avatar className="size-8 ring-1 ring-border">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {user?.fullName?.charAt(0)?.toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email}
                </p>
                <Badge
                  variant={user?.role === "ADMIN" ? "default" : "secondary"}
                  className="mt-1 w-fit"
                >
                  {user?.role === "ADMIN" ? "Admin" : "Customer"}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="size-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
