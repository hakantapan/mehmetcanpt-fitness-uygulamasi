"use client"

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  Line,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Download,
  Package,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"

type PeriodKey = "1m" | "3m" | "6m" | "1y"

type Metric = {
  name: string
  value: number
  change: number
  trend: "up" | "down"
  icon: string
}

type RevenuePoint = {
  month: string
  revenue: number
  expenses: number
  profit: number
  subscriptions: number
}

type PackageStat = {
  name: string
  sales: number
  revenue: number
  color: string
}

type PaymentStat = {
  method: string
  amount: number
  percentage: number
  transactions: number
}

type CustomerStat = {
  name: string
  email: string
  totalSpent: number
  orders: number
  ltv: number
}

type Transaction = {
  id: string
  customer: string
  amount: number
  package: string | null
  method: string
  status: "completed" | "pending" | "failed"
  date: string
}

type ExpenseCategory = {
  category: string
  amount: number
  percentage: number
}

type FinancialResponse = {
  metrics: Metric[]
  revenue: RevenuePoint[]
  packageSales: PackageStat[]
  paymentMethods: PaymentStat[]
  topCustomers: CustomerStat[]
  transactions: Transaction[]
  expenses: ExpenseCategory[]
}

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "1m", label: "Son 1 Ay" },
  { value: "3m", label: "Son 3 Ay" },
  { value: "6m", label: "Son 6 Ay" },
  { value: "1y", label: "Son 1 Yıl" },
]

