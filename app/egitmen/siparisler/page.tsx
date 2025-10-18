"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { TrainerLayout } from "@/components/trainer-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Search,
  Package,
  DollarSign,
  TrendingUp,
  Calendar,
  Filter,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  CreditCard,
  User,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react"

type KnownOrderStatus = "Aktif" | "Tamamlandi" | "Beklemede" | "Iptal"
type KnownPaymentStatus = "Odendi" | "Bekliyor" | "IadeEdildi"

type TrainerOrder = {
  id: string
  clientName: string
  clientEmail: string | null
  clientAvatar: string | null
  packageName: string
  packageType: string | null
  amount: number
  status: KnownOrderStatus | string
  statusLabel: string
  paymentStatus: KnownPaymentStatus | string
  paymentStatusLabel: string
  orderDate: string
  startDate: string | null
  endDate: string | null
  services: string[]
  notes: string | null
  createdAt: string
  updatedAt: string
}

type OrdersResponse = {
  orders: TrainerOrder[]
}

type MonthlyStat = {
  month: string
  revenue: number
  orders: number
}

const STATUS_LABELS: Record<KnownOrderStatus, string> = {
  Aktif: "Aktif",
  Tamamlandi: "Tamamlandı",
  Beklemede: "Beklemede",
  Iptal: "İptal",
}

const PAYMENT_STATUS_LABELS: Record<KnownPaymentStatus, string> = {
  Odendi: "Ödendi",
  Bekliyor: "Bekliyor",
  IadeEdildi: "İade Edildi",
}

const ORDER_STATUS_KEYS = new Set(Object.keys(STATUS_LABELS))
const PAYMENT_STATUS_KEYS = new Set(Object.keys(PAYMENT_STATUS_LABELS))

const isKnownOrderStatus = (value: string): value is KnownOrderStatus => ORDER_STATUS_KEYS.has(value)
const isKnownPaymentStatus = (value: string): value is KnownPaymentStatus => PAYMENT_STATUS_KEYS.has(value)

const monthFormatter = new Intl.DateTimeFormat("tr-TR", { month: "long" })
const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const capitalize = (value: string) => {
  if (!value) return value
  const [first, ...rest] = value
  return first.toLocaleUpperCase("tr-TR") + rest.join("")
}

const formatDate = (value: string | null) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return dateFormatter.format(date)
}

const calculateProgress = (startDate: string | null, endDate: string | null) => {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0
  const now = Date.now()
  const total = end - start
  const elapsed = now - start
  const progress = (elapsed / total) * 100
  return Math.min(Math.max(progress, 0), 100)
}

const formatPackageName = (name: string, type: string | null) => (type ? `${name} (${type})` : name)

const getStatusBadge = (status: string, label?: string) => {
  const resolvedStatus = isKnownOrderStatus(status) ? status : null
  const display = label ?? (resolvedStatus ? STATUS_LABELS[resolvedStatus] : status)

  switch (resolvedStatus) {
    case "Aktif":
      return <Badge className="bg-accent text-accent-foreground">{display}</Badge>
    case "Tamamlandi":
      return <Badge className="bg-primary text-primary-foreground">{display}</Badge>
    case "Beklemede":
      return <Badge variant="secondary">{display}</Badge>
    case "Iptal":
      return <Badge variant="destructive">{display}</Badge>
    default:
      return <Badge variant="outline">{display}</Badge>
  }
}

const getPaymentBadge = (status: string, label?: string) => {
  const resolvedStatus = isKnownPaymentStatus(status) ? status : null
  const display = label ?? (resolvedStatus ? PAYMENT_STATUS_LABELS[resolvedStatus] : status)

  switch (resolvedStatus) {
    case "Odendi":
      return <Badge className="bg-accent text-accent-foreground">{display}</Badge>
    case "Bekliyor":
      return <Badge variant="destructive">{display}</Badge>
    case "IadeEdildi":
      return <Badge variant="outline">{display}</Badge>
    default:
      return <Badge variant="outline">{display}</Badge>
  }
}

