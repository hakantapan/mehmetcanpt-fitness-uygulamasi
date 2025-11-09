"use client"

import { useEffect, useState } from "react"
import AdminLayout from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import { Eye, EyeOff, Save } from "lucide-react"

type AdminProfileForm = {
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

const INITIAL_FORM: AdminProfileForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState<AdminProfileForm>(INITIAL_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        console.log("[Admin Settings] Fetching profile...")
        const response = await fetch("/api/admin/profile", {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        })

        console.log("[Admin Settings] Profile fetch response status:", response.status)

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || "Profil bilgileri yüklenemedi")
        }

        const data = await response.json()
        console.log("[Admin Settings] Profile data received:", data)

        setForm({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          password: "",
          confirmPassword: "",
        })
      } catch (error) {
        console.error("[Admin Settings] Profile fetch error:", error)
        toast({
          title: "Hata",
          description: (error as Error).message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    void fetchProfile()
  }, [])

  const handleChange = (field: keyof AdminProfileForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[Admin Settings] Form submitted")
    console.log("[Admin Settings] Form data:", { ...form, password: form.password ? "***" : "", confirmPassword: form.confirmPassword ? "***" : "" })

    // Şifre kontrolü
    if (form.password && form.password !== form.confirmPassword) {
      console.log("[Admin Settings] Password mismatch")
      toast({
        title: "Hata",
        description: "Şifreler eşleşmiyor",
        variant: "destructive",
      })
      return
    }

    // Minimum validasyon
    if (!form.name.trim() || !form.email.trim()) {
      console.log("[Admin Settings] Validation failed - missing name or email")
      toast({
        title: "Eksik Bilgi",
        description: "Ad Soyad ve E-posta alanları zorunludur",
        variant: "destructive",
      })
      return
    }

    console.log("[Admin Settings] Validation passed, proceeding with update")

    try {
      setSaving(true)

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
      }

      if (form.password.trim()) {
        payload.password = form.password.trim()
      }

      console.log("[Admin Settings] Sending request:", { ...payload, password: payload.password ? "***" : "" })

      const response = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      console.log("[Admin Settings] Response status:", response.status, response.ok)

      const data = await response.json().catch((err) => {
        console.error("[Admin Settings] JSON parse error:", err)
        return null
      })

      console.log("[Admin Settings] Response data:", data)

      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}: Profil güncellenemedi`)
      }

      toast({
        title: "Başarılı",
        description: "Profil bilgileri başarıyla güncellendi.",
      })

      // Şifre alanlarını temizle
      setForm((prev) => ({
        ...prev,
        password: "",
        confirmPassword: "",
      }))

      // Güncellenmiş bilgileri yükle
      setForm({
        name: data.name || form.name,
        email: data.email || form.email,
        phone: data.phone || form.phone,
        password: "",
        confirmPassword: "",
      })
    } catch (error) {
      console.error("[Admin Settings] Profile update error:", error)
      toast({
        title: "Hata",
        description: (error as Error).message || "Profil güncellenirken bir sorun oluştu",
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
          <h1 className="text-3xl font-bold text-foreground">Ayarlar</h1>
          <p className="text-muted-foreground">Hesap bilgilerinizi düzenleyin</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profil Bilgileri</CardTitle>
            <CardDescription>Ad, soyad, e-posta ve telefon bilgilerinizi güncelleyin</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Ad Soyad</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="05XX XXX XX XX"
                  />
                </div>

                <div className="border-t pt-4 mt-6">
                  <h3 className="text-lg font-semibold mb-4">Şifre Değiştir</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Şifrenizi değiştirmek istemiyorsanız bu alanları boş bırakın
                  </p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Yeni Şifre</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => handleChange("password", e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Yeni Şifre Tekrar</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={form.confirmPassword}
                          onChange={(e) => handleChange("confirmPassword", e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

