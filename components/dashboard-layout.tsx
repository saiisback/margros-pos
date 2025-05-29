"use client"

import type React from "react"

import { MainNav } from "@/components/main-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserNav } from "@/components/user-nav"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ChefHat, ClipboardList, CreditCard, Home, Menu, Package } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Determine the current role from the URL
  const rolePath = pathname.split("/")[2]
  const role = ["waiter", "admin", "kitchen", "billing", "inventory"].includes(rolePath) ? rolePath : "waiter"

  // Role-specific data
  const roleData = {
    waiter: {
      name: "John Waiter",
      email: "john.waiter@restaurant.com",
      icon: Home,
      title: "Waiter Dashboard",
    },
    admin: {
      name: "Admin User",
      email: "admin@restaurant.com",
      icon: ClipboardList,
      title: "Admin Dashboard",
    },
    kitchen: {
      name: "Chef Gordon",
      email: "chef@restaurant.com",
      icon: ChefHat,
      title: "Kitchen Dashboard",
    },
    billing: {
      name: "Billing Staff",
      email: "billing@restaurant.com",
      icon: CreditCard,
      title: "Billing Dashboard",
    },
    inventory: {
      name: "Inventory Manager",
      email: "inventory@restaurant.com",
      icon: Package,
      title: "Inventory Dashboard",
    },
  }

  const currentRole = roleData[role as keyof typeof roleData]
  const RoleIcon = currentRole.icon

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center">
          <div className="md:hidden mr-2">
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px] sm:w-[300px]">
                <div className="flex flex-col gap-6 py-4">
                  <div className="flex items-center gap-2 px-2">
                    <RoleIcon className="h-5 w-5" />
                    <span className="text-lg font-semibold">{currentRole.title}</span>
                  </div>
                  <nav className="flex flex-col gap-2 px-2">
                    <MainNav className="flex flex-col items-start gap-4" role={role} />
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="flex items-center gap-2">
            <RoleIcon className="h-6 w-6" />
            <Link href={`/dashboard/${role}`} className="font-bold">
              {currentRole.title}
            </Link>
          </div>
          <div className="hidden md:flex md:flex-1 md:items-center md:justify-between md:gap-10">
            <MainNav className="mx-6" role={role} />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/waiter">Waiter</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/admin">Admin</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/kitchen">Kitchen</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/billing">Billing</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/inventory">Inventory</Link>
                </Button>
              </div>
              <ThemeToggle />
              <UserNav name={currentRole.name} email={currentRole.email} role={role} />
            </div>
          </div>
          <div className="flex items-center gap-2 md:hidden ml-auto">
            <ThemeToggle />
            <UserNav name={currentRole.name} email={currentRole.email} role={role} />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
