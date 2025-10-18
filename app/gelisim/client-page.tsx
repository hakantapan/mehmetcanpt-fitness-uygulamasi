"use client"

import { useEffect, useMemo, useState, type ComponentType, type FormEvent, type ChangeEvent } from "react"
import ResponsiveLayout from "@/components/responsive-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { AlertCircle, Target, TrendingUp, TrendingDown, Calendar, Camera, Trophy, Activity } from "lucide-react"

type MeasurementType =
  | "weight"
  | "height"
  | "chest"
  | "waist"
  | "hip"
  | "arm"
  | "thigh"
  | "neck"
  | "shoulder"

type MeasurementRecord = {
  id: string
  userId: string
  type: MeasurementType
  value: number
  unit: string | null
  recordedAt: string
  notes: string | null
}

type MeasurementGroups = Partial<Record<MeasurementType, MeasurementRecord[]>>

type ProfileResponse = {
  targetWeight?: string
  weight?: string
  height?: string
  goal?: string
  name?: string
}

type AchievementItem = {
  id: string
  title: string
  description: string
  icon: ComponentType<{ className?: string }>
  earned: boolean
  date?: string
  progress?: number
}

type ProgressPhoto = {
  id: string
  data: string
  uploadedAt: string | null
}

const MEASUREMENT_META: Record<MeasurementType, { label: string; unit: string }> = {
  weight: { label: "Kilo", unit: "kg" },
  height: { label: "Boy", unit: "cm" },
  chest: { label: "Göğüs", unit: "cm" },
  waist: { label: "Bel", unit: "cm" },
  hip: { label: "Kalça", unit: "cm" },
  arm: { label: "Kol", unit: "cm" },
  thigh: { label: "Bacak", unit: "cm" },
  neck: { label: "Boyun", unit: "cm" },
  shoulder: { label: "Omuz", unit: "cm" },
}

const MEASUREMENT_ORDER: MeasurementType[] = [
  "weight",
  "waist",
  "hip",
  "chest",
  "arm",
  "thigh",
  "shoulder",
  "neck",
  "height",
]

const isMeasurementType = (value: string): value is MeasurementType => {
  return value in MEASUREMENT_META
}

const toNumber = (value?: string | null): number | null => {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

const formatDate = (iso: string, options?: Intl.DateTimeFormatOptions) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("tr-TR", options ?? { day: "2-digit", month: "short" })
}

const normalizeMeasurementRecord = (entry: any): MeasurementRecord | null => {
  const rawType = typeof entry?.type === "string" ? entry.type.toLowerCase() : ""
  if (!isMeasurementType(rawType)) return null

  const value = Number(entry?.value)
  if (!Number.isFinite(value)) return null

  const recordedRaw = entry?.recordedAt
  let recordedAt: string | null = null
  if (typeof recordedRaw === "string") {
    recordedAt = recordedRaw
  } else if (recordedRaw instanceof Date) {
    recordedAt = recordedRaw.toISOString()
  } else if (recordedRaw !== null && recordedRaw !== undefined) {
    const parsed = new Date(recordedRaw as string)
    if (!Number.isNaN(parsed.getTime())) {
      recordedAt = parsed.toISOString()
    }
  }

  if (!recordedAt) return null

  return {
    id: entry?.id ? String(entry.id) : `${rawType}-${recordedAt}`,
    userId: entry?.userId ? String(entry.userId) : "",
    type: rawType,
    value,
    unit: typeof entry?.unit === "string" ? entry.unit : null,
    recordedAt,
    notes: typeof entry?.notes === "string" ? entry.notes : null,
  }
}

const normalizeProgressPhoto = (entry: any): ProgressPhoto | null => {
  if (!entry) return null
  const data =
    typeof entry === "string"
      ? entry
      : typeof entry?.data === "string"
        ? entry.data
        : null
  if (!data) return null
  const id =
    typeof entry?.id === "string" && entry.id
      ? entry.id
      : `photo-${Math.random().toString(36).slice(2)}`
  const uploadedAt =
    typeof entry?.uploadedAt === "string" && entry.uploadedAt
      ? entry.uploadedAt
      : null
  return { id, data, uploadedAt }
}

