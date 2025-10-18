"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { TrainerLayout } from "@/components/trainer-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  Plus,
  Copy,
  Edit,
  Trash2,
  Pill,
  Filter,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react"

const CATEGORY_OPTIONS = ["Protein", "Performans", "Vitamin", "Yağ Asidi", "Amino Asit", "Mineral", "Diğer"]

const TIMING_SUGGESTIONS = [
  "Kahvaltı",
  "Antrenman Öncesi",
  "Antrenman Sırası",
  "Antrenman Sonrası",
  "Öğle Yemeği",
  "Akşam Yemeği",
  "Yatmadan Önce",
  "Yemek ile",
]

const parseMultiLine = (value: string): string[] =>
  value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

type SupplementTemplate = {
  id: string
  name: string
  category: string | null
  brand: string | null
  description: string | null
  defaultDosage: string | null
  defaultTiming: string | null
  timingOptions: string[]
  benefits: string[]
  warnings: string | null
  createdAt: string | null
  updatedAt: string | null
}

type SupplementFormState = {
  name: string
  category: string
  brand: string
  description: string
  defaultDosage: string
  defaultTiming: string
  timingOptionsInput: string
  benefitsInput: string
  warnings: string
}

const createEmptyForm = (): SupplementFormState => ({
  name: "",
  category: "",
  brand: "",
  description: "",
  defaultDosage: "",
  defaultTiming: "",
  timingOptionsInput: "",
  benefitsInput: "",
  warnings: "",
})

const formatSupplement = (raw: any): SupplementTemplate => ({
  id: String(raw?.id ?? ""),
  name: typeof raw?.name === "string" ? raw.name : "Supplement",
  category: typeof raw?.category === "string" ? raw.category : null,
  brand: typeof raw?.brand === "string" ? raw.brand : null,
  description: typeof raw?.description === "string" ? raw.description : null,
  defaultDosage: typeof raw?.defaultDosage === "string" ? raw.defaultDosage : null,
  defaultTiming: typeof raw?.defaultTiming === "string" ? raw.defaultTiming : null,
  timingOptions: Array.isArray(raw?.timingOptions)
    ? raw.timingOptions.filter((item: unknown): item is string => typeof item === "string")
    : [],
  benefits: Array.isArray(raw?.benefits)
    ? raw.benefits.filter((item: unknown): item is string => typeof item === "string")
    : [],
  warnings: typeof raw?.warnings === "string" ? raw.warnings : null,
  createdAt: typeof raw?.createdAt === "string" ? raw.createdAt : null,
  updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : null,
})

const sortSupplements = (items: SupplementTemplate[]) =>
  items
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "tr", { sensitivity: "base" }))

const getCategoryBadge = (category: string | null) => {
  if (!category) return <Badge variant="outline">Kategori yok</Badge>

  switch (category) {
    case "Protein":
      return <Badge className="bg-blue-900 text-white">Protein</Badge>
    case "Performans":
      return <Badge className="bg-green-800 text-white">Performans</Badge>
    case "Vitamin":
      return <Badge className="bg-slate-700 text-white">Vitamin</Badge>
    case "Yağ Asidi":
      return <Badge className="bg-red-900 text-white">Yağ Asidi</Badge>
    case "Amino Asit":
      return <Badge className="bg-purple-900 text-white">Amino Asit</Badge>
    case "Mineral":
      return <Badge className="bg-amber-900 text-white">Mineral</Badge>
    default:
      return <Badge variant="outline">{category}</Badge>
  }
}

