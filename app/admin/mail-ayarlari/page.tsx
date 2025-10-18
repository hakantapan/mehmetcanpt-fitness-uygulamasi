"use client"

import { useEffect, useState } from "react"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"

type MailSettingForm = {
  host: string
  port: string
  secure: boolean
  username: string
  password: string
  fromName: string
  fromEmail: string
  replyTo: string
}

const INITIAL_FORM: MailSettingForm = {
  host: "",
  port: "587",
  secure: false,
  username: "",
  password: "",
  fromName: "",
  fromEmail: "",
  replyTo: "",
}

export default function MailSettingsPage() {
  const [form, setForm] = useState<MailSettingForm>(INITIAL_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/admin/mail-settings", { cache: "no-store" })
        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || "Mail ayarları yüklenemedi")
        }

        const data = await response.json()
        if (data.setting) {
          const passwordValue = data.setting.password === '********' ? '' : data.setting.password ?? ''
          setForm({
            host: data.setting.host ?? "",
            port: String(data.setting.port ?? "587"),
            secure: Boolean(data.setting.secure),
            username: data.setting.username ?? "",
            password: passwordValue,
            fromName: data.setting.fromName ?? "",
            fromEmail: data.setting.fromEmail ?? "",
            replyTo: data.setting.replyTo ?? "",
          })
          setLastUpdated(data.setting.updatedAt ?? data.setting.lastTested ?? null)
        }
      } catch (error) {
        console.error(error)
        toast({
          title: "Hata",
          description: (error as Error).message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    void fetchSettings()
  }, [])

  const handleChange = (field: keyof MailSettingForm, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (testConnection = false) => {
    try {
      setSaving(true)
      const response = await fetch("/api/admin/mail-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          port: Number(form.port),
          test: testConnection,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Ayarlar kaydedilemedi")
      }

      toast({
        title: "Ayarlar kaydedildi",
        description:
          data?.warning ?? (testConnection ? "SMTP bağlantı testi başarıyla tamamlandı." : "Mail ayarları güncellendi."),
      })

      if (data?.updatedAt) {
        setLastUpdated(data.updatedAt)
      }
    } catch (error) {
      toast({
        title: "Hata",
        description: (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mail Ayarları</h1>
          <p className="text-muted-foreground">Sistem e-postalarının gönderileceği SMTP sunucusunu yapılandırın.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>SMTP Yapılandırması</CardTitle>
            <CardDescription>
              Kaydetmeden önce SMTP sağlayıcınızın bilgilerini doğru girdiğinizden emin olun. Test butonu ile doğrulamayı
              deneyebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="host">SMTP Sunucusu</Label>
                    <Input
                      id="host"
                      value={form.host}
                      onChange={(event) => handleChange("host", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      min={1}
                      value={form.port}
                      onChange={(event) => handleChange("port", event.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={form.secure} onCheckedChange={(checked) => handleChange("secure", checked)} />
                  <Label>Güvenli bağlantı (SSL/TLS)</Label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username">Kullanıcı Adı</Label>
                    <Input
                      id="username"
                      value={form.username}
                      onChange={(event) => handleChange("username", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Şifre / Uygulama Şifresi</Label>
                    <Input
                      id="password"
                      type="password"
                      value={form.password}
                      placeholder={form.password ? "********" : ""}
                      onChange={(event) => handleChange("password", event.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fromName">Gönderen Adı</Label>
                    <Input
                      id="fromName"
                      value={form.fromName}
                      onChange={(event) => handleChange("fromName", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fromEmail">Gönderen E-postası</Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      value={form.fromEmail}
                      onChange={(event) => handleChange("fromEmail", event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="replyTo">Yanıt E-postası (Opsiyonel)</Label>
                  <Input
                    id="replyTo"
                    type="email"
                    value={form.replyTo}
                    onChange={(event) => handleChange("replyTo", event.target.value)}
                  />
                </div>

                {lastUpdated ? (
                  <p className="text-xs text-muted-foreground">
                    Son güncelleme: {new Date(lastUpdated).toLocaleString("tr-TR")}
                  </p>
                ) : null}

                <div className="flex items-center gap-2">
                  <Button disabled={saving} onClick={() => handleSubmit(false)}>
                    {saving ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                  <Button variant="outline" disabled={saving} onClick={() => handleSubmit(true)}>
                    Bağlantıyı Test Et
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