const getStatusIcon = (status: string) => {
  if (!isKnownOrderStatus(status)) {
    return <AlertCircle className="h-4 w-4 text-muted-foreground" />
  }

  switch (status) {
    case "Aktif":
      return <CheckCircle className="h-4 w-4 text-accent" />
    case "Tamamlandi":
      return <CheckCircle className="h-4 w-4 text-primary" />
    case "Beklemede":
      return <Clock className="h-4 w-4 text-yellow-600" />
    case "Iptal":
      return <XCircle className="h-4 w-4 text-destructive" />
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<TrainerOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("orders")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<TrainerOrder | null>(null)

  const loadOrders = useCallback(async (signal?: AbortSignal) => {
    if (signal?.aborted) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/trainer/orders", {
        method: "GET",
        cache: "no-store",
        signal,
      })

      if (!response.ok) {
        throw new Error(`Orders fetch failed with status ${response.status}`)
      }

      const data: OrdersResponse = await response.json()
      const safeOrders = Array.isArray(data.orders) ? data.orders : []

      if (signal?.aborted) return

      setOrders(safeOrders)
      setSelectedOrder((current) =>
        current ? safeOrders.find((order) => order.id === current.id) ?? null : null,
      )
    } catch (fetchError) {
      if (signal?.aborted) return

      console.error("Trainer orders fetch error:", fetchError)
      setError("Siparişler alınamadı. Lütfen tekrar deneyin.")
      setOrders([])
      setSelectedOrder(null)
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadOrders(controller.signal)

    return () => {
      controller.abort()
    }
  }, [loadOrders])

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("tr-TR")

    return orders.filter((order) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          order.clientName,
          order.packageName,
          order.packageType ?? "",
          order.id,
          order.statusLabel,
          order.paymentStatusLabel,
        ].some((value) => value.toLocaleLowerCase("tr-TR").includes(normalizedSearch))

      const matchesStatus = selectedStatus === "all" || order.status === selectedStatus
      const matchesPayment =
        selectedPaymentStatus === "all" || order.paymentStatus === selectedPaymentStatus

      return matchesSearch && matchesStatus && matchesPayment
    })
  }, [orders, searchTerm, selectedStatus, selectedPaymentStatus])

  const totalRevenue = useMemo(
    () =>
      orders.reduce(
        (sum, order) => sum + (order.paymentStatus === "Odendi" ? order.amount : 0),
        0,
      ),
    [orders],
  )

  const pendingRevenue = useMemo(
    () =>
      orders.reduce(
        (sum, order) => sum + (order.paymentStatus === "Bekliyor" ? order.amount : 0),
        0,
      ),
    [orders],
  )

  const monthlyStats = useMemo<MonthlyStat[]>(() => {
    if (orders.length === 0) return []

    const statsMap = new Map<
      string,
      {
        date: Date
        revenue: number
        orders: number
      }
    >()

    orders.forEach((order) => {
      const date = new Date(order.orderDate)
      if (Number.isNaN(date.getTime())) return

      const key = `${date.getFullYear()}-${date.getMonth()}`
      const current = statsMap.get(key)
      const revenueIncrement = order.paymentStatus === "Odendi" ? order.amount : 0

      if (current) {
        current.revenue += revenueIncrement
        current.orders += 1
      } else {
        statsMap.set(key, {
          date: new Date(date.getFullYear(), date.getMonth(), 1),
          revenue: revenueIncrement,
          orders: 1,
        })
      }
    })

    return Array.from(statsMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-6)
      .map((entry) => ({
        month: `${capitalize(monthFormatter.format(entry.date))} ${entry.date.getFullYear()}`,
        revenue: entry.revenue,
        orders: entry.orders,
      }))
  }, [orders])

  const thisMonthRevenue = monthlyStats.length > 0 ? monthlyStats[monthlyStats.length - 1].revenue : 0

  const packageDistribution = useMemo(() => {
    if (orders.length === 0) return []
    const counts = new Map<string, number>()

    orders.forEach((order) => {
      const key = order.packageName || "Belirtilmemiş"
      counts.set(key, (counts.get(key) ?? 0) + 1)
    })

    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [orders])

  return (
    <TrainerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Siparişler</h1>
            <p className="text-muted-foreground">
              Danışan siparişlerini takip edin ve gelir analizlerini görüntüleyin
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => loadOrders()}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Yenile
            </Button>
            <Button variant="outline" className="bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              Rapor İndir
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Toplam Sipariş</p>
                  <p className="text-2xl font-bold text-foreground">{orders.length}</p>
                </div>
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Package className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Toplam Gelir</p>
                  <p className="text-2xl font-bold text-foreground">
                    ₺{totalRevenue.toLocaleString("tr-TR")}
                  </p>
                </div>
                <div className="h-8 w-8 bg-accent/10 rounded-full flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bekleyen Ödeme</p>
                  <p className="text-2xl font-bold text-foreground">
                    ₺{pendingRevenue.toLocaleString("tr-TR")}
                  </p>
                </div>
                <div className="h-8 w-8 bg-destructive/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bu Ay</p>
                  <p className="text-2xl font-bold text-foreground">
                    ₺{thisMonthRevenue.toLocaleString("tr-TR")}
                  </p>
                </div>
                <div className="h-8 w-8 bg-secondary/10 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">Siparişler</TabsTrigger>
            <TabsTrigger value="analytics">Analizler</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Sipariş ara..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-full sm:w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Durum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Durumlar</SelectItem>
                      <SelectItem value="Aktif">Aktif</SelectItem>
                      <SelectItem value="Tamamlandi">Tamamlandı</SelectItem>
                      <SelectItem value="Beklemede">Beklemede</SelectItem>
                      <SelectItem value="Iptal">İptal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedPaymentStatus} onValueChange={setSelectedPaymentStatus}>
                    <SelectTrigger className="w-full sm:w-48">
                      <CreditCard className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Ödeme Durumu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Ödemeler</SelectItem>
                      <SelectItem value="Odendi">Ödendi</SelectItem>
                      <SelectItem value="Bekliyor">Bekliyor</SelectItem>
                      <SelectItem value="IadeEdildi">İade Edildi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Siparişler ({filteredOrders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {error ? (
                  <Alert variant="destructive" className="max-w-xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Siparişler alınamadı</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Siparişler yükleniyor...</span>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Seçilen filtrelere uyan sipariş bulunamadı.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => (
                      <div key={order.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={order.clientAvatar ?? "/placeholder.svg"} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {order.clientName
                                .split(" ")
                                .map((part) => part.charAt(0))
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground">{order.id}</h3>
                                {getStatusIcon(order.status)}
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(order.status, order.statusLabel)}
                                {getPaymentBadge(order.paymentStatus, order.paymentStatusLabel)}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                              <div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                                  <User className="h-4 w-4" />
                                  Danışan
                                </div>
                                <p className="font-medium text-foreground">{order.clientName}</p>
                              </div>
                              <div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                                  <Package className="h-4 w-4" />
                                  Paket
                                </div>
                                <p className="font-medium text-foreground">
                                  {formatPackageName(order.packageName, order.packageType)}
                                </p>
                              </div>
                              <div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                                  <DollarSign className="h-4 w-4" />
                                  Tutar
                                </div>
                                <p className="font-medium text-foreground">
                                  ₺{order.amount.toLocaleString("tr-TR")}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                              <div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                                  <Calendar className="h-4 w-4" />
                                  Sipariş Tarihi
                                </div>
                                <p className="text-sm text-foreground">{formatDate(order.orderDate)}</p>
                              </div>
                              {order.startDate && order.endDate && (
                                <div>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                                    <Clock className="h-4 w-4" />
                                    Süre
                                  </div>
                                  <p className="text-sm text-foreground">
                                    {formatDate(order.startDate)} - {formatDate(order.endDate)}
                                  </p>
                                </div>
                              )}
                            </div>

                            {order.status === "Aktif" && order.startDate && order.endDate && (
                              <div className="mb-3">
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-muted-foreground">İlerleme</span>
                                  <span className="text-foreground">
                                    {Math.round(calculateProgress(order.startDate, order.endDate))}%
                                  </span>
                                </div>
                                <Progress
                                  value={calculateProgress(order.startDate, order.endDate)}
                                  className="h-2"
                                />
                              </div>
                            )}

                            <div className="mb-3">
                              <p className="text-sm text-muted-foreground mb-1">Hizmetler:</p>
                              {order.services.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {order.services.map((service, index) => (
                                    <Badge key={`${order.id}-service-${index}`} variant="outline" className="text-xs">
                                      {service}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">Hizmet bilgisi eklenmemiş.</p>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <Dialog
                                onOpenChange={(open) => {
                                  if (!open) {
                                    setSelectedOrder(null)
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedOrder(order)}
                                    className="bg-transparent"
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Detaylar
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>
                                      Sipariş Detayları {selectedOrder ? `- ${selectedOrder.id}` : ""}
                                    </DialogTitle>
                                  </DialogHeader>
                                  {selectedOrder && (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-sm text-muted-foreground">Danışan</p>
                                          <p className="font-medium text-foreground">{selectedOrder.clientName}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">Paket</p>
                                          <p className="font-medium text-foreground">
                                            {formatPackageName(selectedOrder.packageName, selectedOrder.packageType)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">Tutar</p>
                                          <p className="font-medium text-foreground">
                                            ₺{selectedOrder.amount.toLocaleString("tr-TR")}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">Durum</p>
                                          <div className="flex gap-2 mt-1">
                                            {getStatusBadge(selectedOrder.status, selectedOrder.statusLabel)}
                                            {getPaymentBadge(
                                              selectedOrder.paymentStatus,
                                              selectedOrder.paymentStatusLabel,
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div>
                                        <p className="text-sm text-muted-foreground mb-2">Dahil Edilen Hizmetler</p>
                                        {selectedOrder.services.length > 0 ? (
                                          <div className="flex flex-wrap gap-2">
                                            {selectedOrder.services.map((service, index) => (
                                              <Badge key={`${selectedOrder.id}-detail-service-${index}`} variant="secondary">
                                                {service}
                                              </Badge>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-sm text-muted-foreground">
                                            Hizmet bilgisi eklenmemiş.
                                          </p>
                                        )}
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-sm text-muted-foreground">Sipariş Tarihi</p>
                                          <p className="text-foreground">{formatDate(selectedOrder.orderDate)}</p>
                                        </div>
                                        {selectedOrder.startDate && (
                                          <div>
                                            <p className="text-sm text-muted-foreground">Başlangıç Tarihi</p>
                                            <p className="text-foreground">{formatDate(selectedOrder.startDate)}</p>
                                          </div>
                                        )}
                                      </div>

                                      {selectedOrder.status === "Aktif" &&
                                        selectedOrder.startDate &&
                                        selectedOrder.endDate && (
                                          <div>
                                            <p className="text-sm text-muted-foreground mb-2">Paket İlerlemesi</p>
                                            <Progress
                                              value={calculateProgress(
                                                selectedOrder.startDate,
                                                selectedOrder.endDate,
                                              )}
                                              className="h-3"
                                            />
                                            <p className="text-sm text-muted-foreground mt-1">
                                              {Math.round(
                                                calculateProgress(selectedOrder.startDate, selectedOrder.endDate),
                                              )}
                                              % tamamlandı
                                            </p>
                                          </div>
                                        )}
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>

                              {order.status === "Beklemede" && (
                                <Button variant="outline" size="sm" className="bg-transparent">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Onayla
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground">Aylık Gelir Trendi</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyStats.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Gösterilecek veri bulunmuyor.</p>
                  ) : (
                    <div className="space-y-4">
                      {monthlyStats.map((stat, index) => {
                        const previous = monthlyStats[index - 1]
                        const change =
                          previous && previous.revenue > 0
                            ? ((stat.revenue - previous.revenue) / previous.revenue) * 100
                            : null
                        const isPositive = typeof change === "number" && change >= 0

                        return (
                          <div key={stat.month} className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-foreground">{stat.month}</p>
                              <p className="text-sm text-muted-foreground">
                                {stat.orders} sipariş
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-foreground">
                                ₺{stat.revenue.toLocaleString("tr-TR")}
                              </p>
                              {change !== null ? (
                                <p className={`text-sm ${isPositive ? "text-accent" : "text-destructive"}`}>
                                  {isPositive ? "+" : ""}
                                  {change.toFixed(1)}%
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground">—</p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground">Paket Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                  {packageDistribution.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Henüz paket verisi bulunmuyor.</p>
                  ) : (
                    <div className="space-y-4">
                      {packageDistribution.map(([packageName, count]) => {
                        const percentage =
                          orders.length === 0 ? 0 : (count / orders.length) * 100
                        return (
                          <div key={packageName}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-foreground">{packageName}</span>
                              <span className="text-muted-foreground">
                                {count} ({Math.round(percentage)}%)
                              </span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TrainerLayout>
  )
}