export default function FinancialReports() {
  const [period, setPeriod] = useState<PeriodKey>("6m")
  const [data, setData] = useState<FinancialResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchFinancialData = useCallback(
    async (selectedPeriod: PeriodKey, signal?: AbortSignal) => {
      try {
        setError(null)
        const response = await fetch(`/api/admin/financial?period=${selectedPeriod}`, {
          cache: "no-store",
          signal,
        })

        if (!response.ok) {
          const body = await response.json().catch(() => null)
          throw new Error(body?.error || "Finansal veriler yüklenemedi")
        }

        const payload: FinancialResponse = await response.json()
        setData(payload)
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        console.error("Financial reports error:", err)
        setError((err as Error).message || "Finansal veriler yüklenemedi")
        setData(null)
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setIsRefreshing(false)
    void fetchFinancialData(period, controller.signal)
    return () => controller.abort()
  }, [fetchFinancialData, period])

  const handleExportReport = (type: string) => {
    console.log(`Exporting ${type} report...`)
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value)

  const formatNumber = (value: number) => new Intl.NumberFormat("tr-TR").format(value)

  const metrics = data?.metrics ?? []
  const revenueChart = data?.revenue ?? []
  const packageSales = data?.packageSales ?? []
  const paymentStats = data?.paymentMethods ?? []
  const topCustomers = data?.topCustomers ?? []
  const transactions = data?.transactions ?? []
  const expenses = data?.expenses ?? []

  const totalExpenses = useMemo(() => expenses.reduce((sum, item) => sum + item.amount, 0), [expenses])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Tamamlandı</Badge>
      case "pending":
        return <Badge variant="secondary">Beklemede</Badge>
      case "failed":
        return <Badge variant="destructive">Başarısız</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Finansal Raporlar</h1>
            <p className="text-muted-foreground">Gelir, gider ve karlılık analizleri</p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={period} onValueChange={(value: PeriodKey) => setPeriod(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => handleExportReport("summary")}>
              <Download className="mr-2 h-4 w-4" />
              Rapor İndir
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading && metrics.length === 0
            ? Array.from({ length: 4 }).map((_, index) => (
                <Card key={`metric-skeleton-${index}`} className="space-y-3 p-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-32" />
                  <Skeleton className="h-3 w-16" />
                </Card>
              ))
            : metrics.map((metric) => {
                const iconMap: Record<string, ComponentType<{ className?: string }>> = {
                  DollarSign,
                  TrendingUp,
                  Package,
                  CreditCard,
                }
                const Icon = iconMap[metric.icon] ?? DollarSign
                const TrendIcon = metric.trend === "up" ? ArrowUpRight : ArrowDownRight
                const changeClass = metric.trend === "up" ? "text-green-600" : "text-red-600"
                return (
                  <Card key={metric.name}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(metric.value)}</div>
                      <div className="flex items-center space-x-1 text-xs">
                        <TrendIcon className={`h-3 w-3 ${changeClass}`} />
                        <span className={changeClass}>{`${metric.change >= 0 ? "+" : ""}${metric.change.toFixed(1)}%`}</span>
                        <span className="text-muted-foreground">önceki döneme göre</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="revenue">Gelir Analizi</TabsTrigger>
            <TabsTrigger value="expenses">Gider Analizi</TabsTrigger>
            <TabsTrigger value="customers">Müşteri Analizi</TabsTrigger>
            <TabsTrigger value="transactions">İşlemler</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gelir Trendi</CardTitle>
                <CardDescription>Son 6 aydaki gelir, gider ve kar analizi</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && revenueChart.length === 0 ? (
                  <Skeleton className="h-[320px] w-full rounded-lg" />
                ) : revenueChart.length === 0 ? (
                  <div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                    Gelir verisi bulunamadı.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={revenueChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar yAxisId="left" dataKey="revenue" fill="hsl(var(--chart-2))" name="Gelir" />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="profit"
                        stroke="hsl(var(--chart-1))"
                        fill="hsl(var(--chart-1))"
                        fillOpacity={0.25}
                        name="Kar"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="subscriptions"
                        stroke="hsl(var(--chart-3))"
                        strokeWidth={2}
                        dot={true}
                        name="Abonelik"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Paket Satışları</CardTitle>
                <CardDescription>Paket gelirleri ve satış dağılımı</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-start">
                {loading && packageSales.length === 0 ? (
                  <Skeleton className="h-[240px] w-[240px] rounded-full" />
                ) : packageSales.length === 0 ? (
                  <div className="flex h-[240px] w-full items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                    Paket verisi bulunamadı.
                  </div>
                ) : (
                  <>
                    <PieChart width={260} height={260}>
                      <Pie data={packageSales} dataKey="sales" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                        {packageSales.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                    <div className="space-y-2 text-sm">
                      {packageSales.map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: item.color }} />
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground">{formatNumber(item.sales)} satış</span>
                          <span className="text-muted-foreground">{formatCurrency(item.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ödeme Yöntemleri</CardTitle>
                <CardDescription>Ödeme kanallarına göre gelir dağılımı</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && paymentStats.length === 0 ? (
                  <Skeleton className="h-[320px] w-full rounded-lg" />
                ) : paymentStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ödeme istatistiği bulunamadı.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={paymentStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="method" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="amount" fill="hsl(var(--chart-4))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gider Dağılımı</CardTitle>
                <CardDescription>Toplam giderler ve kategorilere göre dağılım</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading && expenses.length === 0 ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-12 w-full" />
                    ))}
                  </div>
                ) : expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Gider verisi bulunamadı.</p>
                ) : (
                  <>
                    <div className="rounded-md border p-3 text-sm text-muted-foreground">
                      Toplam gider: <span className="font-semibold text-foreground">{formatCurrency(totalExpenses)}</span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Tutar</TableHead>
                          <TableHead>Yüzde</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => (
                          <TableRow key={expense.category}>
                            <TableCell>{expense.category}</TableCell>
                            <TableCell>{formatCurrency(expense.amount)}</TableCell>
                            <TableCell>{expense.percentage}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>En İyi Müşteriler</CardTitle>
                <CardDescription>Harcamaya göre en değerli müşteriler</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && topCustomers.length === 0 ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} className="h-12 w-full" />
                    ))}
                  </div>
                ) : topCustomers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Müşteri verisi bulunamadı.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Müşteri</TableHead>
                        <TableHead>Harcanan</TableHead>
                        <TableHead>Sipariş</TableHead>
                        <TableHead>LTV</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topCustomers.map((customer) => (
                        <TableRow key={`${customer.email}-${customer.name}`}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{customer.name}</span>
                              <span className="text-xs text-muted-foreground">{customer.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(customer.totalSpent)}</TableCell>
                          <TableCell>{customer.orders}</TableCell>
                          <TableCell>{formatCurrency(customer.ltv)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Son İşlemler</CardTitle>
                <CardDescription>En yeni ödeme hareketleri ve durumları</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && transactions.length === 0 ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} className="h-12 w-full" />
                    ))}
                  </div>
                ) : transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">İşlem bulunamadı.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Müşteri</TableHead>
                        <TableHead>Paketi</TableHead>
                        <TableHead>Ödeme</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead className="text-right">Tutar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono text-xs">{transaction.id}</TableCell>
                          <TableCell>{transaction.customer}</TableCell>
                          <TableCell>{transaction.package ?? "-"}</TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              <span className="font-medium text-foreground">{transaction.method}</span>
                              {getStatusBadge(transaction.status)}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(transaction.date), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
