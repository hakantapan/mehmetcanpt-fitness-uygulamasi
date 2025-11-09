"use client"

import { useEffect, useState } from "react"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Rocket,
  Download,
  Upload,
  Database,
  Code,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Server,
  Clock,
  Terminal,
  Play,
  Pause,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type DeploymentStatus = {
  configured: boolean
  serverStatus: "online" | "offline" | "unknown"
  config: {
    host: string | null
    user: string | null
    path: string | null
  } | null
}

type DeploymentLog = {
  timestamp: string
  level: string
  message: string
}

export default function DeploymentPage() {
  const [status, setStatus] = useState<DeploymentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [deploying, setDeploying] = useState<string | null>(null)
  const [pulling, setPulling] = useState<string | null>(null)
  const [logs, setLogs] = useState<DeploymentLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/admin/deployment?action=status", { cache: "no-store" })
      
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Durum kontrol edilemedi")
      }

      const data = await response.json()
      setStatus(data)
    } catch (err) {
      console.error(err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      setLogsLoading(true)
      const response = await fetch("/api/admin/deployment/logs?limit=50", { cache: "no-store" })
      
      if (!response.ok) {
        return
      }

      const data = await response.json()
      setLogs(data.logs || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    void fetchStatus()
    void fetchLogs()
    
    // Her 10 saniyede bir durumu güncelle
    const interval = setInterval(() => {
      void fetchStatus()
      void fetchLogs()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const handleDeploy = async (action: "all" | "code" | "db") => {
    try {
      setDeploying(action)
      setError(null)
      
      const response = await fetch("/api/admin/deployment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "deploy", action }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Deploy işlemi başlatılamadı")
      }

      toast({
        title: "Deploy başlatıldı",
        description: data.message || "Deploy işlemi arka planda başlatıldı.",
      })

      // Logları yenile
      setTimeout(() => {
        void fetchLogs()
      }, 2000)
    } catch (err) {
      const errorMessage = (err as Error).message
      setError(errorMessage)
      toast({
        title: "Deploy hatası",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setTimeout(() => {
        setDeploying(null)
      }, 3000)
    }
  }

  const handlePull = async (action: "all" | "db" | "files") => {
    try {
      setPulling(action)
      setError(null)
      
      const response = await fetch("/api/admin/deployment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pull", action }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Pull işlemi başlatılamadı")
      }

      toast({
        title: "Pull başlatıldı",
        description: data.message || "Pull işlemi arka planda başlatıldı.",
      })

      // Logları yenile
      setTimeout(() => {
        void fetchLogs()
      }, 2000)
    } catch (err) {
      const errorMessage = (err as Error).message
      setError(errorMessage)
      toast({
        title: "Pull hatası",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setTimeout(() => {
        setPulling(null)
      }, 3000)
    }
  }

  const getStatusBadge = (serverStatus: string) => {
    switch (serverStatus) {
      case "online":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            <CheckCircle className="mr-1 h-3 w-3" />
            Çevrimiçi
          </Badge>
        )
      case "offline":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300">
            <XCircle className="mr-1 h-3 w-3" />
            Çevrimdışı
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="mr-1 h-3 w-3" />
            Bilinmiyor
          </Badge>
        )
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Deployment Yönetimi</h1>
            <p className="text-muted-foreground">Kod ve veritabanı deployment işlemlerini yönetin</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Hata</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Sunucu Durumu
            </CardTitle>
            <CardDescription>Production sunucu bağlantı durumu</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : !status?.configured ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Yapılandırma Gerekli</AlertTitle>
                <AlertDescription>
                  <code>.env.deploy</code> dosyası bulunamadı veya yapılandırılmamış. Lütfen sunucu bilgilerini ayarlayın.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sunucu Durumu</span>
                  {getStatusBadge(status.serverStatus)}
                </div>
                {status.config && (
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Host:</span>
                      <span className="font-mono">{status.config.host || "Belirtilmemiş"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kullanıcı:</span>
                      <span className="font-mono">{status.config.user || "Belirtilmemiş"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Path:</span>
                      <span className="font-mono text-xs">{status.config.path || "Belirtilmemiş"}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="deploy" className="space-y-4">
          <TabsList>
            <TabsTrigger value="deploy">
              <Upload className="h-4 w-4 mr-2" />
              Deploy (Local → Production)
            </TabsTrigger>
            <TabsTrigger value="pull">
              <Download className="h-4 w-4 mr-2" />
              Pull (Production → Local)
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Terminal className="h-4 w-4 mr-2" />
              Loglar
            </TabsTrigger>
          </TabsList>

          {/* Deploy Tab */}
          <TabsContent value="deploy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  Production'a Deploy
                </CardTitle>
                <CardDescription>
                  Yerel değişikliklerinizi production sunucuya gönderin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Kod Deploy
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Sadece kod dosyalarını production'a gönderir
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            className="w-full"
                            disabled={!status?.configured || deploying !== null}
                          >
                            {deploying === "code" ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deploy Ediliyor...
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" />
                                Kod Deploy Et
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Kod Deploy Onayı</AlertDialogTitle>
                            <AlertDialogDescription>
                              Yerel kod değişiklikleriniz production sunucuya gönderilecek.
                              Bu işlem birkaç dakika sürebilir.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeploy("code")}>
                              Deploy Et
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Veritabanı Sync
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Migration'ları production'da çalıştırır
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            className="w-full"
                            variant="outline"
                            disabled={!status?.configured || deploying !== null}
                          >
                            {deploying === "db" ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Senkronize Ediliyor...
                              </>
                            ) : (
                              <>
                                <Database className="mr-2 h-4 w-4" />
                                Veritabanı Sync
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Veritabanı Sync Onayı</AlertDialogTitle>
                            <AlertDialogDescription>
                              Production veritabanında migration'lar çalıştırılacak.
                              Bu işlem veritabanı yapısını değiştirebilir.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeploy("db")}>
                              Senkronize Et
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-primary">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Rocket className="h-4 w-4" />
                        Tam Deploy
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Hem kod hem veritabanını deploy eder
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            className="w-full"
                            disabled={!status?.configured || deploying !== null}
                          >
                            {deploying === "all" ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deploy Ediliyor...
                              </>
                            ) : (
                              <>
                                <Rocket className="mr-2 h-4 w-4" />
                                Tam Deploy
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Tam Deploy Onayı</AlertDialogTitle>
                            <AlertDialogDescription>
                              Hem kod hem veritabanı production'a deploy edilecek.
                              Bu işlem birkaç dakika sürebilir ve production'ı etkiler.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeploy("all")}>
                              Deploy Et
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pull Tab */}
          <TabsContent value="pull" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Production'dan Çek
                </CardTitle>
                <CardDescription>
                  Production verilerini yerel makinenize çekin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Dikkat!</AlertTitle>
                  <AlertDescription>
                    Pull işlemleri yerel verilerinizi production verileri ile değiştirecektir.
                    Önemli verileriniz varsa önce yedek alın.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Veritabanı Çek
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Production veritabanını local'e çeker
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            className="w-full"
                            variant="outline"
                            disabled={!status?.configured || pulling !== null}
                          >
                            {pulling === "db" ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Çekiliyor...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" />
                                Veritabanı Çek
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Veritabanı Çekme Onayı</AlertDialogTitle>
                            <AlertDialogDescription>
                              Production veritabanı yerel veritabanınızın üzerine yazılacak.
                              Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handlePull("db")}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Çek
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>

                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Dosyalar Çek
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Production uploads klasörünü local'e çeker
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            className="w-full"
                            variant="outline"
                            disabled={!status?.configured || pulling !== null}
                          >
                            {pulling === "files" ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Çekiliyor...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" />
                                Dosyalar Çek
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Dosya Çekme Onayı</AlertDialogTitle>
                            <AlertDialogDescription>
                              Production uploads dosyaları yerel dosyalarınızın üzerine yazılacak.
                              Devam etmek istediğinizden emin misiniz?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handlePull("files")}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Çek
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-primary">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Hepsi Çek
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Hem veritabanı hem dosyaları çeker
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            className="w-full"
                            disabled={!status?.configured || pulling !== null}
                          >
                            {pulling === "all" ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Çekiliyor...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" />
                                Hepsi Çek
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Tam Çekme Onayı</AlertDialogTitle>
                            <AlertDialogDescription>
                              Hem veritabanı hem dosyalar yerel verilerinizin üzerine yazılacak.
                              Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handlePull("all")}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Çek
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Terminal className="h-5 w-5" />
                      Deployment Logları
                    </CardTitle>
                    <CardDescription>Son deployment işlemlerinin logları</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchLogs} disabled={logsLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${logsLoading ? "animate-spin" : ""}`} />
                    Yenile
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {logsLoading && logs.length === 0 ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-12 w-full" />
                    ))}
                  </div>
                ) : logs.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    Henüz log kaydı yok.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {logs.map((log, index) => (
                      <div
                        key={index}
                        className="rounded-lg border bg-muted/50 p-3 text-sm font-mono"
                      >
                        <div className="flex items-start gap-2">
                          <Clock className="h-3 w-3 mt-0.5 text-muted-foreground" />
                          <span className="text-muted-foreground text-xs">{log.timestamp}</span>
                          <Badge variant="outline" className="ml-auto">
                            {log.level}
                          </Badge>
                        </div>
                        <p className="mt-1 text-foreground">{log.message}</p>
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

