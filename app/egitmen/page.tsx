"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import ResponsiveLayout from "@/components/responsive-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { signOut } from "next-auth/react"
import type { LucideIcon } from "lucide-react"
import {
  Users,
  Dumbbell,
  MessageSquare,
  TrendingUp,
  Calendar,
  Clock,
  Plus,
  ArrowRight,
  LogOut,
  RefreshCw,
  Loader2,
  CreditCard,
  DollarSign,
  Package,
  AlertCircle,
  Activity,
  UtensilsCrossed,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { tr } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"

const formatNumber = (value: number) => new Intl.NumberFormat("tr-TR").format(value)
const formatCurrency = (value: number) => `₺${formatNumber(value)}`
const formatPercent = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
const displayNumber = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : formatNumber(value)
const displayCurrency = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : formatCurrency(value)

const FITNESS_GOAL_LABELS: Record<string, string> = {
  KiloVerme: "Kilo Verme",
  KiloAlma: "Kilo Alma",
  KasKazanma: "Kas Kazanma",
  GenelSaglik: "Genel Sağlık",
}

const getProgramLabel = (value: string | null | undefined) =>
  value ? FITNESS_GOAL_LABELS[value] ?? value : "Program bilgisi yok"

const getOrderStatusBadge = (status: string, label: string) => {
  switch (status) {
    case "Aktif":
      return <Badge className="bg-accent text-accent-foreground">{label}</Badge>
    case "Tamamlandi":
      return <Badge className="bg-primary text-primary-foreground">{label}</Badge>
    case "Beklemede":
      return <Badge variant="secondary">{label}</Badge>
    case "Iptal":
      return <Badge variant="destructive">{label}</Badge>
    default:
      return <Badge variant="outline">{label}</Badge>
  }
}

const getPaymentStatusBadge = (status: string, label: string) => {
  switch (status) {
    case "Odendi":
      return <Badge className="bg-accent text-accent-foreground">{label}</Badge>
    case "Bekliyor":
      return <Badge variant="destructive">{label}</Badge>
    case "IadeEdildi":
      return <Badge variant="outline">{label}</Badge>
    default:
      return <Badge variant="outline">{label}</Badge>
  }
}

type DashboardMetrics = {
  totalClients: number
  activeClients: number
  inactiveClients: number
  newClientsThisMonth: number
  totalOrders: number
  completedOrders: number
  pendingOrders: number
  totalRevenue: number
  pendingRevenue: number
  monthlyRevenue: number
  previousMonthRevenue: number
  revenueChangePercentage: number | null
  averageRevenuePerClient: number | null
}

type WorkloadSummary = {
  activeWorkoutPrograms: number
  activeDietPrograms: number
  activeSupplementPrograms: number
  openQuestionCount: number
  urgentQuestionCount: number
}

type RevenueTrendEntry = {
  key: string
  label: string
  revenue: number
  orders: number
}

type ClientTrendEntry = {
  key: string
  label: string
  count: number
}

type RecentClient = {
  id: string
  name: string
  email: string
  status: "active" | "inactive" | string
  joinDate: string
  lastActivity: string | null
  program: string | null
  avatar: string | null
}

type RecentOrder = {
  id: string
  clientName: string
  packageName: string
  packageType: string | null
  amount: number
  status: string
  statusLabel: string
  paymentStatus: string
  paymentStatusLabel: string
  orderDate: string
}

type UpcomingSession = {
  id: string
  clientName: string
  packageName: string
  startDate: string | null
  status: string
  statusLabel: string
}

type DashboardResponse = {
  metrics: DashboardMetrics
  workload: WorkloadSummary
  recentClients: RecentClient[]
  recentOrders: RecentOrder[]
  upcomingSessions: UpcomingSession[]
  revenueTrend: RevenueTrendEntry[]
  clientTrend: ClientTrendEntry[]
}

export default function TrainerDashboard() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const handleSignOut = () => {
    signOut({
      callbackUrl: "/login",
      redirect: true,
    })
  }

  const loadDashboard = useCallback(
    async ({ signal, soft }: { signal?: AbortSignal; soft?: boolean } = {}) => {
      if (soft) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      try {
        if (!soft) {
          setError(null)
        }

        const response = await fetch("/api/trainer/dashboard", {
          method: "GET",
          cache: "no-store",
          signal,
        })

        if (!response.ok) {
          throw new Error("Dashboard verileri alınamadı")
        }

        const data: DashboardResponse = await response.json()
        if (signal?.aborted) return

        setDashboard(data)
        setError(null)
      } catch (err) {
        if (signal?.aborted) return
        console.error("Trainer dashboard fetch error:", err)
        setError((err as Error).message || "Dashboard verileri alınamadı")
      } finally {
        if (signal?.aborted) return
        if (soft) {
          setIsRefreshing(false)
        } else {
          setIsLoading(false)
        }
      }
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadDashboard({ signal: controller.signal })
    return () => controller.abort()
  }, [loadDashboard])

  const handleRefresh = () => {
    loadDashboard({ soft: true })
  }

  const metrics = dashboard?.metrics
  const workload = dashboard?.workload
  const recentClients = dashboard?.recentClients ?? []
  const recentOrders = dashboard?.recentOrders ?? []
  const upcomingSessions = dashboard?.upcomingSessions ?? []
  const revenueTrend = dashboard?.revenueTrend ?? []
  const clientTrend = dashboard?.clientTrend ?? []

  const revenueTrendMax = useMemo(
    () => revenueTrend.reduce((max, entry) => Math.max(max, entry.revenue), 0),
    [revenueTrend],
  )

  const clientTrendMax = useMemo(
    () => clientTrend.reduce((max, entry) => Math.max(max, entry.count), 0),
    [clientTrend],
  )

  const revenueChange = metrics?.revenueChangePercentage ?? null
  const revenueChangeLabel =
    revenueChange === null ? "Geçen ay verisi bulunamadı" : `${formatPercent(revenueChange)} geçen aya göre`
  const revenueChangeClass =
    revenueChange === null ? "text-muted-foreground" : revenueChange >= 0 ? "text-accent" : "text-destructive"

  const totalActivePrograms =
    (workload?.activeWorkoutPrograms ?? 0) +
    (workload?.activeDietPrograms ?? 0) +
    (workload?.activeSupplementPrograms ?? 0)

  const quickActions: { label: string; icon: LucideIcon; onClick: () => void }[] = [
    {
      label: "Yeni Program Oluştur",
      icon: Plus,
      onClick: () => router.push("/egitmen/antrenman"),
    },
    {
      label: "Randevu Planla",
      icon: Calendar,
      onClick: () =>
        toast({
          title: "Yakında",
          description: "Randevu planlama özelliği hazırlık aşamasında.",
        }),
    },
    {
      label: "Mesaj Gönder",
      icon: MessageSquare,
      onClick: () => router.push("/egitmen/danisanlar"),
    },
    {
      label: "Diyet Planı Hazırla",
      icon: UtensilsCrossed,
      onClick: () => router.push("/egitmen/diyet"),
    },
  ] as const

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Genel Bakış</h1>
            <p className="text-muted-foreground">Danışanlarınızın durumunu ve performansını takip edin</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing || (isLoading && !dashboard)}
              className="bg-transparent"
            >
              {isRefreshing || (isLoading && !dashboard) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Yenile
            </Button>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış Yap
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Veriler alınamadı</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Danışan</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {metrics ? formatNumber(metrics.totalClients) : isLoading ? "—" : "0"}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics
                  ? `${formatNumber(metrics.newClientsThisMonth)} yeni danışan bu ay`
                  : isLoading
                    ? "Veriler yükleniyor..."
                    : "Veri bulunamadı"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Aktif Danışan</CardTitle>
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {metrics ? formatNumber(metrics.activeClients) : isLoading ? "—" : "0"}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics
                  ? `${formatNumber(metrics.inactiveClients)} pasif danışan`
                  : isLoading
                    ? "Veriler yükleniyor..."
                    : "Veri bulunamadı"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bekleyen Ödeme</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {metrics ? displayCurrency(metrics.pendingRevenue) : isLoading ? "—" : "₺0"}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics
                  ? `${formatNumber(metrics.pendingOrders)} bekleyen sipariş`
                  : isLoading
                    ? "Veriler yükleniyor..."
                    : "Veri bulunamadı"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Aylık Gelir</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {metrics ? displayCurrency(metrics.monthlyRevenue) : isLoading ? "—" : "₺0"}
              </div>
              <p className={`text-xs ${revenueChangeClass}`}>{metrics ? revenueChangeLabel : ""}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Sipariş</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {metrics ? formatNumber(metrics.totalOrders) : isLoading ? "—" : "0"}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics
                  ? `Tamamlanan: ${formatNumber(metrics.completedOrders)} • Bekleyen: ${formatNumber(metrics.pendingOrders)}`
                  : isLoading
                    ? "Veriler yükleniyor..."
                    : "Veri bulunamadı"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ortalama Gelir</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {displayCurrency(metrics?.averageRevenuePerClient)}
              </div>
              <p className="text-xs text-muted-foreground">Danışan başına ortalama tahsilat</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Aktif Programlar</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{displayNumber(totalActivePrograms)}</div>
              <p className="text-xs text-muted-foreground">
                {workload
                  ? `Antrenman: ${formatNumber(workload.activeWorkoutPrograms)} • Diyet: ${formatNumber(workload.activeDietPrograms)} • Supplement: ${formatNumber(workload.activeSupplementPrograms)}`
                  : isLoading
                    ? "Veriler yükleniyor..."
                    : "Veri bulunamadı"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Açık Destek Talepleri</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {displayNumber(workload?.openQuestionCount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {workload
                  ? workload.urgentQuestionCount > 0
                    ? `Acil: ${formatNumber(workload.urgentQuestionCount)}`
                    : "Acil talep bulunmuyor"
                  : isLoading
                    ? "Veriler yükleniyor..."
                    : "Veri bulunamadı"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground">Son Danışanlar</CardTitle>
              <Button variant="ghost" size="sm">
                Tümünü Gör
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading && !dashboard && (
                <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-muted-foreground">
                  Danışanlar yükleniyor...
                </div>
              )}
              {!isLoading && recentClients.length === 0 && (
                <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-muted-foreground">
                  Henüz danışan bulunmuyor.
                </div>
              )}
              {recentClients.map((client) => {
                const joinedAt = client.joinDate ? new Date(client.joinDate) : null
                const joinLabel =
                  joinedAt && !Number.isNaN(joinedAt.getTime())
                    ? format(joinedAt, "dd MMM yyyy", { locale: tr })
                    : "Tarih bilinmiyor"
                const lastActivity =
                  client.lastActivity && !Number.isNaN(new Date(client.lastActivity).getTime())
                    ? formatDistanceToNow(new Date(client.lastActivity), { locale: tr, addSuffix: true })
                    : "Bilgi yok"

                const initials = client.name
                  .split(" ")
                  .map((part) => part.charAt(0))
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()

                return (
                  <div key={client.id} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={client.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <p className="font-medium text-foreground truncate">{client.name}</p>
                        <Badge variant={client.status === "active" ? "secondary" : "outline"}>
                          {client.status === "active" ? "Aktif" : "Pasif"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{getProgramLabel(client.program)}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-xs text-muted-foreground">
                        <span>Katılım: {joinLabel}</span>
                        <span className="hidden sm:inline">•</span>
                        <span>Son aktivite: {lastActivity}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Operasyon Özeti</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Aktif Antrenman Programı</span>
                  <span className="font-medium text-foreground">
                    {displayNumber(workload?.activeWorkoutPrograms)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Aktif Diyet Programı</span>
                  <span className="font-medium text-foreground">
                    {displayNumber(workload?.activeDietPrograms)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Aktif Supplement Planı</span>
                  <span className="font-medium text-foreground">
                    {displayNumber(workload?.activeSupplementPrograms)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Açık Destek Talepleri</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {displayNumber(workload?.openQuestionCount)}
                    </span>
                    {workload && workload.urgentQuestionCount > 0 && (
                      <Badge variant="destructive" className="text-[10px] uppercase tracking-wide">
                        Acil {formatNumber(workload.urgentQuestionCount)}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Yaklaşan Seanslar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading && !dashboard && (
                  <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4 text-center text-muted-foreground">
                    Program yükleniyor...
                  </div>
                )}
                {!isLoading && upcomingSessions.length === 0 && (
                  <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4 text-center text-muted-foreground">
                    Henüz planlı seans bulunmuyor.
                  </div>
                )}
                {upcomingSessions.map((session) => {
                  const startDate = session.startDate ? new Date(session.startDate) : null
                  const hasValidDate = startDate && !Number.isNaN(startDate.getTime())
                  const dateLabel = hasValidDate
                    ? format(startDate, "dd MMMM yyyy", { locale: tr })
                    : "Tarih bekleniyor"
                  const timeLabel = hasValidDate ? format(startDate, "HH:mm") : ""
                  const countdown = hasValidDate
                    ? formatDistanceToNow(startDate, { locale: tr, addSuffix: true })
                    : "Tarih netleşmedi"

                  return (
                    <div key={session.id} className="space-y-2 rounded border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{session.clientName}</p>
                          <p className="text-xs text-muted-foreground">{session.packageName}</p>
                        </div>
                        {getOrderStatusBadge(session.status, session.statusLabel)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {dateLabel}
                          {timeLabel ? ` • ${timeLabel}` : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Başlamasına {countdown}</p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Hızlı İşlemler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Button
                      key={action.label}
                      variant="outline"
                      className="w-full justify-start bg-transparent"
                      type="button"
                      onClick={action.onClick}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {action.label}
                    </Button>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground">Son Siparişler</CardTitle>
              <Button variant="ghost" size="sm">
                Tümünü Gör
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading && !dashboard && (
                <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-muted-foreground">
                  Siparişler yükleniyor...
                </div>
              )}
              {!isLoading && recentOrders.length === 0 && (
                <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-muted-foreground">
                  Henüz sipariş bulunmuyor.
                </div>
              )}
              {recentOrders.map((order) => {
                const orderDate = new Date(order.orderDate)
                const orderDateLabel = Number.isNaN(orderDate.getTime())
                  ? "Tarih bilinmiyor"
                  : format(orderDate, "dd MMM yyyy", { locale: tr })

                return (
                  <div key={order.id} className="grid gap-3 rounded border border-border p-3 md:grid-cols-4">
                    <div className="md:col-span-2 space-y-1">
                      <p className="font-medium text-foreground">{order.clientName}</p>
                      <p className="text-sm text-muted-foreground">{order.packageName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{displayCurrency(order.amount)}</p>
                      <p className="text-xs text-muted-foreground">{orderDateLabel}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getOrderStatusBadge(order.status, order.statusLabel)}
                      {getPaymentStatusBadge(order.paymentStatus, order.paymentStatusLabel)}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Performans Eğilimleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Aylık Gelir</p>
                {revenueTrend.length === 0 && (
                  <p className="text-xs text-muted-foreground">Gösterilecek gelir verisi bulunmuyor.</p>
                )}
                {revenueTrend.map((entry) => (
                  <div key={entry.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{entry.label}</span>
                      <span className="font-medium text-foreground">{formatCurrency(entry.revenue)}</span>
                    </div>
                    <Progress
                      value={
                        revenueTrendMax > 0 ? Math.min((entry.revenue / revenueTrendMax) * 100, 100) : 0
                      }
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-3 border-t border-border/60 pt-4">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Yeni Danışanlar
                </p>
                {clientTrend.length === 0 && (
                  <p className="text-xs text-muted-foreground">Gösterilecek danışan verisi bulunmuyor.</p>
                )}
                {clientTrend.map((entry) => (
                  <div key={entry.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{entry.label}</span>
                      <span className="font-medium text-foreground">{formatNumber(entry.count)}</span>
                    </div>
                    <Progress
                      value={
                        clientTrendMax > 0 ? Math.min((entry.count / clientTrendMax) * 100, 100) : 0
                      }
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ResponsiveLayout>
  )
}
