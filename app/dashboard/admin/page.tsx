"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase, type Order, type Payment } from "@/lib/supabase"
import { ArrowDown, ArrowUp, CreditCard, DollarSign, ShoppingBag, Users } from "lucide-react"
import { useState, useEffect } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export default function AdminDashboard() {
  // State
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    averageBill: 0,
  })

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    await Promise.all([fetchOrders(), fetchPayments()])
    setLoading(false)
  }

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        tables (*),
        order_items (
          *,
          menu_items (*)
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching orders:", error)
    } else {
      setOrders(data || [])
      calculateStats(data || [])
    }
  }

  const fetchPayments = async () => {
    const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching payments:", error)
    } else {
      setPayments(data || [])
    }
  }

  const calculateStats = (ordersData: Order[]) => {
    const totalRevenue = ordersData
      .filter((order) => order.status === "paid")
      .reduce((sum, order) => sum + Number(order.total), 0)

    const totalOrders = ordersData.length
    const totalCustomers = new Set(ordersData.map((order) => order.table_id)).size
    const averageBill = totalOrders > 0 ? totalRevenue / totalOrders : 0

    setStats({
      totalRevenue,
      totalOrders,
      totalCustomers,
      averageBill,
    })
  }

  // Sample data for charts (you can replace with real data processing)
  const revenueData = [
    { name: "Mon", revenue: 1200 },
    { name: "Tue", revenue: 1800 },
    { name: "Wed", revenue: 1500 },
    { name: "Thu", revenue: 2000 },
    { name: "Fri", revenue: 2400 },
    { name: "Sat", revenue: 2800 },
    { name: "Sun", revenue: 3200 },
  ]

  const categoryData = [
    { name: "Starters", value: 1200, fill: "#3b82f6" },
    { name: "Main Course", value: 2800, fill: "#10b981" },
    { name: "Desserts", value: 800, fill: "#f59e0b" },
    { name: "Beverages", value: 1600, fill: "#ef4444" },
  ]

  const monthlyRevenueData = [
    { name: "Jan", revenue: 18000 },
    { name: "Feb", revenue: 20000 },
    { name: "Mar", revenue: 22000 },
    { name: "Apr", revenue: 25000 },
    { name: "May", revenue: 28000 },
    { name: "Jun", revenue: 30000 },
    { name: "Jul", revenue: 32000 },
    { name: "Aug", revenue: 35000 },
    { name: "Sep", revenue: 33000 },
    { name: "Oct", revenue: 30000 },
    { name: "Nov", revenue: 28000 },
    { name: "Dec", revenue: 32000 },
  ]

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of restaurant performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <span className="text-green-500 flex items-center mr-1">
                  <ArrowUp className="h-3 w-3 mr-1" /> 20.1%
                </span>
                from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <span className="text-green-500 flex items-center mr-1">
                  <ArrowUp className="h-3 w-3 mr-1" /> 12.2%
                </span>
                from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tables Served</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.totalCustomers}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <span className="text-green-500 flex items-center mr-1">
                  <ArrowUp className="h-3 w-3 mr-1" /> 5.7%
                </span>
                from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Bill</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.averageBill.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <span className="text-red-500 flex items-center mr-1">
                  <ArrowDown className="h-3 w-3 mr-1" /> 3.2%
                </span>
                from last month
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="daily" className="w-full">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Export
              </Button>
              <Button variant="outline" size="sm">
                Print
              </Button>
            </div>
          </div>

          <TabsContent value="daily" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue</CardTitle>
                <CardDescription>Revenue breakdown for the current week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Revenue</CardTitle>
                <CardDescription>Revenue breakdown for the last 4 weeks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: "Week 1", revenue: 8500 },
                        { name: "Week 2", revenue: 9200 },
                        { name: "Week 3", revenue: 10500 },
                        { name: "Week 4", revenue: 12000 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
                <CardDescription>Revenue breakdown for the current year</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="yearly" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Yearly Revenue</CardTitle>
                <CardDescription>Revenue breakdown for the last 5 years</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: "2020", revenue: 250000 },
                        { name: "2021", revenue: 300000 },
                        { name: "2022", revenue: 350000 },
                        { name: "2023", revenue: 400000 },
                        { name: "2024", revenue: 450000 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
              <CardDescription>Revenue by menu category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Selling Items</CardTitle>
              <CardDescription>Most popular menu items by quantity sold</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={[
                      { name: "Beef Burger", quantity: 350 },
                      { name: "Margherita Pizza", quantity: 310 },
                      { name: "Spaghetti Carbonara", quantity: 280 },
                      { name: "Chicken Wings", quantity: 250 },
                      { name: "Chocolate Cake", quantity: 220 },
                    ]}
                    margin={{ top: 20, right: 20, bottom: 20, left: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantity" name="Quantity Sold" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
