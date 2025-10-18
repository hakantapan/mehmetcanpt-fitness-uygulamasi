"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  LineChart,
  Line,
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
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Server,
  Cpu,
  HardDrive,
  Download,
  RefreshCw,
  Clock,
} from "lucide-react"

type PeriodKey = "1d" | "7d" | "30d" | "90d"

type SystemMetric = {
  name: string
  value: string
  change: string
  status: "normal" | "warning" | "good"
  icon: string
}

type BusinessMetric = {
  name: string
  value: number
  change: number
  trend: "up" | "down"
}

type UserActivityPoint = {
  time: string
  users: number
}

type RevenuePoint = {
  month: string
  revenue: number
  users: number
  packages: number
}

type PackagePoint = {
  name: string
  value: number
  color?: string
}

type SystemPerformancePoint = {
  time: string
  cpu: number
  ram: number
  disk: number
}

type TopPage = {
  page: string
  views: number
  bounce: number
}

type StatisticsResponse = {
  systemMetrics: SystemMetric[]
  businessMetrics: BusinessMetric[]
  userActivity: UserActivityPoint[]
  revenue: RevenuePoint[]
  packageDistribution: PackagePoint[]
  systemPerformance: SystemPerformancePoint[]
  topPages: TopPage[]
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  cpu: Cpu,
  activity: Activity,
  "hard-drive": HardDrive,
  server: Server,
}

const businessMetricIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Kullanıcı: Users,
  Gelir: DollarSign,
  Kayıt: Users,
  Paket: DollarSign,
}

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "1d", label: "Son 24 Saat" },
  { value: "7d", label: "Son 7 Gün" },
  { value: "30d", label: "Son 30 Gün" },
  { value: "90d", label: "Son 3 Ay" },
]

const DEFAULT_STATISTICS: StatisticsResponse = {
  systemMetrics: [],
  businessMetrics: [],
  userActivity: [],
  revenue: [],
  packageDistribution: [],
  systemPerformance: [],
  topPages: [],
}

