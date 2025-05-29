"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { supabase, type Order, type OrderItem, type Payment } from "@/lib/supabase"
import { CreditCard, Download, Printer, Receipt, Wallet } from "lucide-react"
import { useState, useEffect } from "react"

type PaymentMethod = "cash" | "card" | "upi" | "qr"

export default function BillingDashboard() {
  const { toast } = useToast()

  // State
  const [orders, setOrders] = useState<Order[]>([])
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [discount, setDiscount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  // Fetch data on component mount
  useEffect(() => {
    fetchData()

    // Set up real-time subscriptions
    const ordersSubscription = supabase
      .channel("billing-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders()
      })
      .subscribe()

    const paymentsSubscription = supabase
      .channel("payments")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
        fetchPayments()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ordersSubscription)
      supabase.removeChannel(paymentsSubscription)
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchOrders(), fetchOrderItems(), fetchPayments()])
    setLoading(false)
  }

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        tables (*)
      `)
      .in("status", ["served", "ready"])
      .order("created_at", { ascending: false })

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      })
    } else {
      setOrders(data || [])
    }
  }

  const fetchOrderItems = async () => {
    const { data, error } = await supabase.from("order_items").select(`
        *,
        menu_items (*)
      `)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch order items",
        variant: "destructive",
      })
    } else {
      setOrderItems(data || [])
    }
  }

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        orders (
          *,
          tables (*)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch payments",
        variant: "destructive",
      })
    } else {
      setPayments(data || [])
    }
  }

  // Get order items for a specific order
  const getOrderItems = (orderId: number) => {
    return orderItems.filter((item) => item.order_id === orderId)
  }

  // Handle order selection
  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order)
    setDiscount(0)
    setPaymentMethod("cash")
  }

  // Calculate total with discount
  const calculateTotal = (subtotal: number, tax: number) => {
    return subtotal + tax - discount
  }

  // Process payment
  const processPayment = async () => {
    if (!selectedOrder) return

    try {
      const finalTotal = calculateTotal(selectedOrder.subtotal, selectedOrder.tax)

      // Create payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .insert({
          order_id: selectedOrder.id,
          amount: finalTotal,
          payment_method: paymentMethod,
          status: "completed",
        })
        .select()
        .single()

      if (paymentError) throw paymentError

      // Update order status to paid and apply discount
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "paid",
          discount: discount,
          total: finalTotal,
        })
        .eq("id", selectedOrder.id)

      if (orderError) throw orderError

      // Update table status to free
      const { error: tableError } = await supabase
        .from("tables")
        .update({ status: "free" })
        .eq("id", selectedOrder.table_id)

      if (tableError) throw tableError

      toast({
        title: "Payment Processed",
        description: `Payment for Table ${selectedOrder.tables?.number} has been processed successfully`,
      })

      // Reset selected order
      setSelectedOrder(null)
      fetchData()
    } catch (error) {
      console.error("Error processing payment:", error)
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      })
    }
  }

  // Print bill
  const printBill = () => {
    if (!selectedOrder) return

    toast({
      title: "Printing Bill",
      description: `Bill for Table ${selectedOrder.tables?.number} has been sent to the printer`,
    })
  }

  // Download bill
  const downloadBill = () => {
    if (!selectedOrder) return

    toast({
      title: "Downloading Bill",
      description: `Bill for Table ${selectedOrder.tables?.number} has been downloaded`,
    })
  }

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading billing data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Billing Dashboard</h1>
          <p className="text-muted-foreground">Manage payments and generate bills</p>
        </div>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active Bills</TabsTrigger>
            <TabsTrigger value="history">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Bills</CardTitle>
                    <CardDescription>Select an order to generate bill</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className={`p-3 rounded-md border cursor-pointer transition-all hover:shadow-md ${
                            selectedOrder?.id === order.id ? "ring-2 ring-primary" : ""
                          }`}
                          onClick={() => handleOrderSelect(order)}
                        >
                          <div className="flex justify-between items-center">
                            <h3 className="font-medium">Table {order.tables?.number}</h3>
                            <Badge variant={order.status === "ready" ? "default" : "outline"}>
                              {order.status === "ready" ? "Ready" : "Served"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">Order #{order.id}</div>
                          <div className="text-sm font-medium mt-1">${order.total.toFixed(2)}</div>
                        </div>
                      ))}

                      {orders.length === 0 && (
                        <div className="text-center py-6 text-muted-foreground">
                          <p>No pending bills</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-2">
                {selectedOrder ? (
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>Bill for Table {selectedOrder.tables?.number}</CardTitle>
                        <Badge variant={selectedOrder.status === "ready" ? "default" : "outline"}>
                          {selectedOrder.status === "ready" ? "Ready" : "Served"}
                        </Badge>
                      </div>
                      <CardDescription>{new Date(selectedOrder.created_at).toLocaleString()}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="border rounded-md">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">Item</th>
                                <th className="text-center p-2">Qty</th>
                                <th className="text-right p-2">Price</th>
                                <th className="text-right p-2">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getOrderItems(selectedOrder.id).map((item) => (
                                <tr key={item.id} className="border-b last:border-0">
                                  <td className="p-2">{item.menu_items?.name}</td>
                                  <td className="text-center p-2">{item.quantity}</td>
                                  <td className="text-right p-2">${item.price.toFixed(2)}</td>
                                  <td className="text-right p-2">${(item.price * item.quantity).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>${selectedOrder.subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tax</span>
                            <span>${selectedOrder.tax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Discount</span>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={discount}
                                onChange={(e) => setDiscount(Number(e.target.value))}
                                className="w-20 h-8"
                                min="0"
                                max={selectedOrder.subtotal}
                              />
                              <span>$</span>
                            </div>
                          </div>
                          <div className="flex justify-between font-bold text-lg pt-2 border-t">
                            <span>Total</span>
                            <span>${calculateTotal(selectedOrder.subtotal, selectedOrder.tax).toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="pt-4">
                          <Label className="mb-2 block">Payment Method</Label>
                          <RadioGroup
                            value={paymentMethod}
                            onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                            className="grid grid-cols-2 gap-2"
                          >
                            <div className="flex items-center space-x-2 border rounded-md p-2">
                              <RadioGroupItem value="cash" id="cash" />
                              <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer">
                                <Wallet className="h-4 w-4" /> Cash
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 border rounded-md p-2">
                              <RadioGroupItem value="card" id="card" />
                              <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer">
                                <CreditCard className="h-4 w-4" /> Card
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 border rounded-md p-2">
                              <RadioGroupItem value="upi" id="upi" />
                              <Label htmlFor="upi" className="flex items-center gap-2 cursor-pointer">
                                <Receipt className="h-4 w-4" /> UPI
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2 border rounded-md p-2">
                              <RadioGroupItem value="qr" id="qr" />
                              <Label htmlFor="qr" className="flex items-center gap-2 cursor-pointer">
                                <Receipt className="h-4 w-4" /> QR Scan
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div className="pt-2">
                          <Label className="mb-2 block">Split Bill</Label>
                          <Select defaultValue="1">
                            <SelectTrigger>
                              <SelectValue placeholder="Number of splits" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">No split (1)</SelectItem>
                              <SelectItem value="2">Split in 2</SelectItem>
                              <SelectItem value="3">Split in 3</SelectItem>
                              <SelectItem value="4">Split in 4</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-wrap gap-2">
                      <Button variant="outline" className="flex-1" onClick={printBill}>
                        <Printer className="mr-2 h-4 w-4" /> Print Bill
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={downloadBill}>
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full mt-2">Process Payment</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirm Payment</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to process payment for Table {selectedOrder.tables?.number}?
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <div className="flex justify-between font-medium">
                              <span>Total Amount:</span>
                              <span>${calculateTotal(selectedOrder.subtotal, selectedOrder.tax).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Payment Method:</span>
                              <span className="capitalize">{paymentMethod}</span>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" className="w-full sm:w-auto">
                              Cancel
                            </Button>
                            <Button onClick={processPayment} className="w-full sm:w-auto">
                              Confirm Payment
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardFooter>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
                      <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Order Selected</h3>
                      <p className="text-muted-foreground">Select an order from the list to generate a bill</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Recent payments and transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Payment ID</th>
                        <th className="text-left p-3">Table</th>
                        <th className="text-left p-3">Date & Time</th>
                        <th className="text-left p-3">Amount</th>
                        <th className="text-left p-3">Payment Method</th>
                        <th className="text-right p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b">
                          <td className="p-3">PAY-{payment.id}</td>
                          <td className="p-3">Table {payment.orders?.tables?.number}</td>
                          <td className="p-3">{new Date(payment.created_at).toLocaleString()}</td>
                          <td className="p-3">${payment.amount.toFixed(2)}</td>
                          <td className="p-3 capitalize">{payment.payment_method}</td>
                          <td className="p-3 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm">
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground">Page 1 of {Math.ceil(payments.length / 10)}</div>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
