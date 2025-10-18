"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { TrainerLayout } from "@/components/trainer-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Loader2, RefreshCw, Save, Users, CheckCircle, MapPin, UploadCloud } from "lucide-react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"

type TrainerSettings = {
  id: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
  firstName: string
  lastName: string
  phone: string | null
  address: string | null
  avatar: string | null
  stats: {
    totalClients: number
    activeClients: number
  }
}

type TrainerSettingsResponse = {
  trainer: TrainerSettings
}

export default function TrainerSettingsPage() {
  const [trainer, setTrainer] = useState<TrainerSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    avatar: "",
  })
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const emitTrainerProfileUpdate = useCallback((trainerData: TrainerSettings | null) => {
    if (typeof window === "undefined" || !trainerData) return
    window.dispatchEvent(
      new CustomEvent("trainer-profile-updated", {
        detail: {
          trainer: {
            firstName: trainerData.firstName ?? "",
            lastName: trainerData.lastName ?? "",
            avatar: trainerData.avatar ?? null,
          },
        },
      }),
    )
  }, [])

  const loadSettings = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/trainer/settings", {
        method: "GET",
        cache: "no-store",
        signal,
      })

      if (!response.ok) {
        throw new Error("Ayarlar yüklenemedi")
      }

      const data: TrainerSettingsResponse = await response.json()
      if (signal?.aborted) return

      setTrainer(data.trainer)
      emitTrainerProfileUpdate(data.trainer)
      setForm({
        firstName: data.trainer.firstName ?? "",
        lastName: data.trainer.lastName ?? "",
        phone: data.trainer.phone ?? "",
        address: data.trainer.address ?? "",
        avatar: data.trainer.avatar ?? "",
      })
    } catch (err) {
      if (signal?.aborted) return
      console.error("Trainer settings fetch error:", err)
      setError((err as Error).message || "Ayarlar yüklenemedi")
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false)
      }
    }
  }, [emitTrainerProfileUpdate])

  useEffect(() => {
    const controller = new AbortController()
    loadSettings(controller.signal)
    return () => controller.abort()
  }, [loadSettings])

  const handleRefresh = () => {
    const controller = new AbortController()
    loadSettings(controller.signal)
  }

  const initials = useMemo(() => {
    const source = `${form.firstName} ${form.lastName}`.trim()
    if (!source) return "TR"
    return source
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }, [form.firstName, form.lastName])

  const accountCreatedAt = useMemo(() => {
    if (!trainer?.createdAt) return null
    const date = new Date(trainer.createdAt)
    if (Number.isNaN(date.getTime())) return null
    return format(date, "dd MMMM yyyy", { locale: tr })
  }, [trainer?.createdAt])

  const handleSave = async () => {
    setFormError(null)

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError("Lütfen ad ve soyad alanlarını doldurun.")
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch("/api/trainer/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          address: form.address,
          avatar: form.avatar,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = data?.error ?? "Ayarlar güncellenemedi"
        throw new Error(message)
      }

      const data: TrainerSettingsResponse = await response.json()
      setTrainer(data.trainer)
      emitTrainerProfileUpdate(data.trainer)
      toast({
        title: "Ayarlar kaydedildi",
        description: "Profil bilgileriniz başarıyla güncellendi.",
      })
    } catch (err) {
      const message = (err as Error).message || "Ayarlar güncellenemedi"
      setFormError(message)
      toast({
        title: "Kaydetme başarısız",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (file: File) => {
    if (!file) return
    setFormError(null)

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Geçersiz dosya",
        description: "Lütfen bir resim dosyası seçin.",
        variant: "destructive",
      })
      return
    }

    const formData = new FormData()
    formData.append("avatar", file)

    try {
      setIsUploadingAvatar(true)
      const response = await fetch("/api/trainer/settings/avatar", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = data?.error ?? "Profil fotoğrafı yüklenemedi"
        throw new Error(message)
      }

      const data = (await response.json()) as { avatar: string | null }
      if (data.avatar) {
        setForm((prev) => ({ ...prev, avatar: data.avatar ?? "" }))
        setTrainer((prev) => {
          const base = prev ?? trainer
          if (!base) {
            emitTrainerProfileUpdate(null)
            return prev
          }
          const updated = {
            ...base,
            avatar: data.avatar,
          }
          emitTrainerProfileUpdate(updated)
          return updated
        })
        toast({
          title: "Profil fotoğrafı güncellendi",
          description: "Yeni profil fotoğrafınız kaydedildi.",
        })
      }
    } catch (err) {
      const message = (err as Error).message || "Profil fotoğrafı yüklenemedi"
      setFormError(message)
      toast({
        title: "Yükleme başarısız",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  return (
    <TrainerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Eğitmen Ayarları</h1>
            <p className="text-muted-foreground">
              Profil bilgilerinizi ve iletişim detaylarınızı güncel tutun.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={handleRefresh}
              disabled={isLoading || isSaving}
            >
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Yenile
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Kaydet
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Veriler yüklenemedi</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-foreground">Profil Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={(form.avatar || trainer?.avatar) ?? undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-transparent"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar || isLoading}
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <UploadCloud className="h-4 w-4 mr-2" />
                      )}
                      {isUploadingAvatar ? "Yükleniyor..." : "Fotoğraf Yükle"}
                    </Button>
                    <Input
                      id="avatar"
                      placeholder="https://..."
                      value={form.avatar}
                      onChange={(event) => setForm((prev) => ({ ...prev, avatar: event.target.value }))}
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    URL üzerinden fotoğraf ekleyebilir veya bilgisayarınızdan yükleyebilirsiniz. Yüklenen fotoğraflar
                    güvenli şekilde saklanır.
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void handleAvatarUpload(file)
                    event.target.value = ""
                  }
                }}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Ad</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                    disabled={isLoading}
                    placeholder="Adınız"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Soyad</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                    disabled={isLoading}
                    placeholder="Soyadınız"
                  />
                </div>
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Hesap Özeti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">E-posta</p>
                <p className="font-medium text-foreground break-all">{trainer?.email ?? "—"}</p>
              </div>
              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Toplam Danışan</span>
                  </div>
                  <span className="font-semibold text-foreground">{trainer?.stats.totalClients ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Aktif Danışan</span>
                  </div>
                  <span className="font-semibold text-foreground">{trainer?.stats.activeClients ?? 0}</span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Hesap Oluşturma</p>
                <p className="font-medium text-foreground">{accountCreatedAt ?? "Bilinmiyor"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">İletişim Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="+90 555 000 0000"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Textarea
                  id="address"
                  value={form.address}
                  onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                  placeholder="Çalıştığınız salon, şehir vb."
                  disabled={isLoading}
                  className="min-h-[105px]"
                />
              </div>
            </div>
            {form.address && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{form.address}</span>
              </div>
            )}

            {trainer?.stats && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  Danışanlar: {trainer.stats.totalClients}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Aktif Danışanlar: {trainer.stats.activeClients}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TrainerLayout>
  )
}
