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
  const [testing, setTesting] = useState(false)
  const [sendingTestEmail, setSendingTestEmail] = useState(false)
  const [testEmailAddress, setTestEmailAddress] = useState("")
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [lastTested, setLastTested] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    
    const fetchSettings = async () => {
      try {
        setLoading(true)
        const [settingsResponse, profileResponse] = await Promise.all([
          fetch("/api/admin/mail-settings", { cache: "no-store" }),
          fetch("/api/user/profile", { cache: "no-store" }).catch(() => null),
        ])
        
        if (!isMounted) return
        
        if (!settingsResponse.ok) {
          const data = await settingsResponse.json().catch(() => null)
          throw new Error(data?.error || "Mail ayarları yüklenemedi")
        }

        const data = await settingsResponse.json()
        if (!isMounted) return
        
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
          setLastUpdated(data.setting.updatedAt ?? null)
          setLastTested(data.setting.lastTested ?? null)
        }

        // Admin kullanıcının e-postasını test e-postası alanına otomatik doldur
        try {
          if (profileResponse && profileResponse.ok) {
            const profileData = await profileResponse.json().catch(() => null)
            if (profileData?.email && isMounted) {
              setTestEmailAddress(profileData.email)
            }
          }
        } catch (profileError) {
          // Profil yüklenemezse sessizce geç
          console.log("Profil yüklenemedi:", profileError)
        }
      } catch (error) {
        if (!isMounted) return
        console.error("Mail ayarları yükleme hatası:", error)
        toast({
          title: "Hata",
          description: (error as Error).message,
          variant: "destructive",
        })
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void fetchSettings()
    
    return () => {
      isMounted = false
    }
  }, [])

  const handleChange = (field: keyof MailSettingForm, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (testConnection = false) => {
    console.log("handleSubmit çağrıldı, testConnection:", testConnection)
    
    // Test için minimum gerekli alanları kontrol et
    if (testConnection && (!form.host || !form.port || !form.fromEmail)) {
      toast({
        title: "Eksik Bilgi",
        description: "Test için SMTP sunucusu, port ve gönderen e-posta alanları doldurulmalıdır.",
        variant: "destructive",
      })
      return
    }

    // Kaydet için minimum gerekli alanları kontrol et
    if (!testConnection && (!form.host || !form.port || !form.fromName || !form.fromEmail)) {
      toast({
        title: "Eksik Bilgi",
        description: "Host, port, gönderen adı ve e-posta alanları zorunludur.",
        variant: "destructive",
      })
      return
    }

    try {
      if (testConnection) {
        setTesting(true)
      } else {
        setSaving(true)
      }
      
      const requestBody = {
        ...form,
        port: Number(form.port),
        test: testConnection,
      }
      
      console.log("API isteği gönderiliyor:", { testConnection, body: { ...requestBody, password: requestBody.password ? "***" : "" } })
      
      const response = await fetch("/api/admin/mail-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      console.log("API yanıtı:", { status: response.status, ok: response.ok, statusText: response.statusText })

      const data = await response.json().catch((err) => {
        console.error("JSON parse hatası:", err)
        return null
      })

      console.log("API yanıt verisi:", JSON.stringify(data, null, 2))

      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}: Ayarlar kaydedilemedi`)
      }

      // Test bağlantısı için özel işleme
      if (testConnection) {
        if (data?.testResult?.success) {
          toast({
            title: "Test Başarılı",
            description: data.testResult.message || "SMTP bağlantı testi başarıyla tamamlandı.",
          })
          if (data.testResult.testedAt) {
            setLastTested(data.testResult.testedAt)
          }
        } else if (data?.error || data?.warning) {
          toast({
            title: data?.error ? "Test Başarısız" : "Uyarı",
            description: data?.error || data?.warning,
            variant: data?.error ? "destructive" : "default",
          })
        } else {
          toast({
            title: "Test Tamamlandı",
            description: "SMTP bağlantı testi tamamlandı.",
          })
        }
      } else {
        // Kaydetme için işleme
        if (data?.error || data?.warning) {
          toast({
            title: data?.error ? "Hata" : "Uyarı",
            description: data?.error || data?.warning,
            variant: data?.error ? "destructive" : "default",
          })
        } else {
          toast({
            title: "Başarılı",
            description: "Mail ayarları güncellendi.",
          })
        }
        if (data?.updatedAt) {
          setLastUpdated(data.updatedAt)
        }
      }
    } catch (error) {
      console.error("handleSubmit hatası:", error)
      toast({
        title: "Hata",
        description: (error as Error).message || "Beklenmeyen bir hata oluştu",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
      setTesting(false)
    }
  }

  const handleSendTestEmail = async () => {
    console.log("[handleSendTestEmail] Called with email:", testEmailAddress)
    
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      toast({
        title: "Geçersiz E-posta",
        description: "Lütfen geçerli bir e-posta adresi giriniz.",
        variant: "destructive",
      })
      return
    }

    try {
      setSendingTestEmail(true)
      console.log("[handleSendTestEmail] Sending request to /api/admin/mail-settings/test")
      
      const response = await fetch("/api/admin/mail-settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmailAddress }),
      })

      console.log("[handleSendTestEmail] Response status:", response.status, response.ok)

      const data = await response.json().catch((err) => {
        console.error("[handleSendTestEmail] JSON parse error:", err)
        return null
      })

      console.log("[handleSendTestEmail] Response data:", JSON.stringify(data, null, 2))

      if (!response.ok) {
        throw new Error(data?.error || "Test e-postası gönderilemedi")
      }

      // Eğer warning varsa veya rejected varsa uyarı göster
      if (data?.warning || (data?.rejected && data.rejected.length > 0)) {
        toast({
          title: "Uyarı",
          description: data?.warning || data?.message || `E-posta gönderildi ancak bazı alıcılar reddedildi: ${data.rejected?.join(", ")}`,
          variant: "default",
        })
      } else if (data?.success === false) {
        toast({
          title: "Uyarı",
          description: data?.message || data?.warning || "E-posta gönderildi ancak beklenmeyen bir durum oluştu.",
          variant: "default",
        })
      } else {
        toast({
          title: "Başarılı",
          description: data?.message || `Test e-postası ${testEmailAddress} adresine gönderildi.`,
        })
      }
      
      // Eğer accepted varsa konsola yazdır
      if (data?.accepted && data.accepted.length > 0) {
        console.log("[handleSendTestEmail] Mail accepted by SMTP server for:", data.accepted)
      }
      
      setTestEmailAddress("")
    } catch (error) {
      console.error("[handleSendTestEmail] Error:", error)
      toast({
        title: "Hata",
        description: (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setSendingTestEmail(false)
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
                      placeholder="smtp.gmail.com"
                      value={form.host}
                      onChange={(event) => {
                        // Kullanıcı ssl:// veya tls:// yazarsa uyar
                        const value = event.target.value
                        if (value.includes("ssl://") || value.includes("tls://")) {
                          toast({
                            title: "Uyarı",
                            description: "Host alanına sadece domain adresini girin (örn: smtp.gmail.com). SSL/TLS için 'Güvenli bağlantı' seçeneğini kullanın.",
                            variant: "default",
                          })
                        }
                        handleChange("host", value.replace(/^(ssl|tls):\/\//i, "").replace(/^\/\//, ""))
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Sadece domain adresini girin (örn: smtp.gmail.com). SSL/TLS için "Güvenli bağlantı" seçeneğini kullanın.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      min={1}
                      placeholder="587"
                      value={form.port}
                      onChange={(event) => handleChange("port", event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Genellikle 587 (TLS) veya 465 (SSL) kullanılır.
                    </p>
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

                <div className="space-y-1">
                  {lastUpdated ? (
                    <p className="text-xs text-muted-foreground">
                      Son güncelleme: {new Date(lastUpdated).toLocaleString("tr-TR")}
                    </p>
                  ) : null}
                  {lastTested ? (
                    <p className="text-xs text-green-600 font-medium">
                      ✓ Son test: {new Date(lastTested).toLocaleString("tr-TR")} - Başarılı
                    </p>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button disabled={saving || testing || sendingTestEmail} onClick={() => handleSubmit(false)}>
                      {saving ? "Kaydediliyor..." : "Kaydet"}
                    </Button>
                    <Button variant="outline" disabled={saving || testing || sendingTestEmail} onClick={() => handleSubmit(true)}>
                      {testing ? "Test ediliyor..." : "Bağlantıyı Test Et"}
                    </Button>
                  </div>
                  
                  <div className="border-t pt-4">
                    <Label htmlFor="testEmail" className="text-sm font-medium mb-2 block">
                      Test E-postası Gönder
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="testEmail"
                        type="email"
                        placeholder="test@example.com"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        disabled={saving || testing || sendingTestEmail}
                        className="flex-1"
                      />
                      <Button
                        variant="secondary"
                        disabled={saving || testing || sendingTestEmail || !testEmailAddress}
                        onClick={handleSendTestEmail}
                      >
                        {sendingTestEmail ? "Gönderiliyor..." : "Gönder"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Test e-postası göndermek için e-posta adresini girin ve Gönder butonuna tıklayın.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
