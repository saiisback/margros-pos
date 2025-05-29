"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { supabase, type InventoryItem, type InventoryCategory } from "@/lib/supabase"
import { AlertTriangle, ArrowUp, Edit, Plus, Search, Trash } from "lucide-react"
import { useState, useEffect } from "react"

export default function InventoryDashboard() {
  const { toast } = useToast()

  // State
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState<Omit<InventoryItem, "id" | "created_at" | "updated_at">>({
    name: "",
    category_id: 1,
    quantity: 0,
    unit: "kg",
    restock_threshold: 0,
    price: 0,
    expiry_date: undefined,
    last_restocked: undefined,
  })

  // Fetch data on component mount
  useEffect(() => {
    fetchData()

    // Set up real-time subscriptions
    const inventorySubscription = supabase
      .channel("inventory-items")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, () => {
        fetchInventory()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(inventorySubscription)
    }
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchInventory(), fetchCategories()])
    setLoading(false)
  }

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from("inventory_items")
      .select(`
        *,
        inventory_categories (*)
      `)
      .order("name")

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch inventory items",
        variant: "destructive",
      })
    } else {
      setInventory(data || [])
    }
  }

  const fetchCategories = async () => {
    const { data, error } = await supabase.from("inventory_categories").select("*").order("name")

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      })
    } else {
      setCategories(data || [])
    }
  }

  // Add new item
  const addNewItem = async () => {
    if (!newItem.name || newItem.quantity <= 0 || newItem.restock_threshold <= 0 || newItem.price <= 0) {
      toast({
        title: "Error",
        description: "Please fill all required fields with valid values",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.from("inventory_items").insert(newItem)

      if (error) throw error

      // Reset form
      setNewItem({
        name: "",
        category_id: categories[0]?.id || 1,
        quantity: 0,
        unit: "kg",
        restock_threshold: 0,
        price: 0,
        expiry_date: undefined,
        last_restocked: undefined,
      })

      toast({
        title: "Item Added",
        description: `${newItem.name} has been added to inventory`,
      })

      fetchInventory()
    } catch (error) {
      console.error("Error adding item:", error)
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      })
    }
  }

  // Delete item
  const deleteItem = async (id: number) => {
    try {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Item Deleted",
        description: "The item has been removed from inventory",
      })

      fetchInventory()
    } catch (error) {
      console.error("Error deleting item:", error)
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  // Update item quantity
  const updateItemQuantity = async (id: number, quantity: number) => {
    if (quantity < 0) return

    try {
      const { error } = await supabase.from("inventory_items").update({ quantity }).eq("id", id)

      if (error) throw error

      toast({
        title: "Quantity Updated",
        description: "Inventory quantity has been updated",
      })

      fetchInventory()
    } catch (error) {
      console.error("Error updating quantity:", error)
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      })
    }
  }

  // Get stock level status
  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity <= item.restock_threshold * 0.5) {
      return "critical"
    } else if (item.quantity <= item.restock_threshold) {
      return "low"
    } else {
      return "normal"
    }
  }

  // Get expiry status
  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return "none"

    const today = new Date()
    const expiry = new Date(expiryDate)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry <= 0) {
      return "expired"
    } else if (daysUntilExpiry <= 3) {
      return "soon"
    } else {
      return "good"
    }
  }

  // Filter inventory based on search query
  const filteredInventory = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.inventory_categories?.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Get low stock items
  const lowStockItems = inventory.filter((item) => item.quantity <= item.restock_threshold)

  // Get expiring items
  const expiringItems = inventory.filter((item) => item.expiry_date && getExpiryStatus(item.expiry_date) !== "good")

  // Calculate inventory value
  const inventoryValue = inventory.reduce((total, item) => total + Number(item.quantity) * Number(item.price), 0)

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading inventory...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Inventory Dashboard</h1>
          <p className="text-muted-foreground">Manage stock levels and inventory items</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">{inventory.length}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inventory.length} items</div>
              <p className="text-xs text-muted-foreground">
                {inventory.reduce((total, item) => total + Number(item.quantity), 0)} units in stock
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">{lowStockItems.length}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockItems.length} items</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <span className="text-amber-500 flex items-center mr-1">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                </span>
                Need restocking soon
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">{expiringItems.length}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expiringItems.length} items</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <span className="text-red-500 flex items-center mr-1">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                </span>
                Check expiry dates
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">$</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${inventoryValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <span className="text-green-500 flex items-center mr-1">
                  <ArrowUp className="h-3 w-3 mr-1" /> 5.2%
                </span>
                from last month
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Inventory Items</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search items..."
                    className="pl-8 w-[200px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" /> Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Inventory Item</DialogTitle>
                      <DialogDescription>Fill in the details to add a new item to inventory</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Name
                        </Label>
                        <Input
                          id="name"
                          value={newItem.name}
                          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">
                          Category
                        </Label>
                        <Select
                          value={newItem.category_id.toString()}
                          onValueChange={(value) => setNewItem({ ...newItem, category_id: Number.parseInt(value) })}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="quantity" className="text-right">
                          Quantity
                        </Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={newItem.quantity}
                          onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                          className="col-span-2"
                          min="0"
                        />
                        <Select value={newItem.unit} onValueChange={(value) => setNewItem({ ...newItem, unit: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="liters">liters</SelectItem>
                            <SelectItem value="units">units</SelectItem>
                            <SelectItem value="grams">grams</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="threshold" className="text-right">
                          Restock Threshold
                        </Label>
                        <Input
                          id="threshold"
                          type="number"
                          value={newItem.restock_threshold}
                          onChange={(e) => setNewItem({ ...newItem, restock_threshold: Number(e.target.value) })}
                          className="col-span-3"
                          min="0"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="expiry" className="text-right">
                          Expiry Date
                        </Label>
                        <Input
                          id="expiry"
                          type="date"
                          value={newItem.expiry_date || ""}
                          onChange={(e) => setNewItem({ ...newItem, expiry_date: e.target.value || undefined })}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">
                          Price
                        </Label>
                        <div className="col-span-3 flex items-center">
                          <span className="mr-2">$</span>
                          <Input
                            id="price"
                            type="number"
                            value={newItem.price}
                            onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={addNewItem}>Add Item</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <CardDescription>{filteredInventory.length} items found</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Items</TabsTrigger>
                <TabsTrigger value="low">Low Stock</TabsTrigger>
                <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
              </TabsList>

              {["all", "low", "expiring"].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-0">
                  <div className="border rounded-md">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Name</th>
                          <th className="text-left p-3">Category</th>
                          <th className="text-left p-3">Quantity</th>
                          <th className="text-left p-3 hidden md:table-cell">Stock Level</th>
                          <th className="text-left p-3 hidden lg:table-cell">Expiry</th>
                          <th className="text-right p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInventory
                          .filter((item) => {
                            if (tab === "all") return true
                            if (tab === "low") return Number(item.quantity) <= Number(item.restock_threshold)
                            if (tab === "expiring")
                              return item.expiry_date && getExpiryStatus(item.expiry_date) !== "good"
                            return true
                          })
                          .map((item) => (
                            <tr key={item.id} className="border-b">
                              <td className="p-3 font-medium">{item.name}</td>
                              <td className="p-3">{item.inventory_categories?.name}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-6 w-6 rounded-full"
                                    onClick={() => updateItemQuantity(item.id, Number(item.quantity) - 1)}
                                  >
                                    -
                                  </Button>
                                  <span className="min-w-[3rem] text-center">
                                    {Number(item.quantity)} {item.unit}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-6 w-6 rounded-full"
                                    onClick={() => updateItemQuantity(item.id, Number(item.quantity) + 1)}
                                  >
                                    +
                                  </Button>
                                </div>
                              </td>
                              <td className="p-3 hidden md:table-cell">
                                <div className="flex flex-col gap-1">
                                  <Progress
                                    value={(Number(item.quantity) / (Number(item.restock_threshold) * 2)) * 100}
                                    className="h-2"
                                    indicatorClassName={
                                      getStockStatus(item) === "critical"
                                        ? "bg-red-500"
                                        : getStockStatus(item) === "low"
                                          ? "bg-amber-500"
                                          : "bg-green-500"
                                    }
                                  />
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>
                                      {getStockStatus(item) === "critical"
                                        ? "Critical"
                                        : getStockStatus(item) === "low"
                                          ? "Low"
                                          : "Good"}
                                    </span>
                                    <span>
                                      Threshold: {Number(item.restock_threshold)} {item.unit}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 hidden lg:table-cell">
                                {item.expiry_date ? (
                                  <Badge
                                    variant={
                                      getExpiryStatus(item.expiry_date) === "expired"
                                        ? "destructive"
                                        : getExpiryStatus(item.expiry_date) === "soon"
                                          ? "outline"
                                          : "secondary"
                                    }
                                  >
                                    {getExpiryStatus(item.expiry_date) === "expired"
                                      ? "Expired"
                                      : getExpiryStatus(item.expiry_date) === "soon"
                                        ? "Expiring Soon"
                                        : item.expiry_date}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">N/A</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteItem(item.id)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>

                    {filteredInventory.filter((item) => {
                      if (tab === "all") return true
                      if (tab === "low") return Number(item.quantity) <= Number(item.restock_threshold)
                      if (tab === "expiring") return item.expiry_date && getExpiryStatus(item.expiry_date) !== "good"
                      return true
                    }).length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <p>No items found</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
