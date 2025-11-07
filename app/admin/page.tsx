"use client"

import { useEffect, useMemo, useState } from "react"
import ResponsiveLayout from "@/components/responsive-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Users,
  UserCheck,
  DollarSign,
  TrendingUp,
  Server,
  Database,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  LogOut,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { formatDistanceToNowStrict } from "date-fns/formatDistanceToNowStrict"
import { tr } from "date-fns/locale/tr"

type LogLevelType = "INFO" | "WARN" | "ERROR" | "AUDIT"

type AdminLogItem = {
  id: string
  level: LogLevelType
  message: string
  context?: Record<string, unknown> | null
  actorId?: string | null
  actorEmail?: string | null
  source?: string | null
  createdAt: string
}

type DashboardStat = {
  label: string
  value: number
  change: number
}

type DashboardHealth = {
  name: string
  status: "online" | "warning" | "offline"
  uptime: number
  icon: string
}

type DashboardChartPoint = {
  month: string
  users: number
  revenue: number
}

const LOG_LEVEL_OPTIONS: Array<{ label: string; value: "ALL" | LogLevelType }> = [
  { label: "Tümü", value: "ALL" },
  { label: "Bilgi", value: "INFO" },
  { label: "Uyarı", value: "WARN" },
  { label: "Hata", value: "ERROR" },
  { label: "Denetim", value: "AUDIT" },
]