export default function SupplementPage() {
  const [supplements, setSupplements] = useState<SupplementTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formState, setFormState] = useState<SupplementFormState>(createEmptyForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchSupplements = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch("/api/trainer/supplements")
      if (!response.ok) {
        throw new Error("Supplement listesi alınamadı")
      }

      const data = await response.json()
      const items: SupplementTemplate[] = Array.isArray(data.supplements)
        ? sortSupplements(data.supplements.map(formatSupplement))
        : []

      setSupplements(items)
    } catch (err) {
      console.error("Trainer supplements fetch error:", err)
      setError((err as Error).message || "Supplement listesi alınamadı")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSupplements()
  }, [fetchSupplements])

  const filteredSupplements = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    return supplements.filter((supplement) => {
      const matchesSearch =
        search.length === 0 ||
        [
          supplement.name,
          supplement.brand,
          supplement.description,
          ...supplement.timingOptions,
          ...supplement.benefits,
        ]
          .filter((value): value is string => typeof value === "string")
          .some((value) => value.toLowerCase().includes(search))

      const matchesCategory =
        selectedCategory === "all" ||
        (supplement.category ?? "").toLowerCase() === selectedCategory.toLowerCase()

      return matchesSearch && matchesCategory
    })
  }, [supplements, searchTerm, selectedCategory])

  const categoryCount = useMemo(() => {
    const categories = new Set(
      supplements
        .map((supplement) => supplement.category)
        .filter((category): category is string => typeof category === "string" && category.length > 0),
    )
    return categories.size
  }, [supplements])

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setEditingId(null)
      setFormState(createEmptyForm())
      setFormError(null)
    }
  }

  const handleOpenCreate = () => {
    setFormMode("create")
    setEditingId(null)
    setFormState(createEmptyForm())
    setFormError(null)
    setSuccessMessage(null)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (supplement: SupplementTemplate) => {
    setFormMode("edit")
    setEditingId(supplement.id)
    setFormError(null)
    setSuccessMessage(null)
  setFormState({
    name: supplement.name ?? "",
    category: supplement.category ?? "",
    brand: supplement.brand ?? "",
    description: supplement.description ?? "",
    defaultDosage: supplement.defaultDosage ?? "",
    defaultTiming: supplement.defaultTiming ?? "",
    timingOptionsInput: supplement.timingOptions.join("\n"),
    benefitsInput: supplement.benefits.join("\n"),
    warnings: supplement.warnings ?? "",
  })
    setIsDialogOpen(true)
  }

  const addTimingSuggestion = (suggestion: string) => {
    setFormState((prev) => {
      const options = parseMultiLine(prev.timingOptionsInput)
      if (options.includes(suggestion)) return prev
      return {
        ...prev,
        timingOptionsInput: [...options, suggestion].join("\n"),
      }
    })
  }

  const handleSaveSupplement = async () => {
    if (!formState.name.trim()) {
      setFormError("Supplement adı zorunludur")
      return
    }

    const timingOptions = parseMultiLine(formState.timingOptionsInput)
    const benefits = parseMultiLine(formState.benefitsInput)

    const payload = {
      name: formState.name.trim(),
      category: formState.category.trim(),
      brand: formState.brand.trim(),
      description: formState.description.trim(),
      defaultDosage: formState.defaultDosage.trim(),
      defaultTiming: formState.defaultTiming.trim(),
      timingOptions,
      benefits,
      warnings: formState.warnings.trim(),
    }

    try {
      setSaving(true)
      setFormError(null)
      setError(null)

      const endpoint = editingId ? `/api/trainer/supplements/${editingId}` : "/api/trainer/supplements"
      const method = editingId ? "PUT" : "POST"

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(
          errorData?.error ??
            (editingId ? "Supplement güncellenemedi" : "Supplement oluşturulamadı"),
        )
      }

      const data = await response.json()
      const updatedSupplement = formatSupplement(data?.supplement)

      setSupplements((prev) =>
        sortSupplements(
          editingId
            ? prev.map((supplement) =>
                supplement.id === updatedSupplement.id ? updatedSupplement : supplement,
              )
            : [...prev, updatedSupplement],
        ),
      )

      setSuccessMessage(editingId ? "Supplement güncellendi" : "Supplement eklendi")
      setIsDialogOpen(false)
      setEditingId(null)
      setFormState(createEmptyForm())
    } catch (err) {
      console.error("Trainer supplement save error:", err)
      setFormError((err as Error).message || "İşlem tamamlanamadı")
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      setProcessingId(id)
      setError(null)

      const response = await fetch(`/api/trainer/supplements/${id}/duplicate`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error ?? "Supplement kopyalanamadı")
      }

      const data = await response.json()
      const duplicated = formatSupplement(data?.supplement)

      setSupplements((prev) => sortSupplements([...prev, duplicated]))
      setSuccessMessage("Supplement kopyalandı")
    } catch (err) {
      console.error("Trainer supplement duplicate error:", err)
      setError((err as Error).message || "Supplement kopyalanamadı")
      setSuccessMessage(null)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Bu supplementi silmek istediğinize emin misiniz?")
      if (!confirmed) return
    }

    try {
      setProcessingId(id)
      setError(null)

      const response = await fetch(`/api/trainer/supplements/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error ?? "Supplement silinemedi")
      }

      setSupplements((prev) => prev.filter((supplement) => supplement.id !== id))
      setSuccessMessage("Supplement silindi")
    } catch (err) {
      console.error("Trainer supplement delete error:", err)
      setError((err as Error).message || "Supplement silinemedi")
      setSuccessMessage(null)
    } finally {
      setProcessingId(null)
    }
  }

  const handleRefresh = () => {
    void fetchSupplements()
  }

  return (
    <TrainerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Supplement Yönetimi</h1>
            <p className="text-muted-foreground">
              Supplement kütüphanenizi yönetin, düzenleyin ve danışanlarınıza uygun programlar oluşturun
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Supplement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {formMode === "create" ? "Yeni Supplement Ekle" : "Supplementi Düzenle"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supplement-name">Adı</Label>
                    <Input
                      id="supplement-name"
                      value={formState.name}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder="Örn. Whey Protein"
                    />
                  </div>
                  <div>
                    <Label>Kategori</Label>
                    <Select
                      value={formState.category || "__empty"}
                      onValueChange={(value) =>
                        setFormState((prev) => ({
                          ...prev,
                          category: value === "__empty" ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__empty">Belirtme</SelectItem>
                        {CATEGORY_OPTIONS.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="supplement-brand">Marka</Label>
                    <Input
                      id="supplement-brand"
                      value={formState.brand}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, brand: event.target.value }))
                      }
                      placeholder="Örn. Optimum Nutrition"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplement-dosage">Varsayılan Dozaj</Label>
                    <Input
                      id="supplement-dosage"
                      value={formState.defaultDosage}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, defaultDosage: event.target.value }))
                      }
                      placeholder="Örn. 30g"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplement-timing">Varsayılan Zaman</Label>
                    <Input
                      id="supplement-timing"
                      value={formState.defaultTiming}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, defaultTiming: event.target.value }))
                      }
                      placeholder="Örn. Antrenman sonrası"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="supplement-description">Açıklama</Label>
                  <Textarea
                    id="supplement-description"
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Supplement hakkında kısa açıklama"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supplement-benefits">Faydalar</Label>
                    <Textarea
                      id="supplement-benefits"
                      value={formState.benefitsInput}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, benefitsInput: event.target.value }))
                      }
                      placeholder="Her satıra bir fayda gelecek şekilde yazın"
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Her satır ayrı bir fayda olarak kaydedilir.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="supplement-timing-options">Kullanım Zamanları</Label>
                    <Textarea
                      id="supplement-timing-options"
                      value={formState.timingOptionsInput}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          timingOptionsInput: event.target.value,
                        }))
                      }
                      placeholder="Her satıra bir zaman yazın (örn. Kahvaltı)"
                      rows={6}
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {TIMING_SUGGESTIONS.map((suggestion) => (
                        <Badge
                          key={suggestion}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => addTimingSuggestion(suggestion)}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="supplement-warnings">Uyarılar</Label>
                  <Textarea
                    id="supplement-warnings"
                    value={formState.warnings}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, warnings: event.target.value }))
                    }
                    placeholder="Kullanım uyarıları veya dikkat edilmesi gereken noktalar"
                    rows={3}
                  />
                </div>

                {formError && <p className="text-sm text-destructive">{formError}</p>}

                <Separator />

                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-primary text-primary-foreground"
                    onClick={handleSaveSupplement}
                    disabled={saving}
                  >
                    {saving
                      ? "Kaydediliyor..."
                      : formMode === "create"
                      ? "Oluştur"
                      : "Güncelle"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={saving}
                  >
                    İptal
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {successMessage && (
          <div className="rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent-foreground">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Toplam Supplement</p>
                  <p className="text-2xl font-bold text-foreground">{supplements.length}</p>
                </div>
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Pill className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Kategori Sayısı</p>
                  <p className="text-2xl font-bold text-foreground">{categoryCount}</p>
                </div>
                <div className="h-8 w-8 bg-accent/10 rounded-full flex items-center justify-center">
                  <Filter className="h-4 w-4 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-foreground">Supplement Kütüphanesi</CardTitle>
              <p className="text-sm text-muted-foreground">
                Tüm supplementleri görüntüleyin, düzenleyin ve gerekirse çoğaltın
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Supplement ara..."
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Kategoriler</SelectItem>
                  {CATEGORY_OPTIONS.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Yenile
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Supplementler yükleniyor...</p>
            ) : filteredSupplements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aramanızla eşleşen supplement bulunamadı.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredSupplements.map((supplement) => (
                    <Card key={supplement.id} className="border border-border">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-base text-foreground flex items-center gap-2">
                              <Pill className="h-4 w-4 text-primary" />
                              {supplement.name}
                            </CardTitle>
                            {supplement.brand && (
                              <p className="text-sm text-muted-foreground">{supplement.brand}</p>
                            )}
                          </div>
                          {getCategoryBadge(supplement.category)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        {supplement.description && (
                          <p className="text-muted-foreground">{supplement.description}</p>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Varsayılan Dozaj</span>
                            <span className="text-foreground">
                              {supplement.defaultDosage || "Belirtilmemiş"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Varsayılan Zaman</span>
                            <span className="text-foreground">
                              {supplement.defaultTiming || "Belirtilmemiş"}
                            </span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Kullanım Zamanları</p>
                          <div className="flex flex-wrap gap-1">
                            {supplement.timingOptions.length > 0 ? (
                              supplement.timingOptions.map((option) => (
                                <Badge key={option} variant="outline" className="text-xs">
                                  {option}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">Bilgi yok</span>
                            )}
                          </div>
                        </div>

                        {supplement.benefits.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Faydalar</p>
                            <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
                              {supplement.benefits.slice(0, 3).map((benefit, index) => (
                                <li key={`${supplement.id}-benefit-${index}`}>{benefit}</li>
                              ))}
                              {supplement.benefits.length > 3 && <li>...</li>}
                            </ul>
                          </div>
                        )}

                        {supplement.warnings && (
                          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                            <div className="flex items-center gap-1 text-yellow-800">
                              <AlertTriangle className="h-3 w-3" />
                              <span className="font-medium">Uyarı:</span>
                            </div>
                            <p className="text-yellow-700 mt-1">{supplement.warnings}</p>
                          </div>
                        )}

                        <div className="flex flex-col gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-transparent"
                            onClick={() => handleOpenEdit(supplement)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Düzenle
                          </Button>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 bg-transparent"
                              onClick={() => handleDuplicate(supplement.id)}
                              disabled={processingId === supplement.id}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              {processingId === supplement.id ? "Çoğaltılıyor..." : "Çoğalt"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 bg-transparent text-destructive hover:text-destructive"
                              onClick={() => handleDelete(supplement.id)}
                              disabled={processingId === supplement.id}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              {processingId === supplement.id ? "Siliniyor..." : "Sil"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TrainerLayout>
  )
}
