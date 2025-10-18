"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import AdminLayout from "@/components/admin-layout"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Plus, Pencil, Trash2, Layers } from "lucide-react"

type AdminPackage = {
  id: string
  slug: string
  name: string
  headline?: string | null
  description?: string | null
  price: number
  originalPrice?: number | null
  currency: string
  durationInDays: number
  isPopular: boolean
  isActive: boolean
  themeColor?: string | null
  iconName?: string | null
  features: string[]
  notIncluded: string[]
}

type PackageFormState = {
  id?: string
  name: string
  slug: string
  headline: string
  description: string
  price: string
  originalPrice: string
  currency: string
  durationInDays: string
  isPopular: boolean
  isActive: boolean
  themeColor: string
  iconName: string
  features: string
  notIncluded: string
}

const EMPTY_FORM: PackageFormState = {
  name: "",
  slug: "",
  headline: "",
  description: "",
  price: "",
  originalPrice: "",
  currency: "TRY",
  durationInDays: "30",
  isPopular: false,
  isActive: true,
  themeColor: "",
  iconName: "",
  features: "",
  notIncluded: "",
}

const formatCurrency = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch (_error) {
    return `${value} ${currency}`
  }
}

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<AdminPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formState, setFormState] = useState<PackageFormState>(EMPTY_FORM)
  const [mode, setMode] = useState<"create" | "edit">("create")

  const fetchPackages = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/packages", { cache: "no-store" })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "Paketler yüklenemedi")
      }

      setPackages(Array.isArray(data?.packages) ? (data.packages as AdminPackage[]) : [])
    } catch (error) {
      toast({
        title: "Hata",
        description: (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchPackages()
  }, [fetchPackages])

  const openCreateModal = () => {
    setMode("create")
    setFormState({
      ...EMPTY_FORM,
      slug: "",
    })
    setModalOpen(true)
  }

  const openEditModal = (pkg: AdminPackage) => {
    setMode("edit")
    setFormState({
      id: pkg.id,
      name: pkg.name,
      slug: pkg.slug,
      headline: pkg.headline ?? "",
      description: pkg.description ?? "",
      price: String(pkg.price),
      originalPrice: pkg.originalPrice ? String(pkg.originalPrice) : "",
      currency: pkg.currency ?? "TRY",
      durationInDays: String(pkg.durationInDays),
      isPopular: pkg.isPopular,
      isActive: pkg.isActive ?? true,
      themeColor: pkg.themeColor ?? "",
      iconName: pkg.iconName ?? "",
      features: pkg.features.join("\n"),
      notIncluded: pkg.notIncluded.join("\n"),
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setFormState(EMPTY_FORM)
  }

  const handleInputChange = (field: keyof PackageFormState, value: string | boolean) => {
    setFormState((prev) => ({
      ...prev,
      [field]: typeof value === "string" ? value : value,
    }))
  }

  const parsedFeatures = useMemo(() => formState.features.split(/\r?\n/).filter((item) => item.trim().length > 0), [
    formState.features,
  ])

  const parsedNotIncluded = useMemo(
    () => formState.notIncluded.split(/\r?\n/).filter((item) => item.trim().length > 0),
    [formState.notIncluded],
  )

  const handleSave = async () => {
    try {
      if (!formState.name.trim()) {
        throw new Error("Paket adı zorunludur.")
      }
      if (!formState.price.trim()) {
        throw new Error("Paket fiyatı zorunludur.")
      }

      setSaving(true)

      const payload = {
        name: formState.name.trim(),
        slug: formState.slug.trim(),
        headline: formState.headline.trim(),
        description: formState.description.trim(),
        price: Number.parseInt(formState.price, 10),
        originalPrice: formState.originalPrice.trim() ? Number.parseInt(formState.originalPrice, 10) : null,
        currency: formState.currency.trim() || "TRY",
        durationInDays: Number.parseInt(formState.durationInDays, 10) || 30,
        isPopular: formState.isPopular,
        isActive: formState.isActive,
        themeColor: formState.themeColor.trim(),
        iconName: formState.iconName.trim(),
        features: parsedFeatures,
        notIncluded: parsedNotIncluded,
      }

      const endpoint = "/api/admin/packages"
      const method = mode === "edit" ? "PUT" : "POST"
      const body =
        mode === "edit"
          ? JSON.stringify({ ...payload, id: formState.id })
          : JSON.stringify(payload)

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "Paket kaydedilemedi")
      }

      toast({
        title: "Başarılı",
        description: mode === "edit" ? "Paket güncellendi." : "Yeni paket oluşturuldu.",
      })

      closeModal()
      await fetchPackages()
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

  const handleDelete = async (id: string) => {
    const confirm = window.confirm("Bu paketi silmek istediğinizden emin misiniz?")
    if (!confirm) return

    try {
      setSaving(true)
      const response = await fetch(`/api/admin/packages?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "Paket silinemedi")
      }

      toast({
        title: "Paket silindi",
        description: "Paket listeden kaldırıldı.",
      })

      await fetchPackages()
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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Paket Yönetimi</h1>
            <p className="text-muted-foreground">
              Danışanlar tarafından satın alınabilen paketleri buradan oluşturabilir, güncelleyebilir ve pasif hale getirebilirsiniz.
            </p>
          </div>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Paket
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Mevcut Paketler</CardTitle>
              <CardDescription>Aktif paketler kullanıcı tarafındaki satın alma ekranında listelenir.</CardDescription>
            </div>
            <Button variant="outline" onClick={fetchPackages} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Layers className="mr-2 h-4 w-4" />}
              Yenile
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Paketler yükleniyor...</p>
              </div>
            ) : packages.length === 0 ? (
              <Alert className="border-dashed">
                <AlertTitle>Paket bulunamadı</AlertTitle>
                <AlertDescription>
                  Henüz paket oluşturmadınız. &quot;Yeni Paket&quot; butonunu kullanarak ilk paketinizi ekleyebilirsiniz.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paket</TableHead>
                      <TableHead>Fiyat</TableHead>
                      <TableHead>Süre</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="w-[120px] text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packages.map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{pkg.name}</span>
                              {pkg.isPopular && (
                                <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700">
                                  Popüler
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{pkg.headline ?? "—"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <span className="font-medium text-foreground">
                              {formatCurrency(pkg.price, pkg.currency)}
                            </span>
                            {pkg.originalPrice ? (
                              <p className="text-xs text-muted-foreground line-through">
                                {formatCurrency(pkg.originalPrice, pkg.currency)}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {pkg.durationInDays % 30 === 0
                            ? `${Math.max(1, Math.round(pkg.durationInDays / 30))} Ay`
                            : `${pkg.durationInDays} Gün`}
                        </TableCell>
                        <TableCell>
                          {pkg.isActive ? (
                            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                              Aktif
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pasif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditModal(pkg)} className="gap-2">
                              <Pencil className="h-4 w-4" />
                              Düzenle
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 text-red-600 hover:text-red-600"
                              onClick={() => handleDelete(pkg.id)}
                              disabled={saving}
                            >
                              <Trash2 className="h-4 w-4" />
                              Sil
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={modalOpen} onOpenChange={closeModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{mode === "edit" ? "Paketi Düzenle" : "Yeni Paket Oluştur"}</DialogTitle>
              <DialogDescription>
                {mode === "edit"
                  ? "Paket bilgilerini güncellediğinizde danışanlar yeni verileri hemen görecektir."
                  : "Yeni bir paket oluşturun ve özelliklerini belirleyin."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Paket Adı</Label>
                <Input
                  value={formState.name}
                  onChange={(event) => handleInputChange("name", event.target.value)}
                  placeholder="Örn: Premium Paket"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={formState.slug}
                  onChange={(event) => handleInputChange("slug", event.target.value)}
                  placeholder="premium-paket"
                />
              </div>
              <div className="space-y-2">
                <Label>Fiyat</Label>
                <Input
                  value={formState.price}
                  onChange={(event) =>
                    handleInputChange("price", event.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="599"
                />
              </div>
              <div className="space-y-2">
                <Label>İndirimli Fiyat</Label>
                <Input
                  value={formState.originalPrice}
                  onChange={(event) =>
                    handleInputChange("originalPrice", event.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="799"
                />
              </div>
              <div className="space-y-2">
                <Label>Süre (Gün)</Label>
                <Input
                  value={formState.durationInDays}
                  onChange={(event) =>
                    handleInputChange("durationInDays", event.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label>Para Birimi</Label>
                <Input
                  value={formState.currency}
                  onChange={(event) => handleInputChange("currency", event.target.value.toUpperCase())}
                  maxLength={3}
                  placeholder="TRY"
                />
              </div>
              <div className="space-y-2">
                <Label>Tema Rengi</Label>
                <Input
                  value={formState.themeColor}
                  onChange={(event) => handleInputChange("themeColor", event.target.value)}
                  placeholder="bg-orange-500"
                />
              </div>
              <div className="space-y-2">
                <Label>İkon Adı</Label>
                <Input
                  value={formState.iconName}
                  onChange={(event) => handleInputChange("iconName", event.target.value)}
                  placeholder="star"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Başlık</Label>
                <Input
                  value={formState.headline}
                  onChange={(event) => handleInputChange("headline", event.target.value)}
                  placeholder="Örn: Daha hızlı sonuçlar için"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Açıklama</Label>
                <Textarea
                  value={formState.description}
                  onChange={(event) => handleInputChange("description", event.target.value)}
                  rows={3}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Paket İçeriği (her satır bir özellik)</Label>
                <Textarea
                  value={formState.features}
                  onChange={(event) => handleInputChange("features", event.target.value)}
                  rows={5}
                  placeholder={"Kişisel antrenman programı\nDetaylı beslenme planı"}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Dahil Olmayanlar (her satır)</Label>
                <Textarea
                  value={formState.notIncluded}
                  onChange={(event) => handleInputChange("notIncluded", event.target.value)}
                  rows={4}
                  placeholder={"1-1 PT seansları\nCanlı video görüşme"}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <p className="font-medium">Popüler Paket</p>
                  <p className="text-xs text-muted-foreground">
                    Popüler olarak işaretlenen paket satın alma ekranında vurgulanır.
                  </p>
                </div>
                <Switch
                  checked={formState.isPopular}
                  onCheckedChange={(checked) => handleInputChange("isPopular", checked)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <p className="font-medium">Aktif</p>
                  <p className="text-xs text-muted-foreground">Pasif paketler müşterilere gösterilmez.</p>
                </div>
                <Switch
                  checked={formState.isActive}
                  onCheckedChange={(checked) => handleInputChange("isActive", checked)}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={closeModal} disabled={saving}>
                İptal
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Kaydet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