const levelStyles: Record<LogLevelType, { label: string; className: string }> = {
  INFO: { label: "Bilgi", className: "border-blue-200 bg-blue-50 text-blue-700" },
  WARN: { label: "Uyarı", className: "border-amber-200 bg-amber-50 text-amber-700" },
  ERROR: { label: "Hata", className: "border-red-200 bg-red-50 text-red-700" },
  AUDIT: { label: "Denetim", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
}

export default function AdminDashboard() {

  const [stats, setStats] = useState<DashboardStat[]>([])
  const [health, setHealth] = useState<DashboardHealth[]>([])
  const [chartData, setChartData] = useState<DashboardChartPoint[]>([])
  const [trainerCount, setTrainerCount] = useState(0)
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  const [logs, setLogs] = useState<AdminLogItem[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [logLevelFilter, setLogLevelFilter] = useState<"ALL" | LogLevelType>("ALL")
  const [logSearchInput, setLogSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    const fetchDashboard = async () => {
      try {
        setDashboardLoading(true)
        setDashboardError(null)

        const response = await fetch("/api/admin/dashboard", {
          signal: controller.signal,
          cache: "no-store",
        })

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || "Panel verileri yüklenemedi")
        }

        const data = await response.json()
        setStats(Array.isArray(data?.stats) ? data.stats : [])
        setHealth(Array.isArray(data?.health) ? data.health : [])
        setChartData(Array.isArray(data?.chart) ? data.chart : [])
        setTrainerCount(typeof data?.trainerCount === "number" ? data.trainerCount : 0)
      } catch (error) {
        if ((error as Error).name === "AbortError") return
        console.error("Dashboard stats fetch error:", error)
        setDashboardError((error as Error).message || "Panel verileri yüklenemedi")
      } finally {
        setDashboardLoading(false)
      }
    }

    fetchDashboard()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(logSearchInput.trim())
    }, 400)

    return () => clearTimeout(timeout)
  }, [logSearchInput])

  useEffect(() => {
    const controller = new AbortController()

    const fetchLogs = async () => {
      try {
        setLogsLoading(true)
        setLogsError(null)

        const params = new URLSearchParams()
        if (logLevelFilter !== "ALL") {
          params.set("level", logLevelFilter)
        }
        if (debouncedSearch) {
          params.set("q", debouncedSearch)
        }
        params.set("limit", "50")

        const response = await fetch(`/api/admin/logs?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        })

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || "Loglar yüklenemedi")
        }

        const data = await response.json()
        setLogs(Array.isArray(data?.items) ? data.items : [])
      } catch (error) {
        if ((error as Error).name === "AbortError") return
        console.error("Admin logs fetch error:", error)
        setLogsError((error as Error).message || "Loglar yüklenemedi")
      } finally {
        setLogsLoading(false)
        setIsRefreshing(false)
      }
    }

    fetchLogs()

    return () => controller.abort()
  }, [logLevelFilter, debouncedSearch])

  const extendedStats = useMemo(() => {
    const list = [...stats]
    if (trainerCount) {
      list.push({
        label: "Aktif Eğitmen",
        value: trainerCount,
        change: 0,
      })
    }
    return list
  }, [stats, trainerCount])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(value)

  const formatNumber = (value: number) => new Intl.NumberFormat("tr-TR").format(value)

  const formatStatValue = (label: string, value: number) => {
    if (label.toLowerCase().includes("gelir")) {
      return formatCurrency(value)
    }
    if (label.toLowerCase().includes("performans")) {
      return `${value.toFixed(1)}%`
    }
    return formatNumber(value)
  }

  const getStatIcon = (label: string) => {
    if (label.includes("Kullanıcı")) return Users
    if (label.includes("Danışan")) return UserCheck
    if (label.includes("Gelir")) return DollarSign
    if (label.includes("Eğitmen")) return Server
    return TrendingUp
  }

  const getServiceIcon = (icon: string) => {
    if (icon === "server") return Server
    if (icon === "database") return Database
    if (icon === "shield") return Shield
    return Activity
  }

  const handleSignOut = () => {
    signOut({
      callbackUrl: "/login",
      redirect: true,
    })
  }

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sistem Yönetimi</h1>
            <p className="text-muted-foreground">Fitness platformunuzun genel durumu ve istatistikleri</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              Rapor İndir
            </Button>
            <Button size="sm">Yedek Al</Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Çıkış Yap
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {dashboardError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {dashboardError}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {dashboardLoading && extendedStats.length === 0
              ? Array.from({ length: 4 }).map((_, index) => (
                  <Card key={`stat-skeleton-${index}`} className="space-y-3 p-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="h-3 w-28" />
                  </Card>
                ))
              : extendedStats.map((stat) => {
                  const IconComponent = getStatIcon(stat.label)
                  const change = Number.isFinite(stat.change) ? stat.change : 0
                  const changeDisplay = `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`
                  const changeClass = change >= 0 ? "text-green-600" : "text-red-600"
                  return (
                    <Card key={stat.label}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatStatValue(stat.label, stat.value)}</div>
                        <p className="text-xs text-muted-foreground">
                          <span className={changeClass}>{changeDisplay}</span> geçen aya göre
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle>Sistem Durumu</CardTitle>
              <CardDescription>Sunucu ve servislerin anlık durumu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboardLoading && health.length === 0 ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={`health-skeleton-${index}`} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : health.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sistem durumu bilgisi bulunamadı.</p>
              ) : (
                health.map((service) => {
                  const IconComponent = getServiceIcon(service.icon)
                  const badgeVariant =
                    service.status === "online"
                      ? "default"
                      : service.status === "warning"
                        ? "destructive"
                        : "outline"
                  return (
                    <div key={service.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{service.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{`${service.uptime.toFixed(1)}%`}</span>
                        <Badge variant={badgeVariant}>
                          {service.status === "online" ? (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          ) : (
                            <AlertTriangle className="mr-1 h-3 w-3" />
                          )}
                          {service.status === "online" ? "Çevrimiçi" : "Uyarı"}
                        </Badge>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Admin Logs */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Yönetim Logları</CardTitle>
                  <CardDescription>Sistem aktiviteleri, denetim kayıtları ve uyarılar</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Input
                      placeholder="Loglarda ara..."
                      value={logSearchInput}
                      onChange={(event) => setLogSearchInput(event.target.value)}
                      className="h-9 w-56 pr-10"
                    />
                    <Clock className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <select
                    value={logLevelFilter}
                    onChange={(event) => setLogLevelFilter(event.target.value as "ALL" | LogLevelType)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {LOG_LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsRefreshing(true)
                      setLogSearchInput("")
                      setDebouncedSearch("")
                      setLogLevelFilter("ALL")
                    }}
                    disabled={logsLoading}
                  >
                    Yenile
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading && logs.length === 0 ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`log-skeleton-${index}`}
                      className="space-y-2 rounded-md border border-dashed border-border/60 p-4"
                    >
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              ) : logsError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {logsError}
                </div>
              ) : logs.length === 0 ? (
                <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  Kayıtlı log bulunamadı. Filtreleri değiştirerek yeniden deneyin.
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => {
                    const meta = levelStyles[log.level]
                    const timeAgo = formatDistanceToNowStrict(new Date(log.createdAt), {
                      addSuffix: true,
                      locale: tr,
                    })
                    return (
                      <div key={log.id} className="rounded-lg border border-border/70 bg-background px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={meta.className}>{meta.label}</Badge>
                            <span className="text-sm font-medium text-foreground">{log.message}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {timeAgo}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {log.actorEmail ? (
                            <span>
                              <span className="font-medium text-foreground">Kullanıcı:</span> {log.actorEmail}
                            </span>
                          ) : null}
                          {log.source ? (
                            <span>
                              <span className="font-medium text-foreground">Kaynak:</span> {log.source}
                            </span>
                          ) : null}
                          {log.context ? (
                            <span className="truncate">
                              <span className="font-medium text-foreground">Detay:</span>{" "}
                              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                                {JSON.stringify(log.context)}
                              </code>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {logsLoading && logs.length > 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">Loglar yenileniyor...</p>
              ) : null}
              {isRefreshing && !logsLoading ? (
                <p className="mt-3 text-xs text-muted-foreground">Filtreler sıfırlandı.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Kullanıcı Büyümesi</CardTitle>
              <CardDescription>Son 6 aydaki kullanıcı artışı</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardLoading && chartData.length === 0 ? (
                <Skeleton className="h-[300px] w-full rounded-lg" />
              ) : chartData.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                  Grafik verisi bulunamadı.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aylık Gelir</CardTitle>
              <CardDescription>Son 6 aydaki gelir trendi</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardLoading && chartData.length === 0 ? (
                <Skeleton className="h-[300px] w-full rounded-lg" />
              ) : chartData.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                  Grafik verisi bulunamadı.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="revenue" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>İzleme Ayarları</CardTitle>
            <Button variant="outline" size="sm">
              Ayarları Yönet
            </Button>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Admin panelinden elde edilen göstergeler sisteminizin anlık durumunu paylaşır. Kritik eşikler için
            otomatik bildirimler yapılandırmak üzere izleme ayarlarını kullanabilirsiniz.
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  )
}
