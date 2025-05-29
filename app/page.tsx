import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChefHat, ClipboardList, CreditCard, Home, Package } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="w-full max-w-md">
        <Card className="border-2">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold">Restaurant POS</CardTitle>
            <CardDescription>Enter your credentials to sign in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" placeholder="name@example.com" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" placeholder="••••••••" type="password" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full" asChild>
              <Link href="/dashboard">Sign In</Link>
            </Button>
            <div className="text-center text-sm text-muted-foreground">Select your role to preview:</div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/waiter">
                  <Home className="mr-2 h-4 w-4" />
                  Waiter
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/admin">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Admin
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/kitchen">
                  <ChefHat className="mr-2 h-4 w-4" />
                  Kitchen
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/billing">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="col-span-2" asChild>
                <Link href="/dashboard/inventory">
                  <Package className="mr-2 h-4 w-4" />
                  Inventory
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