export default function SystemStatistics() {
  const [period, setPeriod] = useState<PeriodKey>("7d")
  const [statistics, setStatistics] = useState<StatisticsResponse>(DEFAULT_STATISTICS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchStatistics = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/admin/statistics?period=${period}`, {
          signal,
          cache: "no-store",
        })

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || "İstatistikler yüklenemedi")
        }

        const data = await response.json()
        setStatistics({
          systemMetrics: Array.isArray(data.systemMetrics) ? data.systemMetrics : [],
          businessMetrics: Array.isArray(data.businessMetrics) ? data.businessMetrics : [],
          userActivity: Array.isArray(data.userActivity) ? data.userActivity : [],
          revenue: Array.isArray(data.revenue) ? data.revenue : [],
          packageDistribution: Array.isArray(data.packageDistribution) ? data.packageDistribution : [],
          systemPerformance: Array.isArray(data.systemPerformance) ? data.systemPerformance : [],
          topPages: Array.isArray(data.topPages) ? data.topPages : [],
        })
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        console.error("Statistics fetch error:", err)
        setError((err as Error).message || "İstatistikler yüklenemedi")
        setStatistics(DEFAULT_STATISTICS)
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    },
    [period],
  )

  useEffect(() => {
    const controller = new AbortController()
    void fetchStatistics(controller.signal)
    return () => controller.abort()
  }, [fetchStatistics])

  const handleRefresh = () => {
    setIsRefreshing(true)
    void fetchStatistics()
  }

  const handleExport = () => {
    console.log("Exporting statistics…")
  }

  const systemMetricsCards = useMemo(() => statistics.systemMetrics, [statistics.systemMetrics])
  const businessMetricCards = useMemo(() => statistics.businessMetrics, [statistics.businessMetrics])

  const formatNumber = (value: number) => new Intl.NumberFormat("tr-TR").format(value)

  const formatBusinessValue = (metric: BusinessMetric) => {
    if (metric.name.toLowerCase().includes("gelir")) {
      return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0,
      }).format(metric.value)
    }
    return formatNumber(metric.value)
  }

  const getBusinessIcon = (name: string) => {
    const match = Object.entries(businessMetricIconMap).find(([key]) => name.includes(key))
    return match ? match[1] : TrendingUp
  }

  const packageColors = statistics.packageDistribution.map((item) => item.color ?? "#3b82f6")

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sistem İstatistikleri</h1>
            <p className="text-muted-foreground">Detaylı sistem performansı ve iş metrikleri</p>
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
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing || loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Yenile
            </Button>
            <Button size="sm" onClick={handleExport}>
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

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="system">Sistem Performansı</TabsTrigger>
            <TabsTrigger value="business">İş Metrikleri</TabsTrigger>
            <TabsTrigger value="analytics">Analitik</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* System Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {loading && systemMetricsCards.length === 0
                ? Array.from({ length: 4 }).map((_, index) => (
                    <Card key={`system-skeleton-${index}`} className="space-y-3 p-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-7 w-20" />
                      <Skeleton className="h-3 w-12" />
                    </Card>
                  ))
                : systemMetricsCards.map((metric) => {
                    const IconComponent = ICON_MAP[metric.icon] ?? Activity
                    const badgeVariant =
                      metric.status === "good" ? "default" : metric.status === "warning" ? "destructive" : "secondary"
                    return (
                      <Card key={metric.name}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{metric.value}</div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={badgeVariant}>{metric.change}</Badge>
                            <span className="text-xs text-muted-foreground">son döneme göre</span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
            </div>

            {/* Business Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {loading && businessMetricCards.length === 0
                ? Array.from({ length: 4 }).map((_, index) => (
                    <Card key={`business-skeleton-${index}`} className="space-y-3 p-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-7 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </Card>
                  ))
                : businessMetricCards.map((metric) => {
                    const IconComponent = getBusinessIcon(metric.name)
                    const changeClass = metric.trend === "up" ? "text-green-600" : "text-red-600"
                    return (
                      <Card key={metric.name}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatBusinessValue(metric)}</div>
                          <div className="flex items-center space-x-1">
                            {metric.trend === "up" ? (
                              <TrendingUp className="h-3 w-3 text-green-600" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-600" />
                            )}
                            <span className={`text-xs ${changeClass}`}>
                              {metric.change >= 0 ? `+${metric.change.toFixed(1)}%` : `${metric.change.toFixed(1)}%`}
                            </span>
                            <span className="text-xs text-muted-foreground">önceki döneme göre</span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
            </div>

            {/* User activity chart */}
            <Card>
              <CardHeader>
                <CardTitle>Kullanıcı Aktivitesi</CardTitle>
                <CardDescription>Seçilen periyottaki aktif kullanıcı dağılımı</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && statistics.userActivity.length === 0 ? (
                  <Skeleton className="h-[300px] w-full rounded-lg" />
                ) : statistics.userActivity.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                    Aktivite verisi bulunamadı.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={statistics.userActivity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="users" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Anlık Performans</CardTitle>
                <CardDescription>CPU, RAM ve disk kullanımının zamana göre değişimi</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && statistics.systemPerformance.length === 0 ? (
                  <Skeleton className="h-[320px] w-full rounded-lg" />
                ) : statistics.systemPerformance.length === 0 ? (
                  <div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                    Performans verisi bulunamadı.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={statistics.systemPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="cpu" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} />
                      <Area type="monotone" dataKey="ram" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                      <Area type="monotone" dataKey="disk" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="business" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gelir ve Kullanıcı Büyümesi</CardTitle>
                <CardDescription>Son 6 aydaki gelir ve kullanıcı trendleri</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && statistics.revenue.length === 0 ? (
                  <Skeleton className="h-[320px] w-full rounded-lg" />
                ) : statistics.revenue.length === 0 ? (
                  <div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                    Gelir verisi bulunamadı.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedRevenueChart data={statistics.revenue} />
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Paket Dağılımı</CardTitle>
                <CardDescription>Aktif paketlerin satış dağılımı</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 lg:flex-row lg:items-start">
                {loading && statistics.packageDistribution.length === 0 ? (
                  <Skeleton className="h-[240px] w-[240px] rounded-full" />
                ) : statistics.packageDistribution.length === 0 ? (
                  <div className="flex h-[240px] w-full items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                    Paket verisi bulunamadı.
                  </div>
                ) : (
                  <>
                    <PieChart width={260} height={260}>
                      <Pie
                        data={statistics.packageDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        label
                      >
                        {statistics.packageDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={packageColors[index]} />
                        ))}
                      </Pie>
                    </PieChart>
                    <div className="space-y-2 text-sm">
                      {statistics.packageDistribution.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded"
                            style={{ backgroundColor: packageColors[index] }}
                          />
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground">{formatNumber(item.value)} satış</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>En Popüler Sayfalar</CardTitle>
                <CardDescription>Platformunuzda en çok ziyaret edilen sayfalar</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && statistics.topPages.length === 0 ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={`page-skeleton-${index}`} className="h-10 w-full" />
                    ))}
                  </div>
                ) : statistics.topPages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sayfa analizi verisi bulunamadı.</p>
                ) : (
                  <div className="space-y-3">
                    {statistics.topPages.map((item) => (
                      <div key={item.page} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium text-foreground">{item.page}</p>
                          <p className="text-xs text-muted-foreground">Hemen çıkma oranı: %{item.bounce}</p>
                        </div>
                        <Badge variant="secondary">{formatNumber(item.views)} görüntülenme</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}

function ComposedRevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis yAxisId="left" />
      <YAxis yAxisId="right" orientation="right" />
      <Tooltip
        formatter={(value: number, name: string) =>
          name === "revenue"
            ? new Intl.NumberFormat("tr-TR", {
                style: "currency",
                currency: "TRY",
                maximumFractionDigits: 0,
              }).format(value)
            : value
        }
      />
      <Bar yAxisId="left" dataKey="revenue" fill="hsl(var(--chart-2))" />
      <Line
        yAxisId="right"
        type="monotone"
        dataKey="users"
        stroke="hsl(var(--chart-1))"
        strokeWidth={2}
        dot={true}
      />
      <Line
        yAxisId="right"
        type="monotone"
        dataKey="packages"
        stroke="hsl(var(--chart-3))"
        strokeWidth={2}
        dot={true}
      />
    </BarChart>
  )
}