export default function GelisimPage() {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"overview" | "detailed">("overview")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [measurements, setMeasurements] = useState<MeasurementRecord[]>([])
  const [newWeightValue, setNewWeightValue] = useState("")
  const [newWeightDate, setNewWeightDate] = useState("")
  const [savingWeight, setSavingWeight] = useState(false)
  const [savingWeightError, setSavingWeightError] = useState<string | null>(null)
  const [savingWeightSuccess, setSavingWeightSuccess] = useState<string | null>(null)
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [photosLoading, setPhotosLoading] = useState(true)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null)
  const [photoUploadSuccess, setPhotoUploadSuccess] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        setPhotosLoading(true)
        setPhotoError(null)

        const measurementsRes = await fetch("/api/measurements?limit=120", {
          signal: controller.signal,
          cache: "no-store",
        })

        if (measurementsRes.status === 403) {
          window.location.href = "/paket-satin-al?source=gelisim"
          return
        }

        if (!measurementsRes.ok) {
          const message = await measurementsRes.text()
          throw new Error(message || "Ölçümler alınamadı")
        }

        const measurementsJson = await measurementsRes.json()
        if (controller.signal.aborted) return

        const normalizedMeasurements: MeasurementRecord[] = Array.isArray(measurementsJson)
          ? measurementsJson
              .map((entry: any) => normalizeMeasurementRecord(entry))
              .filter((item): item is MeasurementRecord => Boolean(item))
          : []

        let profileData: ProfileResponse | null = null
        try {
          const profileRes = await fetch("/api/user/profile", {
            signal: controller.signal,
            cache: "no-store",
          })
          if (profileRes.ok) {
            const json = (await profileRes.json()) as ProfileResponse
            profileData = json
          }
        } catch (profileError) {
          if ((profileError as Error).name !== "AbortError") {
            console.warn("Profil verisi alınamadı:", profileError)
          }
        }

        try {
          const photosRes = await fetch("/api/client/progress-photos", {
            signal: controller.signal,
            cache: "no-store",
          })
          if (controller.signal.aborted) return

          if (photosRes.status === 403) {
            window.location.href = "/paket-satin-al?source=gelisim"
            return
          }

          if (photosRes.ok) {
            const photoJson = await photosRes.json()
            const normalizedPhotos: ProgressPhoto[] = Array.isArray(photoJson?.photos)
              ? photoJson.photos
                  .map((item: any) => normalizeProgressPhoto(item))
                  .filter((item): item is ProgressPhoto => Boolean(item))
              : []
            setPhotos(normalizedPhotos)
          } else if (photosRes.status === 404) {
            setPhotos([])
          } else {
            const message = await photosRes.text()
            setPhotoError(message || "Fotoğraflar alınamadı")
          }
        } catch (photoFetchError) {
          if ((photoFetchError as Error).name !== "AbortError") {
            console.error("Gelişim fotoğrafları alınamadı:", photoFetchError)
            setPhotoError("Fotoğraflar alınamadı")
          }
        }

        if (controller.signal.aborted) return

        setMeasurements(normalizedMeasurements)
        setProfile(profileData)
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return
        console.error("Gelişim verisi alınırken hata:", fetchError)
        setError((fetchError as Error).message || "Veriler yüklenirken bir hata oluştu")
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          setPhotosLoading(false)
        }
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [])

  const groupedMeasurements = useMemo<MeasurementGroups>(() => {
    return measurements.reduce<MeasurementGroups>((acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = []
      }
      acc[item.type]!.push(item)
      return acc
    }, {})
  }, [measurements])

  const latestMeasurement = measurements[0] ?? null
  const weightRecords = useMemo(() => groupedMeasurements.weight ?? [], [groupedMeasurements])
  const latestWeight = weightRecords[0] ?? null
  const previousWeight = weightRecords[1] ?? null
  const firstWeight = weightRecords.length > 0 ? weightRecords[weightRecords.length - 1] : null
  const targetWeight = toNumber(profile?.targetWeight ?? null)
  const profileWeight = toNumber(profile?.weight ?? null)

  const weightChangeFromPrevious =
    latestWeight && previousWeight ? latestWeight.value - previousWeight.value : null
  const totalWeightProgress =
    latestWeight && firstWeight ? latestWeight.value - firstWeight.value : null

  const weightChartData = useMemo(() => {
    if (!weightRecords.length) return []
    const reversed = [...weightRecords].reverse()
    return reversed.map((record) => ({
      date: formatDate(record.recordedAt),
      weight: Number(record.value.toFixed(1)),
      target: targetWeight ?? undefined,
    }))
  }, [weightRecords, targetWeight])

  const metricCards = useMemo(() => {
    const items: Array<{
      key: string
      label: string
      value: string
      change?: string
      trend?: "up" | "down" | "neutral"
      helper?: string
    }> = []

    if (latestWeight) {
      const unit = latestWeight.unit ?? MEASUREMENT_META.weight.unit
      items.push({
        key: "weight",
        label: "Güncel Kilo",
        value: `${latestWeight.value.toFixed(1)} ${unit}`,
        change:
          weightChangeFromPrevious !== null
            ? `${weightChangeFromPrevious > 0 ? "+" : ""}${weightChangeFromPrevious.toFixed(1)} ${unit}`
            : undefined,
        trend:
          weightChangeFromPrevious === null
            ? "neutral"
            : weightChangeFromPrevious <= 0
              ? "down"
              : "up",
        helper:
          weightChangeFromPrevious === null
            ? "Önceki ölçüm bulunamadı"
            : weightChangeFromPrevious < 0
              ? "Son ölçümde kilo azalması olduğunu gösterir"
              : weightChangeFromPrevious > 0
                ? "Son ölçümde kilo artışı olduğunu gösterir"
                : "Son ölçümde değişim yok",
      })
    } else if (profileWeight !== null) {
      items.push({
        key: "weight",
        label: "Güncel Kilo",
        value: `${profileWeight.toFixed(1)} ${MEASUREMENT_META.weight.unit}`,
        helper: "Profil bilgileri tercih edildi, ölçüm kaydı bulunamadı",
        trend: "neutral",
      })
    }

    if (targetWeight !== null) {
      const referenceWeight = latestWeight?.value ?? profileWeight
      if (referenceWeight !== null) {
        const diff = referenceWeight - targetWeight
        const unit = latestWeight?.unit ?? MEASUREMENT_META.weight.unit
        items.push({
          key: "target-gap",
          label: "Hedef Kilo Farkı",
          value: `${diff > 0 ? "+" : ""}${diff.toFixed(1)} ${unit}`,
          trend: diff <= 0 ? "down" : "up",
          helper:
            diff === 0
              ? "Hedef kiloya ulaşıldı"
              : diff > 0
                ? "Hedef kilonun üzerindesin"
                : "Hedef kilonun altındasın",
        })
      }
    }

    if (totalWeightProgress !== null) {
      const unit = latestWeight?.unit ?? MEASUREMENT_META.weight.unit
      items.push({
        key: "total-progress",
        label: "Toplam Değişim",
        value: `${totalWeightProgress > 0 ? "+" : ""}${totalWeightProgress.toFixed(1)} ${unit}`,
        trend: totalWeightProgress <= 0 ? "down" : "up",
        helper: firstWeight
          ? `${formatDate(firstWeight.recordedAt)} tarihinden beri toplam değişim`
          : undefined,
      })
    }

    return items
  }, [
    firstWeight,
    latestWeight,
    profileWeight,
    targetWeight,
    totalWeightProgress,
    weightChangeFromPrevious,
  ])

  useEffect(() => {
    if (!metricCards.length) return
    if (selectedMetric && metricCards.some((item) => item.key === selectedMetric)) return
    setSelectedMetric(metricCards[0]?.key ?? null)
  }, [metricCards, selectedMetric])

  const achievements = useMemo<AchievementItem[]>(() => {
    const list: AchievementItem[] = []

    if (latestWeight) {
      list.push({
        id: "latest-weight",
        title: "Güncel Ölçüm Kaydı",
        description: `${formatDate(latestWeight.recordedAt, {
          day: "numeric",
          month: "long",
        })} tarihinde ${latestWeight.value.toFixed(1)} ${latestWeight.unit ?? "kg"} olarak ölçüldün.`,
        icon: Calendar,
        earned: true,
        date: formatDate(latestWeight.recordedAt, { day: "numeric", month: "long" }),
      })
    }

    if (firstWeight && latestWeight) {
      const delta = firstWeight.value - latestWeight.value
      const unit = latestWeight.unit ?? MEASUREMENT_META.weight.unit
      const isLoss = delta > 0
      if (Math.abs(delta) >= 0.1) {
        list.push({
          id: "consistent-progress",
          title: isLoss ? "Kilo Kaybı Başarısı" : "Kilo Kazancı Başarısı",
          description: `${formatDate(firstWeight.recordedAt)} tarihinden bu yana ${
            isLoss ? "toplam" : "net"
          } ${Math.abs(delta).toFixed(1)} ${unit} ${
            isLoss ? "verdin" : "aldın"
          }. Harika ilerliyorsun!`,
          icon: TrendingUp,
          earned: true,
          date: `${Math.abs(delta).toFixed(1)} ${unit}`,
        })
      }
    }

    if (targetWeight !== null && firstWeight && latestWeight) {
      const initialDiff = targetWeight - firstWeight.value
      const currentDiff = targetWeight - latestWeight.value

      const totalDistance = Math.abs(initialDiff)
      const remainingDistance = Math.abs(currentDiff)

      const progressPercent =
        totalDistance === 0
          ? 100
          : clamp(((totalDistance - remainingDistance) / totalDistance) * 100)

      const achieved =
        (initialDiff > 0 && latestWeight.value >= targetWeight) ||
        (initialDiff < 0 && latestWeight.value <= targetWeight) ||
        progressPercent >= 99

      list.push({
        id: "target-progress",
        title: "Hedef Kilo İlerlemesi",
        description: achieved
          ? "Hedef kilonu yakaladın, tebrikler! Yeni hedefler için hazırsın."
          : `Hedefine %${progressPercent.toFixed(0)} oranında yaklaştın.`,
        icon: Target,
        earned: achieved,
        progress: achieved ? undefined : Number(progressPercent.toFixed(0)),
      })
    }

    if (!list.length) {
      list.push({
        id: "no-data",
        title: "Henüz veri yok",
        description: "İlk ölçümünü eklediğinde gelişim rozetlerin burada görünecek.",
        icon: Trophy,
        earned: false,
      })
    }

    return list
  }, [firstWeight, latestWeight, targetWeight])

  const bodyMeasurementSummary = useMemo(() => {
    return MEASUREMENT_ORDER.filter((type) => type !== "weight")
      .map((type) => {
        const records = groupedMeasurements[type]
        if (!records || !records.length) return null
        const latest = records[0]
        const earliest = records[records.length - 1]
        const unit = latest.unit ?? MEASUREMENT_META[type].unit
        const delta = latest.value - earliest.value
        return {
          type,
          label: MEASUREMENT_META[type].label,
          earliest,
          latest,
          unit,
          delta,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
  }, [groupedMeasurements])

  const monthlyWeightStats = useMemo(() => {
    if (!weightRecords.length) return []
    const ascRecords = [...weightRecords].reverse()
    const monthMap = new Map<
      string,
      {
        key: string
        label: string
        start: number
        end: number
        count: number
      }
    >()

    ascRecords.forEach((record) => {
      const date = new Date(record.recordedAt)
      if (Number.isNaN(date.getTime())) return
      const key = `${date.getFullYear()}-${date.getMonth()}`
      const label = date.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          key,
          label,
          start: record.value,
          end: record.value,
          count: 1,
        })
        return
      }
      const item = monthMap.get(key)!
      item.end = record.value
      item.count += 1
    })

    return Array.from(monthMap.values()).map((item) => ({
      ...item,
      change: item.end - item.start,
    }))
  }, [weightRecords])

  const motivationalMessages = useMemo(() => {
    const messages: Array<{ id: string; title: string; description: string; tone: "success" | "info" | "warning" }> =
      []

    if (weightChangeFromPrevious !== null) {
      messages.push({
        id: "recent-change",
        title: weightChangeFromPrevious < 0 ? "🎉 Son ölçüm harika!" : "📈 Son ölçüm güncellendi",
        description:
          weightChangeFromPrevious === 0
            ? "Son ölçümünde kilonda değişim yok. Dengeni korumaya devam et!"
            : `Son ölçümde ${Math.abs(weightChangeFromPrevious).toFixed(1)} ${
                latestWeight?.unit ?? "kg"
              } ${weightChangeFromPrevious < 0 ? "kilo verdin" : "kilo aldın"}.`,
        tone: weightChangeFromPrevious < 0 ? "success" : "info",
      })
    }

    if (totalWeightProgress !== null) {
      messages.push({
        id: "total-progress",
        title: totalWeightProgress < 0 ? "💪 Genel ilerleme çok iyi" : "🔁 Genel durum",
        description:
          totalWeightProgress === 0
            ? "Toplamda kilon sabit. Düzenli ölçüm almayı sürdür."
            : `${formatDate(firstWeight?.recordedAt ?? "")} tarihinden beri ${
                totalWeightProgress < 0 ? "toplam" : "net"
              } ${Math.abs(totalWeightProgress).toFixed(1)} ${
                latestWeight?.unit ?? "kg"
              } ${totalWeightProgress < 0 ? "kaybettin" : "kazandın"}.`,
        tone: totalWeightProgress < 0 ? "success" : "info",
      })
    }

    if (targetWeight !== null && latestWeight) {
      const diff = latestWeight.value - targetWeight
      messages.push({
        id: "target-diff",
        title: diff <= 0 ? "🎯 Hedefe ulaşıldı" : "🎯 Hedefe yaklaşıyorsun",
        description:
          diff === 0
            ? "Belirlediğin hedef kilodasın. Daimi form için yeni hedefler belirleyebilirsin."
            : `Hedef kilona ${Math.abs(diff).toFixed(1)} ${latestWeight.unit ?? "kg"} kaldı.`,
        tone: diff <= 0 ? "success" : "warning",
      })
    }

    if (!messages.length) {
      messages.push({
        id: "awaiting-data",
        title: "📷 İlk verini ekle",
        description:
          "Ölçüm ve fotoğraf eklediğinde gelişim mesajların burada görünecek. İlk adımı atmayı unutma!",
        tone: "info",
      })
    }

    return messages
  }, [firstWeight, latestWeight, targetWeight, totalWeightProgress, weightChangeFromPrevious])

  const weightUnit = latestWeight?.unit ?? MEASUREMENT_META.weight.unit
  const handlePhotoInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setPhotoUploadError(null)
    setPhotoUploadSuccess(null)

    if (!file.type.startsWith("image/")) {
      setPhotoUploadError("Lütfen bir görüntü dosyası seçin.")
      event.target.value = ""
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5 MB
    if (file.size > maxSize) {
      setPhotoUploadError("Dosya boyutu 5MB'ı geçmemelidir.")
      event.target.value = ""
      return
    }

    try {
      setPhotoUploading(true)
      const formData = new FormData()
      formData.append("photo", file)

      const response = await fetch("/api/client/progress-photos", {
        method: "POST",
        body: formData,
      })

      if (response.status === 403) {
        window.location.href = "/paket-satin-al?source=gelisim"
        return
      }

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || "Fotoğraf yüklenemedi")
      }

      const json = await response.json()
      const updatedPhotos: ProgressPhoto[] = Array.isArray(json?.photos)
        ? json.photos
            .map((item: any) => normalizeProgressPhoto(item))
            .filter((item): item is ProgressPhoto => Boolean(item))
        : []
      setPhotos(updatedPhotos)
      setPhotoUploadSuccess("Fotoğraf yüklendi. En eski kayıt otomatik silindi.")
    } catch (uploadError) {
      console.error("Fotoğraf yükleme hatası:", uploadError)
      setPhotoUploadError(uploadError instanceof Error ? uploadError.message : "Fotoğraf yüklenemedi")
    } finally {
      setPhotoUploading(false)
      event.target.value = ""
    }
  }

  const handleQuickWeightSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingWeightError(null)
    setSavingWeightSuccess(null)

    const parsedValue = Number(newWeightValue.replace(",", "."))
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      setSavingWeightError("Lütfen geçerli bir kilo değeri girin.")
      return
    }

    const payload: Record<string, unknown> = {
      type: "weight",
      value: Number(parsedValue.toFixed(2)),
    }

    if (newWeightDate) {
      const parsedDate = new Date(newWeightDate)
      if (Number.isNaN(parsedDate.getTime())) {
        setSavingWeightError("Geçerli bir tarih seçin.")
        return
      }
      payload.recordedAt = parsedDate.toISOString()
    }

    try {
      setSavingWeight(true)
      const response = await fetch("/api/measurements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.status === 403) {
        window.location.href = "/paket-satin-al?source=gelisim"
        return
      }

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || "Ölçüm kaydedilemedi")
      }

      const created = await response.json()
      const normalized = normalizeMeasurementRecord(created)

      if (normalized) {
        setMeasurements((prev) => {
          const next = [normalized, ...prev]
          next.sort(
            (a, b) =>
              new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
          )
          return next
        })

        setProfile((prev) =>
          prev
            ? {
                ...prev,
                weight: normalized.value.toFixed(1),
              }
            : prev,
        )
      }

      setNewWeightValue("")
      setNewWeightDate("")
      setSavingWeightSuccess("Kilo ölçümü kaydedildi.")
    } catch (submissionError) {
      console.error("Kilo ölçümü eklenemedi:", submissionError)
      setSavingWeightError(
        submissionError instanceof Error ? submissionError.message : "Kilo ölçümü eklenemedi",
      )
    } finally {
      setSavingWeight(false)
    }
  }

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gelişim Süreci</h1>
            <p className="text-gray-600">Fitness yolculuğundaki ilerlemeni takip et</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "overview" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("overview")}
            >
              Genel Bakış
            </Button>
            <Button
              variant={viewMode === "detailed" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("detailed")}
            >
              Detaylı
            </Button>
          </div>
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        {viewMode === "overview" ? (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center justify-between gap-3">
                  <span>Kilo Ölçümü Ekle</span>
                  {latestWeight ? (
                    <Badge variant="secondary">
                      Son kayıt: {latestWeight.value.toFixed(1)} {weightUnit}
                    </Badge>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleQuickWeightSubmit} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700" htmlFor="new-weight-value">
                      Kilo (kg)
                    </label>
                    <Input
                      id="new-weight-value"
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      value={newWeightValue}
                      onChange={(event) => {
                        setNewWeightValue(event.target.value)
                        setSavingWeightError(null)
                        setSavingWeightSuccess(null)
                      }}
                      placeholder="Örn. 82.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700" htmlFor="new-weight-date">
                      Ölçüm Tarihi (opsiyonel)
                    </label>
                    <Input
                      id="new-weight-date"
                      type="date"
                      value={newWeightDate}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(event) => {
                        setNewWeightDate(event.target.value)
                        setSavingWeightError(null)
                        setSavingWeightSuccess(null)
                      }}
                    />
                  </div>
                  <Button type="submit" disabled={savingWeight} className="md:h-[42px]">
                    {savingWeight ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </form>
                {savingWeightError ? (
                  <p className="mt-3 text-sm text-destructive">{savingWeightError}</p>
                ) : null}
                {savingWeightSuccess ? (
                  <p className="mt-3 text-sm text-emerald-600">{savingWeightSuccess}</p>
                ) : null}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {loading
                ? Array.from({ length: 2 }).map((_, index) => (
                    <Card key={`metric-skel-${index}`}>
                      <CardContent className="p-4 space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </CardContent>
                    </Card>
                  ))
                : metricCards.length
                  ? metricCards.map((metric) => {
                      const isActive = selectedMetric === metric.key
                      const TrendIcon =
                        metric.trend === "up" ? TrendingUp : metric.trend === "down" ? TrendingDown : Activity
                      const trendColor =
                        metric.trend === "down"
                          ? "text-emerald-600"
                          : metric.trend === "up"
                            ? "text-rose-600"
                            : "text-gray-500"
                      return (
                        <Card
                          key={metric.key}
                          className={`cursor-pointer transition-shadow ${
                            isActive ? "border-rose-300 shadow-md" : "hover:shadow-md"
                          }`}
                          onClick={() => setSelectedMetric(metric.key)}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm text-gray-600">{metric.label}</p>
                                <p className="text-xl font-bold text-gray-900">{metric.value}</p>
                              </div>
                              {metric.change ? (
                                <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
                                  <TrendIcon className="h-4 w-4" />
                                  {metric.change}
                                </div>
                              ) : null}
                            </div>
                            {metric.helper ? (
                              <p className="text-xs text-gray-500 leading-relaxed">{metric.helper}</p>
                            ) : null}
                          </CardContent>
                        </Card>
                      )
                    })
                  : (
                    <Card className="col-span-full">
                      <CardContent className="p-6 text-sm text-muted-foreground">
                        Henüz ölçüm verisi bulunmuyor. İlk ölçümünü eklediğinde gelişim kartları burada yer alacak.
                      </CardContent>
                    </Card>
                  )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Kilo Değişimi
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : weightChartData.length ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weightChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={["dataMin - 1", "dataMax + 1"]} />
                        <Tooltip
                          formatter={(value) => {
                            const numeric = typeof value === "number" ? value : Number(value ?? 0)
                            return [`${numeric.toFixed(1)} ${weightUnit}`]
                          }}
                        />
                        <Line type="monotone" dataKey="weight" stroke="#dc2626" strokeWidth={3} dot={{ r: 3 }} />
                        {targetWeight !== null ? (
                          <Line type="monotone" dataKey="target" stroke="#f97316" strokeDasharray="5 5" dot={false} />
                        ) : null}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
                    Kilo verisi bulunamadı. Ölçüm eklediğinde grafik burada görünecek.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Başarılar & Rozetler
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <div key={`ach-skel-${index}`} className="rounded-lg border p-4">
                        <Skeleton className="mb-2 h-4 w-32" />
                        <Skeleton className="mb-2 h-3 w-48" />
                        <Skeleton className="h-2 w-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {achievements.map((achievement) => {
                      const Icon = achievement.icon
                      return (
                        <div
                          key={achievement.id}
                          className={`rounded-lg border-2 p-4 ${
                            achievement.earned ? "border-rose-200 bg-rose-50" : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`rounded-full p-2 ${
                                achievement.earned ? "bg-rose-500 text-white" : "bg-gray-300 text-gray-600"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div>
                                <h3 className="font-semibold text-gray-900">{achievement.title}</h3>
                                <p className="text-sm text-gray-600">{achievement.description}</p>
                              </div>
                              {achievement.date ? <Badge variant="secondary">{achievement.date}</Badge> : null}
                              {achievement.progress !== undefined ? (
                                <div>
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>İlerleme</span>
                                    <span>%{achievement.progress}</span>
                                  </div>
                                  <Progress value={achievement.progress} className="mt-1" />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Tabs defaultValue="performance" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="performance">Performans</TabsTrigger>
              <TabsTrigger value="body">Vücut Ölçümleri</TabsTrigger>
              <TabsTrigger value="photos">Fotoğraflar</TabsTrigger>
              <TabsTrigger value="reports">Raporlar</TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Aylık Kilo Değişimi</CardTitle>
                  <p className="text-sm text-muted-foreground">Son ölçümlere göre aylık değişim grafiği.</p>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-64 w-full" />
                  ) : monthlyWeightStats.length ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyWeightStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <Tooltip
                            formatter={(value) => {
                              const numeric = typeof value === "number" ? value : Number(value ?? 0)
                              return [`${numeric.toFixed(1)} ${weightUnit}`]
                            }}
                          />
                          <Bar dataKey="change" radius={[6, 6, 0, 0]}>
                            {monthlyWeightStats.map((item) => (
                              <Cell key={item.key} fill={item.change <= 0 ? "#16a34a" : "#dc2626"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
                      Aylık karşılaştırma yapabilmek için en az iki ölçüm eklemelisin.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{measurements.length}</div>
                    <div className="text-sm text-gray-600">Toplam Ölçüm Kaydı</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{Object.keys(groupedMeasurements).length}</div>
                    <div className="text-sm text-gray-600">Farklı Ölçüm Tipi</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {latestMeasurement
                        ? formatDate(latestMeasurement.recordedAt, { day: "numeric", month: "short" })
                        : "-"}
                    </div>
                    <div className="text-sm text-gray-600">Son Ölçüm Tarihi</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="body" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Vücut Ölçümleri Değişimi</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Farklı bölgelerdeki ilk ve son ölçümlerinin karşılaştırması.
                  </p>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={`body-skel-${index}`} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : bodyMeasurementSummary.length ? (
                    <div className="space-y-4">
                      {bodyMeasurementSummary.map((item) => (
                        <div key={item.type} className="rounded-lg border bg-gray-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-gray-800">{item.label}</span>
                            <Badge variant={item.delta <= 0 ? "default" : "secondary"}>
                              {item.delta > 0 ? "+" : ""}
                              {item.delta.toFixed(1)} {item.unit}
                            </Badge>
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            {formatDate(item.earliest.recordedAt, { day: "numeric", month: "short", year: "numeric" })}:
                            <span className="font-medium text-gray-800">
                              {" "}
                              {item.earliest.value.toFixed(1)} {item.unit}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDate(item.latest.recordedAt, { day: "numeric", month: "short", year: "numeric" })}:
                            <span className="font-medium text-gray-800">
                              {" "}
                              {item.latest.value.toFixed(1)} {item.unit}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                      Vücut ölçümü kaydı bulunmuyor. Ölçüm eklediğinde karşılaştırmalar burada yer alacak.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="photos" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Fotoğraf Karşılaştırması
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Fotoğraflarını ekleyerek görsel değişimini kayıt altına al.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoInputChange}
                        disabled={photoUploading}
                      />
                      <p className="text-xs text-muted-foreground">
                        En fazla 2 fotoğraf saklanır. Yeni fotoğraf yüklendiğinde en eski olan otomatik silinir.
                      </p>
                      {photoUploadError ? (
                        <p className="text-sm text-destructive">{photoUploadError}</p>
                      ) : null}
                      {photoUploadSuccess ? (
                        <p className="text-sm text-emerald-600">{photoUploadSuccess}</p>
                      ) : null}
                    </div>

                    {photoError ? (
                      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                        {photoError}
                      </div>
                    ) : null}

                    {photosLoading ? (
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {Array.from({ length: 2 }).map((_, index) => (
                          <div key={`photo-skel-${index}`} className="space-y-2">
                            <Skeleton className="h-5 w-32 mx-auto" />
                            <Skeleton className="aspect-[3/4] w-full rounded-lg" />
                          </div>
                        ))}
                      </div>
                    ) : photos.length ? (
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {photos.map((photo, index) => {
                          const label =
                            index === 0 ? "Güncel Fotoğraf" : "Önceki Fotoğraf"
                          const uploadedLabel = photo.uploadedAt
                            ? formatDate(photo.uploadedAt, {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })
                            : null
                          return (
                            <div key={photo.id} className="space-y-2">
                              <h3 className="text-center font-semibold text-gray-800">
                                {label}
                                {uploadedLabel ? ` (${uploadedLabel})` : ""}
                              </h3>
                              <div className="overflow-hidden rounded-lg border bg-gray-50">
                                <img
                                  src={photo.data}
                                  alt={label}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-border bg-gray-50">
                        <div className="text-center text-muted-foreground space-y-2 px-6">
                          <Camera className="mx-auto h-10 w-10" />
                          <p>Henüz fotoğraf yüklemedin. İlk fotoğrafını ekleyerek başlangıç sağlar.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 rounded-lg border border-rose-100 bg-rose-50 p-4">
                    <h4 className="mb-2 font-semibold text-rose-800">Görsel Değişim İpucu</h4>
                    <p className="text-sm text-rose-700">
                      Düzenli aralıklarla aynı açı ve ışıkta fotoğraf çekerek değişimini görsel olarak takip edebilirsin.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Aylık Ölçüm Özeti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={`report-skel-${index}`} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : monthlyWeightStats.length ? (
                    <div className="space-y-4">
                      {monthlyWeightStats.map((month) => (
                        <div key={month.key} className="rounded-lg border p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <h3 className="font-semibold">{month.label}</h3>
                            <Badge variant={month.change <= 0 ? "default" : "secondary"}>
                              {month.change > 0 ? "+" : ""}
                              {month.change.toFixed(1)} {weightUnit}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                            <div>
                              <div className="text-gray-600">Ay Başı</div>
                              <div className="font-semibold text-gray-900">
                                {month.start.toFixed(1)} {weightUnit}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600">Ay Sonu</div>
                              <div className="font-semibold text-gray-900">
                                {month.end.toFixed(1)} {weightUnit}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600">Ölçüm Sayısı</div>
                              <div className="font-semibold text-gray-900">{month.count}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                      Aylık rapor oluşturmak için en az iki farklı ayda ölçüm yapmalısın.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Motivasyon Mesajları</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Son ölçümlerine göre önerilen kısa hatırlatmalar.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {motivationalMessages.map((message) => {
                      const toneStyles = {
                        success: {
                          container: "bg-green-50 border border-green-100",
                          title: "text-green-800",
                          description: "text-green-700",
                        },
                        info: {
                          container: "bg-blue-50 border border-blue-100",
                          title: "text-blue-800",
                          description: "text-blue-700",
                        },
                        warning: {
                          container: "bg-orange-50 border border-orange-100",
                          title: "text-orange-800",
                          description: "text-orange-700",
                        },
                      } as const
                      const styles = toneStyles[message.tone]
                      return (
                        <div key={message.id} className={`rounded-lg p-3 ${styles.container}`}>
                          <p className={`font-medium ${styles.title}`}>{message.title}</p>
                          <p className={`text-sm ${styles.description}`}>{message.description}</p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ResponsiveLayout>
  )
}
