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
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { supabase, type Table, type Order, type OrderItem, type MenuItem, type MenuCategory } from "@/lib/supabase"
import { Check, CreditCard, Edit, Send, Trash } from "lucide-react"
import { useState, useEffect } from "react"

export default function WaiterDashboard() {
  const { toast } = useToast()

  // State
  const [tables, setTables] = useState<Table[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([])
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [newOrder, setNewOrder] = useState<Omit<OrderItem, "id" | "order_id" | "created_at" | "updated_at">[]>([])
  const [orderNotes, setOrderNotes] = useState("")
  const [loading, setLoading] = useState(true)

  // Fetch data on component mount
  useEffect(() => {
    fetchData()

    // Set up real-time subscriptions
    const tablesSubscription = supabase
      .channel("tables")
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, () => {
        fetchTables()
      })
      .subscribe()

    const ordersSubscription = supabase
      .channel("orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders()
      })
      .subscribe()

    const orderItemsSubscription = supabase
      .channel("order_items")
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        fetchOrderItems()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(tablesSubscription)
      supabase.removeChannel(ordersSubscription)
      supabase.removeChannel(orderItemsSubscription)
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchTables(), fetchOrders(), fetchOrderItems(), fetchMenuItems(), fetchMenuCategories()])
    setLoading(false)
  }

  const fetchTables = async () => {
    const { data, error } = await supabase.from("tables").select("*").order("number")

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch tables",
        variant: "destructive",
      })
    } else {
      setTables(data || [])
    }
  }

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        tables (*)
      `)
      .in("status", ["pending", "preparing", "ready", "served"])

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

  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select(`
        *,
        menu_categories (*)
      `)
      .eq("is_available", true)
      .order("name")

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch menu items",
        variant: "destructive",
      })
    } else {
      setMenuItems(data || [])
    }
  }

  const fetchMenuCategories = async () => {
    const { data, error } = await supabase.from("menu_categories").select("*").order("display_order")

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch menu categories",
        variant: "destructive",
      })
    } else {
      setMenuCategories(data || [])
    }
  }

  // Get orders for a specific table
  const getTableOrders = (tableId: number) => {
    return orders.filter((order) => order.table_id === tableId)
  }

  // Get order items for a specific order
  const getOrderItems = (orderId: number) => {
    return orderItems.filter((item) => item.order_id === orderId)
  }

  // Handle table selection
  const handleTableSelect = (table: Table) => {
    setSelectedTable(table)
    setNewOrder([])
    setOrderNotes("")
  }

  // Add item to new order
  const addItemToOrder = (item: MenuItem) => {
    const existingItem = newOrder.find((orderItem) => orderItem.menu_item_id === item.id)

    if (existingItem) {
      setNewOrder(
        newOrder.map((orderItem) =>
          orderItem.menu_item_id === item.id ? { ...orderItem, quantity: orderItem.quantity + 1 } : orderItem,
        ),
      )
    } else {
      setNewOrder([
        ...newOrder,
        {
          menu_item_id: item.id,
          quantity: 1,
          price: item.price,
          notes: "",
          status: "pending",
        },
      ])
    }
  }

  // Remove item from new order
  const removeItemFromOrder = (menuItemId: number) => {
    setNewOrder(newOrder.filter((item) => item.menu_item_id !== menuItemId))
  }

  // Update item quantity in new order
  const updateItemQuantity = (menuItemId: number, quantity: number) => {
    if (quantity < 1) return

    setNewOrder(newOrder.map((item) => (item.menu_item_id === menuItemId ? { ...item, quantity } : item)))
  }

  // Update item notes in new order
  const updateItemNotes = (menuItemId: number, notes: string) => {
    setNewOrder(newOrder.map((item) => (item.menu_item_id === menuItemId ? { ...item, notes } : item)))
  }

  // Place order
  const placeOrder = async () => {
    if (!selectedTable || newOrder.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the order",
        variant: "destructive",
      })
      return
    }

    try {
      // Calculate totals
      const subtotal = newOrder.reduce((total, item) => total + item.price * item.quantity, 0)
      const tax = subtotal * 0.1 // 10% tax
      const total = subtotal + tax

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          table_id: selectedTable.id,
          status: "pending",
          notes: orderNotes,
          subtotal,
          tax,
          discount: 0,
          total,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItemsToInsert = newOrder.map((item) => ({
        order_id: orderData.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes,
        status: "pending" as const,
      }))

      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsToInsert)

      if (itemsError) throw itemsError

      // Update table status
      const { error: tableError } = await supabase
        .from("tables")
        .update({ status: "occupied" })
        .eq("id", selectedTable.id)

      if (tableError) throw tableError

      // Reset form
      setNewOrder([])
      setOrderNotes("")

      toast({
        title: "Order Placed",
        description: `Order has been sent to the kitchen for Table ${selectedTable.number}`,
      })

      // Refresh data
      fetchData()
    } catch (error) {
      console.error("Error placing order:", error)
      toast({
        title: "Error",
        description: "Failed to place order",
        variant: "destructive",
      })
    }
  }

  // Update order status
  const updateOrderStatus = async (orderId: number, status: "pending" | "preparing" | "ready" | "served" | "paid") => {
    try {
      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId)

      if (error) throw error

      // If marking as paid, update table status to free
      if (status === "paid") {
        const order = orders.find((o) => o.id === orderId)
        if (order) {
          await supabase.from("tables").update({ status: "free" }).eq("id", order.table_id)
        }
      }

      toast({
        title: `Order ${status === "served" ? "Served" : status === "paid" ? "Paid" : "Updated"}`,
        description: `Order has been marked as ${status}`,
      })

      fetchData()
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      })
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "free":
        return "bg-green-500"
      case "occupied":
        return "bg-blue-500"
      case "bill-pending":
        return "bg-amber-500"
      default:
        return "bg-gray-500"
    }
  }

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case "free":
        return "Free"
      case "occupied":
        return "Occupied"
      case "bill-pending":
        return "Bill Pending"
      default:
        return "Unknown"
    }
  }

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading tables...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Table Layout</h1>
          <p className="text-muted-foreground">Select a table to manage orders</p>
        </div>

        <Tabs defaultValue="AC">
          <TabsList className="mb-4">
            <TabsTrigger value="AC">AC Section</TabsTrigger>
            <TabsTrigger value="Non-AC">Non-AC Section</TabsTrigger>
            <TabsTrigger value="Outdoor">Outdoor Section</TabsTrigger>
          </TabsList>

          {["AC", "Non-AC", "Outdoor"].map((zone) => (
            <TabsContent key={zone} value={zone} className="mt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tables
                  .filter((table) => table.zone === zone)
                  .map((table) => {
                    const tableOrders = getTableOrders(table.id)
                    return (
                      <Card
                        key={table.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          selectedTable?.id === table.id && "ring-2 ring-primary",
                        )}
                        onClick={() => handleTableSelect(table)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle>Table {table.number}</CardTitle>
                            <Badge className={cn("text-white", getStatusColor(table.status))}>
                              {getStatusText(table.status)}
                            </Badge>
                          </div>
                          <CardDescription>{table.seats} Seats</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm">
                            {tableOrders.length > 0 ? <p>{tableOrders.length} order(s)</p> : <p>No active orders</p>}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {selectedTable && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Table {selectedTable.number} - Orders</span>
                  <Badge className={cn("text-white", getStatusColor(selectedTable.status))}>
                    {getStatusText(selectedTable.status)}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {selectedTable.zone} Section - {selectedTable.seats} Seats
                </CardDescription>
              </CardHeader>
              <CardContent>
                {getTableOrders(selectedTable.id).length > 0 ? (
                  <div className="space-y-4">
                    {getTableOrders(selectedTable.id).map((order) => {
                      const items = getOrderItems(order.id)
                      return (
                        <Card key={order.id}>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-base">Order #{order.id}</CardTitle>
                              <Badge
                                variant={
                                  order.status === "pending"
                                    ? "outline"
                                    : order.status === "served"
                                      ? "secondary"
                                      : "default"
                                }
                              >
                                {order.status}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="pb-2">
                            <ul className="space-y-1">
                              {items.map((item) => (
                                <li key={item.id} className="flex justify-between text-sm">
                                  <span>
                                    {item.quantity}x {item.menu_items?.name}
                                    {item.notes && (
                                      <span className="text-xs text-muted-foreground ml-2">({item.notes})</span>
                                    )}
                                  </span>
                                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                                </li>
                              ))}
                            </ul>
                            {order.notes && (
                              <div className="mt-2 text-sm">
                                <span className="font-medium">Notes:</span> {order.notes}
                              </div>
                            )}
                            <div className="mt-3 pt-3 border-t flex justify-between font-medium">
                              <span>Total</span>
                              <span>₹{order.total.toFixed(2)}</span>
                            </div>
                          </CardContent>
                          <CardFooter className="flex gap-2">
                            {order.status === "pending" && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="flex-1"
                                onClick={() => updateOrderStatus(order.id, "served")}
                              >
                                <Check className="mr-1 h-4 w-4" /> Mark as Served
                              </Button>
                            )}
                            {order.status === "served" && (
                              <Button
                                variant="default"
                                size="sm"
                                className="flex-1"
                                onClick={() => updateOrderStatus(order.id, "paid")}
                              >
                                <CreditCard className="mr-1 h-4 w-4" /> Mark as Paid
                              </Button>
                            )}
                          </CardFooter>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>No orders for this table</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>New Order</CardTitle>
                <CardDescription>Add items to the order</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={menuCategories[0]?.name || "Starters"}>
                  <TabsList className="mb-4 flex flex-wrap h-auto">
                    {menuCategories.map((category) => (
                      <TabsTrigger key={category.id} value={category.name}>
                        {category.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {menuCategories.map((category) => (
                    <TabsContent key={category.id} value={category.name} className="mt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {menuItems
                          .filter((item) => item.category_id === category.id)
                          .map((item) => (
                            <Button
                              key={item.id}
                              variant="outline"
                              className="justify-between h-auto py-2"
                              onClick={() => addItemToOrder(item)}
                            >
                              <span>{item.name}</span>
                              <span>₹{item.price.toFixed(2)}</span>
                            </Button>
                          ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

                <div className="mt-6">
                  <h3 className="font-medium mb-2">Current Order</h3>
                  {newOrder.length > 0 ? (
                    <div className="space-y-2">
                      {newOrder.map((item) => {
                        const menuItem = menuItems.find((mi) => mi.id === item.menu_item_id)
                        return (
                          <div
                            key={item.menu_item_id}
                            className="flex items-center justify-between border rounded-md p-2"
                          >
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <span className="font-medium">{menuItem?.name}</span>
                                <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                              <div className="flex items-center mt-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6 rounded-full"
                                  onClick={() => updateItemQuantity(item.menu_item_id, item.quantity - 1)}
                                >
                                  -
                                </Button>
                                <span className="mx-2 min-w-[1.5rem] text-center">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-6 w-6 rounded-full"
                                  onClick={() => updateItemQuantity(item.menu_item_id, item.quantity + 1)}
                                >
                                  +
                                </Button>

                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="ml-2 h-7">
                                      <Edit className="h-3 w-3 mr-1" /> Notes
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Item Notes</DialogTitle>
                                      <DialogDescription>Add special instructions for this item</DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                      <div className="grid gap-2">
                                        <Label htmlFor="item-notes">Notes</Label>
                                        <Textarea
                                          id="item-notes"
                                          placeholder="E.g., Extra spicy, No onions"
                                          value={item.notes}
                                          onChange={(e) => updateItemNotes(item.menu_item_id, e.target.value)}
                                        />
                                      </div>
                                    </div>
                                    <DialogFooter>
                                      <Button type="submit">Save Notes</Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeItemFromOrder(item.menu_item_id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      })}

                      <div className="mt-4">
                        <Label htmlFor="order-notes">Order Notes</Label>
                        <Textarea
                          id="order-notes"
                          placeholder="Add notes for the entire order"
                          className="mt-1"
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                        />
                      </div>

                      <div className="mt-4 pt-4 border-t flex justify-between font-medium">
                        <span>Total</span>
                        <span>
                          ₹{newOrder.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground border rounded-md">
                      <p>No items added yet</p>
                      <p className="text-sm">Select items from the menu above</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" disabled={newOrder.length === 0} onClick={placeOrder}>
                  <Send className="mr-2 h-4 w-4" /> Place Order
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
