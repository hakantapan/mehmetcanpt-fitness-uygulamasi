"use client"

import { useEffect, useState } from "react"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Save,
  Download,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Trash2,
  Calendar,
  HardDrive,
  RefreshCw,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Backup = {
  name: string
  size: number
  sizeFormatted: string
  createdAt: Date
  modifiedAt: Date
}

export default function BackupPage() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchBackups = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/admin/backup/list", { cache: "no-store" })
      
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Yedek listesi alınamadı")
      }

      const data = await response.json()
      setBackups(data.backups || [])
    } catch (err) {
      console.error(err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchBackups()
  }, [])

  const handleCreateBackup = async () => {
    try {
      setCreating(true)
      setError(null)
      const response = await fetch("/api/admin/backup/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Yedekleme başarısız oldu")
      }

      toast({
        title: "Yedekleme başarılı",
        description: data.message || "Yedek başarıyla oluşturuldu.",
      })

      // Listeyi yenile
      await fetchBackups()
    } catch (err) {
      const errorMessage = (err as Error).message
      setError(errorMessage)
      toast({
        title: "Yedekleme hatası",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (backupName: string) => {
    try {
      setRestoring(backupName)
      setError(null)
      const response = await fetch("/api/admin/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupName }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Geri yükleme başarısız oldu")
      }

      toast({
        title: "Geri yükleme başarılı",
        description: data.message || "Yedek başarıyla geri yüklendi.",
      })
    } catch (err) {
      const errorMessage = (err as Error).message
      setError(errorMessage)
      toast({
        title: "Geri yükleme hatası",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setRestoring(null)
    }
  }

  const handleDownload = (backupName: string) => {
    const url = `/api/admin/backup/download?file=${encodeURIComponent(backupName)}`
    window.open(url, "_blank")
  }

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleString("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Yedekleme ve Geri Yükleme</h1>
          <p className="text-muted-foreground">Projenizi yedekleyin ve yedekten geri yükleyin.</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Hata</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Create Backup Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Yeni Yedek Oluştur
            </CardTitle>
            <CardDescription>
              Tüm proje dosyalarını ve veritabanını yedekleyin. Yedekler <code>backups/</code> klasöründe saklanır.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateBackup} disabled={creating} className="w-full sm:w-auto">
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Yedekleniyor...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Yedek Oluştur
                </>
              )}
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              Yedekleme şunları içerir: Veritabanı, kod dosyaları, config dosyaları, uploads klasörü
            </p>
          </CardContent>
        </Card>

        {/* Backups List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Yedekler
                </CardTitle>
                <CardDescription>Mevcut yedeklerin listesi</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchBackups} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : backups.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Henüz yedek oluşturulmamış. Yukarıdaki butona tıklayarak ilk yedeğinizi oluşturun.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Yedek Adı</TableHead>
                    <TableHead>Boyut</TableHead>
                    <TableHead>Oluşturulma</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.name}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Save className="h-4 w-4 text-muted-foreground" />
                          {backup.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3 text-muted-foreground" />
                          {backup.sizeFormatted}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(backup.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(backup.name)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={restoring === backup.name}
                              >
                                {restoring === backup.name ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Geri Yükleme Onayı</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Bu işlem mevcut dosyaların üzerine yazacak ve veritabanını değiştirecektir.
                                  <br />
                                  <strong>Yedek:</strong> {backup.name}
                                  <br />
                                  <strong>Boyut:</strong> {backup.sizeFormatted}
                                  <br />
                                  <strong>Tarih:</strong> {formatDate(backup.createdAt)}
                                  <br />
                                  <br />
                                  Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRestore(backup.name)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Geri Yükle
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Önemli Bilgiler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • Yedekler <code>backups/</code> klasöründe saklanır ve <code>.tar.gz</code> formatındadır.
            </p>
            <p>• Yedekleme işlemi veritabanını, kod dosyalarını ve config dosyalarını içerir.</p>
            <p>• Geri yükleme işlemi mevcut dosyaların üzerine yazar, dikkatli kullanın.</p>
            <p>• Yedekleri indirip güvenli bir yerde saklamanız önerilir.</p>
            <p>• Geri yükleme sonrası <code>npm install</code> ve <code>npx prisma generate</code> çalıştırmanız gerekebilir.</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

